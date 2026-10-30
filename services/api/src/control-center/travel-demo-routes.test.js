import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';

import { registerTravelDemoRoutes, travelDemoSeedEnabled } from './travel-demo-routes.js';

const SEED = { method: 'POST', url: '/control-center/test-data/travel-demo' };
const pool = {
  query: async () => { throw new Error('POOL_MUST_NOT_BE_USED'); },
  connect: async () => { throw new Error('POOL_MUST_NOT_BE_USED'); }
};

async function appWith(env) {
  const app = Fastify();
  await registerTravelDemoRoutes(app, pool, { env });
  await app.ready();
  return app;
}

test('travel demo seed is disabled unless explicitly enabled outside production', () => {
  assert.equal(travelDemoSeedEnabled({}), false);
  assert.equal(travelDemoSeedEnabled({ NODE_ENV: 'production' }), false);
  assert.equal(travelDemoSeedEnabled({ NODE_ENV: 'production', SEGALOKA_ENABLE_TEST_DATA_SEED: 'true' }), false);
  assert.equal(travelDemoSeedEnabled({ NODE_ENV: 'test', SEGALOKA_ENABLE_TEST_DATA_SEED: '1' }), false);
  assert.equal(travelDemoSeedEnabled({ NODE_ENV: 'test', SEGALOKA_ENABLE_TEST_DATA_SEED: 'true' }), true);
});

test('production does not register the travel demo seed route (404, no database access)', async () => {
  const app = await appWith({ NODE_ENV: 'production', SEGALOKA_ENABLE_TEST_DATA_SEED: 'true' });
  try {
    assert.equal(app.hasRoute(SEED), false);
    const response = await app.inject({ ...SEED, headers: { authorization: 'Bearer anything' } });
    assert.equal(response.statusCode, 404);
    // Rute cabang administratif tetap ada.
    assert.equal(app.hasRoute({ method: 'GET', url: '/control-center/travel-branches' }), true);
  } finally {
    await app.close();
  }
});

test('default environment without the flag does not register the seed route', async () => {
  const app = await appWith({});
  try {
    assert.equal(app.hasRoute(SEED), false);
  } finally {
    await app.close();
  }
});

test('explicitly enabled non-production environment registers the seed route', async () => {
  const app = await appWith({ NODE_ENV: 'test', SEGALOKA_ENABLE_TEST_DATA_SEED: 'true' });
  try {
    assert.equal(app.hasRoute(SEED), true);
  } finally {
    await app.close();
  }
});
