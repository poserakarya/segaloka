import test from 'node:test';
import assert from 'node:assert/strict';

import { signIngressRequest } from '../src/security/ingress-identity-v3.js';
import { authenticateIngressRequest } from '../src/security/ingress-request-auth.js';

const secret = 'test-only-ingress-identity-secret-123456789';

const request = {
  ip: '192.0.2.10',
  method: 'POST',
  target: '/auth/login',
  body: Buffer.from('{"email":"test@example.com"}')
};

test('01 - valid signature and first nonce accepted', async () => {
  const headers = signIngressRequest(secret, request);
  const pool = {
    query: async () => ({ rowCount: 1 })
  };

  const result = await authenticateIngressRequest(
    pool, headers, secret, request
  );

  assert.equal(result.allowed, true);
  assert.equal(result.ip, request.ip);
});

test('02 - replayed nonce rejected', async () => {
  const headers = signIngressRequest(secret, request);
  const pool = {
    query: async () => ({ rowCount: 0 })
  };

  const result = await authenticateIngressRequest(
    pool, headers, secret, request
  );

  assert.deepEqual(result, {
    allowed: false,
    reason: 'REPLAY_DETECTED'
  });
});

test('03 - invalid signature rejected before database', async () => {
  const headers = signIngressRequest(secret, request);
  headers['x-segaloka-client-ip'] = '192.0.2.99';

  let called = false;
  const pool = {
    query: async () => {
      called = true;
      return { rowCount: 1 };
    }
  };

  const result = await authenticateIngressRequest(
    pool, headers, secret, request
  );

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'INVALID_SIGNATURE');
  assert.equal(called, false);
});

test('04 - database error fails closed', async () => {
  const headers = signIngressRequest(secret, request);
  const pool = {
    query: async () => {
      throw new Error('DATABASE_UNAVAILABLE');
    }
  };

  const result = await authenticateIngressRequest(
    pool, headers, secret, request
  );

  assert.deepEqual(result, {
    allowed: false,
    reason: 'NONCE_STORAGE_UNAVAILABLE'
  });
});

test('05 - changed HTTP target rejected', async () => {
  const headers = signIngressRequest(secret, request);
  const pool = {
    query: async () => ({ rowCount: 1 })
  };

  const result = await authenticateIngressRequest(
    pool,
    headers,
    secret,
    { ...request, target: '/auth/register' }
  );

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'INVALID_SIGNATURE');
});

test('06 - changed request body rejected', async () => {
  const headers = signIngressRequest(secret, request);
  const pool = {
    query: async () => ({ rowCount: 1 })
  };

  const result = await authenticateIngressRequest(
    pool,
    headers,
    secret,
    { ...request, body: Buffer.from('{}') }
  );

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'INVALID_SIGNATURE');
});