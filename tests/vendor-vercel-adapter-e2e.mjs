// Dashboard Vendor dalam mode Vercel (apps/vendor-dashboard/api/index.mjs)
// dengan proses asli: API Fastify + PostgreSQL *_test sementara (runner
// migrasi asli). Function dijalankan di harness runtime Node Vercel
// (tests/support/vercel-node-harness.mjs) tanpa proses BFF kedua dan tanpa
// hop 127.0.0.1. Bagian IP memakai API tiruan yang memverifikasi tanda
// tangan ingress dan mencatat IP klien.
//
//   SEGALOKA_E2E_DB_HOST/PORT/NAME/USER (database *_test di localhost)
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { run as migrate } from '../database/migrate.mjs';
import { verifyIngressRequest } from '../services/api/src/security/ingress-identity-v3.js';
import { createRealtimeHarness, sleep } from './support/realtime-harness.mjs';
import { TEST_MARKETPLACE_ORIGIN, marketplaceHandoffLogin } from './support/marketplace-handoff.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const db = {
  host: process.env.SEGALOKA_E2E_DB_HOST,
  port: process.env.SEGALOKA_E2E_DB_PORT,
  name: process.env.SEGALOKA_E2E_DB_NAME,
  user: process.env.SEGALOKA_E2E_DB_USER
};
const configured = ['127.0.0.1', 'localhost'].includes(db.host) && /_test$/.test(db.name || '') && db.port && db.user;
const nodeMajor = Number(process.versions.node.split('.')[0]);

const API_PORT = 4797;
const API = `http://127.0.0.1:${API_PORT}`;
const FN_PORT = 4890;
const FN = `http://127.0.0.1:${FN_PORT}`;
const STUB_FN_PORT = 4891;
const PASSWORD = 'kata-sandi-vercel-uji';
const FUNCTION = 'apps/vendor-dashboard/api/index.mjs';
const HARNESS = 'tests/support/vercel-node-harness.mjs';

function functionEnv(extra) {
  return {
    PATH: process.env.PATH,
    NODE_ENV: 'test',
    BFF_SESSION_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    SEGALOKA_MARKETPLACE_ORIGIN: TEST_MARKETPLACE_ORIGIN,
    ...extra
  };
}

test('startup Vercel Vendor: env wajib divalidasi, pesan tanpa nilai secret', { skip: nodeMajor < 24 ? 'butuh Node >= 24' : false }, () => {
  const password = `rahasia-${randomBytes(6).toString('hex')}`;
  const result = spawnSync(process.execPath, [HARNESS, FUNCTION, String(STUB_FN_PORT)], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20000,
    env: functionEnv({
      NODE_ENV: 'production',
      API_ORIGIN: 'http://127.0.0.1:4192',
      DB_HOST: '127.0.0.1', DB_PORT: '5432', DB_NAME: 'x', DB_USER: 'x', DB_PASSWORD: password, DB_SSL: 'false',
      INGRESS_IDENTITY_SECRET: 'pendek',
      SEGALOKA_PUBLIC_ORIGIN: 'http://vendor.example'
    })
  });
  assert.notEqual(result.status, 0, 'function tidak boleh start');
  const output = result.stderr + result.stdout;
  assert.match(output, /PORTAL_RUNTIME_ENV_INVALID/);
  for (const name of ['API_ORIGIN', 'DB_HOST', 'DB_SSL', 'INGRESS_IDENTITY_SECRET', 'SEGALOKA_PUBLIC_ORIGIN']) {
    assert.match(output, new RegExp(name));
  }
  assert.ok(!output.includes(password), 'nilai secret tidak boleh tercetak');
});

