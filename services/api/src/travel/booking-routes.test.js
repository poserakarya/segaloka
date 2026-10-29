import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerBookingRoutes } from './booking-routes.js';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const ORG = '33333333-3333-4333-8333-333333333333';
const DEPARTURE = '44444444-4444-4444-8444-444444444444';
const BOOKING = '55555555-5555-4555-8555-555555555555';
const PARTICIPANT = '66666666-6666-4666-8666-666666666666';
const TOKEN = 'a'.repeat(64);

function setup(options = {}) {
  const calls = [];
  let released = false;

  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });

      if (sql.includes('information_schema.columns')) {
        return { rows: [{ available: false }] };
      }

      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) {
        return { rows: [] };
      }

      if (sql.includes('FROM public.travel_departures d') &&
          sql.includes('FOR UPDATE OF d')) {
        return {
          rows: options.departureMissing ? [] : [{
            id: DEPARTURE,
            travel_organization_id: ORG,
            status: options.departureStatus ?? 'scheduled'
          }]
        };
      }

      if (sql.includes('FROM public.memberships')) {
        return {
          rows: options.staff === false ? [] : [{ allowed: 1 }]
        };
      }

      if (sql.includes('FROM public.travel_bookings b') &&
          sql.includes('FOR UPDATE OF b')) {
        return {
          rows: options.bookingMissing ? [] : [{
            id: BOOKING,
            status: options.bookingStatus ?? 'pending',
            booking_user_id: options.owner ?? USER,
            travel_organization_id: ORG,
            departure_status: 'scheduled'
          }]
        };
      }

      if (sql.includes('FROM public.travel_bookings b') &&
          !sql.includes('FOR UPDATE')) {
        return {
          rows: options.bookingMissing ? [] : [{
            id: BOOKING,
            booking_number: 'SLK-TEST',
            booking_user_id: options.owner ?? USER,
            travel_organization_id: ORG
          }]
        };
      }

      if (sql.includes('FROM public.travel_booking_participants p')) {
        return {
          rows: options.participantMissing ? [] : [{
            id: PARTICIPANT,
            departure_status: 'not_verified',
            booking_status: options.bookingStatus ?? 'confirmed',
            departure_status_record: options.departureStatus ?? 'departed',
            travel_organization_id: ORG
          }]
        };
      }

      if (sql.includes('INSERT INTO public.travel_bookings')) {
        return {
          rows: [{
            id: BOOKING,
            booking_user_id: USER,
            departure_id: DEPARTURE,
            status: 'pending'
          }]
        };
      }

      if (sql.includes('INSERT INTO public.travel_booking_participants')) {
        return {
          rows: [{
            id: PARTICIPANT,
            booking_id: BOOKING,
            full_name: params[2],
            departure_status: 'not_verified'
          }]
        };
      }

      if (sql.includes('UPDATE public.travel_booking_participants')) {
        return {
          rows: [{
            id: PARTICIPANT,
            departure_status: 'departed'
          }]
        };
      }

      if (sql.includes('FROM public.travel_booking_participants') &&
          !sql.includes('JOIN')) {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO public.audit_logs')) {
        if (options.failAudit) throw new Error('AUDIT_FAILED');
        return { rows: [] };
      }

      throw new Error(`UNEXPECTED_SQL: ${sql.slice(0, 90)}`);
    },
    release() {
      released = true;
    }
  };

  return {
    calls,
    get released() { return released; },
    pool: {
      async query(sql) {
        if (sql.includes('FROM public.auth_access_tokens')) {
          return {
            rows: options.authenticated === false
              ? []
              : [{ user_id: USER, session_id: 'session-test' }]
          };
        }
        throw new Error('UNEXPECTED_AUTH_SQL');
      },
      async connect() { return client; }
    }
  };
}

async function run(options, method, url, payload) {
  const state = setup(options);
  const app = Fastify({ logger: false });

  await registerBookingRoutes(app, state.pool);

  try {
    const response = await app.inject({
      method,
      url,
      headers: {
        authorization: `Bearer ${TOKEN}`
      },
      ...(payload === undefined ? {} : { payload })
    });

    return { response, state };
  } finally {
    await app.close();
  }
}

test('booking membutuhkan sesi valid', async () => {
  const { response } = await run(
    { authenticated: false },
    'POST',
    '/travel/bookings',
    { departureId: DEPARTURE }
  );

  assert.equal(response.statusCode, 401);
});

test('booking menolak departureId tidak valid', async () => {
  const { response } = await run(
    {},
    'POST',
    '/travel/bookings',
    { departureId: 'invalid' }
  );

  assert.equal(response.statusCode, 400);
});

test('booking berhasil dibuat dengan audit', async () => {
  const { response, state } = await run(
    {},
    'POST',
    '/travel/bookings',
    { departureId: DEPARTURE }
  );

  assert.equal(response.statusCode, 201);
  assert.ok(state.calls.some(c =>
    c.sql.includes('INSERT INTO public.audit_logs')
  ));
  assert.ok(state.calls.some(c => c.sql === 'COMMIT'));
  assert.equal(state.released, true);
});

test('booking menolak jadwal tidak tersedia', async () => {
  const { response, state } = await run(
    { departureStatus: 'cancelled' },
    'POST',
    '/travel/bookings',
    { departureId: DEPARTURE }
  );

  assert.equal(response.statusCode, 409);
  assert.ok(state.calls.some(c => c.sql === 'ROLLBACK'));
});

test('peserta ditolak bila bukan pemesan atau petugas Travel', async () => {
  const { response } = await run(
    { staff: false, owner: OTHER },
    'POST',
    `/travel/bookings/${BOOKING}/participants`,
    { fullName: 'Peserta Test' }
  );

  assert.equal(response.statusCode, 403);
});

test('peserta dapat ditambahkan pemesan', async () => {
  const { response } = await run(
    { staff: false },
    'POST',
    `/travel/bookings/${BOOKING}/participants`,
    { fullName: 'Peserta Test' }
  );

  assert.equal(response.statusCode, 201);
});

test('booking tidak dapat dibaca pengguna lain', async () => {
  const { response } = await run(
    { staff: false, owner: OTHER },
    'GET',
    `/travel/bookings/${BOOKING}`
  );

  assert.equal(response.statusCode, 404);
});

test('verifikasi keberangkatan menolak nonpetugas', async () => {
  const { response } = await run(
    { staff: false },
    'POST',
    `/travel/participants/${PARTICIPANT}/verify-departure`
  );

  assert.equal(response.statusCode, 403);
});

test('verifikasi keberangkatan menolak booking pending', async () => {
  const { response } = await run(
    { bookingStatus: 'pending' },
    'POST',
    `/travel/participants/${PARTICIPANT}/verify-departure`
  );

  assert.equal(response.statusCode, 409);
});

test('verifikasi keberangkatan menyimpan audit', async () => {
  const { response, state } = await run(
    {},
    'POST',
    `/travel/participants/${PARTICIPANT}/verify-departure`
  );

  assert.equal(response.statusCode, 200);
  assert.ok(state.calls.some(c =>
    c.sql.includes('INSERT INTO public.audit_logs') &&
    c.params.includes('travel.participant.departure_verified')
  ));
});

test('kegagalan audit membatalkan booking', async () => {
  const { response, state } = await run(
    { failAudit: true },
    'POST',
    '/travel/bookings',
    { departureId: DEPARTURE }
  );

  assert.equal(response.statusCode, 500);
  assert.ok(state.calls.some(c => c.sql === 'ROLLBACK'));
  assert.ok(!state.calls.some(c => c.sql === 'COMMIT'));
});
