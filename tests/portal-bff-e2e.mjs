// E2E lima BFF portal (vendor, affiliate, agen, mitra, traveler):
// proses BFF asli + PostgreSQL tes + API tiruan yang memverifikasi tanda
// tangan ingress. Menguji kontrak login 2FA dan penyajian V7 asli di /bff/ui.
//
// Wajib: database tes lokal yang namanya berakhiran _test.
//   SEGALOKA_E2E_DB_HOST=127.0.0.1 SEGALOKA_E2E_DB_PORT=55432 \
//   SEGALOKA_E2E_DB_NAME=segaloka_e2e_test SEGALOKA_E2E_DB_USER=segaloka_test \
//   node --test tests/portal-bff-e2e.mjs
//
// Berkas .env sementara ditulis lalu dihapus; skrip menolak berjalan bila
// berkas .env sudah ada agar konfigurasi asli tidak tertimpa.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { verifyIngressRequest } from '../services/api/src/security/ingress-identity-v3.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const db = {
  host: process.env.SEGALOKA_E2E_DB_HOST,
  port: process.env.SEGALOKA_E2E_DB_PORT,
  name: process.env.SEGALOKA_E2E_DB_NAME,
  user: process.env.SEGALOKA_E2E_DB_USER,
  password: process.env.SEGALOKA_E2E_DB_PASSWORD || ''
};
const configured = ['127.0.0.1', 'localhost', '::1'].includes(db.host) &&
  /_test$/.test(db.name || '') && Boolean(db.port && db.user);

const PORTALS = [
  { role: 'vendor', app: 'vendor-dashboard', port: 4211, origin: 'http://127.0.0.1:4204' },
  { role: 'affiliate', app: 'affiliate-dashboard', port: 4221, origin: 'http://127.0.0.1:4212' },
  { role: 'agen', app: 'agen-dashboard', port: 4231, origin: 'http://127.0.0.1:4216' },
  { role: 'mitra', app: 'mitra-dashboard', port: 4241, origin: 'http://127.0.0.1:4214' },
  { role: 'traveler', app: 'traveler-portal', port: 4251, origin: 'http://127.0.0.1:4210' }
];

const ORG = '22222222-2222-4222-8222-222222222222';
const TOTP_OK = '246810';
const ingressSecret = randomBytes(32).toString('hex');

function userFor(role) {
  const index = PORTALS.findIndex(p => p.role === role) + 1;
  return {
    id: `0000000${index}-0000-4000-8000-00000000000${index}`,
    email: `${role}@example.invalid`,
    fullName: `Uji ${role}`
  };
}

const MARKETPLACE = 'https://www.segaloka.com';

