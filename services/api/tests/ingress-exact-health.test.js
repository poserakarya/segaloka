import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import Fastify from 'fastify';
import { createIngressPreParsing } from '../src/security/ingress-preparsing.js';
import { signIngressRequest } from '../src/security/ingress-identity-v3.js';

const secret = randomBytes(32).toString('hex');

function buildApp() {
  const used = new Set();

  const pool = {
    async query(_sql, params) {
      const nonce = params[0];

      if (used.has(nonce)) {
        return { rowCount: 0 };
      }

      used.add(nonce);
      return { rowCount: 1 };
    }
  };

  const app = Fastify();
  const verifyIngress = createIngressPreParsing(pool, secret);

  app.addHook('preParsing', async (request, reply, payload) => {
    const method = request.raw.method;
    const rawTarget = request.raw.url;

    if (
      method === 'OPTIONS' ||
      (method === 'GET' && (
        rawTarget === '/health' ||
        rawTarget === '/ready'
      ))
    ) {
      return payload;
    }

    return verifyIngress(request, reply, payload);
  });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async () => ({ status: 'ready' }));
  app.post('/auth/login', async () => ({ accepted: true }));

  return app;
}

test('GET /health tanpa HMAC diterima', async () => {
  const app = buildApp();

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

test('GET /ready tanpa HMAC diterima', async () => {
  const app = buildApp();

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

test('POST /auth/login tanpa HMAC ditolak', async () => {
  const app = buildApp();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ test: true })
    });

    assert.equal(response.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('POST /auth/login dengan HMAC valid diterima', async () => {
  const app = buildApp();
  const body = Buffer.from(JSON.stringify({ test: true }));

  try {
    const headers = signIngressRequest(secret, {
      ip: '203.0.113.10',
      method: 'POST',
      target: '/auth/login',
      body
    });

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: {
        ...headers,
        'content-type': 'application/json'
      },
      payload: body
    });

    assert.equal(response.statusCode, 200);
  } finally {
    await app.close();
  }
});

test('GET /health dengan query bukan pengecualian', async () => {
  const app = buildApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/health?check=1'
    });

    assert.equal(response.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('POST /health bukan pengecualian', async () => {
  const app = buildApp();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/health',
      payload: '{}',
      headers: { 'content-type': 'application/json' }
    });

    assert.equal(response.statusCode, 403);
  } finally {
    await app.close();
  }
});