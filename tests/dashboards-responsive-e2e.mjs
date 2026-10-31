// E2E ketujuh dashboard di Chromium: proses asli (entry server, BFF, Vite
// Travel, server Control Center) + PostgreSQL tes + API tiruan bertanda
// tangan ingress. Control Center: login sendiri lewat UI (password + TOTP).
// Enam dashboard lain: tanpa form login; browser diarahkan ke Marketplace
// (halaman handoff Marketplace distub lewat Playwright route dengan tiket dari
// API tiruan) lalu kembali lewat form POST. Dashboard diperiksa pada 360/768/1280 px dalam
// ID/EN/AR (RTL), termasuk font lokal, tanpa banner simulasi, tanpa request
// eksternal, dan tanpa scroll horizontal.
//
//   SEGALOKA_E2E_DB_HOST=127.0.0.1 SEGALOKA_E2E_DB_PORT=55432 \
//   SEGALOKA_E2E_DB_NAME=segaloka_e2e_test SEGALOKA_E2E_DB_USER=segaloka_test \
//   node --test tests/dashboards-responsive-e2e.mjs
//
// SEGALOKA_E2E_SCREENSHOTS=<dir> menyimpan screenshot setiap kombinasi.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { verifyIngressRequest } from '../services/api/src/security/ingress-identity-v3.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
let chromium = null;
try {
  ({ chromium } = require('playwright'));
} catch {
  chromium = null;
}

const db = {
  host: process.env.SEGALOKA_E2E_DB_HOST,
  port: process.env.SEGALOKA_E2E_DB_PORT,
  name: process.env.SEGALOKA_E2E_DB_NAME,
  user: process.env.SEGALOKA_E2E_DB_USER,
  password: process.env.SEGALOKA_E2E_DB_PASSWORD || 'trust-auth-unused'
};
const configured = ['127.0.0.1', 'localhost', '::1'].includes(db.host) &&
  /_test$/.test(db.name || '') && Boolean(db.port && db.user);
const screenshots = process.env.SEGALOKA_E2E_SCREENSHOTS || null;

const TOTP_OK = '246810';
const ingressSecret = randomBytes(32).toString('hex');
const ORG_TRAVEL = '33333333-0000-4000-8000-000000000001';
const ORG_VENDOR = '33333333-0000-4000-8000-000000000002';
const VIEWPORTS = [
  { width: 360, height: 780 },
  { width: 768, height: 1024 },
  { width: 1280, height: 860 }
];
const LANGUAGES = ['id', 'en', 'ar'];
const SIMULATION_TEXT = [
  'Mode simulasi permission',
  'Permission simulation',
  'محاكاة الصلاحيات',
  'Kembali ke Super Admin',
  'Back to Super Admin'
];

const ACCOUNTS = {
  super_admin: { id: '44444444-0000-4000-8000-000000000001', email: 'admin.responsive@example.invalid' },
  travel: { id: '44444444-0000-4000-8000-000000000002', email: 'travel.responsive@example.invalid' },
  vendor: { id: '44444444-0000-4000-8000-000000000003', email: 'vendor.responsive@example.invalid' },
  affiliate: { id: '44444444-0000-4000-8000-000000000004', email: 'affiliate.responsive@example.invalid' },
  agen: { id: '44444444-0000-4000-8000-000000000005', email: 'agen.responsive@example.invalid' },
  mitra: { id: '44444444-0000-4000-8000-000000000006', email: 'mitra.responsive@example.invalid' },
  traveler: { id: '44444444-0000-4000-8000-000000000007', email: 'traveler.responsive@example.invalid' }
};

