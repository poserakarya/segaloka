// E2E realtime Fase B dengan API Fastify asli + PostgreSQL tes terisolasi.
// Tidak ada API tiruan: login, booking, peserta, konfirmasi, outbox, SSE,
// BFF, dan dashboard V7 di Chromium semuanya proses asli.
//
// Wajib Node >= 24 (syarat services/api) dan database tes lokal *_test:
//   SEGALOKA_E2E_DB_HOST=127.0.0.1 SEGALOKA_E2E_DB_PORT=55432 \
//   SEGALOKA_E2E_DB_NAME=segaloka_e2e_test SEGALOKA_E2E_DB_USER=segaloka_test \
//   node --test tests/realtime-e2e.mjs
//
// SEGALOKA_E2E_REPORT=<file.json> menyimpan latensi propagasi yang diukur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { signIngressRequest } from '../services/api/src/security/ingress-identity-v3.js';

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
const nodeMajor = Number(process.versions.node.split('.')[0]);

const API_PORT = 4790;
const API = `http://127.0.0.1:${API_PORT}`;
const PASSWORD = 'kata-sandi-uji-realtime';
const ingressSecret = randomBytes(32).toString('hex');
const run = randomBytes(3).toString('hex');
const PORTALS = {
  agen: { app: 'agen-dashboard', entry: 4216, bff: 4231 },
  mitra: { app: 'mitra-dashboard', entry: 4214, bff: 4241 },
  traveler: { app: 'traveler-portal', entry: 4210, bff: 4251 }
};
const TRAVEL_BFF = 4701;
const CONTROL = { server: 4702, bff: 4703 };
const NO_EVENT_WINDOW_MS = 4000;
const latencies = [];

async function api(method, path, { body, token } = {}) {
  const raw = body === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body));
  const signed = signIngressRequest(ingressSecret, { ip: '127.0.0.1', method, target: path, body: raw });
  const response = await fetch(API + path, {
    method,
    headers: {
      ...signed,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body === undefined ? {} : { body: raw })
  });
  return { status: response.status, data: await response.json().catch(() => ({})) };
}

// Klien SSE minimal di atas fetch (mendukung Last-Event-ID).
function openStream(url, headers = {}) {
  const abort = new AbortController();
  const stream = { events: [], status: null, ready: null, ended: false, waiters: [] };
  const notify = () => {
    stream.waiters = stream.waiters.filter(waiter => !waiter());
  };

  stream.done = (async () => {
    const response = await fetch(url, { headers, signal: abort.signal });
    stream.status = response.status;
    if (!response.ok) {
      stream.ended = true;
      notify();
      return;
    }
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let index;
        while ((index = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          const event = { event: 'message', id: null, data: null, at: Date.now() };
          for (const line of frame.split('\n')) {
            if (line.startsWith('event: ')) event.event = line.slice(7);
            else if (line.startsWith('id: ')) event.id = line.slice(4);
            else if (line.startsWith('data: ')) event.data = JSON.parse(line.slice(6));
          }
          if (event.data === null && event.event === 'message') continue;
          if (event.event === 'ready') stream.ready = event;
          stream.events.push(event);
          notify();
        }
      }
    } catch {
      // Dibatalkan oleh close().
    }
    stream.ended = true;
    notify();
  })();

  stream.waitFor = (predicate, timeout = 8000) => new Promise((resolve, reject) => {
    const check = () => {
      const found = stream.events.find(predicate);
      if (found) { clearTimeout(timer); resolve(found); return true; }
      return false;
    };
    const timer = setTimeout(() => {
      stream.waiters = stream.waiters.filter(w => w !== check);
      reject(new Error(`event not received within ${timeout}ms (${url})`));
    }, timeout);
    if (!check()) stream.waiters.push(check);
  });
  stream.waitReady = (timeout = 8000) => new Promise((resolve, reject) => {
    const check = () => {
      if (stream.ready || stream.ended) { clearTimeout(timer); resolve(stream.ready); return true; }
      return false;
    };
    const timer = setTimeout(() => reject(new Error(`stream not ready (${url}) status=${stream.status}`)), timeout);
    if (!check()) stream.waiters.push(check);
  });
  stream.changes = () => stream.events.filter(event => event.event === 'change');
  stream.close = () => abort.abort();
  trackedStreams.push(stream);
  return stream;
}

const trackedStreams = [];

