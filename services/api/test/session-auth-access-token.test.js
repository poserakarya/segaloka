import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createSessionAuth } from '../src/security/session-auth.js';

const TOKEN = 'a'.repeat(64);
const TOKEN_HASH = createHash('sha256')
  .update(TOKEN)
  .digest('hex');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';

function makeRequest(authorization) {
  return {
    headers: authorization === undefined
      ? {}
      : { authorization },
    log: {
      error() {}
    }
  };
}

function makeReply() {
  return {
    statusCode: 200,
    headers: {},
    payload: undefined,
    sent: false,

    header(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },

    code(status) {
      this.statusCode = status;
      return this;
    },

    send(payload) {
      this.payload = payload;
      this.sent = true;
      return this;
    }
  };
}

function makePool(row, onQuery) {
  return {
    async query(sql, params) {
      onQuery?.(sql, params);

      return {
        rowCount: row ? 1 : 0,
        rows: row ? [row] : []
      };
    }
  };
}

test('token valid menghasilkan request.auth', async () => {
  let queryCount = 0;

  const pool = makePool(
    { user_id: USER_ID, session_id: SESSION_ID },
    (sql, params) => {
      queryCount++;

      assert.match(sql, /FROM public\.auth_access_tokens a/);
      assert.match(sql, /a\.token_hash\s*=\s*\$1/);
      assert.match(sql, /a\.expires_at\s*>\s*now\(\)/);
      assert.match(sql, /s\.revoked_at\s+IS\s+NULL/);
      assert.match(sql, /s\.expires_at\s*>\s*now\(\)/);
      assert.match(sql, /u\.status\s*=\s*'active'/);
      // 2FA opsional: sesi akun ber-2FA wajib sudah terverifikasi MFA.
      assert.match(sql, /u\.two_factor_enabled\s*=\s*false\s+OR\s+s\.mfa_verified_at\s+IS\s+NOT\s+NULL/);
      // Kebijakan produk: Traveler baru boleh masuk sebelum verifikasi email
      // (verifikasi dilakukan di dalam dashboard), jadi sesi tidak
      // mensyaratkan email terverifikasi secara global.
      assert.doesNotMatch(sql, /email_verified_at/);

      assert.deepEqual(params, [TOKEN_HASH]);
    }
  );

  const request = makeRequest(`Bearer ${TOKEN}`);
  const reply = makeReply();

  await createSessionAuth(pool)(request, reply);

  assert.equal(queryCount, 1);
  assert.deepEqual(request.auth, {
    userId: USER_ID,
    sessionId: SESSION_ID,
    // Dipakai stream SSE untuk memeriksa ulang token yang sama.
    accessTokenHash: TOKEN_HASH
  });
  assert.equal(reply.sent, false);
  assert.equal(reply.headers['cache-control'], 'no-store');
});

test('header Authorization kosong menghasilkan 401', async () => {
  const pool = makePool(null, () => {
    throw new Error('Query tidak boleh dijalankan');
  });

  const request = makeRequest();
  const reply = makeReply();

  await createSessionAuth(pool)(request, reply);

  assert.equal(reply.statusCode, 401);
  assert.equal(reply.payload.code, 'AUTH_REQUIRED');
  assert.equal(reply.sent, true);
  assert.equal(request.auth, undefined);
});

test('format Bearer salah menghasilkan 401', async () => {
  const pool = makePool(null, () => {
    throw new Error('Query tidak boleh dijalankan');
  });

  const request = makeRequest('Bearer invalid');
  const reply = makeReply();

  await createSessionAuth(pool)(request, reply);

  assert.equal(reply.statusCode, 401);
  assert.equal(reply.payload.code, 'AUTH_REQUIRED');
  assert.equal(request.auth, undefined);
});

test('access token tidak ditemukan menghasilkan 401', async () => {
  const pool = makePool(null);

  const request = makeRequest(`Bearer ${TOKEN}`);
  const reply = makeReply();

  await createSessionAuth(pool)(request, reply);

  assert.equal(reply.statusCode, 401);
  assert.equal(reply.payload.code, 'INVALID_SESSION');
  assert.equal(request.auth, undefined);
});

test('token kedaluwarsa atau sesi dicabut ditolak', async () => {
  const pool = makePool(null, (sql) => {
    assert.match(sql, /a\.expires_at\s*>\s*now\(\)/);
    assert.match(sql, /s\.revoked_at\s+IS\s+NULL/);
    assert.match(sql, /s\.expires_at\s*>\s*now\(\)/);
  });

  const request = makeRequest(`Bearer ${TOKEN}`);
  const reply = makeReply();

  await createSessionAuth(pool)(request, reply);

  assert.equal(reply.statusCode, 401);
  assert.equal(reply.payload.code, 'INVALID_SESSION');
  assert.equal(request.auth, undefined);
});

test('kegagalan database menghasilkan 503', async () => {
  let logged = false;

  const pool = {
    async query() {
      throw new Error('DATABASE_UNAVAILABLE');
    }
  };

  const request = makeRequest(`Bearer ${TOKEN}`);

  request.log.error = () => {
    logged = true;
  };

  const reply = makeReply();

  await createSessionAuth(pool)(request, reply);

  assert.equal(reply.statusCode, 503);
  assert.equal(reply.payload.code, 'AUTH_SERVICE_UNAVAILABLE');
  assert.equal(request.auth, undefined);
  assert.equal(logged, true);
});