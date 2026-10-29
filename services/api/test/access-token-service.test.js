import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  createAccessToken,
  hashAccessToken,
  ACCESS_TOKEN_TTL_SECONDS
} from '../src/auth/access-token-service.js';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

test('access token menggunakan TTL 15 menit', () => {
  assert.equal(ACCESS_TOKEN_TTL_SECONDS, 900);
});

test('hash access token menggunakan SHA-256', () => {
  const token = 'a'.repeat(64);

  const expected = createHash('sha256')
    .update(token)
    .digest('hex');

  assert.equal(hashAccessToken(token), expected);
});

test('format token tidak valid ditolak', () => {
  assert.throws(
    () => hashAccessToken('invalid-token'),
    /INVALID_ACCESS_TOKEN_FORMAT/
  );
});

test('access token diterbitkan untuk sesi valid', async () => {
  let queryCount = 0;

  const pool = {
    async query(sql, params) {
      queryCount++;

      assert.match(sql, /auth_access_tokens/);
      assert.match(sql, /auth_sessions/);
      assert.match(sql, /revoked_at IS NULL/);
      assert.match(sql, /expires_at > now\(\)/);

      assert.equal(params[0], SESSION_ID);
      assert.match(params[1], /^[0-9a-f]{64}$/);

      return {
        rowCount: 1,
        rows: [{
          expires_at: new Date(Date.now() + 900000)
        }]
      };
    }
  };

  const result = await createAccessToken(pool, SESSION_ID);

  assert.equal(queryCount, 1);
  assert.match(result.accessToken, /^[0-9a-f]{64}$/);
  assert.equal(result.tokenType, 'Bearer');
  assert.equal(result.expiresIn, 900);
});

test('sesi yang tidak valid tidak mendapat access token', async () => {
  const pool = {
    async query() {
      return {
        rowCount: 0,
        rows: []
      };
    }
  };

  const result = await createAccessToken(pool, SESSION_ID);

  assert.equal(result, null);
});

test('session ID tidak valid ditolak sebelum query', async () => {
  let called = false;

  const pool = {
    async query() {
      called = true;
    }
  };

  await assert.rejects(
    createAccessToken(pool, 'invalid-session'),
    /INVALID_SESSION_ID/
  );

  assert.equal(called, false);
});