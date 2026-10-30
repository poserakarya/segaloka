// E2E realtime Fase B tahap 2 dengan API Fastify asli + PostgreSQL tes
// terisolasi: daftar booking Travel per organisasi, referral Affiliate, dan
// halaman Control Center yang dimuat ulang oleh SSE. Tidak ada API tiruan.
//
// Wajib Node >= 24 dan database tes lokal *_test:
//   SEGALOKA_E2E_DB_HOST=127.0.0.1 SEGALOKA_E2E_DB_PORT=55432 \
//   SEGALOKA_E2E_DB_NAME=segaloka_e2e_test SEGALOKA_E2E_DB_USER=segaloka_test \
//   node --test tests/realtime-stage2-e2e.mjs
//
// SEGALOKA_E2E_REPORT=<file.json> menyimpan latensi yang diukur.
// SEGALOKA_E2E_SCREENSHOTS=<dir> menyimpan tangkapan layar dashboard.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRealtimeHarness, sleep } from './support/realtime-harness.mjs';

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

const API_PORT = 4890;
const API = `http://127.0.0.1:${API_PORT}`;
const PASSWORD = 'kata-sandi-uji-realtime-2';
const ingressSecret = randomBytes(32).toString('hex');
const run = randomBytes(3).toString('hex');
const TRAVEL = { vite: 4800, bff: 4801 };
const CONTROL = { server: 4802, bff: 4803 };
const AFFILIATE = { app: 'affiliate-dashboard', entry: 4212, bff: 4221 };
const NO_EVENT_WINDOW_MS = 4000;
const screenshots = process.env.SEGALOKA_E2E_SCREENSHOTS || null;
const latencies = [];

