import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerDepartureRoutes } from './departure-routes.js';

const USER = '11111111-1111-4111-8111-111111111111';
const ORG = '22222222-2222-4222-8222-222222222222';
const DEPARTURE = '33333333-3333-4333-8333-333333333333';
const TOKEN = 'a'.repeat(64);

function setup(options = {}) {
  const calls = [];

  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });

      if (sql.includes('information_schema.columns')) {
        return { rows: [{ available: false }] };
      }

      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        if (sql === 'ROLLBACK' && options.failOutbox) return { rows: [] };
        return { rows: [] };
      }

      if (sql.includes('FROM public.memberships')) {
        return { rows: [{ allowed: 1 }] };
      }

      if (sql.includes('INSERT INTO public.travel_departures')) {
        return {
          rows: [{
            id: DEPARTURE,
            travel_organization_id: ORG,
            title: 'Keberangkatan Uji',
            destination: 'Makkah',
            departure_date: '2026-12-01',
            return_date: null,
            status: 'scheduled',
            created_at: '2026-10-14T00:00:00.000Z'
          }]
        };
      }

      if (sql.includes('INSERT INTO public.audit_logs')) {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO public.sync_outbox')) {
        if (options.failOutbox) {
          throw new Error('OUTBOX_WRITE_FAILED');
        }
        return { rows: [] };
      }

      throw new Error(`UNEXPECTED_CLIENT_SQL: ${sql.slice(0, 100)}`);
    },
    release() {}
  };

  const pool = {
    async query(sql) {
      calls.push({ sql, params: [] });

        if (sql.includes('information_schema.columns')) {
          return { rows: [{ available: false }] };
        }
      if (sql.includes('FROM public.auth_access_tokens')) {
        return {
          rows: [{
            user_id: USER,
            session_id: 'session-test'
          }]
        };
      }
      throw new Error(`UNEXPECTED_POOL_SQL: ${sql.slice(0, 100)}`);
    },
    async connect() {
      return client;
    }
  };

  return { pool, calls };
}

async function run(options) {
  const state = setup(options);
  const app = Fastify({ logger: false });
  await registerDepartureRoutes(app, state.pool);

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/travel/departures',
      headers: {
        authorization: `Bearer ${TOKEN}`,
        'content-type': 'application/json'
      },
      payload: {
        organizationId: ORG,
        title: 'Keberangkatan Uji',
        destination: 'Makkah',
        departureDate: '2026-12-01'
      }
    });

    return { response, state };
  } finally {
    await app.close();
  }
}

test('departure and outbox event commit in the same transaction', async () => {
  const { response, state } = await run({});
  const outboxIndex = state.calls.findIndex(
    call => call.sql.includes('INSERT INTO public.sync_outbox')
  );
  const commitIndex = state.calls.findIndex(
    call => call.sql === 'COMMIT'
  );

  assert.equal(response.statusCode, 201);
  assert.ok(outboxIndex >= 0);
  assert.ok(commitIndex > outboxIndex);
  assert.match(
    state.calls[outboxIndex].sql,
    /jsonb_build_object\('organizationId', \$1::uuid::text\)/
  );
  assert.deepEqual(state.calls[outboxIndex].params, [ORG, DEPARTURE]);
});

test('failed outbox write rolls the departure transaction back', async () => {
  const { response, state } = await run({ failOutbox: true });

  assert.equal(response.statusCode, 500);
  assert.equal(
    state.calls.some(call => call.sql === 'COMMIT'),
    false
  );
  assert.equal(
    state.calls.some(call => call.sql === 'ROLLBACK'),
    true
  );
});