const PORTALS = [
  { role: 'vendor', app: 'vendor-dashboard', entry: 'server-v7.mjs', port: 4204, bff: 4211 },
  { role: 'affiliate', app: 'affiliate-dashboard', entry: 'server.mjs', port: 4212, bff: 4221 },
  { role: 'agen', app: 'agen-dashboard', entry: 'server.mjs', port: 4216, bff: 4231 },
  { role: 'mitra', app: 'mitra-dashboard', entry: 'server.mjs', port: 4214, bff: 4241 },
  { role: 'traveler', app: 'traveler-portal', entry: 'server.mjs', port: 4210, bff: 4251 }
];
const TRAVEL = { vite: 4700, bff: 4701 };
const CONTROL = { server: 4702, bff: 4703 };

function membershipsFor(role) {
  if (role === 'travel') return [{ role: 'travel', organizationId: ORG_TRAVEL }];
  if (role === 'vendor') return [{ role: 'vendor', organizationId: ORG_VENDOR }];
  return [{ role, organizationId: null }];
}

function dashboardsFor(role) {
  if (role === 'super_admin') return [{ dashboard: 'control-center', role, organizationId: null }];
  if (role === 'travel') return [{ dashboard: 'travel', role, organizationId: ORG_TRAVEL, organizationName: 'Travel Uji' }];
  if (role === 'vendor') return [{ dashboard: 'vendor', role, organizationId: ORG_VENDOR, organizationName: 'Vendor Uji' }];
  return [{ dashboard: role, role, organizationId: null }];
}

// API tiruan khusus pengujian terisolasi.
// Marketplace tiruan lokal (127.0.0.1, diizinkan di luar production):
// halaman handoff dengan tiket dari API tiruan untuk role = dashboard.
const MARKETPLACE_PORT = 4706;
const MARKETPLACE = `http://127.0.0.1:${MARKETPLACE_PORT}`;
const DASHBOARD_ORIGINS = {};

function createMarketplaceStub(mock) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, MARKETPLACE);
    const dashboard = url.searchParams.get('dashboard');
    const origin = DASHBOARD_ORIGINS[dashboard];
    if (url.pathname !== '/api/auth/dashboard-handoff' || !origin) {
      res.writeHead(404);
      return res.end();
    }
    const ticket = mock.issueHandoff(dashboard, dashboard, url.searchParams.get('challenge'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Referrer-Policy': 'strict-origin', 'Cache-Control': 'no-store' });
    res.end(`<!doctype html><form id="f" method="post" action="${origin}/bff/auth/handoff/callback">` +
      `<input type="hidden" name="ticket" value="${ticket}"></form><script>document.getElementById('f').submit()</script>`);
  });
}