test('Vercel Vendor: IP klien dari edge sampai ke tanda tangan ingress', { skip: nodeMajor < 24 ? 'butuh Node >= 24' : false, timeout: 60000 }, async () => {
  const ingressSecret = randomBytes(32).toString('hex');
  const seen = [];
  const stub = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const verified = verifyIngressRequest(req.headers, ingressSecret, { method: req.method, target: req.url, body: Buffer.concat(chunks) });
    seen.push({ url: req.url, ip: verified?.ip ?? null });
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end('{"authenticated":false}');
  });
  await new Promise(resolve => stub.listen(0, '127.0.0.1', resolve));
  const h = createRealtimeHarness({ apiOrigin: 'http://127.0.0.1:1', ingressSecret });
  try {
    const fn = h.start('vercel fn (stub)', [HARNESS, FUNCTION, String(STUB_FN_PORT)], {
      cwd: root,
      env: functionEnv({
        API_ORIGIN: `http://127.0.0.1:${stub.address().port}`,
        INGRESS_IDENTITY_SECRET: ingressSecret,
        DB_HOST: '127.0.0.1', DB_PORT: '5432', DB_NAME: 'tidak_dipakai_test', DB_USER: 'x', DB_PASSWORD: 'x', DB_SSL: 'false',
        SEGALOKA_PUBLIC_ORIGIN: `http://127.0.0.1:${STUB_FN_PORT}`
      })
    });
    await h.waitHttp(`http://127.0.0.1:${STUB_FN_PORT}/health`, fn, 'vercel fn (stub)');
    // Callback handoff memicu consume ke API; klien memalsukan header IP.
    const start = await fetch(`http://127.0.0.1:${STUB_FN_PORT}/bff/auth/handoff/start`, { redirect: 'manual', headers: { 'x-edge-test-client-ip': '203.0.113.9' } });
    const verifier = start.headers.get('set-cookie').split(';')[0];
    const response = await fetch(`http://127.0.0.1:${STUB_FN_PORT}/bff/auth/handoff/callback`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        Origin: TEST_MARKETPLACE_ORIGIN,
        Cookie: verifier,
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-edge-test-client-ip': '203.0.113.9',
        'x-forwarded-for': '1.1.1.1',
        'x-real-ip': '1.1.1.1',
        'x-vercel-forwarded-for': '1.1.1.1'
      },
      body: `ticket=${'a'.repeat(64)}`
    });
    assert.equal(response.status, 401);
    assert.deepEqual(seen, [{ url: '/auth/dashboard-handoff/consume', ip: '203.0.113.9' }], 'tanda tangan sah dengan IP edge, bukan nilai palsu');
  } finally {
    h.shutdown();
    stub.close();
  }
});

