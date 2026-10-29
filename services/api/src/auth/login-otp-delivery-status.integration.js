import 'dotenv/config';
import pg from 'pg';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import {
  createLoginOtp,
  confirmLoginOtpDelivery,
  recordLoginOtpDeliveryFailure
} from './login-otp-service.js';

import { completeLoginOtp } from './login-otp-completion.js';

const secret = 'ab'.repeat(32);

if (
  !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST) ||
  Number(process.env.DB_PORT) !== 5434 ||
  process.env.DB_NAME !== 'segaloka'
) {
  throw new Error('STOP: TEST_REQUIRES_LOCAL_SEGALOKA_DATABASE');
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
let transactionActive = false;

try {
  client = await pool.connect();
  await client.query('BEGIN');
  transactionActive = true;

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
            return client.query(`SAVEPOINT otp_delivery_${savepoint}`);
          }

          if (command === 'COMMIT') {
            const result = await client.query(
              `RELEASE SAVEPOINT otp_delivery_${savepoint}`
            );
            savepoint--;
            return result;
          }

          if (command === 'ROLLBACK') {
            await client.query(
              `ROLLBACK TO SAVEPOINT otp_delivery_${savepoint}`
            );
            const result = await client.query(
              `RELEASE SAVEPOINT otp_delivery_${savepoint}`
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
  const email = `otp-delivery-${userId}@example.invalid`;

  const role = await client.query(
    "SELECT id FROM public.roles WHERE code = 'traveler'"
  );

  assert.equal(role.rowCount, 1);

  await client.query(
    `INSERT INTO public.users
       (id, email, full_name, status, email_verified_at, two_factor_enabled)
     VALUES ($1, $2, 'OTP Delivery Test', 'active', now(), true)`,
    [userId, email]
  );

  await client.query(
    `INSERT INTO public.memberships
       (user_id, role_id, organization_id)
     VALUES ($1, $2, NULL)`,
    [userId, role.rows[0].id]
  );

  async function createChallenge() {
    return createLoginOtp(testPool, {
      userId,
      channel: 'email',
      secret
    });
  }

  async function verify(challenge) {
    return completeLoginOtp(testPool, {
      challengeId: challenge.challengeId,
      code: challenge.code,
      secret
    });
  }

  async function getStatus(challenge) {
    const result = await client.query(
      `SELECT delivery_status, consumed_at
       FROM public.auth_login_otp
       WHERE id = $1`,
      [challenge.challengeId]
    );
    return result.rows[0];
  }

  // 1. Pending must never authenticate.
  const pending = await createChallenge();
  assert.equal((await getStatus(pending)).delivery_status, 'pending');
  assert.equal((await verify(pending)).authenticated, false);
  console.log('PASS: pending tidak dapat login');

  // 2. Failed must never authenticate.
  const failedResult = await recordLoginOtpDeliveryFailure(testPool, {
    challengeId: pending.challengeId,
    userId,
    status: 'failed'
  });

  assert.equal(failedResult.recorded, true);
  assert.equal((await getStatus(pending)).delivery_status, 'failed');
  assert.equal((await verify(pending)).authenticated, false);
  console.log('PASS: failed tidak dapat login');

  // 3. Unknown must never authenticate.
  const unknown = await createChallenge();

  const unknownResult = await recordLoginOtpDeliveryFailure(testPool, {
    challengeId: unknown.challengeId,
    userId,
    status: 'unknown'
  });

  assert.equal(unknownResult.recorded, true);
  assert.equal((await getStatus(unknown)).delivery_status, 'unknown');
  assert.equal((await verify(unknown)).authenticated, false);
  console.log('PASS: unknown tidak dapat login');

  // Unknown retains cooldown protection.
  await assert.rejects(
    () => createChallenge(),
    /OTP_RESEND_TOO_SOON/
  );
  console.log('PASS: unknown mempertahankan cooldown');

  // Simulate cooldown elapsed, within the rollback-only transaction.
  await client.query(
    `UPDATE public.auth_login_otp
     SET last_sent_at = now() - interval '61 seconds'
     WHERE id = $1`,
    [unknown.challengeId]
  );

  // 4. Sent challenge is valid.
  const sent = await createChallenge();

  const confirmed = await confirmLoginOtpDelivery(testPool, {
    challengeId: sent.challengeId,
    userId
  });

  assert.equal(confirmed.confirmed, true);
  assert.equal((await getStatus(sent)).delivery_status, 'sent');
  console.log('PASS: konfirmasi sent berhasil');

  // 5. Failed replacement must not invalidate previously sent OTP.
  await client.query(
    `UPDATE public.auth_login_otp
     SET last_sent_at = now() - interval '61 seconds'
     WHERE id = $1`,
    [sent.challengeId]
  );

  const replacement = await createChallenge();

  const replacementFailure = await recordLoginOtpDeliveryFailure(
    testPool,
    {
      challengeId: replacement.challengeId,
      userId,
      status: 'failed'
    }
  );

  assert.equal(replacementFailure.recorded, true);
  assert.equal((await getStatus(sent)).consumed_at, null);
  assert.equal((await verify(replacement)).authenticated, false);
  console.log('PASS: OTP pengganti gagal tidak membatalkan OTP lama');

  // 6. Previously sent OTP still authenticates.
  const authenticated = await verify(sent);
  assert.equal(authenticated.authenticated, true);
  console.log('PASS: OTP lama yang sent tetap dapat login');

  console.log('ALL OTP DELIVERY STATUS TESTS PASSED');
} finally {
  if (client) {
    if (transactionActive) {
      try {
        await client.query('ROLLBACK');
        console.log('TEST DATA ROLLED BACK');
      } catch (error) {
        console.error('ROLLBACK FAILED:', error.message);
      }
    }
    client.release();
  }

  await pool.end();
}