// API tiruan: password "benar" untuk setiap akun, 2FA aktif dengan
// authenticator + whatsapp; pengiriman WhatsApp selalu gagal (provider down).
// Tiket handoff Marketplace didaftarkan uji lewat issueHandoff (API asli
// diuji di marketplace-handoff-e2e); consume sekali pakai + verifier.
function createMockApi() {
  const tickets = new Map();
  const handoffs = new Map();
  const tokens = new Map();
  const unsignedRequests = [];

  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    const verified = verifyIngressRequest(req.headers, ingressSecret, {
      method: req.method,
      target: req.url,
      body
    });
    if (!verified) unsignedRequests.push(req.url);

    const data = body.length ? JSON.parse(body.toString('utf8')) : {};
    const bearer = (req.headers.authorization || '').replace(/^Bearer /, '');

    if (req.method === 'POST' && req.url === '/auth/login') {
      const role = data.email?.split('@')[0];
      if (!PORTALS.some(p => p.role === role) || data.password !== 'benar') {
        return send(401, { authenticated: false, code: 'INVALID_CREDENTIALS' });
      }
      const ticket = randomBytes(32).toString('hex');
      tickets.set(ticket, { role, attempts: 0 });
      return send(200, {
        authenticated: false,
        code: 'OTP_CHANNEL_REQUIRED',
        preAuthTicket: ticket,
        availableMethods: ['authenticator', 'whatsapp'],
        expiresIn: 300
      });
    }

    if (req.method === 'POST' && req.url === '/auth/login/verify-authenticator') {
      const entry = tickets.get(data.preAuthTicket);
      if (!entry || entry.attempts >= 5 || data.code !== TOTP_OK) {
        if (entry) entry.attempts++;
        return send(401, { authenticated: false, code: 'INVALID_OR_EXPIRED_AUTHENTICATOR' });
      }
      tickets.delete(data.preAuthTicket);
      const accessToken = randomBytes(16).toString('hex');
      tokens.set(accessToken, entry.role);
      return send(200, {
        authenticated: true,
        session: { accessToken, refreshToken: randomBytes(16).toString('hex') }
      });
    }

    if (req.method === 'POST' && req.url === '/auth/login/select-channel') {
      tickets.delete(data.preAuthTicket);
      return send(503, {
        authenticated: false,
        code: 'OTP_DELIVERY_UNAVAILABLE',
        message: 'Pengiriman kode verifikasi belum tersedia.'
      });
    }

    if (req.method === 'GET' && req.url === '/auth/me') {
      const role = tokens.get(bearer);
      if (!role) return send(401, { code: 'INVALID_TOKEN' });
      return send(200, {
        user: userFor(role),
        memberships: [{
          role,
          organizationId: role === 'vendor' ? ORG : null
        }]
      });
    }

    if (req.method === 'GET' && req.url === '/dashboard/access') {
      const role = tokens.get(bearer);
      if (!role) return send(401, { code: 'INVALID_TOKEN' });
      return send(200, {
        authenticated: true,
        workspaceSwitching: false,
        dashboards: [{
          dashboard: role,
          role,
          organizationId: role === 'vendor' ? ORG : null,
          ...(role === 'vendor' ? { organizationName: 'Vendor Uji' } : {})
        }]
      });
    }

    if (req.method === 'POST' && req.url === '/auth/dashboard-handoff/consume') {
      const entry = handoffs.get(data.ticket);
      handoffs.delete(data.ticket);
      const challenge = createHash('sha256').update(String(data.verifier)).digest('hex');
      if (!entry || entry.dashboard !== data.dashboard || entry.challenge !== challenge) {
        return send(401, { authenticated: false, code: 'INVALID_OR_EXPIRED_HANDOFF' });
      }
      const accessToken = randomBytes(16).toString('hex');
      tokens.set(accessToken, entry.role);
      return send(200, {
        authenticated: true,
        dashboard: entry.dashboard,
        organizationId: entry.role === 'vendor' ? ORG : null,
        session: { accessToken, refreshToken: randomBytes(16).toString('hex') }
      });
    }

    if (req.method === 'POST' && req.url === '/auth/logout') {
      return send(200, { success: true });
    }

    return send(404, { code: 'NOT_FOUND' });
  });

  function issueHandoff(role, dashboard, challenge) {
    const ticket = randomBytes(32).toString('hex');
    handoffs.set(ticket, { role, dashboard, challenge });
    return ticket;
  }

  return { server, unsignedRequests, issueHandoff };
}

