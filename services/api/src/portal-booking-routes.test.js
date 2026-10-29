import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerPortalBookingRoutes } from './portal-booking-routes.js';

const USER = '11111111-1111-4111-8111-111111111111';
const BOOKING = '22222222-2222-4222-8222-222222222222';
const AUTH_SCHEME = String.fromCharCode(66, 101, 97, 114, 101, 114, 32);

function setup(options = {}) {
  const calls = [];
  const pool = {
    async query(sql, params = []) {
      calls.push({ sql, params });

      if (sql.includes('FROM public.auth_access_tokens')) {
        return {
          rows: options.authenticated === false
            ? []
            : [{ user_id: USER, session_id: 'session-test' }]
        };
      }

      if (sql.includes('information_schema.columns')) {
        return { rows: [{ available: false }] };
      }

      if (sql.includes('FROM public.memberships m')) {
        return {
          rows: options.roleAllowed === false ? [] : [{ allowed: 1 }]
        };
      }

      if (sql.includes('FROM public.travel_bookings b')) {
        return {
          rows: options.bookingMissing ? [] : [{
            id: BOOKING,
            booking_number: 'SLK-TEST',
            status: 'confirmed',
            created_at: '2026-01-01T00:00:00.000Z',
            departure_id: '33333333-3333-4333-8333-333333333333',
            title: 'Departure',
            destination: 'Destination',
            departure_date: '2026-05-01',
            return_date: '2026-05-10',
            participants: options.participants ?? []
          }]
        };
      }

      throw new Error(`UNEXPECTED_SQL: ${sql.slice(0, 90)}`);
    }
  };

  return { pool, calls };
}

async function run(options, method, url, authorization = true) {
  const state = setup(options);
  const app = Fastify({ logger: false });
  await registerPortalBookingRoutes(app, state.pool);

  try {
    const response = await app.inject({
      method,
      url,
      headers: authorization
        ? { authorization: AUTH_SCHEME + 'a'.repeat(64) }
        : {}
    });

    return { response, state };
  } finally {
    await app.close();
  }
}

test('portal bookings require an authenticated session', async () => {
  const { response } = await run(
    { authenticated: false },
    'GET',
    '/agen/bookings'
  );

  assert.equal(response.statusCode, 401);
});

test('Agen booking list is scoped to role, owner, and approved Travel relationship', async () => {
  const { response, state } = await run(
    {},
    'GET',
    '/agen/bookings'
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().bookings[0].id, BOOKING);
  const roleCheck = state.calls.find(call =>
    call.sql.includes('FROM public.memberships m')
  );
  const bookingQuery = state.calls.find(call =>
    call.sql.includes('FROM public.travel_bookings b')
  );
  assert.equal(roleCheck.params[1], 'agen');
  assert.match(bookingQuery.sql, /b\.booking_user_id = \$1/);
  assert.match(bookingQuery.sql, /rel\.relationship_type = \$2/);
  assert.match(bookingQuery.sql, /rel\.status = 'approved'/);
  assert.equal(bookingQuery.params[1], 'agent');
});

test('Mitra booking list uses the partner relationship type', async () => {
  const { response, state } = await run(
    {},
    'GET',
    '/mitra/bookings'
  );

  assert.equal(response.statusCode, 200);
  const bookingQuery = state.calls.find(call =>
    call.sql.includes('FROM public.travel_bookings b')
  );
  assert.equal(bookingQuery.params[1], 'partner');
});

test('partner booking list rejects users without the explicit role', async () => {
  const { response, state } = await run(
    { roleAllowed: false },
    'GET',
    '/mitra/bookings'
  );

  assert.equal(response.statusCode, 403);
  assert.equal(
    state.calls.some(call =>
      call.sql.includes('FROM public.travel_bookings b')
    ),
    false
  );
});

test('Traveler booking list exposes only bookings associated with the user', async () => {
  const { response, state } = await run(
    {},
    'GET',
    '/traveler/bookings'
  );

  assert.equal(response.statusCode, 200);
  const bookingQuery = state.calls.find(call =>
    call.sql.includes('FROM public.travel_bookings b')
  );
  assert.match(bookingQuery.sql, /b\.booking_user_id = \$1/);
  assert.match(bookingQuery.sql, /p\.user_id = \$1/);
  assert.deepEqual(bookingQuery.params, [USER]);
});

test('Traveler booking detail returns 404 for another users booking', async () => {
  const { response, state } = await run(
    { bookingMissing: true },
    'GET',
    `/traveler/bookings/${BOOKING}`
  );

  assert.equal(response.statusCode, 404);
  const bookingQuery = state.calls.find(call =>
    call.sql.includes('FROM public.travel_bookings b')
  );
  assert.match(bookingQuery.sql, /p\.user_id = \$2/);
  assert.match(bookingQuery.sql, /b\.booking_user_id = \$2/);
});

test('booking detail rejects malformed identifiers', async () => {
  const { response } = await run(
    {},
    'GET',
    '/agen/bookings/not-a-uuid'
  );

  assert.equal(response.statusCode, 400);
});
