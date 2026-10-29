import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';

import { signIngressRequest } from '../src/security/ingress-identity-v3.js';
import { createIngressPreParsing } from '../src/security/ingress-preparsing.js';

const secret = 'test-ingress-route-policy-secret-123456789';
const ip = '192.0.2.25';

function createApp() {
  const nonces = new Set();

  const pool = {
    async query(_sql, params) {
      const nonce = params[0];

      if (nonces.has(nonce)) {
        return { rowCount: 0 };
      }

      nonces.add(nonce);
      return { rowCount: 1 };
    }
  };

  const app = Fastify({ logger: false });

  const verify = createIngressPreParsing(pool, secret);

  app.addHook('preParsing', async (request, reply, payload) => {
    const method = request.raw.method;
    const path = new URL(
      request.raw.url,
      'http://localhost'
    ).pathname;

    if (
      method === 'OPTIONS' ||
      (method === 'GET' && (
        path === '/health' ||
        path === '/ready'
      ))
    ) {
      return payload;
    }

    return verify(request, reply, payload);
  });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async () => ({ status: 'ready' }));

  app.post('/auth/login', async (request) => ({
    accepted: true,
    ip: request.verifiedClientIp
  }));

  return app;
}

test('01 - health remains available', async () => {
  const app = createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    assert.equal(response.statusCode, 200);
  } finally {
    await app.close();
  }
});

test('02 - ready remains available', async () => {
  const app = createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/ready'
    });

    assert.equal(response.statusCode, 200);
  } finally {
    await app.close();
  }
});

test('03 - unsigned login rejected', async () => {
  const app = createApp();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: {
        'content-type': 'application/json'
      },
      payload: '{}'
    });

    assert.equal(response.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('04 - signed login accepted', async () => {
  const app = createApp();

  try {
    const body = Buffer.from('{}');

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: {
        'content-type': 'application/json',
        ...signIngressRequest(secret, {
          ip,
          method: 'POST',
          target: '/auth/login',
          body
        })
      },
      payload: body
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().ip, ip);
  } finally {
    await app.close();
  }
});

test('05 - replay rejected', async () => {
  const app = createApp();

  try {
    const body = Buffer.from('{}');

    const headers = {
      'content-type': 'application/json',
      ...signIngressRequest(secret, {
        ip,
        method: 'POST',
        target: '/auth/login',
        body
      })
    };

    const first = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers,
      payload: body
    });

    const second = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers,
      payload: body
    });

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 403);
  } finally {
    await app.close();
  }
});