async function waitForHealth(port, child) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`BFF exited ${child.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/bff/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`BFF ${port} not ready`);
}

function cookieOf(response) {
  const raw = response.headers.get('set-cookie');
  return raw ? raw.split(';')[0] : null;
}

test('portal BFF Marketplace handoff and V7 source serving', {
  skip: configured ? false : 'database tes (_test, localhost) belum dikonfigurasi',
  timeout: 180000
}, async t => {
  const envFiles = [
    `${root}services/api/.env`,
    ...PORTALS.map(p => `${root}apps/${p.app}/server/.env`)
  ];
  const existing = envFiles.filter(file => existsSync(file));
  assert.deepEqual(existing, [], 'berkas .env sudah ada; uji dihentikan agar tidak tertimpa');

  // Pengguna uji di database tes (sesi BFF mereferensikan public.users).
  const { Pool } = createRequire(`${root}services/api/package.json`)('pg');
  const pool = new Pool({
    host: db.host, port: Number(db.port), database: db.name,
    user: db.user, password: db.password, ssl: false
  });
  try {
    for (const portal of PORTALS) {
      const user = userFor(portal.role);
      await pool.query(
        `INSERT INTO public.users (id, email, full_name, two_factor_enabled)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.email, user.fullName]
      );
    }
  } finally {
    await pool.end();
  }

  const mock = createMockApi();
  await new Promise(resolve => mock.server.listen(0, '127.0.0.1', resolve));
  const apiOrigin = `http://127.0.0.1:${mock.server.address().port}`;
  const children = [];

  try {
    writeFileSync(envFiles[0], [
      `INGRESS_IDENTITY_SECRET=${ingressSecret}`,
      `DB_HOST=${db.host}`,
      `DB_PORT=${db.port}`,
      `DB_NAME=${db.name}`,
      `DB_USER=${db.user}`,
      `DB_PASSWORD=${db.password}`,
      'DB_SSL=false'
    ].join('\n'));
    for (const file of envFiles.slice(1)) {
      writeFileSync(file, `BFF_SESSION_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}\n`);
    }

    for (const portal of PORTALS) {
      const child = spawn(process.execPath, [`apps/${portal.app}/server/bff.mjs`], {
        cwd: root,
        env: { ...process.env, API_ORIGIN: apiOrigin, NODE_ENV: 'test' },
        stdio: ['ignore', 'ignore', 'pipe']
      });
      children.push(child);
      await waitForHealth(portal.port, child);
    }

    // Mulai handoff di BFF (verifier cookie + challenge), tiket dari API
    // tiruan untuk role tertentu, lalu callback form POST dari Marketplace.
    async function handoff(base, dashboard, role, { origin = MARKETPLACE, tamperVerifier = false } = {}) {
      const start = await fetch(base + '/bff/auth/handoff/start', { redirect: 'manual' });
      assert.equal(start.status, 302);
      const location = new URL(start.headers.get('location'));
      assert.equal(location.origin + location.pathname, `${MARKETPLACE}/api/auth/dashboard-handoff`);
      assert.equal(location.searchParams.get('dashboard'), dashboard);
      const setCookie = start.headers.get('set-cookie');
      assert.match(setCookie, new RegExp(`^segaloka_${dashboard}_handoff=[0-9a-f]{64}; HttpOnly; SameSite=Lax; Path=/bff/auth/handoff; Max-Age=300`));
      let verifierCookie = setCookie.split(';')[0];
      if (tamperVerifier) verifierCookie = verifierCookie.replace(/=.*/, '=' + 'f'.repeat(64));
      const ticket = mock.issueHandoff(role, dashboard, location.searchParams.get('challenge'));
      const callback = await fetch(base + '/bff/auth/handoff/callback', {
        method: 'POST',
        redirect: 'manual',
        headers: { Origin: origin, Cookie: verifierCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `ticket=${ticket}`
      });
      return { callback, ticket, verifierCookie };
    }
    const sessionOf = response => (response.headers.getSetCookie() || [])
      .map(cookie => cookie.split(';')[0])
      .find(cookie => /_session=[0-9a-f]{64}$/.test(cookie)) || null;

    for (const portal of PORTALS) {
      await t.test(portal.role, async () => {
        const base = `http://127.0.0.1:${portal.port}`;
        const post = (path, body, cookie) => fetch(base + path, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: portal.origin,
            ...(cookie ? { Cookie: cookie } : {})
          },
          body: JSON.stringify(body)
        });

        // CSRF: POST tanpa Origin yang diizinkan ditolak.
        const noOrigin = await fetch(base + '/bff/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
        assert.equal(noOrigin.status, 403);

        // Tanpa sesi: V7 tidak disajikan, diarahkan ke login Marketplace.
        const anonymous = await fetch(base + '/bff/ui', { redirect: 'manual' });
        assert.equal(anonymous.status, 302);
        assert.equal(anonymous.headers.get('location'), '/bff/auth/handoff/start');

        // Login password dashboard dimatikan (juga langkah 2FA-nya).
        for (const path of ['/bff/login', '/bff/login/select-channel', '/bff/login/verify-otp', '/bff/login/verify-authenticator']) {
          const disabled = await post(path, { email: `${portal.role}@example.invalid`, password: 'benar' });
          assert.equal(disabled.status, 404, path);
          assert.equal((await disabled.json()).code, 'DASHBOARD_LOGIN_DISABLED');
          assert.equal(cookieOf(disabled), null);
        }

        // Callback: Origin bukan Marketplace, verifier salah, dan replay ditolak.
        const foreign = await handoff(base, portal.role, portal.role, { origin: portal.origin });
        assert.equal(foreign.callback.status, 403);
        assert.equal(sessionOf(foreign.callback), null);
        const tampered = await handoff(base, portal.role, portal.role, { tamperVerifier: true });
        assert.equal(tampered.callback.status, 401);
        assert.equal(sessionOf(tampered.callback), null);
        const wrongType = await fetch(base + '/bff/auth/handoff/callback', {
          method: 'POST', headers: { Origin: MARKETPLACE, 'Content-Type': 'application/json' }, body: '{}'
        });
        assert.equal(wrongType.status, 415);

        const { callback, ticket, verifierCookie } = await handoff(base, portal.role, portal.role);
        assert.equal(callback.status, 303);
        assert.equal(callback.headers.get('location'), '/bff/ui');
        const cookie = sessionOf(callback);
        assert.match(cookie, new RegExp(`^segaloka_${portal.role}_session=[0-9a-f]{64}$`));
        assert.ok(callback.headers.getSetCookie().some(c => c.startsWith(`segaloka_${portal.role}_handoff=;`) && c.includes('Max-Age=0')));
        const replay = await fetch(base + '/bff/auth/handoff/callback', {
          method: 'POST', redirect: 'manual',
          headers: { Origin: MARKETPLACE, Cookie: verifierCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `ticket=${ticket}`
        });
        assert.equal(replay.status, 401);

        // Sesi sah: start langsung ke dashboard.
        const again = await fetch(base + '/bff/auth/handoff/start', { redirect: 'manual', headers: { Cookie: cookie } });
        assert.equal(again.headers.get('location'), '/bff/ui');

        const ui = await fetch(base + '/bff/ui', { headers: { Cookie: cookie } });
        const html = await ui.text();
        assert.equal(ui.status, 200);
        assert.match(ui.headers.get('content-security-policy'), /connect-src 'self'/);
        assert.ok(html.includes('window.__SEGALOKA_PORTAL_CONTEXT__='));
        assert.ok(html.includes(`S.role = "${portal.role}";`));
        assert.ok(html.includes('class="side-scroll"'));
        assert.ok(!html.includes('V7 visual parity source'), 'shell dist-v7 tidak boleh disajikan');
        const user = userFor(portal.role);
        const tenantId = portal.role === 'vendor' ? ORG : user.id;
        assert.ok(html.includes(`"tenant":{"id":"${tenantId}"`));

        assert.equal((await fetch(base + '/bff/ui/index.html', { headers: { Cookie: cookie } })).status, 404);

        const logout = await post('/bff/logout', {}, cookie);
        assert.equal(logout.status, 200);
        assert.equal((await fetch(base + '/bff/ui', { headers: { Cookie: cookie }, redirect: 'manual' })).status, 302);
      });
    }

    // Tiket untuk akun traveler tidak membuka BFF agen.
    await t.test('cross-role handoff is rejected', async () => {
      const { callback } = await handoff('http://127.0.0.1:4231', 'agen', 'traveler');
      assert.equal(callback.status, 403);
      assert.equal((await callback.json()).code, 'AGEN_ACCESS_REQUIRED');
      assert.equal(sessionOf(callback), null);
    });

    assert.deepEqual(mock.unsignedRequests, [], 'semua request BFF ke API harus bertanda tangan ingress');
  } finally {
    for (const child of children) child.kill();
    for (const file of envFiles) {
      if (existsSync(file)) unlinkSync(file);
    }
    mock.server.close();
  }
});