function createMockApi() {
  const tickets = new Map();
  const handoffs = new Map();
  const tokens = new Map();
  const unsigned = [];

  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    if (!verifyIngressRequest(req.headers, ingressSecret, { method: req.method, target: req.url, body })) {
      unsigned.push(`${req.method} ${req.url}`);
    }
    const data = body.length ? JSON.parse(body.toString('utf8')) : {};
    const path = req.url.split('?')[0];
    const role = tokens.get((req.headers.authorization || '').replace(/^Bearer /, ''));
    const send = (status, payload) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    };

    if (req.method === 'POST' && path === '/auth/login') {
      const entry = Object.entries(ACCOUNTS).find(([, a]) => a.email === data.email);
      if (!entry || data.password !== 'kata-sandi-uji') {
        return send(401, { authenticated: false, code: 'INVALID_CREDENTIALS' });
      }
      const ticket = randomBytes(32).toString('hex');
      tickets.set(ticket, entry[0]);
      return send(200, {
        authenticated: false,
        code: 'OTP_CHANNEL_REQUIRED',
        preAuthTicket: ticket,
        availableMethods: ['authenticator', 'email'],
        expiresIn: 300
      });
    }
    if (req.method === 'POST' && path === '/auth/login/verify-authenticator') {
      const ticketRole = tickets.get(data.preAuthTicket);
      if (!ticketRole || data.code !== TOTP_OK) {
        return send(401, { authenticated: false, code: 'INVALID_OR_EXPIRED_AUTHENTICATOR' });
      }
      tickets.delete(data.preAuthTicket);
      const accessToken = randomBytes(32).toString('hex');
      tokens.set(accessToken, ticketRole);
      return send(200, {
        authenticated: true,
        session: { accessToken, refreshToken: randomBytes(32).toString('hex') }
      });
    }
    if (req.method === 'POST' && path === '/auth/dashboard-handoff/consume') {
      const entry = handoffs.get(data.ticket);
      handoffs.delete(data.ticket);
      const challenge = createHash('sha256').update(String(data.verifier)).digest('hex');
      if (!entry || entry.dashboard !== data.dashboard || entry.challenge !== challenge) {
        return send(401, { authenticated: false, code: 'INVALID_OR_EXPIRED_HANDOFF' });
      }
      const accessToken = randomBytes(32).toString('hex');
      tokens.set(accessToken, entry.role);
      return send(200, {
        authenticated: true,
        dashboard: entry.dashboard,
        organizationId: dashboardsFor(entry.role)[0].organizationId,
        session: { accessToken, refreshToken: randomBytes(32).toString('hex') }
      });
    }
    if (req.method === 'POST' && path === '/auth/logout') return send(200, { success: true });
    if (req.method === 'GET' && path === '/health') return send(200, { service: 'segaloka-api', status: 'ok' });
    if (req.method === 'GET' && path === '/ready') return send(200, { status: 'ready', database: { connected: true } });

    if (!role) return send(401, { code: 'INVALID_SESSION' });

    if (path === '/auth/me') {
      const account = ACCOUNTS[role];
      return send(200, {
        user: { id: account.id, email: account.email, fullName: `Uji ${role}` },
        memberships: membershipsFor(role)
      });
    }
    if (path === '/dashboard/access') {
      return send(200, { authenticated: true, workspaceSwitching: false, dashboards: dashboardsFor(role) });
    }
    if (path === '/travel/departures' && role === 'travel') return send(200, { departures: [] });
    if (path === '/sync/events' && role === 'travel') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      res.write('event: ready\nid: 0\ndata: {}\n\n');
      req.on('close', () => res.end());
      return;
    }
    return send(503, { code: 'SERVICE_UNAVAILABLE' });
  });

  function issueHandoff(role, dashboard, challenge) {
    const ticket = randomBytes(32).toString('hex');
    handoffs.set(ticket, { role, dashboard, challenge });
    return ticket;
  }

  return { server, unsigned, issueHandoff };
}

async function waitFor(url, child, label) {
  for (let i = 0; i < 200; i++) {
    if (child && child.exitCode !== null) throw new Error(`${label} exited (${child.exitCode}): ${child.stderrText}`);
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`${label} not ready: ${url}`);
}

function start(children, label, args, options) {
  const child = spawn(process.execPath, args, { ...options, stdio: ['ignore', 'ignore', 'pipe'] });
  child.stderrText = '';
  child.stderr.on('data', chunk => { child.stderrText += chunk; });
  children.push(child);
  return child;
}

async function pageState(page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const text = document.body.innerText;
    const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, ''));
    return {
      dir: document.documentElement.dir || 'ltr',
      lang: document.documentElement.lang,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyFont: getComputedStyle(document.body).fontFamily,
      loadedFonts: [...new Set(loaded)],
      text
    };
  });
}

function assertPage(state, label, language) {
  assert.ok(state.overflow <= 1, `${label}: horizontal overflow ${state.overflow}px`);
  assert.equal(state.dir, language === 'ar' ? 'rtl' : 'ltr', `${label}: dir`);
  assert.match(state.bodyFont, /^"?Plus Jakarta Sans"?/, `${label}: font ${state.bodyFont}`);
  assert.ok(state.loadedFonts.includes('Plus Jakarta Sans'), `${label}: Plus Jakarta Sans not loaded`);
  if (language === 'ar') {
    assert.ok(state.loadedFonts.includes('IBM Plex Sans Arabic'), `${label}: IBM Plex Sans Arabic not loaded`);
  }
  for (const phrase of SIMULATION_TEXT) {
    assert.ok(!state.text.includes(phrase), `${label}: simulation text "${phrase}"`);
  }
}

