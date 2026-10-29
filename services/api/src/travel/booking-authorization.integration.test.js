// Integrasi POST /travel/bookings terhadap PostgreSQL tes (nama DB wajib
// berakhiran _test dan host lokal). Seluruh data dibuat sintetis per run.
//   SEGALOKA_E2E_DB_HOST=127.0.0.1 SEGALOKA_E2E_DB_PORT=55432 \
//   SEGALOKA_E2E_DB_NAME=segaloka_e2e_test SEGALOKA_E2E_DB_USER=segaloka_test \
//   node --test src/travel/booking-authorization.integration.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import pg from 'pg';

import { registerBookingRoutes } from './booking-routes.js';

const db = {
  host: process.env.SEGALOKA_E2E_DB_HOST,
  port: Number(process.env.SEGALOKA_E2E_DB_PORT),
  database: process.env.SEGALOKA_E2E_DB_NAME,
  user: process.env.SEGALOKA_E2E_DB_USER,
  password: process.env.SEGALOKA_E2E_DB_PASSWORD || ''
};
const configured = ['127.0.0.1', 'localhost', '::1'].includes(db.host) &&
  /_test$/.test(db.database || '') && Boolean(db.port && db.user);

test('POST /travel/bookings authorization and tenant isolation', {
  skip: configured ? false : 'database tes (_test, localhost) belum dikonfigurasi'
}, async t => {
  const pool = new pg.Pool({ ...db, ssl: false, max: 4 });
  const app = Fastify({ logger: false });
  await registerBookingRoutes(app, pool);
  const run = randomBytes(4).toString('hex');

  async function q(sql, params = []) {
    return (await pool.query(sql, params)).rows;
  }

  async function user(label) {
    const [row] = await q(
      `INSERT INTO public.users (email, full_name)
       VALUES ($1, $2) RETURNING id`,
      [`${label}-${run}@example.invalid`, `Uji ${label}`]
    );
    return row.id;
  }

  async function member(userId, role, organizationId = null) {
    await q(
      `INSERT INTO public.memberships (user_id, organization_id, role_id)
       SELECT $1, $2, id FROM public.roles WHERE code = $3`,
      [userId, organizationId, role]
    );
  }

  async function organization(type, { testData = false } = {}) {
    const [row] = await q(
      `INSERT INTO public.organizations (name, organization_type, status, is_test_data)
       VALUES ($1, $2, 'active', $3) RETURNING id`,
      [`Org ${type} ${run} ${randomUUID().slice(0, 4)}`, type, testData]
    );
    return row.id;
  }

  async function bearer(userId) {
    const [session] = await q(
      `INSERT INTO public.auth_sessions (user_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, now() + interval '1 hour') RETURNING id`,
      [userId, randomBytes(32).toString('hex')]
    );
    const token = randomBytes(32).toString('hex');
    await q(
      `INSERT INTO public.auth_access_tokens (session_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '15 minutes')`,
      [session.id, createHash('sha256').update(token).digest('hex')]
    );
    return token;
  }

  async function departure(organizationId) {
    const [row] = await q(
      `INSERT INTO public.travel_departures
         (travel_organization_id, title, destination, departure_date)
       VALUES ($1, 'Umrah Uji', 'Makkah', current_date + 30) RETURNING id`,
      [organizationId]
    );
    return row.id;
  }

  async function relationship(partnerId, organizationId, type, status, approverId) {
    await q(
      `INSERT INTO public.travel_partner_relationships
         (travel_organization_id, partner_user_id, relationship_type, status, approved_by, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [organizationId, partnerId, type, status,
        status === 'approved' ? approverId : null,
        status === 'approved' ? new Date() : null]
    );
  }

  try {
    // Paket uji dengan bookings.manage aktif.
    const [plan] = await q(
      `INSERT INTO public.subscription_plans (code, name, billing_interval)
       VALUES ($1, 'Paket Uji', 'monthly') RETURNING id`,
      [`plan-test-${run}`]
    );
    await q(
      `INSERT INTO public.plan_entitlements (plan_id, entitlement_id, enabled)
       SELECT $1, id, true FROM public.entitlements WHERE code = 'bookings.manage'`,
      [plan.id]
    );

    const travelA = await organization('travel');
    const travelB = await organization('travel');
    const travelNoSub = await organization('travel');
    const travelTest = await organization('travel', { testData: true });
    const vendorOrg = await organization('vendor');

    for (const org of [travelA, travelB, travelTest]) {
      await q(
        `INSERT INTO public.organization_subscriptions
           (organization_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', now() - interval '1 day', now() + interval '30 days')`,
        [org, plan.id]
      );
    }
    // Travel B: entitlement dimatikan lewat override organisasi.
    await q(
      `INSERT INTO public.organization_entitlement_overrides (organization_id, entitlement_id, enabled)
       SELECT $1, id, false FROM public.entitlements WHERE code = 'bookings.manage'`,
      [travelB]
    );

    const staffA = await user('staff-a');
    await member(staffA, 'travel', travelA);
    const staffB = await user('staff-b');
    await member(staffB, 'travel', travelB);
    const staffNoSub = await user('staff-nosub');
    await member(staffNoSub, 'travel', travelNoSub);
    const staffTest = await user('staff-test');
    await member(staffTest, 'travel', travelTest);

    const agenA = await user('agen-a');
    await member(agenA, 'agen');
    await relationship(agenA, travelA, 'agent', 'approved', staffA);
    const mitraA = await user('mitra-a');
    await member(mitraA, 'mitra');
    await relationship(mitraA, travelA, 'partner', 'approved', staffA);
    const agenPending = await user('agen-pending');
    await member(agenPending, 'agen');
    await relationship(agenPending, travelA, 'agent', 'pending', staffA);
    const agenWrongType = await user('agen-wrong-type');
    await member(agenWrongType, 'agen');
    await relationship(agenWrongType, travelA, 'partner', 'approved', staffA);
    const relNoRole = await user('rel-no-role');
    await relationship(relNoRole, travelA, 'agent', 'approved', staffA);
    const agenB = await user('agen-b');
    await member(agenB, 'agen');
    await relationship(agenB, travelB, 'agent', 'approved', staffB);

    const traveler = await user('traveler');
    await member(traveler, 'traveler');
    const vendor = await user('vendor');
    await member(vendor, 'vendor', vendorOrg);
    const affiliate = await user('affiliate');
    await member(affiliate, 'affiliate');
    const superAdmin = await user('super-admin');
    await member(superAdmin, 'super_admin');

    const depA = await departure(travelA);
    const depB = await departure(travelB);
    const depNoSub = await departure(travelNoSub);
    const depTest = await departure(travelTest);

    async function book(userId, departureId) {
      const response = await app.inject({
        method: 'POST',
        url: '/travel/bookings',
        headers: { authorization: `Bearer ${await bearer(userId)}` },
        payload: { departureId }
      });
      return { status: response.statusCode, body: response.json() };
    }

    async function bookingCount(departureId) {
      const [row] = await q(
        'SELECT count(*)::int AS n FROM public.travel_bookings WHERE departure_id = $1',
        [departureId]
      );
      return row.n;
    }

    await t.test('Travel staff of the organization with bookings.manage → 201', async () => {
      const result = await book(staffA, depA);
      assert.equal(result.status, 201);
      assert.equal(result.body.booking.booking_user_id, staffA);
      const [audit] = await q(
        `SELECT organization_id FROM public.audit_logs
         WHERE entity_id = $1 AND action = 'travel.booking.created'`,
        [result.body.booking.id]
      );
      assert.equal(audit.organization_id, travelA);
    });

    await t.test('Travel staff cannot book another Travel (tenant isolation) → 403', async () => {
      const before = await bookingCount(depA);
      const result = await book(staffB, depA);
      assert.equal(result.status, 403);
      assert.equal(result.body.code, 'BOOKING_CREATION_NOT_ALLOWED');
      assert.equal(await bookingCount(depA), before);
    });

    await t.test('Travel without bookings.manage (override off / no subscription) → 403', async () => {
      assert.deepEqual(await book(staffB, depB), { status: 403, body: { code: 'BOOKINGS_MANAGE_REQUIRED' } });
      assert.deepEqual(await book(staffNoSub, depNoSub), { status: 403, body: { code: 'BOOKINGS_MANAGE_REQUIRED' } });
      assert.equal(await bookingCount(depB), 0);
      assert.equal(await bookingCount(depNoSub), 0);
    });

    await t.test('Agen and Mitra with approved relationship → 201', async () => {
      assert.equal((await book(agenA, depA)).status, 201);
      assert.equal((await book(mitraA, depA)).status, 201);
    });

    await t.test('Agen/Mitra without a valid approved relationship → 403', async () => {
      for (const partner of [agenPending, agenWrongType, relNoRole]) {
        const result = await book(partner, depA);
        assert.equal(result.status, 403);
        assert.equal(result.body.code, 'BOOKING_CREATION_NOT_ALLOWED');
      }
      // Agen yang disetujui Travel B tidak bisa booking ke Travel A.
      assert.equal((await book(agenB, depA)).status, 403);
      // Agen B disetujui, tetapi Travel B tidak memiliki bookings.manage.
      assert.deepEqual(await book(agenB, depB), { status: 403, body: { code: 'BOOKINGS_MANAGE_REQUIRED' } });
    });

    await t.test('Traveler, Vendor, Affiliate, and Super Admin are rejected → 403', async () => {
      const before = await bookingCount(depA);
      for (const other of [traveler, vendor, affiliate, superAdmin]) {
        const result = await book(other, depA);
        assert.equal(result.status, 403);
        assert.equal(result.body.code, 'BOOKING_CREATION_NOT_ALLOWED');
      }
      assert.equal(await bookingCount(depA), before);
    });

    await t.test('TEST_DATA_BOOKING_NOT_ALLOWED guard is unchanged', async () => {
      const result = await book(staffTest, depTest);
      assert.deepEqual(result, { status: 409, body: { code: 'TEST_DATA_BOOKING_NOT_ALLOWED' } });
      assert.equal(await bookingCount(depTest), 0);
    });

    await t.test('unauthenticated request → 401', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/travel/bookings',
        payload: { departureId: depA }
      });
      assert.equal(response.statusCode, 401);
    });
  } finally {
    await app.close();
    await pool.end();
  }
});