const ENTRY_SERVERS = [
  { role: 'vendor', file: 'apps/vendor-dashboard/server-v7.mjs', port: 4204, bff: 4211 },
  { role: 'affiliate', file: 'apps/affiliate-dashboard/server.mjs', port: 4212, bff: 4221 },
  { role: 'agen', file: 'apps/agen-dashboard/server.mjs', port: 4216, bff: 4231 },
  { role: 'mitra', file: 'apps/mitra-dashboard/server.mjs', port: 4214, bff: 4241 },
  { role: 'traveler', file: 'apps/traveler-portal/server.mjs', port: 4210, bff: 4251 }
];

test('portal entry servers redirect to Marketplace login and proxy /bff to their own BFF', {
  timeout: 60000
}, async () => {
  const children = [];

  try {
    for (const entry of ENTRY_SERVERS) {
      const child = spawn(process.execPath, [entry.file], {
        cwd: root,
        stdio: ['ignore', 'ignore', 'pipe']
      });
      children.push(child);

      let health;
      for (let i = 0; i < 100 && !health; i++) {
        try {
          health = await fetch(`http://127.0.0.1:${entry.port}/health`);
        } catch {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      assert.equal(health.status, 200, entry.role);
      const body = await health.json();
      assert.equal(body.source, 'original-v7');
      assert.equal(body.login, 'marketplace');
      assert.equal(body.service, `segaloka-${entry.role}`);

      // Tidak ada form login dashboard: / dan /login ke handoff Marketplace.
      for (const path of ['/', '/login', '/index.html']) {
        const login = await fetch(`http://127.0.0.1:${entry.port}${path}`, { redirect: 'manual' });
        assert.equal(login.status, 302, `${entry.role} ${path}`);
        assert.equal(login.headers.get('location'), '/bff/auth/handoff/start');
      }

      // POST lewat entry wajib memakai origin entry ini.
      const foreign = await fetch(`http://127.0.0.1:${entry.port}/bff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:4999' },
        body: '{}'
      });
      assert.equal(foreign.status, 403);

      const other = await fetch(`http://127.0.0.1:${entry.port}/dist-v7/index.html`);
      assert.equal(other.status, 404);
    }
  } finally {
    for (const child of children) child.kill();
  }
});
