import 'dotenv/config';
import pg from 'pg';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createLoginOtp, confirmLoginOtpDelivery } from './login-otp-service.js';
import { completeLoginOtp } from './login-otp-completion.js';

const secret = 'ab'.repeat(32);

if (Number(process.env.DB_PORT) !== 5434 ||
    !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST)) {
  throw new Error('STOP: TEST_REQUIRES_LOCAL_DOCKER_PORT_5434');
}

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

try {
  client = await pool.connect();
  await client.query('BEGIN');

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
            return client.query(`SAVEPOINT otp_limit_${savepoint}`);
          }

          if (command === 'COMMIT') {
            const result = await client.query(
              `RELEASE SAVEPOINT otp_limit_${savepoint}`
            );
            savepoint--;
            return result;
          }

          if (command === 'ROLLBACK') {
            await client.query(
              `ROLLBACK TO SAVEPOINT otp_limit_${savepoint}`
            );
            const result = await client.query(
              `RELEASE SAVEPOINT otp_limit_${savepoint}`
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

  const userId = randomUUID();
  const email = `otp-limit-${userId}@example.invalid`;

  const role = await client.query(
    "SELECT id FROM public.roles WHERE code = 'traveler'"
  );

  assert.equal(role.rowCount, 1);

  await client.query(
    `INSERT INTO public.users
       (id, email, full_name, status, email_verified_at, two_factor_enabled)
     VALUES ($1, $2, 'OTP Limit Test', 'active', now(), true)`,
    [userId, email]
  );

  await client.query(
    `INSERT INTO public.memberships
       (user_id, role_id, organization_id)
     VALUES ($1, $2, NULL)`,
    [userId, role.rows[0].id]
  );

  const challenge = await createLoginOtp(testPool, {
    userId,
    channel: 'email',
    secret
  });

  const deliveryConfirmation = await confirmLoginOtpDelivery(
    testPool,
    {
      challengeId: challenge.challengeId,
      userId
    }
  );

  assert.equal(deliveryConfirmation.confirmed, true);

  const wrongCode = challenge.code === '000000'
    ? '000001'
    : '000000';

  for (let attempt = 1; attempt <= 5; attempt++) {
    const result = await completeLoginOtp(testPool, {
      challengeId: challenge.challengeId,
      code: wrongCode,
      secret
    });

    assert.equal(result.authenticated, false);

    const stored = await client.query(
      `SELECT attempts FROM public.auth_login_otp
       WHERE id = $1`,
      [challenge.challengeId]
    );

    assert.equal(stored.rows[0].attempts, attempt);
    console.log(`PASS: Kesalahan ${attempt}/5 tercatat`);
  }

  const sixth = await completeLoginOtp(testPool, {
    challengeId: challenge.challengeId,
    code: wrongCode,
    secret
  });

  assert.equal(sixth.authenticated, false);

  const correctAfterLimit = await completeLoginOtp(testPool, {
    challengeId: challenge.challengeId,
    code: challenge.code,
    secret
  });

  assert.equal(correctAfterLimit.authenticated, false);
  console.log('PASS: OTP benar ditolak setelah lima kesalahan');

  const sessions = await client.query(
    'SELECT count(*)::integer AS total FROM public.auth_sessions WHERE user_id = $1',
    [userId]
  );

  assert.equal(sessions.rows[0].total, 0);
  console.log('PASS: Tidak ada sesi diterbitkan');

  console.log('ALL OTP ATTEMPT LIMIT TESTS PASSED');
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
}