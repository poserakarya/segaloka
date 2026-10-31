// Entry portal dua mode tanpa database:
//  - createPortalRequestHandler (Vercel): route, gerbang Origin/CSRF, IP
//    klien dari header edge, tanpa redirect localhost.
//  - createBffProxy (container): x-real-ip selalu ditimpa (anti spoofing).
//  - validatePortalRuntimeEnv: gagal tertutup, pesan tanpa nilai secret.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomBytes } from 'node:crypto';

import { createBffProxy, createPortalRequestHandler } from './v7-portal-entry.mjs';
import { validatePortalRuntimeEnv } from './portal-runtime-env.mjs';

const PUBLIC = 'https://vendor.dashboard.segaloka.com';
const MARKETPLACE = 'https://www.segaloka.com';

async function listen(handler) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

test('Vercel handler: route, Origin, IP klien dari edge', async () => {
  const calls = [];
  const handler = createPortalRequestHandler({
    role: 'vendor',
    env: { SEGALOKA_PUBLIC_ORIGIN: PUBLIC, SEGALOKA_MARKETPLACE_ORIGIN: MARKETPLACE, NODE_ENV: 'production' },
    handleBff: (req, res, context) => {
      calls.push({ method: req.method, url: req.url, origin: req.headers.origin, clientIp: context.clientIp });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    }
  });
  const { server, url } = await listen(handler);
  const edge = { 'x-vercel-forwarded-for': '198.51.100.4' };
  try {
    // Tanpa form login: /, /login, /index.html -> handoff (relatif, bukan localhost).
    for (const path of ['/', '/login', '/index.html']) {
      const response = await fetch(url + path, { redirect: 'manual', headers: edge });
      assert.equal(response.status, 302, path);
      assert.equal(response.headers.get('location'), '/bff/auth/handoff/start');
    }
    assert.equal((await fetch(url + '/src/main.tsx', { headers: edge })).status, 404);
    assert.equal((await fetch(url + '/server/bff.mjs', { headers: edge })).status, 404);
    assert.equal((await (await fetch(url + '/health')).json()).login, 'marketplace');

    // /bff/* diproses langsung dengan IP edge; spoofing klien diabaikan.
    const ok = await fetch(url + '/bff/ui', { headers: { ...edge, 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '1.1.1.1' } });
    assert.equal(ok.status, 200);
    assert.equal(calls.at(-1).clientIp, '198.51.100.4');

    // CSRF/Origin: POST tanpa Origin, Origin asing, atau origin loopback ditolak
    // sebelum mencapai BFF; Origin publik diteruskan apa adanya.
    const before = calls.length;
    for (const origin of [undefined, 'https://evil.example', 'http://127.0.0.1:4204']) {
      const response = await fetch(url + '/bff/logout', { method: 'POST', headers: { ...edge, ...(origin ? { Origin: origin } : {}) } });
      assert.equal(response.status, 403, String(origin));
    }
    assert.equal((await fetch(url + '/bff/me', { headers: { ...edge, Origin: 'https://evil.example' } })).status, 403);
    assert.equal(calls.length, before, 'request ditolak tidak mencapai BFF');
    assert.equal((await fetch(url + '/bff/logout', { method: 'POST', headers: { ...edge, Origin: PUBLIC } })).status, 200);
    assert.equal(calls.at(-1).origin, PUBLIC);

    // Callback handoff hanya dari Marketplace; path lain dengan Origin
    // Marketplace tetap ditolak.
    assert.equal((await fetch(url + '/bff/auth/handoff/callback', { method: 'POST', headers: { ...edge, Origin: MARKETPLACE } })).status, 200);
    assert.equal(calls.at(-1).origin, MARKETPLACE);
    assert.equal((await fetch(url + '/bff/logout', { method: 'POST', headers: { ...edge, Origin: MARKETPLACE } })).status, 403);

    // Tanpa header edge yang sah: gagal tertutup.
    assert.equal((await fetch(url + '/bff/ui', { headers: { 'x-forwarded-for': '1.1.1.1' } })).status, 503);
  } finally {
    server.close();
  }
});

test('Vercel handler menolak konfigurasi tanpa origin publik', () => {
  assert.throws(() => createPortalRequestHandler({ role: 'vendor', handleBff() {}, env: {} }), /SEGALOKA_PUBLIC_ORIGIN_REQUIRED/);
  assert.throws(() => createPortalRequestHandler({ role: 'admin', handleBff() {}, env: { SEGALOKA_PUBLIC_ORIGIN: PUBLIC } }), /INVALID_V7_PORTAL_ROLE/);
});

