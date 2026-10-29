import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

import { hashPassword } from './password.js';
import { generateTotp } from './totp-crypto.js';
import { decryptTotpSecret } from './totp-secret-crypto.js';

import {
  beginTotpEnrollment,
  confirmTotpEnrollment,
  getTotpEnrollmentStatus
} from './totp-enrollment-service.js';

if (
  !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST) ||
  Number(process.env.DB_PORT) !== 5434 ||
  process.env.DB_NAME !== 'segaloka' ||
  process.env.DB_USER !== 'segaloka_app'
) {
  throw new Error('STOP: LOCAL_SEGALOKA_DATABASE_REQUIRED');
}

const previousKey = process.env.SEGALOKA_TOTP_ENCRYPTION_KEY;
process.env.SEGALOKA_TOTP_ENCRYPTION_KEY = 'ab'.repeat(32);

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 1,
  connectionTimeoutMillis: 5000
});

let client;
let savepoint = 0;

const testPool = {
  query(sql, params) {
    return client.query(sql, params);
  },
  async connect() {
    return {
      async query(sql, params) {
        const command = sql.trim().toUpperCase();

        if (command === 'BEGIN') {
          savepoint++;
          return client.query(`SAVEPOINT totp_test_${savepoint}`);
        }

        if (command === 'COMMIT') {
          const result = await client.query(
            `RELEASE SAVEPOINT totp_test_${savepoint}`
          );
          savepoint--;
          return result;
        }

        if (command === 'ROLLBACK') {
          await client.query(
            `ROLLBACK TO SAVEPOINT totp_test_${savepoint}`
          );
          const result = await client.query(
            `RELEASE SAVEPOINT totp_test_${savepoint}`
          );
          savepoint--;
          return result;
        }

        return client.query(sql, params);
      },
      release() {}
    };
  }
};

function pass(name) {
  console.log(`PASS: ${name}`);
}

