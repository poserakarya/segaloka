// E2E verifikasi TOTP Control Center: proses BFF asli (mode
// SEGALOKA_CONTROL_TEST) + PostgreSQL tes + API tiruan bertanda tangan.
//   SEGALOKA_E2E_DB_HOST=127.0.0.1 SEGALOKA_E2E_DB_PORT=55432 \
//   SEGALOKA_E2E_DB_NAME=segaloka_e2e_test SEGALOKA_E2E_DB_USER=segaloka_test \
//   node --test tests/control-center-totp-e2e.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { verifyIngressRequest } from '../services/api/src/security/ingress-identity-v3.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const db = {
  host: process.env.SEGALOKA_E2E_DB_HOST,
  port: process.env.SEGALOKA_E2E_DB_PORT,
  name: process.env.SEGALOKA_E2E_DB_NAME,
  user: process.env.SEGALOKA_E2E_DB_USER,
  password: process.env.SEGALOKA_E2E_DB_PASSWORD || 'trust-auth-unused'
};
const configured = ['127.0.0.1', 'localhost', '::1'].includes(db.host) &&
  /_test$/.test(db.name || '') && Boolean(db.port && db.user);

const ADMIN = { id: '0000000a-0000-4000-8000-00000000000a', email: 'admin@example.invalid', fullName: 'Admin Uji' };
const TRAVEL = { id: '0000000b-0000-4000-8000-00000000000b', email: 'travel@example.invalid', fullName: 'Travel Uji' };
const TOTP_OK = '975310';
const BFF_PORT = 4703;
const secret = randomBytes(32).toString('hex');

test('Control Center BFF verifies TOTP via the existing API contract', {
  skip: configured ? false : 'database tes (_test, localhost) belum dikonfigurasi',
  timeout: 60000
}, async () => {
  const { Pool } = createRequire(`${root}services/api/package.json`)('pg');
  const pool = new Pool({ host: db.host, port: Number(db.port), database: db.name, user: db.user, password: db.password, ssl: false });
  try {
    for (const user of [ADMIN, TRAVEL]) {
      await pool.query(
        `INSERT INTO public.users (id, email, full_name, two_factor_enabled)
         VALUES ($1, $2, $3, true) ON CONFLICT (id) DO NOTHING`,
        [user.id, user.email, user.fullName]
      );
    }
  } finally {
    await pool.end();
  }

  const tickets = new Map();
  const tokens = new Map();
  const unsigned = [];
  const api = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    if (!verifyIngressRequest(req.headers, secret, { method: req.method, target: req.url, body })) {
      unsigned.push(req.url);
    }
    const data = body.length ? JSON.parse(body.toString('utf8')) : {};
    const send = (status, payload) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    };
    const bearer = (req.headers.authorization || '').replace(/^Bearer /, '');

    if (req.url === '/auth/login') {
      const user = [ADMIN, TRAVEL].find(u => u.email === data.email);
      if (!user) return send(401, { code: 'INVALID_CREDENTIALS' });
      const ticket = randomBytes(32).toString('hex');
      tickets.set(ticket, user);
      return send(200, {
        authenticated: false,
        code: 'OTP_CHANNEL_REQUIRED',
        preAuthTicket: ticket,
        availableMethods: ['authenticator', 'email'],
        expiresIn: 300
      });
    }
    if (req.url === '/auth/login/verify-authenticator') {
      const user = tickets.get(data.preAuthTicket);
      if (!user || data.code !== TOTP_OK) {
        return send(401, { authenticated: false, code: 'INVALID_OR_EXPIRED_AUTHENTICATOR', message: 'Kode atau sesi verifikasi tidak valid.' });
      }
      tickets.delete(data.preAuthTicket);
      const accessToken = randomBytes(16).toString('hex');
      tokens.set(accessToken, user);
      return send(200, { authenticated: true, session: { accessToken, refreshToken: randomBytes(16).toString('hex') } });
    }
    if (req.url === '/auth/me') {
      const user = tokens.get(bearer);
      if (!user) return send(401, {});
      return send(200, {
        user,
        memberships: user === ADMIN
          ? [{ role: 'super_admin', organizationId: null }]
          : [{ role: 'travel', organizationId: 'org' }]
      });
    }
    if (req.url === '/auth/logout') return send(200, { success: true });
    return send(404, {});
  });
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));

  const child = spawn(process.execPath, ['apps/control-center/bff.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      SEGALOKA_CONTROL_TEST: '1',
      SEGALOKA_BFF_PORT: String(BFF_PORT),
      API_ORIGIN: `http://127.0.0.1:${api.address().port}`,
      CONTROL_TEST_INGRESS_IDENTITY_SECRET: secret,
      CONTROL_TEST_DB_HOST: db.host,
      CONTROL_TEST_DB_PORT: String(db.port),
      CONTROL_TEST_DB_NAME: db.name,
      CONTROL_TEST_DB_USER: db.user,
      CONTROL_TEST_DB_PASSWORD: db.password,
      CONTROL_TEST_BFF_SESSION_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'ignore', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });

  try {
    const base = `http://127.0.0.1:${BFF_PORT}`;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error(`BFF exited: ${stderr}`);
      try { if ((await fetch(base + '/bff/health')).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const post = (path, body, origin = base) => fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify(body)
    });

    const login = await (await post('/bff/login', { email: ADMIN.email, password: 'x' })).json();
    assert.equal(login.code, 'OTP_CHANNEL_REQUIRED');
    assert.deepEqual(login.availableMethods, ['authenticator', 'email']);

    assert.equal((await post('/bff/login/verify-authenticator', { preAuthTicket: login.preAuthTicket, code: TOTP_OK }, 'http://evil.invalid')).status, 403);
    assert.equal((await post('/bff/login/verify-authenticator', { preAuthTicket: 'x', code: TOTP_OK })).status, 400);

    const wrong = await post('/bff/login/verify-authenticator', { preAuthTicket: login.preAuthTicket, code: '000000' });
    assert.equal(wrong.status, 401);
    assert.equal((await wrong.json()).code, 'INVALID_OR_EXPIRED_AUTHENTICATOR');
    assert.equal(wrong.headers.get('set-cookie'), null);

    const ok = await post('/bff/login/verify-authenticator', { preAuthTicket: login.preAuthTicket, code: TOTP_OK });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).authenticated, true);
    assert.match(ok.headers.get('set-cookie'), /segaloka_control_center_session=[0-9a-f]{64}/);

    // Role selain super_admin tetap ditolak setelah TOTP valid.
    const travelLogin = await (await post('/bff/login', { email: TRAVEL.email, password: 'x' })).json();
    const denied = await post('/bff/login/verify-authenticator', { preAuthTicket: travelLogin.preAuthTicket, code: TOTP_OK });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).code, 'SUPER_ADMIN_ACCESS_REQUIRED');
    assert.doesNotMatch(denied.headers.get('set-cookie') || '', /session=[0-9a-f]{64}/);

    assert.deepEqual(unsigned, []);
  } finally {
    child.kill();
    api.close();
  }
});