test('container proxy: x-real-ip dari klien selalu ditimpa', async () => {
  const seen = [];
  const bff = await listen((req, res) => {
    seen.push({ realIp: req.headers['x-real-ip'], origin: req.headers.origin });
    res.writeHead(200);
    res.end('{}');
  });
  const port = Number(new URL(bff.url).port);
  const proxy = createBffProxy({
    bffPort: port,
    origins: new Set(['http://127.0.0.1:4204', PUBLIC]),
    forwardedOrigin: 'http://127.0.0.1:4204',
    handoffOrigin: MARKETPLACE,
    env: {}
  });
  const entry = await listen(proxy);
  try {
    // Klien (peer loopback, tidak tepercaya untuk entry) memalsukan header.
    await fetch(entry.url + '/bff/me', { headers: { 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '1.1.1.1' } });
    assert.equal(seen.at(-1).realIp, '127.0.0.1');
    await fetch(entry.url + '/bff/logout', { method: 'POST', headers: { Origin: PUBLIC, 'x-real-ip': '1.1.1.1' } });
    assert.equal(seen.at(-1).realIp, '127.0.0.1');
    assert.equal(seen.at(-1).origin, 'http://127.0.0.1:4204', 'origin publik dipetakan ke origin lokal');
  } finally {
    entry.server.close();
    bff.server.close();
  }

  // Peer reverse proxy tepercaya: X-Real-IP darinya dipakai.
  const bff2 = await listen((req, res) => { seen.push({ realIp: req.headers['x-real-ip'] }); res.end('{}'); });
  const trustedEntry = await listen(createBffProxy({
    bffPort: Number(new URL(bff2.url).port), origins: new Set(), forwardedOrigin: 'http://127.0.0.1:4204', env: { SEGALOKA_TRUSTED_PROXY_IPS: '127.0.0.1' }
  }));
  try {
    await fetch(trustedEntry.url + '/bff/me', { headers: { 'x-real-ip': '198.51.100.20' } });
    assert.equal(seen.at(-1).realIp, '198.51.100.20');
  } finally {
    trustedEntry.server.close();
    bff2.server.close();
  }
});

test('validatePortalRuntimeEnv: production wajib https, TLS DB, kunci sah; tanpa nilai di pesan', () => {
  const secret = randomBytes(32).toString('hex');
  const key = randomBytes(32).toString('base64');
  const good = {
    NODE_ENV: 'production',
    INGRESS_IDENTITY_SECRET: secret,
    BFF_SESSION_ENCRYPTION_KEY: key,
    DB_HOST: 'db.internal.example',
    DB_PORT: '5432',
    DB_NAME: 'segaloka',
    DB_USER: 'segaloka_app',
    DB_PASSWORD: 'rahasia-db-jangan-dicetak',
    DB_SSL: 'true',
    API_ORIGIN: 'https://api.segaloka.com',
    SEGALOKA_PUBLIC_ORIGIN: PUBLIC,
    SEGALOKA_MARKETPLACE_ORIGIN: MARKETPLACE
  };
  assert.doesNotThrow(() => validatePortalRuntimeEnv(good));

  const cases = [
    [{ API_ORIGIN: 'http://127.0.0.1:4192' }, 'API_ORIGIN'],
    [{ API_ORIGIN: 'https://localhost' }, 'API_ORIGIN'],
    [{ DB_HOST: '127.0.0.1' }, 'DB_HOST'],
    [{ DB_SSL: 'false' }, 'DB_SSL'],
    [{ SEGALOKA_PUBLIC_ORIGIN: 'http://vendor.dashboard.segaloka.com' }, 'SEGALOKA_PUBLIC_ORIGIN'],
    [{ SEGALOKA_MARKETPLACE_ORIGIN: 'https://evil.example' }, 'SEGALOKA_MARKETPLACE_ORIGIN'],
    [{ BFF_SESSION_ENCRYPTION_KEY: 'pendek' }, 'BFF_SESSION_ENCRYPTION_KEY'],
    [{ INGRESS_IDENTITY_SECRET: 'x' }, 'INGRESS_IDENTITY_SECRET'],
    [{ DB_PASSWORD: '' }, 'DB_PASSWORD']
  ];
  for (const [override, name] of cases) {
    assert.throws(() => validatePortalRuntimeEnv({ ...good, ...override }), error => {
      assert.ok(error.variables.includes(name), `${name}: ${error.message}`);
      for (const value of [secret, key, good.DB_PASSWORD, override[name]].filter(v => v && v.length > 6)) {
        assert.ok(!error.message.includes(value), 'nilai tidak boleh muncul di pesan');
      }
      return true;
    });
  }
});