const DASHBOARDS = [
  {
    name: 'control-center',
    role: 'super_admin',
    origin: `http://127.0.0.1:${CONTROL.server}`,
    loginPath: '/login',
    dashboardPattern: /\/dashboard#\/travel$/,
    ready: () => window.__SEGALOKA_V7_ACTION_POLICY__ && document.querySelector('#side'),
    async login(page) {
      await page.fill('#email', ACCOUNTS.super_admin.email);
      await page.fill('#password', 'kata-sandi-uji');
      await page.click('#submit');
      await page.waitForSelector('#otp-channel-section:not([hidden])');
      await page.selectOption('#otp-channel', 'authenticator');
      await page.click('#send-otp');
      await page.fill('#otp-code', TOTP_OK);
      await page.click('#verify-otp');
    }
  },
  {
    name: 'travel',
    role: 'travel',
    origin: `http://127.0.0.1:${TRAVEL.vite}`,
    entryPath: '/bff/dashboard',
    dashboardPattern: /\/bff\/dashboard/,
    ready: () => window.SegalokaTravelRuntime && document.querySelector('#side')
  },
  ...PORTALS.map(portal => ({
    name: portal.role,
    role: portal.role,
    origin: `http://127.0.0.1:${portal.port}`,
    entryPath: '/',
    dashboardPattern: /\/bff\/ui/,
    ready: () => window.SegalokaPortalRuntime && document.querySelector('#side')
  }))
];