function apiStream(path, token, lastEventId) {
  const signed = signIngressRequest(ingressSecret, { ip: '127.0.0.1', method: 'GET', target: path, body: Buffer.alloc(0) });
  return openStream(API + path, {
    ...signed,
    Authorization: `Bearer ${token}`,
    ...(lastEventId ? { 'Last-Event-ID': lastEventId } : {})
  });
}

async function waitFor(url, child, label) {
  for (let i = 0; i < 300; i++) {
    if (child && child.exitCode !== null) throw new Error(`${label} exited: ${child.stderrText.slice(-800)}`);
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`${label} not ready`);
}

function start(children, label, args, options) {
  const child = spawn(process.execPath, args, { ...options, stdio: ['ignore', 'ignore', 'pipe'] });
  child.stderrText = '';
  child.stderr.on('data', chunk => { child.stderrText += chunk; });
  children.push(child);
  return child;
}

async function bffLogin(origin, email) {
  const response = await fetch(`${origin}/bff/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email, password: PASSWORD })
  });
  assert.equal(response.status, 200, `BFF login ${email}`);
  return response.headers.get('set-cookie').split(';')[0];
}

test('Fase B realtime: outbox, SSE isolation, rollback, reconnect, cross-dashboard', {
  skip: nodeMajor < 24
    ? `butuh Node >= 24 (sekarang ${process.versions.node})`
    : !configured ? 'database tes (_test, localhost) belum dikonfigurasi'
      : !chromium ? 'playwright tidak tersedia' : false,
  timeout: 600000
}, async t => {
  const envFiles = [
    `${root}services/api/.env`,
    ...Object.values(PORTALS).map(p => `${root}apps/${p.app}/server/.env`)
  ];
  assert.deepEqual(envFiles.filter(file => existsSync(file)), [], 'berkas .env sudah ada; uji dihentikan');

  const { Pool } = createRequire(`${root}services/api/package.json`)('pg');
  const { hashPassword } = await import('../services/api/src/auth/password.js');
  const pool = new Pool({ host: db.host, port: Number(db.port), database: db.name, user: db.user, password: db.password, ssl: false });
  const q = async (sql, params = []) => (await pool.query(sql, params)).rows;
  const children = [];
  let browser;
  const storage = join(tmpdir(), `segaloka-realtime-${run}`);
  mkdirSync(storage, { recursive: true });

  // ---------- Data uji sintetis ----------
  const passwordHash = await hashPassword(PASSWORD);
  const ids = {};
  async function user(label) {
    const email = `${label}.${run}@example.invalid`;
    const [row] = await q(
      `INSERT INTO public.users (email, full_name, email_verified_at, two_factor_enabled)
       VALUES ($1, $2, now(), false) RETURNING id`,
      [email, `Uji ${label}`]
    );
    await q('INSERT INTO public.user_credentials (user_id, password_hash) VALUES ($1, $2)', [row.id, passwordHash]);
    ids[label] = { id: row.id, email };
    return row.id;
  }
  const member = (userId, role, org = null) => q(
    `INSERT INTO public.memberships (user_id, organization_id, role_id)
     SELECT $1, $2, id FROM public.roles WHERE code = $3`,
    [userId, org, role]
  );
  async function organization(label) {
    const [row] = await q(
      `INSERT INTO public.organizations (name, organization_type, status, is_test_data)
       VALUES ($1, 'travel', 'active', false) RETURNING id`,
      [`Travel ${label} ${run}`]
    );
    return row.id;
  }

  const [plan] = await q(
    `INSERT INTO public.subscription_plans (code, name, billing_interval)
     VALUES ($1, 'Paket Realtime', 'monthly') RETURNING id`,
    [`plan-realtime-${run}`]
  );
  await q(
    `INSERT INTO public.plan_entitlements (plan_id, entitlement_id, enabled)
     SELECT $1, id, true FROM public.entitlements WHERE code = 'bookings.manage'`,
    [plan.id]
  );
  const orgA = await organization('A');
  const orgB = await organization('B');
  for (const org of [orgA, orgB]) {
    await q(
      `INSERT INTO public.organization_subscriptions
         (organization_id, plan_id, status, current_period_start, current_period_end)
       VALUES ($1, $2, 'active', now() - interval '1 day', now() + interval '30 days')`,
      [org, plan.id]
    );
  }
  await member(await user('staffa'), 'travel', orgA);
  await member(await user('staffb'), 'travel', orgB);
  for (const [label, role, org, type] of [
    ['agena', 'agen', orgA, 'agent'],
    ['mitraa', 'mitra', orgA, 'partner'],
    ['agenb', 'agen', orgB, 'agent']
  ]) {
    await member(await user(label), role);
    await q(
      `INSERT INTO public.travel_partner_relationships
         (travel_organization_id, partner_user_id, relationship_type, status, approved_by, approved_at)
       VALUES ($1, $2, $3, 'approved', $4, now())`,
      [org, ids[label].id, type, org === orgA ? ids.staffa.id : ids.staffb.id]
    );
  }
  await member(await user('traveler'), 'traveler');
  await member(await user('admin'), 'super_admin');
  const [depA] = await q(
    `INSERT INTO public.travel_departures (travel_organization_id, title, destination, departure_date)
     VALUES ($1, 'Umrah Realtime', 'Makkah', current_date + 45) RETURNING id`,
    [orgA]
  );
  const [depB] = await q(
    `INSERT INTO public.travel_departures (travel_organization_id, title, destination, departure_date)
     VALUES ($1, 'Umrah Travel B', 'Madinah', current_date + 50) RETURNING id`,
    [orgB]
  );

  const outboxCount = async () => Number((await q('SELECT count(*)::int AS n FROM public.sync_outbox'))[0].n);
  const bookingCount = async departureId => Number((await q(
    'SELECT count(*)::int AS n FROM public.travel_bookings WHERE departure_id = $1', [departureId]
  ))[0].n);

  try {
    // ---------- Proses asli ----------
    writeFileSync(envFiles[0], [
      `INGRESS_IDENTITY_SECRET=${ingressSecret}`,
      `DB_HOST=${db.host}`, `DB_PORT=${db.port}`, `DB_NAME=${db.name}`,
      `DB_USER=${db.user}`, `DB_PASSWORD=${db.password}`, 'DB_SSL=false'
    ].join('\n'));
    for (const file of envFiles.slice(1)) {
      writeFileSync(file, `BFF_SESSION_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}\n`);
    }

    const apiProcess = start(children, 'API', ['src/server.js'], {
      cwd: `${root}services/api`,
      env: {
        ...process.env,
        API_HOST: '127.0.0.1',
        API_PORT: String(API_PORT),
        INGRESS_IDENTITY_SECRET: ingressSecret,
        DB_HOST: db.host, DB_PORT: String(db.port), DB_NAME: db.name,
        DB_USER: db.user, DB_PASSWORD: db.password, DB_SSL: 'false',
        AUTH_IP_HASH_SECRET: randomBytes(32).toString('hex'),
        SEGALOKA_PRIVATE_STORAGE_ROOT: storage
      }
    });
    await waitFor(`${API}/health`, apiProcess, 'API');

    const baseEnv = { ...process.env, API_ORIGIN: API, NODE_ENV: 'test' };
    for (const [role, portal] of Object.entries(PORTALS)) {
      const bff = start(children, `${role} BFF`, [`apps/${portal.app}/server/bff.mjs`], { cwd: root, env: baseEnv });
      await waitFor(`http://127.0.0.1:${portal.bff}/bff/health`, bff, `${role} BFF`);
      const entry = start(children, `${role} entry`, [`apps/${portal.app}/server.mjs`], { cwd: root, env: baseEnv });
      await waitFor(`http://127.0.0.1:${portal.entry}/health`, entry, `${role} entry`);
    }
    const sessionKey = () => randomBytes(32).toString('base64');
    const travelBff = start(children, 'travel BFF', ['apps/travel-dashboard/server/bff.mjs'], {
      cwd: root,
      env: {
        ...baseEnv,
        SEGALOKA_TEST_DATABASE: 'true',
        BFF_PORT: String(TRAVEL_BFF),
        FRONTEND_ORIGIN: 'http://127.0.0.1:4700',
        INGRESS_IDENTITY_SECRET: ingressSecret,
        DB_HOST: db.host, DB_PORT: String(db.port), DB_NAME: db.name,
        DB_USER: db.user, DB_PASSWORD: db.password, DB_SSL: 'false',
        BFF_SESSION_ENCRYPTION_KEY: sessionKey()
      }
    });
    await waitFor(`http://127.0.0.1:${TRAVEL_BFF}/bff/health`, travelBff, 'travel BFF');
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
      env: { ...baseEnv, SEGALOKA_CONTROL_CENTER_PORT: String(CONTROL.server), SEGALOKA_CONTROL_CENTER_BFF_PORT: String(CONTROL.bff) }
    });
    await waitFor(`http://127.0.0.1:${CONTROL.server}/health`, controlServer, 'control-center server');

    // ---------- Login API asli (password, tanpa 2FA) ----------
    const tokens = {};
    for (const label of Object.keys(ids)) {
      const login = await api('POST', '/auth/login', { body: { email: ids[label].email, password: PASSWORD } });
      assert.equal(login.status, 200, `login ${label}: ${JSON.stringify(login.data)}`);
      assert.equal(login.data.authenticated, true);
      tokens[label] = login.data.session.accessToken;
    }

    // ---------- Stream SSE API per dashboard ----------
    const streams = {
      travelA: apiStream(`/sync/events?organizationId=${orgA}`, tokens.staffa),
      travelB: apiStream(`/sync/events?organizationId=${orgB}`, tokens.staffb),
      agenA: apiStream('/sync/agen/events', tokens.agena),
      agenB: apiStream('/sync/agen/events', tokens.agenb),
      mitraA: apiStream('/sync/mitra/events', tokens.mitraa),
      traveler: apiStream('/sync/traveler/events', tokens.traveler),
      control: apiStream('/sync/control-center/events', tokens.admin)
    };
    for (const [name, stream] of Object.entries(streams)) {
      await stream.waitReady();
      assert.equal(stream.status, 200, `${name} stream`);
    }

    await t.test('RBAC: stream lain ditolak untuk role/tenant yang salah', async () => {
      const denied = [
        ['/sync/events?organizationId=' + orgA, tokens.staffb],
        ['/sync/agen/events', tokens.mitraa],
        ['/sync/mitra/events', tokens.agena],
        ['/sync/traveler/events', tokens.agena],
        ['/sync/control-center/events', tokens.staffa]
      ];
      for (const [path, token] of denied) {
        const stream = apiStream(path, token);
        await stream.done;
        assert.equal(stream.status, 403, path);
      }
    });

    // ---------- Dashboard V7 di Chromium ----------
    browser = await chromium.launch();
    async function openDashboard(origin, loginPath, email, hash, readyFn, loginFn) {
      const context = await browser.newContext({ locale: 'id-ID', viewport: { width: 1280, height: 860 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + loginPath);
      await loginFn(page, email);
      await page.waitForFunction(readyFn, null, { timeout: 30000 });
      await page.evaluate(h => { location.hash = h; window.__noReloadMarker = 'kept'; }, hash);
      return { page, errors, context };
    }
    const portalLogin = async (page, email) => {
      await page.fill('#sg-email', email);
      await page.fill('#sg-password', PASSWORD);
      await page.click('#sg-submit');
      await page.waitForURL(/\/bff\/ui/, { timeout: 30000 });
    };
    const controlLogin = async (page, email) => {
      await page.fill('#email', email);
      await page.fill('#password', PASSWORD);
      await page.click('#submit');
      await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    };
    const portalReady = () => window.SegalokaPortalRuntime && window.__SEGALOKA_PORTAL_SYNC__?.connected === true;
    const dashboards = {
      agen: await openDashboard(`http://127.0.0.1:${PORTALS.agen.entry}`, '/', ids.agena.email, '#/p/agen/bookings', portalReady, portalLogin),
      mitra: await openDashboard(`http://127.0.0.1:${PORTALS.mitra.entry}`, '/', ids.mitraa.email, '#/p/mitra/bookings', portalReady, portalLogin),
      traveler: await openDashboard(`http://127.0.0.1:${PORTALS.traveler.entry}`, '/', ids.traveler.email, '#/p/traveler/bookings', portalReady, portalLogin),
      control: await openDashboard(`http://127.0.0.1:${CONTROL.server}`, '/login', ids.admin.email, '#/booking',
        () => window.__SEGALOKA_CC_SYNC__?.connected === true, controlLogin)
    };
    const textOf = page => page.evaluate(() => document.getElementById('work')?.innerText || '');
    const waitText = (page, text, timeout = 10000) => page.waitForFunction(
      value => (document.getElementById('work')?.innerText || '').includes(value), text, { timeout }
    );

    // Travel BFF stream (login asli lewat BFF Travel).
    const travelCookie = await bffLogin(`http://127.0.0.1:${TRAVEL_BFF}`, ids.staffa.email)
      .catch(async () => {
        const response = await fetch(`http://127.0.0.1:${TRAVEL_BFF}/bff/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:4700' },
          body: JSON.stringify({ email: ids.staffa.email, password: PASSWORD })
        });
        assert.equal(response.status, 200, 'travel BFF login');
        return response.headers.get('set-cookie').split(';')[0];
      });
    const travelBffStream = openStream(`http://127.0.0.1:${TRAVEL_BFF}/bff/sync/events?organizationId=${orgA}`, { cookie: travelCookie });
    await travelBffStream.waitReady();
    assert.equal(travelBffStream.status, 200, 'travel BFF stream');

    let bookingA;
    let uiShown;

    await t.test('booking Agen A: event di transaksi yang sama, diterima hanya oleh pihak berwenang', async () => {
      const before = await outboxCount();
      const sentAt = Date.now();
      const created = await api('POST', '/travel/bookings', { body: { departureId: depA.id }, token: tokens.agena });
      assert.equal(created.status, 201, JSON.stringify(created.data));
      bookingA = created.data.booking;
      // Latensi UI diukur sejak POST, paralel dengan pemeriksaan stream.
      uiShown = Promise.all(['agen', 'control'].map(async name => {
        await waitText(dashboards[name].page, bookingA.booking_number, 15000);
        latencies.push({ scenario: 'booking.created', stream: `${name}-dashboard-ui`, ms: Date.now() - sentAt });
      }));

      // Tersimpan di PostgreSQL: booking + audit + outbox.
      const [stored] = await q('SELECT id, booking_user_id, booking_number, status FROM public.travel_bookings WHERE id = $1', [bookingA.id]);
      assert.equal(stored.booking_user_id, ids.agena.id);
      const [event] = await q(
        `SELECT organization_id, event_type, entity_type, entity_id, payload
         FROM public.sync_outbox WHERE entity_id = $1`, [bookingA.id]
      );
      assert.deepEqual(
        { org: event.organization_id, type: event.event_type, entity: event.entity_type },
        { org: orgA, type: 'travel.booking.created', entity: 'travel_booking' }
      );
      assert.equal(event.payload.bookingId, bookingA.id);
      assert.equal(await outboxCount(), before + 1);

      for (const name of ['travelA', 'agenA', 'control']) {
        const received = await streams[name].waitFor(e => e.event === 'change' && e.data.entityId === bookingA.id, 8000);
        latencies.push({ scenario: 'booking.created', stream: name, ms: received.at - sentAt });
      }
      const viaBff = await travelBffStream.waitFor(e => e.event === 'change' && e.data.entityId === bookingA.id, 8000);
      latencies.push({ scenario: 'booking.created', stream: 'travelA-via-BFF', ms: viaBff.at - sentAt });

      await new Promise(resolve => setTimeout(resolve, NO_EVENT_WINDOW_MS));
      for (const name of ['travelB', 'agenB', 'mitraA', 'traveler']) {
        assert.ok(!streams[name].changes().some(e => e.data.entityId === bookingA.id), `${name} must not receive`);
      }
    });

    await t.test('dashboard Agen dan Control Center menampilkan booking tanpa reload; Mitra tidak', async () => {
      await uiShown;
      for (const dashboard of ['agen', 'control']) {
        assert.equal(await dashboards[dashboard].page.evaluate(() => window.__noReloadMarker), 'kept', `${dashboard} reloaded`);
      }
      assert.ok(!(await textOf(dashboards.mitra.page)).includes(bookingA.booking_number));
      assert.ok(!(await textOf(dashboards.traveler.page)).includes(bookingA.booking_number));
    });

    await t.test('peserta (Traveler) dan konfirmasi menyebar ke pihak terkait saja', async () => {
      const sentAt = Date.now();
      const travelerUi = waitText(dashboards.traveler.page, 'Umrah Realtime', 15000).then(() => {
        latencies.push({ scenario: 'participant.added', stream: 'traveler-dashboard-ui', ms: Date.now() - sentAt });
      });
      const participant = await api('POST', `/travel/bookings/${bookingA.id}/participants`, {
        body: { fullName: 'Peserta Realtime', userId: ids.traveler.id },
        token: tokens.staffa
      });
      assert.equal(participant.status, 201, JSON.stringify(participant.data));
      for (const name of ['travelA', 'agenA', 'control', 'traveler']) {
        const received = await streams[name].waitFor(e => e.event === 'change' && e.data.entityId === participant.data.participant.id, 8000);
        latencies.push({ scenario: 'participant.added', stream: name, ms: received.at - sentAt });
      }
      await travelerUi;
      await waitText(dashboards.traveler.page, bookingA.booking_number);
      await waitText(dashboards.agen.page, 'Peserta Realtime');
      assert.equal(await dashboards.traveler.page.evaluate(() => window.__noReloadMarker), 'kept');

      const confirmedAt = Date.now();
      const confirmed = await api('POST', `/travel/bookings/${bookingA.id}/confirm`, { token: tokens.staffa });
      assert.equal(confirmed.status, 200, JSON.stringify(confirmed.data));
      for (const name of ['travelA', 'agenA', 'control', 'traveler']) {
        const received = await streams[name].waitFor(
          e => e.event === 'change' && e.data.eventType === 'travel.booking.confirmed' && e.data.entityId === bookingA.id, 8000
        );
        latencies.push({ scenario: 'booking.confirmed', stream: name, ms: received.at - confirmedAt });
      }
      const [row] = await q('SELECT status FROM public.travel_bookings WHERE id = $1', [bookingA.id]);
      assert.equal(row.status, 'confirmed');

      await new Promise(resolve => setTimeout(resolve, NO_EVENT_WINDOW_MS));
      for (const name of ['travelB', 'agenB', 'mitraA']) {
        assert.ok(!streams[name].changes().length, `${name} must not receive any booking event`);
      }
    });

    await t.test('transaksi gagal atau dibatalkan tidak menghasilkan event', async () => {
      // Ditolak otorisasi: Agen B ke Travel A.
      let before = await outboxCount();
      const denied = await api('POST', '/travel/bookings', { body: { departureId: depA.id }, token: tokens.agenb });
      assert.equal(denied.status, 403);
      assert.equal(await outboxCount(), before);

      // Insert outbox gagal setelah booking ditulis -> ROLLBACK keduanya.
      before = await outboxCount();
      const bookingsBefore = await bookingCount(depA.id);
      await q(`ALTER TABLE public.sync_outbox ADD CONSTRAINT e2e_block_booking_created
               CHECK (event_type <> 'travel.booking.created') NOT VALID`);
      try {
        const failed = await api('POST', '/travel/bookings', { body: { departureId: depA.id }, token: tokens.staffa });
        assert.equal(failed.status, 500);
      } finally {
        await q('ALTER TABLE public.sync_outbox DROP CONSTRAINT IF EXISTS e2e_block_booking_created');
      }
      assert.equal(await bookingCount(depA.id), bookingsBefore, 'booking must be rolled back');
      assert.equal(await outboxCount(), before, 'event must be rolled back');
    });

    await t.test('reconnect dengan Last-Event-ID dan ?after tidak melewatkan event', async () => {
      const lastSeen = streams.agenA.changes().at(-1).id;
      streams.agenA.close();
      const missed = await api('POST', '/travel/bookings', { body: { departureId: depA.id }, token: tokens.agena });
      assert.equal(missed.status, 201);

      const resumed = apiStream('/sync/agen/events', tokens.agena, lastSeen);
      const replay = await resumed.waitFor(e => e.event === 'change' && e.data.entityId === missed.data.booking.id, 8000);
      assert.ok(BigInt(replay.id) > BigInt(lastSeen));
      resumed.close();

      // Lewat BFF Agen dengan ?after (dipakai runtime V7 setelah putus).
      const agenCookie = await bffLogin(`http://127.0.0.1:${PORTALS.agen.entry}`, ids.agena.email);
      const viaBff = openStream(`http://127.0.0.1:${PORTALS.agen.entry}/bff/sync/events?after=${lastSeen}`, { cookie: agenCookie });
      await viaBff.waitFor(e => e.event === 'change' && e.data.entityId === missed.data.booking.id, 8000);
      viaBff.close();

      // Dashboard yang tetap terbuka juga menerima booking ini tanpa reload.
      await waitText(dashboards.agen.page, missed.data.booking.booking_number);
    });

    await t.test('sesi dicabut: stream ditutup dengan auth.expired', async () => {
      await q('UPDATE public.auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [ids.mitraa.id]);
      const expired = await streams.mitraA.waitFor(e => e.event === 'auth.expired', 15000);
      assert.equal(expired.data.code, 'INVALID_SESSION');
    });

    for (const [name, dashboard] of Object.entries(dashboards)) {
      assert.deepEqual(dashboard.errors, [], `${name} page errors`);
    }
  } finally {
    if (process.env.SEGALOKA_E2E_REPORT) {
      writeFileSync(process.env.SEGALOKA_E2E_REPORT, JSON.stringify({ node: process.versions.node, latencies }, null, 2));
    }
    for (const stream of trackedStreams) stream.close();
    if (browser) await browser.close();
    for (const child of children) child.kill();
    for (const file of envFiles) if (existsSync(file)) unlinkSync(file);
    await pool.end();
  }
});
