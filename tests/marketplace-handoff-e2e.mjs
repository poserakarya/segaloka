// E2E login Marketplace -> Dashboard Vendor V7 dengan proses asli: API
// Fastify, PostgreSQL *_test sementara (runner migrasi asli, termasuk 0042),
// website Next.js (route /api/auth/login dan /api/auth/dashboard-handoff),
// entry + BFF Vendor, dan Chromium. Database sementara dihapus di akhir.
//
//   SEGALOKA_E2E_DB_HOST/PORT/NAME/USER (database *_test di localhost)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { run as migrate } from '../database/migrate.mjs';
import { createRealtimeHarness, sleep } from './support/realtime-harness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
let chromium = null;
try { ({ chromium } = require('playwright')); } catch { chromium = null; }
const db = {
  host: process.env.SEGALOKA_E2E_DB_HOST,
  port: process.env.SEGALOKA_E2E_DB_PORT,
  name: process.env.SEGALOKA_E2E_DB_NAME,
  user: process.env.SEGALOKA_E2E_DB_USER
};
const configured = ['127.0.0.1', 'localhost'].includes(db.host) && /_test$/.test(db.name || '') && db.port && db.user;
const nodeMajor = Number(process.versions.node.split('.')[0]);
const webReady = existsSync(join(root, 'projects/Segaloka-webs/node_modules/next/dist/bin/next'));

const API_PORT = 4795;
const API = `http://127.0.0.1:${API_PORT}`;
const WEB_PORT = 4880;
const WEB = `http://127.0.0.1:${WEB_PORT}`;
const VENDOR = 'http://127.0.0.1:4204';
const PASSWORD = 'kata-sandi-handoff-uji';
const sha256 = value => createHash('sha256').update(value).digest('hex');

