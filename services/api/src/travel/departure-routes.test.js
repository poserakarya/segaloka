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

  const pool = {
    async query(sql, params = []) {
      calls.push({ sql, params });

      if (sql.includes('information_schema.columns')) {
        return { rows: [{ available: false }] };
      }

      if (sql.includes('FROM public.auth_access_tokens')) {
        return {
          rows: options.authenticated === false
            ? []
            : [{ user_id: USER, session_id: 'session-test' }]
        };
      }

      if (sql.includes('FROM public.memberships')) {
        return {
          rows: options.authorized === false ? [] : [{ allowed: 1 }]
        };
      }

      if (sql.includes('FROM public.travel_departures')) {
        return {
          rows: [{
            id: DEPARTURE,
            travel_organization_id: ORG,
            title: 'Keberangkatan Uji',
            destination: 'Makkah',
            status: 'scheduled'
          }]
        };
      }

      throw new Error(`UNEXPECTED_SQL: ${sql.slice(0, 90)}`);
    }
  };

  return { pool, calls };
}

async function run(options, url) {
  const state = setup(options);
  const app = Fastify({ logger: false });

  await registerDepartureRoutes(app, state.pool);

  try {
    const response = await app.inject({
      method: 'GET',
      url,
      headers: {
        authorization: `Bearer ${TOKEN}`
      }
    });

    return { response, state };
  } finally {
    await app.close();
  }
}

test('daftar keberangkatan memerlukan sesi valid', async () => {
  const { response } = await run(
    { authenticated: false },
    `/travel/departures?organizationId=${ORG}`
  );

  assert.equal(response.statusCode, 401);
});

test('daftar keberangkatan menolak organizationId tidak valid', async () => {
  const { response, state } = await run({}, '/travel/departures?organizationId=invalid');

  assert.equal(response.statusCode, 400);
  assert.equal(
    state.calls.some(call => call.sql.includes('FROM public.memberships')),
    false
  );
});

test('daftar keberangkatan menolak tenant tanpa membership Travel', async () => {
  const { response, state } = await run(
    { authorized: false },
    `/travel/departures?organizationId=${ORG}`
  );

  assert.equal(response.statusCode, 403);
  assert.equal(
    state.calls.some(call => call.sql.includes('FROM public.travel_departures')),
    false
  );
});

test('daftar keberangkatan hanya membaca tenant yang diotorisasi', async () => {
  const { response, state } = await run(
    {},
    `/travel/departures?organizationId=${ORG}`
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().departures, [{
    id: DEPARTURE,
    travel_organization_id: ORG,
    title: 'Keberangkatan Uji',
    destination: 'Makkah',
    status: 'scheduled'
  }]);
  assert.deepEqual(
    state.calls.find(call => call.sql.includes('FROM public.travel_departures')).params,
    [ORG]
  );
});
