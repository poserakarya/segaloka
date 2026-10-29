import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';

import { signIngressRequest } from '../src/security/ingress-identity-v3.js';
import { createIngressPreParsing } from '../src/security/ingress-preparsing.js';

const secret = 'test-fastify-ingress-secret-123456789012345';
const target = '/auth/login';
const ip = '192.0.2.25';

function createTestApp() {
  const usedNonces = new Set();

  const pool = {
    async query(_sql, params) {
      const nonce = params[0];

      if (usedNonces.has(nonce)) {
        return { rowCount: 0 };
      }

      usedNonces.add(nonce);
      return { rowCount: 1 };
    }
  };

  const app = Fastify({ logger: false });

  app.addHook(
    'preParsing',
    createIngressPreParsing(pool, secret)
  );

  app.post(target, {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        additionalProperties: false,
        properties: {
          email: { type: 'string' }
        }
      }
    }
  }, async (request) => ({
    accepted: true,
    email: request.body.email,
    ip: request.verifiedClientIp
  }));

  return app;
}

function signedHeaders(body) {
  return {
    'content-type': 'application/json',
    ...signIngressRequest(secret, {
      ip,
      method: 'POST',
      target,
      body
    })
  };
}

test('01 - signed JSON reaches Fastify handler', async () => {
  const app = createTestApp();

  try {
    const body = Buffer.from('{"email":"test@example.com"}');

    const response = await app.inject({
      method: 'POST',
      url: target,
      headers: signedHeaders(body),
      payload: body
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      accepted: true,
      email: 'test@example.com',
      ip
    });
  } finally {
    await app.close();
  }
});

test('02 - unsigned request rejected', async () => {
  const app = createTestApp();

  try {
    const response = await app.inject({
      method: 'POST',
      url: target,
      headers: {
        'content-type': 'application/json'
      },
      payload: '{"email":"test@example.com"}'
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'INGRESS_AUTH_FAILED');
  } finally {
    await app.close();
  }
});

test('03 - replayed request rejected', async () => {
  const app = createTestApp();

  try {
    const body = Buffer.from('{"email":"test@example.com"}');
    const headers = signedHeaders(body);

    const first = await app.inject({
      method: 'POST',
      url: target,
      headers,
      payload: body
    });

    const second = await app.inject({
      method: 'POST',
      url: target,
      headers,
      payload: body
    });

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('04 - modified JSON body rejected', async () => {
  const app = createTestApp();

  try {
    const original = Buffer.from('{"email":"test@example.com"}');
    const modified = Buffer.from('{"email":"other@example.com"}');

    const response = await app.inject({
      method: 'POST',
      url: target,
      headers: signedHeaders(original),
      payload: modified
    });

    assert.equal(response.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('05 - forged forwarded IP ignored', async () => {
  const app = createTestApp();

  try {
    const body = Buffer.from('{"email":"test@example.com"}');

    const response = await app.inject({
      method: 'POST',
      url: target,
      headers: {
        ...signedHeaders(body),
        'x-forwarded-for': '198.51.100.99'
      },
      payload: body
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().ip, ip);
  } finally {
    await app.close();
  }
});