test('Marketplace login -> Vendor V7 dashboard handoff (real processes)', {
  skip: nodeMajor < 24 ? 'butuh Node >= 24'
    : !configured ? 'database tes (_test, localhost) belum dikonfigurasi'
      : !chromium ? 'playwright tidak tersedia'
        : !webReady ? 'dependensi website (projects/Segaloka-webs) belum terpasang' : false,
  timeout: 600000
}, async t => {
  const { Client, Pool } = createRequire(join(root, 'services/api/package.json'))('pg');
  const { hashPassword } = await import('../services/api/src/auth/password.js');
  const name = `seg_handoff_${randomBytes(3).toString('hex')}_test`;
  const admin = new Client({ host: db.host, port: Number(db.port), database: db.name, user: db.user, password: 'x' });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  const dbEnv = { DB_HOST: db.host, DB_PORT: String(db.port), DB_NAME: name, DB_USER: db.user, DB_PASSWORD: 'x', DB_SSL: 'false' };
  const ingressSecret = randomBytes(32).toString('hex');
  const h = createRealtimeHarness({ apiOrigin: API, ingressSecret });
  let pool;
  let browser;

  try {
    await migrate(['apply', '--confirm-database', name], { env: dbEnv, log: () => {} });
    pool = new Pool({ ...{ host: db.host, port: Number(db.port), database: name, user: db.user, password: 'x' }, max: 4 });
    const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

    // ---------- Akun di database sementara ----------
    const hash = await hashPassword(PASSWORD);
    const users = {};
    async function user(key, role, orgs = [null]) {
      const [row] = await q(`INSERT INTO public.users (email, full_name, status, email_verified_at, two_factor_enabled)
                             VALUES ($1, $2, 'active', now(), false) RETURNING id`, [`${key}.handoff@example.invalid`, `Uji ${key}`]);
      await q('INSERT INTO public.user_credentials (user_id, password_hash) VALUES ($1, $2)', [row.id, hash]);
      for (const org of orgs) {
        await q(`INSERT INTO public.memberships (user_id, organization_id, role_id) SELECT $1, $2, id FROM public.roles WHERE code = $3`, [row.id, org, role]);
      }
      users[key] = { id: row.id, email: `${key}.handoff@example.invalid` };
    }
    const org = async (label, type) => (await q(`INSERT INTO public.organizations (name, organization_type, status) VALUES ($1, $2, 'active') RETURNING id`, [label, type]))[0].id;
    const vendorA = await org('Vendor Handoff A', 'vendor');
    const vendorB = await org('Vendor Handoff B', 'vendor');
    await user('vendora', 'vendor', [vendorA]);
    await user('multivendor', 'vendor', [vendorA, vendorB]);
    await user('traveler', 'traveler');

    // ---------- Proses asli ----------
    const storage = join(tmpdir(), `segaloka-handoff-${randomBytes(3).toString('hex')}`);
    mkdirSync(storage, { recursive: true });
    const apiProcess = h.start('API', ['src/server.js'], {
      cwd: join(root, 'services/api'),
      env: { ...process.env, ...dbEnv, API_HOST: '127.0.0.1', API_PORT: String(API_PORT), INGRESS_IDENTITY_SECRET: ingressSecret,
        AUTH_IP_HASH_SECRET: randomBytes(32).toString('hex'), SEGALOKA_PRIVATE_STORAGE_ROOT: storage }
    });
    await h.waitHttp(`${API}/health`, apiProcess, 'API');
    const portalEnv = { ...process.env, ...dbEnv, NODE_ENV: 'test', API_ORIGIN: API, INGRESS_IDENTITY_SECRET: ingressSecret,
      BFF_SESSION_ENCRYPTION_KEY: randomBytes(32).toString('base64'), SEGALOKA_MARKETPLACE_ORIGIN: WEB };
    const bff = h.start('vendor BFF', ['apps/vendor-dashboard/server/bff.mjs'], { cwd: root, env: portalEnv });
    await h.waitHttp('http://127.0.0.1:4211/bff/health', bff, 'vendor BFF');
    const entry = h.start('vendor entry', ['apps/vendor-dashboard/server-v7.mjs'], { cwd: root, env: portalEnv });
    await h.waitHttp(`${VENDOR}/health`, entry, 'vendor entry');
    const web = h.start('website', ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', String(WEB_PORT)], {
      cwd: join(root, 'projects/Segaloka-webs'),
      env: { ...process.env, NODE_ENV: 'development', SEGALOKA_API_BASE_URL: API, SEGALOKA_ORIGIN_AUTH_SECRET: ingressSecret,
        SEGALOKA_DASHBOARD_ORIGINS: JSON.stringify({ vendor: VENDOR }), NEXT_TELEMETRY_DISABLED: '1' }
    });
    for (let i = 0; ; i++) {
      try { await h.waitHttp(`${WEB}/api/auth/dashboard-handoff`, web, 'website'); break; } catch (error) { if (i >= 5) throw error; }
    }

    browser = await chromium.launch();
    const newContext = () => browser.newContext({ locale: 'id-ID', viewport: { width: 1280, height: 860 } });
    const marketplaceLogin = async (context, key) => {
      const response = await context.request.post(`${WEB}/api/auth/login`, { data: { email: users[key].email, password: PASSWORD } });
      assert.equal(response.status(), 200, `login Marketplace ${key}: ${await response.text()}`);
    };

    await t.test('tanpa sesi: dashboard mengarah ke login Marketplace, tanpa form login dashboard', async () => {
      const context = await newContext();
      const page = await context.newPage();
      const visited = [];
      page.on('request', request => { if (request.isNavigationRequest()) visited.push(request.url()); });
      const first = await context.request.get(`${VENDOR}/`, { maxRedirects: 0 });
      assert.equal(first.status(), 302);
      assert.equal(first.headers().location, '/bff/auth/handoff/start');
      await page.goto(`${VENDOR}/`, { waitUntil: 'commit' });
      await page.waitForURL(url => url.origin === WEB && url.searchParams.get('returnTo')?.startsWith('/api/auth/dashboard-handoff'), { timeout: 60000 });
      const returnTo = new URL(page.url()).searchParams.get('returnTo');
      assert.match(returnTo, /dashboard=vendor&challenge=[0-9a-f]{64}$/);
      assert.equal(await page.locator('#sg-email, #sg-password').count(), 0, 'tidak ada form login dashboard');
      // Endpoint login password dashboard dimatikan; data tanpa sesi ditolak.
      const login = await context.request.post(`${VENDOR}/bff/login`, { headers: { Origin: VENDOR }, data: { email: users.vendora.email, password: PASSWORD } });
      assert.equal(login.status(), 404);
      assert.equal((await context.request.get(`${VENDOR}/bff/dashboard/access`)).status(), 401);
      const ui = await context.request.get(`${VENDOR}/bff/ui`, { maxRedirects: 0 });
      assert.equal(ui.status(), 302);
      assert.equal(ui.headers().location, '/bff/auth/handoff/start');
      await context.close();
    });

    await t.test('login Marketplace -> Dashboard Vendor V7 milik akun, tiket tidak pernah di URL', async () => {
      const context = await newContext();
      const page = await context.newPage();
      const urls = [];
      page.on('request', request => urls.push(request.url()));
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${VENDOR}/`, { waitUntil: 'commit' });
      await page.waitForURL(url => url.origin === WEB, { timeout: 60000 });
      const returnTo = new URL(page.url()).searchParams.get('returnTo');
      await marketplaceLogin(context, 'vendora');
      await page.goto(WEB + returnTo);
      await page.waitForURL(url => url.origin === VENDOR && url.pathname === '/bff/ui', { timeout: 60000 });
      await page.waitForResponse(response => response.url().endsWith('/bff/dashboard/access') && response.status() === 200, { timeout: 30000 }).catch(() => {});
      await page.waitForLoadState('load');
      assert.ok((await page.content()).length > 1000, 'UI V7 Vendor dimuat');
      const access = await (await context.request.get(`${VENDOR}/bff/dashboard/access`)).json();
      assert.deepEqual(access.dashboards.map(d => d.organizationId), [vendorA]);
      for (const url of urls) assert.ok(!/ticket=|[?&]token=|accessToken|refreshToken/i.test(url), `token di URL: ${url}`);
      const cookies = (await context.cookies()).filter(c => c.domain === "127.0.0.1");
      const session = cookies.find(c => c.name === 'segaloka_vendor_session');
      assert.ok(session?.httpOnly, 'cookie sesi HttpOnly');
      assert.ok(!cookies.some(c => c.name === 'segaloka_vendor_handoff'), 'verifier dihapus');
      assert.deepEqual(errors, []);
      await context.close();
    });

    // Tiket dari route website (HTML form) untuk uji keamanan tingkat BFF.
    async function issueTicket(context, key, { organizationId } = {}) {
      const start = await context.request.get(`${VENDOR}/bff/auth/handoff/start`, { maxRedirects: 0 });
      const location = new URL(start.headers().location);
      if (organizationId) location.searchParams.set('organizationId', organizationId);
      const response = await context.request.get(location.toString(), { maxRedirects: 0 });
      const html = await response.text();
      return { status: response.status(), html, ticket: html.match(/name="ticket" value="([0-9a-f]{64})"/)?.[1] || null };
    }
    const callback = (context, ticket, origin = WEB) => context.request.post(`${VENDOR}/bff/auth/handoff/callback`, {
      headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, data: `ticket=${ticket}`, maxRedirects: 0
    });

    await t.test('replay, origin asing, verifier salah, dan kedaluwarsa ditolak', async () => {
      const context = await newContext();
      await marketplaceLogin(context, 'vendora');
      const first = await issueTicket(context, 'vendora');
      assert.ok(first.ticket, first.html.slice(0, 300));
      assert.equal((await callback(context, first.ticket, 'https://evil.example')).status(), 403, 'origin asing');
      const ok = await callback(context, first.ticket);
      assert.equal(ok.status(), 303);
      assert.equal(ok.headers().location, '/bff/ui');
      const replay = await callback(context, first.ticket);
      assert.equal(replay.status(), 401, 'replay');

      // Verifier milik browser lain: tiket dibakar.
      const other = await newContext();
      await marketplaceLogin(other, 'vendora');
      const stolen = await issueTicket(other, 'vendora');
      const attacker = await newContext();
      await attacker.request.get(`${VENDOR}/bff/auth/handoff/start`, { maxRedirects: 0 });
      assert.equal((await callback(attacker, stolen.ticket)).status(), 401, 'verifier salah');
      assert.equal((await callback(other, stolen.ticket)).status(), 401, 'tiket sudah dibakar');
      const burned = await q('SELECT consumed_at IS NOT NULL AS used FROM public.dashboard_handoff_tickets WHERE ticket_hash = $1', [sha256(stolen.ticket)]);
      assert.deepEqual(burned, [{ used: true }]);

      const late = await newContext();
      await marketplaceLogin(late, 'vendora');
      const expiring = await issueTicket(late, 'vendora');
      await q(`UPDATE public.dashboard_handoff_tickets SET created_at = now() - interval '2 minutes', expires_at = now() - interval '1 second'
               WHERE ticket_hash = $1`, [sha256(expiring.ticket)]);
      assert.equal((await callback(late, expiring.ticket)).status(), 401, 'kedaluwarsa');
      for (const c of [context, other, attacker, late]) await c.close();
    });

    await t.test('role dan tenant yang salah ditolak; pilihan workspace aman', async () => {
      const traveler = await newContext();
      await marketplaceLogin(traveler, 'traveler');
      const denied = await issueTicket(traveler, 'traveler');
      assert.equal(denied.ticket, null);
      assert.match(denied.html, /Akses ditolak/);
      await traveler.close();

      const multi = await newContext();
      await marketplaceLogin(multi, 'multivendor');
      const select = await issueTicket(multi, 'multivendor');
      assert.equal(select.ticket, null);
      assert.match(select.html, /Pilih organisasi/);
      assert.ok(select.html.includes(vendorA) && select.html.includes(vendorB));
      const chosen = await issueTicket(multi, 'multivendor', { organizationId: vendorB });
      assert.equal((await callback(multi, chosen.ticket)).status(), 303);
      const access = await (await multi.request.get(`${VENDOR}/bff/dashboard/access`)).json();
      // Workspace terpilih mengikat sesi; organisasi lain tidak ikut terbuka.
      assert.deepEqual(access.dashboards.map(d => d.organizationId), [vendorB]);
      const verification = await (await multi.request.get(`${VENDOR}/bff/vendor/verification`)).json();
      assert.equal(verification.organizationId, vendorB);
      await multi.close();

      // Organisasi yang bukan milik akun: API menolak.
      const single = await newContext();
      await marketplaceLogin(single, 'vendora');
      const foreign = await issueTicket(single, 'vendora', { organizationId: vendorB });
      assert.equal(foreign.ticket, null);
      assert.match(foreign.html, /Akses ditolak/);
      await single.close();
    });

    await t.test('API: tiket hanya lewat ingress bertanda; sesi dashboard terpisah dan dapat dicabut', async () => {
      const unsigned = await fetch(`${API}/auth/dashboard-handoff/tickets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboard: 'vendor', challenge: 'a'.repeat(64) })
      });
      assert.ok([401, 403].includes(unsigned.status), `tanpa tanda tangan: ${unsigned.status}`);
      const consumeUnsigned = await fetch(`${API}/auth/dashboard-handoff/consume`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboard: 'vendor', ticket: 'a'.repeat(64), verifier: 'b'.repeat(64) })
      });
      assert.ok([401, 403].includes(consumeUnsigned.status));

      const context = await newContext();
      await marketplaceLogin(context, 'vendora');
      const issued = await issueTicket(context, 'vendora');
      assert.equal((await callback(context, issued.ticket)).status(), 303);
      assert.equal((await context.request.get(`${VENDOR}/bff/dashboard/access`)).status(), 200);
      // Sesi dashboard adalah sesi API baru, terpisah dari sesi Marketplace.
      const sessions = await q(`SELECT count(*)::int AS n FROM public.auth_sessions WHERE user_id = $1 AND revoked_at IS NULL`, [users.vendora.id]);
      assert.ok(sessions[0].n >= 2);
      // Sesi kedaluwarsa/dicabut: akses berikutnya ditolak.
      await q('UPDATE public.auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [users.vendora.id]);
      await sleep(200);
      assert.equal((await context.request.get(`${VENDOR}/bff/dashboard/access`)).status(), 401);
      const audits = await q(`SELECT action FROM public.audit_logs WHERE entity_type = 'dashboard_handoff_ticket' AND action = 'auth.dashboard_handoff.consumed'`);
      assert.ok(audits.length >= 3);
      await context.close();
    });
  } finally {
    h.shutdown();
    if (browser) await browser.close();
    if (pool) await pool.end();
    await sleep(500);
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.end();
  }
});