test('Fase B tahap 2: Travel bookings, Affiliate referral, Control Center realtime', {
  skip: nodeMajor < 24
    ? `butuh Node >= 24 (sekarang ${process.versions.node})`
    : !configured ? 'database tes (_test, localhost) belum dikonfigurasi'
      : !chromium ? 'playwright tidak tersedia' : false,
  timeout: 600000
}, async t => {
  const envFiles = [
    `${root}services/api/.env`,
    `${root}apps/${AFFILIATE.app}/server/.env`
  ];
  assert.deepEqual(envFiles.filter(file => existsSync(file)), [], 'berkas .env sudah ada; uji dihentikan');

  const { Pool } = createRequire(`${root}services/api/package.json`)('pg');
  const { hashPassword } = await import('../services/api/src/auth/password.js');
  const pool = new Pool({ host: db.host, port: Number(db.port), database: db.name, user: db.user, password: db.password, ssl: false });
  const q = async (sql, params = []) => (await pool.query(sql, params)).rows;
  const h = createRealtimeHarness({ apiOrigin: API, ingressSecret });
  let browser;
  const storage = join(tmpdir(), `segaloka-realtime2-${run}`);
  mkdirSync(storage, { recursive: true });
  if (screenshots) mkdirSync(screenshots, { recursive: true });

  // ---------- Data uji sintetis ----------
  const passwordHash = await hashPassword(PASSWORD);
  const ids = {};
  async function user(label) {
    const email = `${label}.s2.${run}@example.invalid`;
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
     VALUES ($1, 'Paket Realtime 2', 'monthly') RETURNING id`,
    [`plan-realtime2-${run}`]
  );
  await q(
    `INSERT INTO public.plan_entitlements (plan_id, entitlement_id, enabled)
     SELECT $1, id, true FROM public.entitlements WHERE code = 'bookings.manage'`,
    [plan.id]
  );
  const [planNoBookings] = await q(
    `INSERT INTO public.subscription_plans (code, name, billing_interval)
     VALUES ($1, 'Paket Tanpa Booking', 'monthly') RETURNING id`,
    [`plan-nobooking-${run}`]
  );
  const orgA = await organization('A');
  const orgB = await organization('B');
  const orgC = await organization('C');
  for (const [org, planId] of [[orgA, plan.id], [orgB, plan.id], [orgC, planNoBookings.id]]) {
    await q(
      `INSERT INTO public.organization_subscriptions
         (organization_id, plan_id, status, current_period_start, current_period_end)
       VALUES ($1, $2, 'active', now() - interval '1 day', now() + interval '30 days')`,
      [org, planId]
    );
  }
  await member(await user('staffa'), 'travel', orgA);
  await member(await user('staffb'), 'travel', orgB);
  await member(await user('staffc'), 'travel', orgC);
  await member(await user('agena'), 'agen');
  await q(
    `INSERT INTO public.travel_partner_relationships
       (travel_organization_id, partner_user_id, relationship_type, status, approved_by, approved_at)
     VALUES ($1, $2, 'agent', 'approved', $3, now())`,
    [orgA, ids.agena.id, ids.staffa.id]
  );
  await member(await user('affa'), 'affiliate');
  await member(await user('affb'), 'affiliate');
  await member(await user('admin'), 'super_admin');
  const [depA] = await q(
    `INSERT INTO public.travel_departures (travel_organization_id, title, destination, departure_date)
     VALUES ($1, 'Umrah Tahap Dua', 'Makkah', current_date + 40) RETURNING id`,
    [orgA]
  );
  const [depB] = await q(
    `INSERT INTO public.travel_departures (travel_organization_id, title, destination, departure_date)
     VALUES ($1, 'Umrah Travel B Dua', 'Madinah', current_date + 55) RETURNING id`,
    [orgB]
  );

  const outboxCount = async () => Number((await q('SELECT count(*)::int AS n FROM public.sync_outbox'))[0].n);
  const count = async (sql, params) => Number((await q(sql, params))[0].n);

  try {
    // ---------- Proses asli ----------
    writeFileSync(envFiles[0], [
      `INGRESS_IDENTITY_SECRET=${ingressSecret}`,
      `DB_HOST=${db.host}`, `DB_PORT=${db.port}`, `DB_NAME=${db.name}`,
      `DB_USER=${db.user}`, `DB_PASSWORD=${db.password}`, 'DB_SSL=false'
    ].join('\n'));
    writeFileSync(envFiles[1], `BFF_SESSION_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}\n`);

    const apiProcess = h.start('API', ['src/server.js'], {
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
    await h.waitHttp(`${API}/health`, apiProcess, 'API');

    const baseEnv = { ...process.env, API_ORIGIN: API, NODE_ENV: 'test' };
    const affBff = h.start('affiliate BFF', [`apps/${AFFILIATE.app}/server/bff.mjs`], { cwd: root, env: baseEnv });
    await h.waitHttp(`http://127.0.0.1:${AFFILIATE.bff}/bff/health`, affBff, 'affiliate BFF');
    const affEntry = h.start('affiliate entry', [`apps/${AFFILIATE.app}/server.mjs`], { cwd: root, env: baseEnv });
    await h.waitHttp(`http://127.0.0.1:${AFFILIATE.entry}/health`, affEntry, 'affiliate entry');

    const sessionKey = () => randomBytes(32).toString('base64');
    const travelBff = h.start('travel BFF', ['apps/travel-dashboard/server/bff.mjs'], {
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
    await h.waitHttp(`http://127.0.0.1:${TRAVEL.bff}/bff/health`, travelBff, 'travel BFF');
    const vite = h.start('travel vite', [
      'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(TRAVEL.vite), '--strictPort'
    ], {
      cwd: `${root}apps/travel-dashboard`,
      env: { ...baseEnv, TRAVEL_BFF_ORIGIN: `http://127.0.0.1:${TRAVEL.bff}` }
    });
    await h.waitHttp(`http://127.0.0.1:${TRAVEL.vite}/`, vite, 'travel vite');
    const controlBff = h.start('control-center BFF', ['apps/control-center/bff.mjs'], {
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
    await h.waitHttp(`http://127.0.0.1:${CONTROL.bff}/bff/health`, controlBff, 'control-center BFF');
    const controlServer = h.start('control-center server', ['apps/control-center/server.mjs'], {
      cwd: root,
      env: { ...baseEnv, SEGALOKA_CONTROL_CENTER_PORT: String(CONTROL.server), SEGALOKA_CONTROL_CENTER_BFF_PORT: String(CONTROL.bff) }
    });
    await h.waitHttp(`http://127.0.0.1:${CONTROL.server}/health`, controlServer, 'control-center server');

    // ---------- Login API asli ----------
    const tokens = {};
    for (const label of Object.keys(ids)) {
      const login = await h.api('POST', '/auth/login', { body: { email: ids[label].email, password: PASSWORD } });
      assert.equal(login.status, 200, `login ${label}: ${JSON.stringify(login.data)}`);
      tokens[label] = login.data.session.accessToken;
    }

    // Booking awal di kedua tenant (lewat API asli).
    const seeded = {};
    for (const [name, departureId, token] of [['A', depA.id, tokens.agena], ['B', depB.id, tokens.staffb]]) {
      const created = await h.api('POST', '/travel/bookings', { body: { departureId }, token });
      assert.equal(created.status, 201, `seed booking ${name}: ${JSON.stringify(created.data)}`);
      seeded[name] = created.data.booking;
    }

    await t.test('GET /travel/bookings: RBAC, entitlement, dan isolasi tenant', async () => {
      const list = (org, token) => h.api('GET', `/travel/bookings?organizationId=${org}`, { token });
      const a = await list(orgA, tokens.staffa);
      assert.equal(a.status, 200, JSON.stringify(a.data));
      const numbersA = a.data.bookings.map(b => b.bookingNumber);
      assert.ok(numbersA.includes(seeded.A.booking_number));
      assert.ok(!numbersA.includes(seeded.B.booking_number), 'booking Travel B bocor ke Travel A');
      assert.ok(a.data.bookings.every(b => b.departure.id === depA.id));

      const b = await list(orgB, tokens.staffb);
      assert.equal(b.status, 200);
      assert.deepEqual(b.data.bookings.map(x => x.bookingNumber), [seeded.B.booking_number]);

      assert.equal((await list(orgA, tokens.staffb)).status, 403, 'Travel B membaca Travel A');
      assert.equal((await list(orgA, tokens.agena)).status, 403, 'Agen membaca daftar Travel');
      assert.equal((await list(orgA, tokens.affa)).status, 403, 'Affiliate membaca daftar Travel');
      const noEntitlement = await list(orgC, tokens.staffc);
      assert.equal(noEntitlement.status, 403);
      assert.equal(noEntitlement.data.code, 'BOOKINGS_MANAGE_REQUIRED');
      assert.equal((await list('bukan-uuid', tokens.staffa)).status, 400);
      assert.equal((await h.api('GET', `/travel/bookings?organizationId=${orgA}`)).status, 401);
    });

    // ---------- Dashboard di Chromium ----------
    browser = await chromium.launch();
    async function contextPage(viewport = { width: 1280, height: 860 }) {
      const context = await browser.newContext({ locale: 'id-ID', viewport });
      const page = await context.newPage();
      const errors = [];
      const consoleErrors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      return { context, page, errors, consoleErrors };
    }
    const textOf = page => page.evaluate(() => document.getElementById('work')?.innerText || '');
    const waitText = (page, text, timeout = 12000) => page.waitForFunction(
      value => (document.getElementById('work')?.innerText || '').includes(value), text, { timeout }
    );
    const marker = page => page.evaluate(() => window.__noReloadMarker);
    const shot = async (page, name) => {
      if (screenshots) await page.screenshot({ path: join(screenshots, `${name}.png`), fullPage: false });
    };

    async function openTravel(email) {
      const view = await contextPage();
      const vite = `http://127.0.0.1:${TRAVEL.vite}`;
      const cookie = await h.bffLogin(vite, email, PASSWORD);
      const [name, value] = cookie.split('=');
      await view.context.addCookies([{ name, value, url: `${vite}/bff/` }]);
      await view.page.goto(`${vite}/bff/dashboard#/p/travel/bookings`);
      await view.page.waitForFunction(() => window.SegalokaTravelRuntime && document.querySelector('#side'), null, { timeout: 30000 });
      await view.page.evaluate(() => { window.__noReloadMarker = 'kept'; });
      return view;
    }
    async function openAffiliate(email) {
      const view = await contextPage();
      const origin = `http://127.0.0.1:${AFFILIATE.entry}`;
      await view.page.goto(origin + '/');
      await view.page.fill('#sg-email', email);
      await view.page.fill('#sg-password', PASSWORD);
      await view.page.click('#sg-submit');
      await view.page.waitForURL(/\/bff\/ui/, { timeout: 30000 });
      await view.page.waitForFunction(
        () => window.SegalokaPortalRuntime && window.__SEGALOKA_PORTAL_SYNC__?.connected === true, null, { timeout: 30000 }
      ).catch(async error => {
        const state = await view.page.evaluate(() => JSON.stringify({ sync: window.__SEGALOKA_PORTAL_SYNC__, runtime: !!window.SegalokaPortalRuntime, url: location.href }));
        throw new Error(`affiliate tidak tersambung: ${state} console=${JSON.stringify(view.consoleErrors)} errors=${JSON.stringify(view.errors)}`, { cause: error });
      });
      await view.page.evaluate(() => { location.hash = '#/p/affiliate/links'; window.__noReloadMarker = 'kept'; });
      return view;
    }
    async function openControl() {
      const view = await contextPage();
      await view.page.goto(`http://127.0.0.1:${CONTROL.server}/login`);
      await view.page.fill('#email', ids.admin.email);
      await view.page.fill('#password', PASSWORD);
      await view.page.click('#submit');
      await view.page.waitForURL(/\/dashboard/, { timeout: 30000 });
      await view.page.waitForFunction(() => window.__SEGALOKA_CC_SYNC__?.connected === true, null, { timeout: 30000 });
      await view.page.evaluate(() => { window.__noReloadMarker = 'kept'; });
      return view;
    }

    const travelA = await openTravel(ids.staffa.email);
    const travelB = await openTravel(ids.staffb.email);
    await waitText(travelA.page, seeded.A.booking_number, 15000);
    await waitText(travelB.page, seeded.B.booking_number, 15000);
    // Beri waktu EventSource Travel tersambung sebelum perubahan dibuat.
    await sleep(2000);

    await t.test('Travel V7: booking baru tampil tanpa reload hanya di Travel A', async () => {
      assert.ok(!(await textOf(travelA.page)).includes(seeded.B.booking_number), 'Travel A menampilkan booking B');
      assert.ok(!(await textOf(travelB.page)).includes(seeded.A.booking_number), 'Travel B menampilkan booking A');
      await shot(travelA.page, 'travel-bookings-before');

      const sentAt = Date.now();
      const created = await h.api('POST', '/travel/bookings', { body: { departureId: depA.id }, token: tokens.agena });
      assert.equal(created.status, 201);
      const number = created.data.booking.booking_number;
      await waitText(travelA.page, number, 15000);
      latencies.push({ scenario: 'booking.created', stream: 'travel-dashboard-ui', ms: Date.now() - sentAt });
      assert.equal(await marker(travelA.page), 'kept', 'Travel A reload');
      await shot(travelA.page, 'travel-bookings-after');

      await sleep(NO_EVENT_WINDOW_MS);
      assert.ok(!(await textOf(travelB.page)).includes(number), 'Travel B menerima booking A');
      assert.equal(await marker(travelB.page), 'kept');

      // BFF Travel menolak organisasi lain walaupun sesi valid.
      const cookieB = await h.bffLogin(`http://127.0.0.1:${TRAVEL.vite}`, ids.staffb.email, PASSWORD);
      const cross = await fetch(`http://127.0.0.1:${TRAVEL.bff}/bff/bookings?organizationId=${orgA}`, { headers: { cookie: cookieB } });
      assert.equal(cross.status, 403);
      const own = await fetch(`http://127.0.0.1:${TRAVEL.bff}/bff/bookings?organizationId=${orgB}`, { headers: { cookie: cookieB } });
      assert.equal(own.status, 200);
      assert.ok(!JSON.stringify(await own.json()).includes(number));
    });

    const affA = await openAffiliate(ids.affa.email);
    const affB = await openAffiliate(ids.affb.email);
    const streams = {
      affA: h.apiStream('/sync/affiliate/events', tokens.affa),
      affB: h.apiStream('/sync/affiliate/events', tokens.affb)
    };
    for (const stream of Object.values(streams)) {
      await stream.waitReady();
      assert.equal(stream.status, 200);
    }
    let link;

    await t.test('Affiliate: referral A tampil tanpa reload; B tidak menerima', async () => {
      const deniedStream = h.apiStream('/sync/affiliate/events', tokens.staffa);
      await deniedStream.done;
      assert.equal(deniedStream.status, 403, 'Travel membuka stream Affiliate');

      const sentAt = Date.now();
      const created = await h.api('POST', '/affiliate/referral-links', { body: { travelOrganizationId: orgA }, token: tokens.affa });
      assert.equal(created.status, 201, JSON.stringify(created.data));
      link = created.data.link;
      const [event] = await q(
        `SELECT event_type, entity_type, payload FROM public.sync_outbox WHERE entity_id = $1`, [link.id]
      );
      assert.equal(event.event_type, 'affiliate.referral_link.created');
      assert.equal(event.payload.affiliateUserId, ids.affa.id);

      const received = await streams.affA.waitFor(e => e.event === 'change' && e.data.entityId === link.id);
      latencies.push({ scenario: 'referral.created', stream: 'affiliateA', ms: received.at - sentAt });
      await waitText(affA.page, link.referralCode, 15000);
      latencies.push({ scenario: 'referral.created', stream: 'affiliate-dashboard-ui', ms: Date.now() - sentAt });
      await waitText(affA.page, `Travel A ${run}`);
      assert.equal(await marker(affA.page), 'kept');
      await shot(affA.page, 'affiliate-links');

      await sleep(NO_EVENT_WINDOW_MS);
      assert.ok(!streams.affB.changes().some(e => e.data.entityId === link.id), 'Affiliate B menerima event A');
      assert.ok(!(await textOf(affB.page)).includes(link.referralCode), 'Affiliate B menampilkan referral A');
      const listB = await h.api('GET', '/affiliate/referral-links', { token: tokens.affb });
      assert.deepEqual(listB.data.items, []);
      const patchB = await h.api('PATCH', `/affiliate/referral-links/${link.id}`, { body: { status: 'paused' }, token: tokens.affb });
      assert.notEqual(patchB.status, 200, 'Affiliate B mengubah referral A');
      assert.equal((await q('SELECT status FROM public.affiliate_referral_links WHERE id = $1', [link.id]))[0].status, 'active');
      // Tidak ada data simulasi: klik/konversi tidak tersedia di API.
      assert.ok(!(await textOf(affA.page)).match(/NaN|undefined/));
    });

    await t.test('Affiliate: tombol status V7 menulis ke API lalu UI dimuat ulang', async () => {
      const toggle = affA.page.locator(`[data-act="al-toggle"][data-id="${link.id}"]`);
      assert.equal(await toggle.count(), 1, 'tombol al-toggle referral A');
      await toggle.click();
      await streams.affA.waitFor(e => e.event === 'change' && e.data.eventType === 'affiliate.referral_link.paused');
      for (let i = 0; i < 50; i++) {
        if ((await q('SELECT status FROM public.affiliate_referral_links WHERE id = $1', [link.id]))[0].status === 'paused') break;
        await sleep(100);
      }
      assert.equal((await q('SELECT status FROM public.affiliate_referral_links WHERE id = $1', [link.id]))[0].status, 'paused');
      // REFLINKS adalah variabel global V7 (deklarasi let, bukan properti window).
      await affA.page.waitForFunction(id => REFLINKS.find(r => r.id === id)?.state === 'paused', link.id, { timeout: 10000 });
      assert.equal(await marker(affA.page), 'kept');
    });

    await t.test('Affiliate: rollback dan reconnect ?after lewat BFF', async () => {
      const before = await outboxCount();
      const linksBefore = await count('SELECT count(*)::int AS n FROM public.affiliate_referral_links WHERE affiliate_user_id = $1', [ids.affb.id]);
      await q(`ALTER TABLE public.sync_outbox ADD CONSTRAINT e2e_block_referral
               CHECK (entity_type <> 'affiliate_referral_link') NOT VALID`);
      try {
        const failed = await h.api('POST', '/affiliate/referral-links', { body: { travelOrganizationId: orgB }, token: tokens.affb });
        assert.equal(failed.status, 500);
      } finally {
        await q('ALTER TABLE public.sync_outbox DROP CONSTRAINT IF EXISTS e2e_block_referral');
      }
      assert.equal(await count('SELECT count(*)::int AS n FROM public.affiliate_referral_links WHERE affiliate_user_id = $1', [ids.affb.id]), linksBefore);
      assert.equal(await outboxCount(), before);

      const lastSeen = streams.affA.changes().at(-1).id;
      const resumed = await h.api('PATCH', `/affiliate/referral-links/${link.id}`, { body: { status: 'active' }, token: tokens.affa });
      assert.equal(resumed.status, 200, JSON.stringify(resumed.data));
      const cookie = await h.bffLogin(`http://127.0.0.1:${AFFILIATE.entry}`, ids.affa.email, PASSWORD);
      const viaBff = h.openStream(`http://127.0.0.1:${AFFILIATE.entry}/bff/sync/affiliate/events?after=${lastSeen}`, { cookie });
      const replay = await viaBff.waitFor(e => e.event === 'change' && e.data.eventType === 'affiliate.referral_link.active');
      assert.ok(BigInt(replay.id) > BigInt(lastSeen));
      viaBff.close();
      const cookieB = await h.bffLogin(`http://127.0.0.1:${AFFILIATE.entry}`, ids.affb.email, PASSWORD);
      const viaBffB = h.openStream(`http://127.0.0.1:${AFFILIATE.entry}/bff/sync/affiliate/events?after=0`, { cookie: cookieB });
      await viaBffB.waitReady();
      await sleep(2500);
      assert.ok(!viaBffB.changes().some(e => e.data.entityId === link.id), 'replay B memuat event A');
      viaBffB.close();
    });

    const control = await openControl();
    const controlStream = h.apiStream('/sync/control-center/events', tokens.admin);
    await controlStream.waitReady();

    await t.test('Control Center: halaman cabang dan audit dimuat ulang oleh SSE', async () => {
      await control.page.evaluate(() => { location.hash = '#/travel/branches'; });
      await control.page.waitForFunction(() => document.getElementById('cc-branches-q'), null, { timeout: 15000 }).catch(async error => {
        const state = await control.page.evaluate(() => location.href + ' :: ' + (document.getElementById('work')?.innerText || document.body.innerText).slice(0, 600));
        throw new Error('halaman Control Center: ' + state + ' console=' + JSON.stringify(control.consoleErrors), { cause: error });
      });
      await sleep(1000);
      const code = `CB${run}`.toUpperCase().slice(0, 12);
      const sentAt = Date.now();
      const branch = await h.api('POST', `/control-center/travels/${orgA}/branches`, {
        body: { branchCode: code, branchName: `Cabang Realtime ${run}`, status: 'active' },
        token: tokens.admin
      });
      assert.equal(branch.status, 201, JSON.stringify(branch.data));
      const branchId = branch.data.branch?.id || branch.data.id;
      const received = await controlStream.waitFor(e => e.event === 'change' && e.data.eventType === 'travel.branch.created');
      latencies.push({ scenario: 'branch.created', stream: 'control-center', ms: received.at - sentAt });
      await waitText(control.page, `Cabang Realtime ${run}`, 15000).catch(async error => {
        const state = await control.page.evaluate(() => JSON.stringify({ sync: window.__SEGALOKA_CC_SYNC__, href: location.href, text: (document.getElementById('work')?.innerText || '').slice(0, 900) }));
        throw new Error('halaman Control Center: ' + state + ' console=' + JSON.stringify(control.consoleErrors), { cause: error });
      });
      latencies.push({ scenario: 'branch.created', stream: 'control-center-ui', ms: Date.now() - sentAt });
      assert.equal(await control.page.evaluate(() => window.__SEGALOKA_CC_SYNC__.lastReloadPath), '/travel/branches');
      assert.equal(await marker(control.page), 'kept');
      await shot(control.page, 'control-center-branches');

      // Travel A tidak menerima event cabang (stream Travel hanya booking/keberangkatan).
      assert.ok(!(await textOf(travelB.page)).includes(`Cabang Realtime ${run}`));

      // Audit: booking baru memicu muat ulang halaman audit.
      await control.page.evaluate(() => { location.hash = '#/compliance/audit'; });
      await control.page.waitForFunction(() => document.getElementById('cc-audit-q'), null, { timeout: 15000 });
      const reloadsBefore = await control.page.evaluate(() => window.__SEGALOKA_CC_SYNC__.reloads);
      const status = await h.api('PATCH', `/control-center/travel-branches/${branchId}`, {
        body: { status: 'inactive' }, token: tokens.admin
      });
      assert.ok([200, 204].includes(status.status), JSON.stringify(status.data));
      await controlStream.waitFor(e => e.event === 'change' && e.data.eventType === 'travel.branch.status_changed');
      await control.page.waitForFunction(
        before => window.__SEGALOKA_CC_SYNC__.reloads > before &&
          window.__SEGALOKA_CC_SYNC__.lastReloadPath === '/compliance/audit', reloadsBefore, { timeout: 10000 }
      );
      await control.page.waitForFunction(id => JSON.stringify(CC_AUDIT_API).includes(id), branchId, { timeout: 10000 });
      assert.equal(await marker(control.page), 'kept');
      await shot(control.page, 'control-center-audit');

      // Rollback: event cabang gagal -> cabang tidak tersimpan.
      const before = await outboxCount();
      await q(`ALTER TABLE public.sync_outbox ADD CONSTRAINT e2e_block_branch
               CHECK (event_type <> 'travel.branch.created') NOT VALID`);
      try {
        const failed = await h.api('POST', `/control-center/travels/${orgB}/branches`, {
          body: { branchCode: `RB${run}`.toUpperCase(), branchName: 'Cabang Gagal', status: 'active' },
          token: tokens.admin
        });
        assert.equal(failed.status, 500);
      } finally {
        await q('ALTER TABLE public.sync_outbox DROP CONSTRAINT IF EXISTS e2e_block_branch');
      }
      assert.equal(await count(`SELECT count(*)::int AS n FROM public.travel_branches WHERE branch_name = 'Cabang Gagal'`, []), 0);
      assert.equal(await outboxCount(), before);

      // Non-admin tidak dapat membuat cabang.
      const denied = await h.api('POST', `/control-center/travels/${orgA}/branches`, {
        body: { branchCode: 'X1', branchName: 'Tidak Boleh', status: 'active' }, token: tokens.staffa
      });
      assert.equal(denied.status, 403);
    });

    await t.test('sesi Affiliate dicabut: stream BFF ditutup auth.expired', async () => {
      const cookie = await h.bffLogin(`http://127.0.0.1:${AFFILIATE.entry}`, ids.affb.email, PASSWORD);
      const stream = h.openStream(`http://127.0.0.1:${AFFILIATE.entry}/bff/sync/affiliate/events`, { cookie });
      await stream.waitReady();
      await q('UPDATE public.auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [ids.affb.id]);
      const expired = await stream.waitFor(e => e.event === 'auth.expired', 15000);
      assert.equal(expired.data.code, 'INVALID_SESSION');
    });

    for (const [name, view] of Object.entries({ travelA, travelB, affA, affB, control })) {
      assert.deepEqual(view.errors, [], `${name} page errors`);
    }
  } finally {
    if (process.env.SEGALOKA_E2E_REPORT) {
      writeFileSync(process.env.SEGALOKA_E2E_REPORT, JSON.stringify({ node: process.versions.node, latencies }, null, 2));
    }
    h.shutdown();
    if (browser) await browser.close();
    for (const file of envFiles) if (existsSync(file)) unlinkSync(file);
    await pool.end();
  }
});