try {
  client = await pool.connect();
  await client.query('BEGIN');

  const userId = randomUUID();
  const sessionId = randomUUID();
  const email = `totp-${userId}@example.invalid`;
  const password = 'Segaloka-TOTP-Integration-2026!';

  await client.query(
    `INSERT INTO public.users (
       id, email, full_name, status,
       email_verified_at, two_factor_enabled
     ) VALUES (
       $1, $2, 'TOTP Integration Test',
       'active', now(), false
     )`,
    [userId, email]
  );

  await client.query(
    `INSERT INTO public.user_credentials (
       user_id, password_hash
     ) VALUES ($1, $2)`,
    [userId, await hashPassword(password)]
  );

  const refreshTokenHash = (
    await import('node:crypto')
  ).createHash('sha256')
    .update(randomUUID())
    .digest('hex');

  await client.query(
    `INSERT INTO public.auth_sessions (
       id, user_id, refresh_token_hash, expires_at
     ) VALUES (
       $1, $2, $3, now() + interval '1 hour'
     )`,
    [sessionId, userId, refreshTokenHash]
  );

  const invalidPassword = await beginTotpEnrollment(testPool, {
    userId,
    sessionId,
    password: 'Wrong-Password!'
  });

  assert.equal(invalidPassword.success, false);
  assert.equal(invalidPassword.code, 'INVALID_PASSWORD');
  pass('Password salah ditolak');

  const invalidSession = await beginTotpEnrollment(testPool, {
    userId,
    sessionId: randomUUID(),
    password
  });

  assert.equal(invalidSession.success, false);
  assert.equal(invalidSession.code, 'INVALID_SESSION');
  pass('Sesi tidak valid ditolak');

  const begin = await beginTotpEnrollment(testPool, {
    userId,
    sessionId,
    password
  });

  assert.equal(begin.success, true);
  assert.match(begin.provisioningUri, /^otpauth:\/\/totp\//);
  pass('Enrollment berhasil dibuat');

  const duplicate = await beginTotpEnrollment(testPool, {
    userId,
    sessionId,
    password
  });

  assert.equal(duplicate.success, false);
  assert.equal(duplicate.code, 'ENROLLMENT_ALREADY_PENDING');
  pass('Enrollment aktif tidak dapat diulang');

  const enrollment = await client.query(
    `SELECT *
     FROM public.auth_totp_authenticators
     WHERE user_id = $1`,
    [userId]
  );

  assert.equal(enrollment.rowCount, 1);

  const secret = decryptTotpSecret({
    userId,
    secretEncrypted: enrollment.rows[0].secret_encrypted,
    encryptionIv: enrollment.rows[0].encryption_iv,
    encryptionTag: enrollment.rows[0].encryption_tag
  });

  const correctCode = generateTotp({ secret });
  const wrongCode = correctCode === '000000'
    ? '000001'
    : '000000';

  for (let attempt = 1; attempt <= 5; attempt++) {
    const result = await confirmTotpEnrollment(testPool, {
      userId,
      sessionId,
      code: wrongCode
    });

    assert.equal(result.success, false);
    assert.equal(result.code, 'INVALID_TOTP_CODE');

    const state = await client.query(
      `SELECT enrollment_attempts
       FROM public.auth_totp_authenticators
       WHERE user_id = $1`,
      [userId]
    );

    assert.equal(state.rows[0].enrollment_attempts, attempt);
    pass(`Kesalahan ${attempt}/5 tercatat`);
  }

  const blocked = await confirmTotpEnrollment(testPool, {
    userId,
    sessionId,
    code: correctCode
  });

  assert.equal(blocked.success, false);
  assert.equal(blocked.code, 'INVALID_OR_EXPIRED_ENROLLMENT');
  pass('Kode benar ditolak setelah lima kesalahan');

  await client.query(
    `UPDATE public.auth_totp_authenticators
     SET enrollment_expires_at = now() - interval '1 second'
     WHERE user_id = $1`,
    [userId]
  );

  const retry = await beginTotpEnrollment(testPool, {
    userId,
    sessionId,
    password
  });

  assert.equal(retry.success, true);
  pass('Enrollment baru diizinkan setelah kedaluwarsa');

  const refreshed = await client.query(
    `SELECT *
     FROM public.auth_totp_authenticators
     WHERE user_id = $1`,
    [userId]
  );

  const refreshedSecret = decryptTotpSecret({
    userId,
    secretEncrypted: refreshed.rows[0].secret_encrypted,
    encryptionIv: refreshed.rows[0].encryption_iv,
    encryptionTag: refreshed.rows[0].encryption_tag
  });

  const confirmation = await confirmTotpEnrollment(testPool, {
    userId,
    sessionId,
    code: generateTotp({ secret: refreshedSecret })
  });

  assert.equal(confirmation.success, true);
  assert.equal(confirmation.enabled, true);
  pass('Kode TOTP benar mengaktifkan authenticator');

  const status = await getTotpEnrollmentStatus(testPool, userId);

  assert.equal(status.enabled, true);
  assert.equal(status.pending, false);
  pass('Status authenticator aktif');

  const userState = await client.query(
    `SELECT two_factor_enabled
     FROM public.users WHERE id = $1`,
    [userId]
  );

  assert.equal(userState.rows[0].two_factor_enabled, true);
  pass('2FA akun aktif');

  const sessionState = await client.query(
    `SELECT revoked_at
     FROM public.auth_sessions WHERE id = $1`,
    [sessionId]
  );

  assert.ok(sessionState.rows[0].revoked_at);
  pass('Sesi lama dicabut');

  console.log('67K-8W12C: ALL TOTP INTEGRATION TESTS PASSED');
} finally {
  if (client) {
    try {
      await client.query('ROLLBACK');
      console.log('TEST DATA ROLLED BACK');
    } finally {
      client.release();
    }
  }

  await pool.end();

  if (previousKey === undefined) {
    delete process.env.SEGALOKA_TOTP_ENCRYPTION_KEY;
  } else {
    process.env.SEGALOKA_TOTP_ENCRYPTION_KEY = previousKey;
  }
}