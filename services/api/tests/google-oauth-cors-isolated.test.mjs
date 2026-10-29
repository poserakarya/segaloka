import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import cors from '@fastify/cors';

const allowed = new Set([
  'https://segaloka.com',
  'https://www.segaloka.com',
  'https://dashboard.segaloka.com',
  'https://dev.segaloka.com',
  'https://dev.dashboard.segaloka.com'
]);

async function createApp() {
  const app = Fastify();

  await app.register(cors, {
    origin(origin, callback) {
      callback(null, !origin || allowed.has(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 600
  });

  app.post('/auth/google/exchange', {
    config: {
      cors: {
        origin: [...allowed],
        credentials: true
      }
    }
  }, async () => ({ authenticated: false }));

  app.get('/ordinary', async () => ({ ok: true }));

  await app.ready();
  return app;
}

test('allowed origin receives credentialed exchange response', async () => {
  const app = await createApp();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/google/exchange',
      headers: { origin: 'https://segaloka.com' },
      payload: {}
    });

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.headers['access-control-allow-origin'],
      'https://segaloka.com'
    );
    assert.equal(
      response.headers['access-control-allow-credentials'],
      'true'
    );
  } finally {
    await app.close();
  }
});

test('foreign origin does not receive credentialed access', async () => {
  const app = await createApp();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/google/exchange',
      headers: { origin: 'https://untrusted.example' },
      payload: {}
    });

    assert.notEqual(
      response.headers['access-control-allow-origin'],
      'https://untrusted.example'
    );
    assert.notEqual(
      response.headers['access-control-allow-credentials'],
      'true'
    );
  } finally {
    await app.close();
  }
});

test('exchange preflight permits credentialed request', async () => {
  const app = await createApp();
  try {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/auth/google/exchange',
      headers: {
        origin: 'https://segaloka.com',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type'
      }
    });

    assert.ok([200, 204].includes(response.statusCode));
    assert.equal(
      response.headers['access-control-allow-origin'],
      'https://segaloka.com'
    );
    assert.equal(
      response.headers['access-control-allow-credentials'],
      'true'
    );
  } finally {
    await app.close();
  }
});

test('ordinary endpoint remains non-credentialed', async () => {
  const app = await createApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/ordinary',
      headers: { origin: 'https://segaloka.com' }
    });

    assert.equal(response.statusCode, 200);
    assert.notEqual(
      response.headers['access-control-allow-credentials'],
      'true'
    );
  } finally {
    await app.close();
  }
});