test('seven separate V7 dashboards: Marketplace login, render, responsive, ID/EN/AR, fonts, no simulation', {
  skip: !chromium
    ? 'playwright tidak tersedia'
    : configured ? false : 'database tes (_test, localhost) belum dikonfigurasi',
  timeout: 900000
}, async t => {
  const envFiles = [
    `${root}services/api/.env`,
    ...PORTALS.map(p => `${root}apps/${p.app}/server/.env`)
  ];
  assert.deepEqual(envFiles.filter(file => existsSync(file)), [], 'berkas .env sudah ada; uji dihentikan');

  const { Pool } = createRequire(`${root}services/api/package.json`)('pg');
  const pool = new Pool({ host: db.host, port: Number(db.port), database: db.name, user: db.user, password: db.password, ssl: false });
  try {
    for (const [role, account] of Object.entries(ACCOUNTS)) {
      await pool.query(
        `INSERT INTO public.users (id, email, full_name, two_factor_enabled)
         VALUES ($1, $2, $3, true) ON CONFLICT (id) DO NOTHING`,
        [account.id, account.email, `Uji ${role}`]
      );
    }
  } finally {
    await pool.end();
  }

  const mock = createMockApi();
  await new Promise(resolve => mock.server.listen(0, '127.0.0.1', resolve));
  const apiOrigin = `http://127.0.0.1:${mock.server.address().port}`;
  const children = [];
  const sessionKey = () => randomBytes(32).toString('base64');
  let browser;

  try {
    writeFileSync(envFiles[0], [
      `INGRESS_IDENTITY_SECRET=${ingressSecret}`,
      `DB_HOST=${db.host}`, `DB_PORT=${db.port}`, `DB_NAME=${db.name}`,
      `DB_USER=${db.user}`, `DB_PASSWORD=${db.password}`, 'DB_SSL=false'
    ].join('\n'));
    for (const file of envFiles.slice(1)) writeFileSync(file, `BFF_SESSION_ENCRYPTION_KEY=${sessionKey()}\n`);

    const baseEnv = { ...process.env, API_ORIGIN: apiOrigin, NODE_ENV: 'test', SEGALOKA_MARKETPLACE_ORIGIN: MARKETPLACE };
    for (const dashboard of DASHBOARDS) if (!dashboard.login) DASHBOARD_ORIGINS[dashboard.name] = dashboard.origin;
    const marketplace = createMarketplaceStub(mock);
    await new Promise(resolve => marketplace.listen(MARKETPLACE_PORT, '127.0.0.1', resolve));
    children.push({ kill: () => marketplace.close() });

    for (const portal of PORTALS) {
      const bff = start(children, `${portal.role} BFF`, [`apps/${portal.app}/server/bff.mjs`], { cwd: root, env: baseEnv });
      await waitFor(`http://127.0.0.1:${portal.bff}/bff/health`, bff, `${portal.role} BFF`);
      const entry = start(children, `${portal.role} entry`, [`apps/${portal.app}/${portal.entry}`], { cwd: root, env: baseEnv });
      await waitFor(`http://127.0.0.1:${portal.port}/health`, entry, `${portal.role} entry`);
    }

    const travelBff = start(children, 'travel BFF', ['apps/travel-dashboard/server/bff.mjs'], {
      cwd: root,
      env: {
        ...baseEnv,
        SEGALOKA_TEST_DATABASE: 'true',
        BFF_PORT: String(TRAVEL.bff),
        FRONTEND_ORIGIN: `http://127.0.0.1:${TRAVEL.vite}`,
        INGRESS_IDENTITY_SECRET: ingressSecret,
        DB_HOST: db.host, DB_PORT: String(db.port), DB_NAME: db.name,
        DB_USER: db.user, DB_PASSWORD: db.password, DB_SSL: 'false',
        BFF_SESSION_ENCRYPTION_KEY: sessionKey()
      }
    });
    await waitFor(`http://127.0.0.1:${TRAVEL.bff}/bff/health`, travelBff, 'travel BFF');
    const vite = start(children, 'travel vite', [
      'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(TRAVEL.vite), '--strictPort'
    ], {
      cwd: `${root}apps/travel-dashboard`,
      env: { ...baseEnv, TRAVEL_BFF_ORIGIN: `http://127.0.0.1:${TRAVEL.bff}` }
    });
    await waitFor(`http://127.0.0.1:${TRAVEL.vite}/`, vite, 'travel vite');

    const controlBff = start(children, 'control-center BFF', ['apps/control-center/bff.mjs'], {
      cwd: root,
      env: {
        ...baseEnv,
        SEGALOKA_CONTROL_TEST: '1',
        SEGALOKA_BFF_PORT: String(CONTROL.bff),
        CONTROL_TEST_INGRESS_IDENTITY_SECRET: ingressSecret,
        CONTROL_TEST_DB_HOST: db.host, CONTROL_TEST_DB_PORT: String(db.port),
        CONTROL_TEST_DB_NAME: db.name, CONTROL_TEST_DB_USER: db.user,
        CONTROL_TEST_DB_PASSWORD: db.password,
        CONTROL_TEST_BFF_SESSION_ENCRYPTION_KEY: sessionKey()
      }
    });
    await waitFor(`http://127.0.0.1:${CONTROL.bff}/bff/health`, controlBff, 'control-center BFF');
    const controlServer = start(children, 'control-center server', ['apps/control-center/server.mjs'], {
      cwd: root,
      env: {
        ...baseEnv,
        SEGALOKA_CONTROL_CENTER_PORT: String(CONTROL.server),
        SEGALOKA_CONTROL_CENTER_BFF_PORT: String(CONTROL.bff)
      }
    });
    await waitFor(`http://127.0.0.1:${CONTROL.server}/health`, controlServer, 'control-center server');

    browser = await chromium.launch();

    for (const dashboard of DASHBOARDS) {
      await t.test(dashboard.name, async () => {
        const context = await browser.newContext({ locale: 'id-ID', viewport: VIEWPORTS[2] });
        const page = await context.newPage();
        const pageErrors = [];
        const external = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('request', request => {
          const url = new URL(request.url());
          if (url.hostname !== '127.0.0.1') external.push(url.href);
        });
        // Halaman login sendiri hanya untuk Control Center (Super Admin).
        for (const viewport of dashboard.login ? VIEWPORTS : []) {
          await page.setViewportSize(viewport);
          for (const language of LANGUAGES) {
            await page.goto(dashboard.origin + dashboard.loginPath);
            await page.evaluate(lang => localStorage.setItem('sg.lang', JSON.stringify(lang)), language);
            await page.reload();
            await page.waitForLoadState('networkidle');
            const label = `${dashboard.name} login ${viewport.width}px ${language}`;
            assertPage(await pageState(page), label, language);
            if (screenshots) {
              mkdirSync(screenshots, { recursive: true });
              await page.screenshot({ path: `${screenshots}/${dashboard.name}-login-${viewport.width}-${language}.png`, fullPage: true });
            }
          }
        }

        if (dashboard.login) {
          // Control Center: login nyata lewat UI (password + TOTP).
          await page.goto(dashboard.origin + dashboard.loginPath);
          await page.evaluate(() => localStorage.setItem('sg.lang', JSON.stringify('id')));
          await page.goto(dashboard.origin + dashboard.loginPath);
          await dashboard.login(page);
        } else {
          // Tanpa form login dashboard: entry -> handoff -> Marketplace -> callback.
          const handoffUrls = [];
          page.on('request', request => { if (request.url().startsWith(`${MARKETPLACE}/`)) handoffUrls.push(request.url()); });
          await page.goto(dashboard.origin + dashboard.entryPath);
          await page.waitForURL(dashboard.dashboardPattern, { timeout: 30000 });
          assert.equal(handoffUrls.length, 1, `${dashboard.name}: lewat Marketplace`);
          assert.match(handoffUrls[0], new RegExp(`dashboard=${dashboard.name}&challenge=[0-9a-f]{64}$`));
          assert.equal(await page.locator('#sg-email, #email, input[type=password]').count(), 0, `${dashboard.name}: tanpa form login`);
          await page.evaluate(() => localStorage.setItem('sg.lang', JSON.stringify('id')));
        }
        await page.waitForURL(dashboard.dashboardPattern, { timeout: 30000 });
        await page.waitForFunction(dashboard.ready, null, { timeout: 30000 });

        for (const viewport of VIEWPORTS) {
          await page.setViewportSize(viewport);
          for (const language of LANGUAGES) {
            await page.evaluate(lang => localStorage.setItem('sg.lang', JSON.stringify(lang)), language);
            await page.reload();
            await page.waitForFunction(dashboard.ready, null, { timeout: 30000 });
            await page.waitForTimeout(400);
            const label = `${dashboard.name} dashboard ${viewport.width}px ${language}`;
            assertPage(await pageState(page), label, language);
            const runtime = await page.evaluate(() => {
              const before = S.role;
              S.role = 'super_admin';
              S.ux = 'error';
              return { before, after: S.role, ux: S.ux, roleAction: typeof A.role, banners: document.getElementById('banners')?.innerText || '' };
            });
            assert.equal(runtime.after, runtime.before, `${label}: role locked`);
            assert.equal(runtime.before, dashboard.role, `${label}: role`);
            assert.equal(runtime.ux, 'normal', `${label}: ux locked`);
            assert.equal(runtime.roleAction, 'undefined', `${label}: role switch removed`);
            assert.equal(runtime.banners.trim(), '', `${label}: banner`);
            if (screenshots) {
              await page.screenshot({ path: `${screenshots}/${dashboard.name}-dashboard-${viewport.width}-${language}.png` });
            }
          }
        }

        assert.deepEqual(pageErrors, [], `${dashboard.name}: page errors`);
        assert.deepEqual(external, [], `${dashboard.name}: external requests`);
        await context.close();
      });
    }

    assert.deepEqual(mock.unsigned, [], 'semua request ke API harus bertanda tangan ingress');
  } finally {
    if (browser) await browser.close();
    for (const child of children) child.kill();
    for (const file of envFiles) if (existsSync(file)) unlinkSync(file);
    mock.server.close();
  }
});