test('Vercel Vendor: handoff Marketplace, V7 asli, CSRF, replay, role dan tenant (proses asli)', {
  skip: nodeMajor < 24 ? 'butuh Node >= 24' : !configured ? 'database tes (_test, localhost) belum dikonfigurasi' : false,
  timeout: 300000
}, async t => {
  const { Client, Pool } = createRequire(join(root, 'services/api/package.json'))('pg');
  const { hashPassword } = await import('../services/api/src/auth/password.js');
  const name = `seg_vercel_${randomBytes(3).toString('hex')}_test`;
  const admin = new Client({ host: db.host, port: Number(db.port), database: db.name, user: db.user, password: 'x' });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  const dbEnv = { DB_HOST: db.host, DB_PORT: String(db.port), DB_NAME: name, DB_USER: db.user, DB_PASSWORD: 'x', DB_SSL: 'false' };
  const ingressSecret = randomBytes(32).toString('hex');
  const h = createRealtimeHarness({ apiOrigin: API, ingressSecret });
  let pool;
  try {
    await migrate(['apply', '--confirm-database', name], { env: dbEnv, log: () => {} });
    pool = new Pool({ host: db.host, port: Number(db.port), database: name, user: db.user, password: 'x', max: 3 });
    pool.on('error', () => {});
    const q = async (sql, params = []) => (await pool.query(sql, params)).rows;
    const hash = await hashPassword(PASSWORD);
    const users = {};
    const org = async label => (await q(`INSERT INTO public.organizations (name, organization_type, status) VALUES ($1, 'vendor', 'active') RETURNING id`, [label]))[0].id;
    const vendorA = await org('Vendor Vercel A');
    const vendorB = await org('Vendor Vercel B');
    for (const [key, role, orgs] of [['vendora', 'vendor', [vendorA]], ['multi', 'vendor', [vendorA, vendorB]], ['traveler', 'traveler', [null]]]) {
      const [row] = await q(`INSERT INTO public.users (email, full_name, status, email_verified_at, two_factor_enabled)
                             VALUES ($1, $2, 'active', now(), false) RETURNING id`, [`${key}.vercel@example.invalid`, `Uji ${key}`]);
      await q('INSERT INTO public.user_credentials (user_id, password_hash) VALUES ($1, $2)', [row.id, hash]);
      for (const organizationId of orgs) {
        await q('INSERT INTO public.memberships (user_id, organization_id, role_id) SELECT $1, $2, id FROM public.roles WHERE code = $3', [row.id, organizationId, role]);
      }
      users[key] = { id: row.id, email: `${key}.vercel@example.invalid` };
    }

    const storage = join(tmpdir(), `segaloka-vercel-${randomBytes(3).toString('hex')}`);
    mkdirSync(storage, { recursive: true });
    const api = h.start('API', ['src/server.js'], {
      cwd: join(root, 'services/api'),
      env: { ...process.env, ...dbEnv, API_HOST: '127.0.0.1', API_PORT: String(API_PORT), INGRESS_IDENTITY_SECRET: ingressSecret,
        AUTH_IP_HASH_SECRET: randomBytes(32).toString('hex'), SEGALOKA_PRIVATE_STORAGE_ROOT: storage }
    });
    await h.waitHttp(`${API}/health`, api, 'API');
    const fn = h.start('vercel fn', [HARNESS, FUNCTION, String(FN_PORT)], {
      cwd: root,
      env: functionEnv({ ...dbEnv, API_ORIGIN: API, INGRESS_IDENTITY_SECRET: ingressSecret, SEGALOKA_PUBLIC_ORIGIN: FN })
    });
    await h.waitHttp(`${FN}/health`, fn, 'vercel fn');
    const login = (key, options = {}) => marketplaceHandoffLogin({
      apiOrigin: API, ingressSecret, dashboardOrigin: FN, dashboard: 'vendor', email: users[key].email, password: PASSWORD, ...options
    });

    await t.test('tanpa sesi: Marketplace handoff, tanpa login mandiri, tanpa localhost', async () => {
      for (const path of ['/', '/login', '/index.html', '/bff/ui']) {
        const response = await fetch(FN + path, { redirect: 'manual' });
        assert.equal(response.status, 302, path);
        assert.equal(response.headers.get('location'), '/bff/auth/handoff/start');
      }
      const start = await fetch(`${FN}/bff/auth/handoff/start`, { redirect: 'manual' });
      assert.match(start.headers.get('location'), /^https:\/\/www\.segaloka\.com\/api\/auth\/dashboard-handoff\?dashboard=vendor&challenge=[0-9a-f]{64}$/);
      assert.match(start.headers.get('set-cookie'), /^segaloka_vendor_handoff=[0-9a-f]{64}; HttpOnly; SameSite=Lax; Path=\/bff\/auth\/handoff; Max-Age=300/);
      for (const path of ['/bff/login', '/bff/login/verify-otp', '/bff/login/verify-authenticator', '/bff/login/select-channel']) {
        const response = await fetch(FN + path, { method: 'POST', headers: { Origin: FN, 'Content-Type': 'application/json' }, body: '{}' });
        assert.equal(response.status, 404, path);
      }
      assert.equal((await fetch(`${FN}/bff/dashboard/access`)).status, 401);
      for (const path of ['/server/bff.mjs', '/src/main.tsx', '/original-v7/vendor-existing.html', '/package.json']) {
        assert.equal((await fetch(FN + path)).status, 404, `${path} tidak tersaji`);
      }
    });

    await t.test('login Marketplace -> V7 asli dari function, aset font tersedia, tanpa self-fetch', async () => {
      const cookie = await login('vendora');
      assert.match(cookie, /^segaloka_vendor_session=[0-9a-f]{64}$/);
      const ui = await fetch(`${FN}/bff/ui`, { headers: { Cookie: cookie } });
      const html = await ui.text();
      assert.equal(ui.status, 200);
      assert.match(ui.headers.get('content-security-policy'), /connect-src 'self'/);
      assert.ok(html.includes('window.__SEGALOKA_PORTAL_CONTEXT__='));
      assert.ok(html.includes('S.role = "vendor";'));
      assert.ok(html.includes(`"tenant":{"id":"${vendorA}"`));
      assert.ok(!/127\.0\.0\.1|localhost/.test(html.replace(FN, '')), 'HTML tanpa localhost');
      // Tidak ada token atau secret di halaman yang dikirim ke browser.
      const tokens = await q(`SELECT count(*)::int AS n FROM public.auth_sessions WHERE user_id = $1`, [users.vendora.id]);
      assert.ok(tokens[0].n >= 1);
      for (const forbidden of [ingressSecret, 'accessToken', 'refreshToken', 'BFF_SESSION_ENCRYPTION_KEY', 'DB_PASSWORD', 'INGRESS_IDENTITY_SECRET']) {
        assert.ok(!html.includes(forbidden), `HTML memuat ${forbidden.slice(0, 12)}`);
      }
      const css = await fetch(`${FN}/bff/fonts/fonts.css`);
      assert.equal(css.status, 200);
      const font = new URL((await css.text()).match(/url\(([^)]+\.woff2)\)/)[1].replace(/['"]/g, ''), `${FN}/bff/fonts/fonts.css`);
      const fontResponse = await fetch(font);
      assert.equal(fontResponse.status, 200, 'berkas font tersaji');
      assert.equal(fontResponse.headers.get('content-type'), 'font/woff2');
      const access = await (await fetch(`${FN}/bff/dashboard/access`, { headers: { Cookie: cookie } })).json();
      assert.deepEqual(access.dashboards.map(d => d.organizationId), [vendorA]);
      const verification = await fetch(`${FN}/bff/vendor/verification`, { headers: { Cookie: cookie } });
      assert.equal(verification.status, 200);
      assert.equal((await verification.json()).organizationId, vendorA);
    });

    await t.test('CSRF/Origin, replay tiket, verifier salah', async () => {
      const cookie = await login('vendora');
      for (const origin of [undefined, 'https://evil.example', TEST_MARKETPLACE_ORIGIN]) {
        const response = await fetch(`${FN}/bff/logout`, { method: 'POST', headers: { Cookie: cookie, ...(origin ? { Origin: origin } : {}) } });
        assert.equal(response.status, 403, String(origin));
      }
      assert.equal((await fetch(`${FN}/bff/dashboard/access`, { headers: { Cookie: cookie } })).status, 200, 'sesi tetap utuh');

      // Replay: tiket yang sudah dipakai ditolak; tiket dengan verifier lain dibakar.
      const loginApi = await h.api('POST', '/auth/login', { body: { email: users.vendora.email, password: PASSWORD } });
      const start = await fetch(`${FN}/bff/auth/handoff/start`, { redirect: 'manual' });
      const verifier = start.headers.get('set-cookie').split(';')[0];
      const challenge = new URL(start.headers.get('location')).searchParams.get('challenge');
      const issued = await h.api('POST', '/auth/dashboard-handoff/tickets', { token: loginApi.data.session.accessToken, body: { dashboard: 'vendor', challenge } });
      assert.equal(issued.status, 201);
      const callback = (origin, cookieHeader) => fetch(`${FN}/bff/auth/handoff/callback`, {
        method: 'POST', redirect: 'manual',
        headers: { Origin: origin, Cookie: cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `ticket=${issued.data.ticket}`
      });
      assert.equal((await callback('https://evil.example', verifier)).status, 403);
      assert.equal((await callback(TEST_MARKETPLACE_ORIGIN, 'segaloka_vendor_handoff=' + 'f'.repeat(64))).status, 401, 'verifier salah');
      assert.equal((await callback(TEST_MARKETPLACE_ORIGIN, verifier)).status, 401, 'tiket sudah dibakar');
      const burned = await q('SELECT consumed_at IS NOT NULL AS used FROM public.dashboard_handoff_tickets WHERE ticket_hash = $1',
        [createHash('sha256').update(issued.data.ticket).digest('hex')]);
      assert.deepEqual(burned, [{ used: true }]);

      const logout = await fetch(`${FN}/bff/logout`, { method: 'POST', headers: { Cookie: cookie, Origin: FN } });
      assert.equal(logout.status, 200);
      assert.equal((await fetch(`${FN}/bff/dashboard/access`, { headers: { Cookie: cookie } })).status, 401);
    });

    await t.test('role dan tenant: role lain ditolak, workspace mengikat sesi', async () => {
      await assert.rejects(login('traveler'), error => error.status === 403);
      await assert.rejects(login('multi'), error => error.status === 409 && error.code === 'WORKSPACE_SELECTION_REQUIRED');
      await assert.rejects(login('vendora', { organizationId: vendorB }), error => error.status === 403);
      const cookie = await login('multi', { organizationId: vendorB });
      const access = await (await fetch(`${FN}/bff/dashboard/access`, { headers: { Cookie: cookie } })).json();
      assert.deepEqual(access.dashboards.map(d => d.organizationId), [vendorB]);
      const html = await (await fetch(`${FN}/bff/ui`, { headers: { Cookie: cookie } })).text();
      assert.ok(html.includes(`"tenant":{"id":"${vendorB}"`));
      assert.ok(!html.includes(`"tenant":{"id":"${vendorA}"`));
    });

    await t.test('sesi dicabut di API: function menolak akses berikutnya', async () => {
      const cookie = await login('vendora');
      await q('UPDATE public.auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [users.vendora.id]);
      await sleep(100);
      assert.equal((await fetch(`${FN}/bff/dashboard/access`, { headers: { Cookie: cookie } })).status, 401);
      // Sesi BFF ikut dicabut: dashboard kembali ke login Marketplace.
      const ui = await fetch(`${FN}/bff/ui`, { headers: { Cookie: cookie }, redirect: 'manual' });
      assert.equal(ui.status, 302);
      assert.equal(ui.headers.get('location'), '/bff/auth/handoff/start');
    });
  } finally {
    h.shutdown();
    if (pool) await pool.end();
    await sleep(300);
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.end();
  }
});
