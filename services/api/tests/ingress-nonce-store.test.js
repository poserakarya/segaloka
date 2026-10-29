import test from 'node:test';
import assert from 'node:assert/strict';
import { reserveIngressNonce } from '../src/security/ingress-nonce-store.js';

const identity = {
  ip: '192.0.2.10',
  nonce: 'a'.repeat(32),
  timestamp: Date.now()
};

test('01 - first nonce accepted', async () => {
  const pool = {
    query: async () => ({ rowCount: 1 })
  };

  assert.equal(await reserveIngressNonce(pool, identity), true);
});

test('02 - replayed nonce rejected', async () => {
  const pool = {
    query: async () => ({ rowCount: 0 })
  };

  assert.equal(await reserveIngressNonce(pool, identity), false);
});

test('03 - database failure rejects request', async () => {
  const pool = {
    query: async () => {
      throw new Error('DATABASE_UNAVAILABLE');
    }
  };

  await assert.rejects(
    reserveIngressNonce(pool, identity),
    /DATABASE_UNAVAILABLE/
  );
});

test('04 - invalid nonce rejected before database', async () => {
  let called = false;

  const pool = {
    query: async () => {
      called = true;
      return { rowCount: 1 };
    }
  };

  await assert.rejects(
    reserveIngressNonce(pool, { ...identity, nonce: 'invalid' }),
    /INVALID_NONCE_RESERVATION/
  );

  assert.equal(called, false);
});

test('05 - parameterized SQL used', async () => {
  let captured;

  const pool = {
    query: async (sql, params) => {
      captured = { sql, params };
      return { rowCount: 1 };
    }
  };

  await reserveIngressNonce(pool, identity);

  assert.match(captured.sql, /ON CONFLICT \(nonce\) DO NOTHING/);
  assert.equal(captured.params.length, 4);
  assert.equal(captured.params[0], identity.nonce);
});

test('06 - nonce expiry covers signature validity window', async () => {
  let params;

  const pool = {
    query: async (_sql, values) => {
      params = values;
      return { rowCount: 1 };
    }
  };

  await reserveIngressNonce(pool, identity);

  const signatureTime = Date.parse(params[2]);
  const expiresAt = Date.parse(params[3]);

  assert.equal(expiresAt - signatureTime, 30000);
});