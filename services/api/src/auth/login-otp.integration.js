import 'dotenv/config';
import pg from 'pg';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createLoginOtp, confirmLoginOtpDelivery } from './login-otp-service.js';
import { completeLoginOtp } from './login-otp-completion.js';

const secret = 'ab'.repeat(32);

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 1,
  connectionTimeoutMillis: 5000
});

const client = await pool.connect();
const userId = randomUUID();
const email = `otp-${userId}@example.invalid`;

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
          return client.query(
            `SAVEPOINT otp_test_${savepoint}`
          );
        }

        if (command === 'COMMIT') {
          const result = await client.query(
            `RELEASE SAVEPOINT otp_test_${savepoint}`
          );
          savepoint--;
          return result;
        }

        if (command === 'ROLLBACK') {
          await client.query(
            `ROLLBACK TO SAVEPOINT otp_test_${savepoint}`
          );

          const result = await client.query(
            `RELEASE SAVEPOINT otp_test_${savepoint}`
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

function passed(name) {
  console.log(`PASS: ${name}`);
}

try {
  await client.query('BEGIN');

  const role = await client.query(
    `SELECT id FROM public.roles
     WHERE code = 'traveler'`
  );

  assert.equal(role.rowCount, 1);

  await client.query(
    `INSERT INTO public.users (
       id, email, full_name,
       status, email_verified_at, two_factor_enabled
     ) VALUES (
       $1, $2, 'OTP Integration Test',
       'active', now(), true
     )`,
    [userId, email]
  );

  await client.query(
    `INSERT INTO public.memberships (
       user_id, role_id, organization_id
     ) VALUES ($1, $2, NULL)`,
    [userId, role.rows[0].id]
  );

  const first = await createLoginOtp(testPool, {
    userId,
    channel: 'email',
    secret
  });

  const deliveryConfirmation = await confirmLoginOtpDelivery(
    testPool,
    {
      challengeId: first.challengeId,
      userId
    }
  );

  assert.equal(deliveryConfirmation.confirmed, true);

  assert.match(first.code, /^[0-9]{6}$/);
  passed('OTP enam digit dibuat');

  const stored = await client.query(
    `SELECT code_hash, expires_at, consumed_at
     FROM public.auth_login_otp
     WHERE id = $1`,
    [first.challengeId]
  );

  assert.equal(stored.rowCount, 1);
  assert.notEqual(stored.rows[0].code_hash, first.code);
  passed('Database menyimpan hash OTP');

  const success = await completeLoginOtp(testPool, {
    challengeId: first.challengeId,
    code: first.code,
    secret
  });

  assert.equal(success.authenticated, true);
  assert.equal(success.user.id, userId);
  assert.match(
    success.session.refreshToken,
    /^[0-9a-f]{64}$/
  );

  passed('OTP benar menerbitkan sesi');

  const replay = await completeLoginOtp(testPool, {
    challengeId: first.challengeId,
    code: first.code,
    secret
  });

  assert.equal(replay.authenticated, false);
  passed('OTP tidak dapat digunakan ulang');

  await assert.rejects(
    createLoginOtp(testPool, {
      userId,
      channel: 'email',
      secret
    }),
    /OTP_RESEND_TOO_SOON/
  );

  passed('Resend sebelum 60 detik ditolak');

  await assert.rejects(
    createLoginOtp(testPool, {
      userId,
      channel: 'whatsapp',
      secret
    }),
    /OTP_CHANNEL_NOT_VERIFIED/
  );

  passed('WhatsApp belum terverifikasi ditolak');

  const session = await client.query(
    `SELECT id FROM public.auth_sessions
     WHERE id = $1 AND user_id = $2`,
    [success.session.sessionId, userId]
  );

  assert.equal(session.rowCount, 1);
  passed('Sesi tersimpan dalam transaksi pengujian');

  console.log('ALL OTP INTEGRATION TESTS PASSED');
} finally {
  try {
    await client.query('ROLLBACK');
    console.log('TEST DATA ROLLED BACK');
  } finally {
    client.release();
    await pool.end();
  }
}