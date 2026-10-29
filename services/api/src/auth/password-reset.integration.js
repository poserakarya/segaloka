import 'dotenv/config';
import pg from 'pg';
import { randomUUID, createHash } from 'node:crypto';
import {
  requestPasswordReset,
  confirmPasswordReset
} from './password-reset-service.js';
import { hashPassword, verifyPassword } from './password.js';

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
const email = `reset-${userId}@example.invalid`;
const oldPassword = 'Segaloka-Old-Password-2026!';
const newPassword = 'Segaloka-New-Password-2026!';

let savepoint = 0;

const transactionalPool = {
  async connect() {
    return {
      async query(sql, params) {
        const command = sql.trim().toUpperCase();

        if (command === 'BEGIN') {
          savepoint++;
          return client.query(`SAVEPOINT auth_test_${savepoint}`);
        }

        if (command === 'COMMIT') {
          const result = await client.query(
            `RELEASE SAVEPOINT auth_test_${savepoint}`
          );
          savepoint--;
          return result;
        }

        if (command === 'ROLLBACK') {
          await client.query(
            `ROLLBACK TO SAVEPOINT auth_test_${savepoint}`
          );
          const result = await client.query(
            `RELEASE SAVEPOINT auth_test_${savepoint}`
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

function assert(name, condition) {
  console.log(`${name}: ${condition ? 'PASS' : 'FAIL'}`);
  if (!condition) throw new Error(`TEST_FAILED: ${name}`);
}

try {
  await client.query('BEGIN');

  await client.query(
    `INSERT INTO public.users
       (id, email, full_name, status, email_verified_at)
     VALUES ($1, $2, 'Reset Test', 'active', now())`,
    [userId, email]
  );

  await client.query(
    `INSERT INTO public.user_credentials
       (user_id, password_hash)
     VALUES ($1, $2)`,
    [userId, await hashPassword(oldPassword)]
  );

  const sessionId = randomUUID();

  await client.query(
    `INSERT INTO public.auth_sessions
       (id, user_id, refresh_token_hash, expires_at)
     VALUES ($1, $2, $3, now() + interval '7 days')`,
    [
      sessionId,
      userId,
      createHash('sha256')
        .update(randomUUID())
        .digest('hex')
    ]
  );

  const request = await requestPasswordReset(
    transactionalPool,
    email
  );

  assert(
    'Reset token issued',
    /^[0-9a-f]{64}$/.test(request?.token || '')
  );

  const stored = await client.query(
    `SELECT token_hash
     FROM public.password_reset_requests
     WHERE user_id = $1`,
    [userId]
  );

  assert(
    'Token stored as hash',
    stored.rows.length === 1 &&
    stored.rows[0].token_hash !== request.token &&
    stored.rows[0].token_hash ===
      createHash('sha256').update(request.token).digest('hex')
  );

  const result = await confirmPasswordReset(
    transactionalPool,
    request.token,
    newPassword
  );

  assert('Password reset succeeded', result.reset === true);

  const credentials = await client.query(
    `SELECT password_hash
     FROM public.user_credentials
     WHERE user_id = $1`,
    [userId]
  );

  const passwordHash = credentials.rows[0].password_hash;

  assert(
    'New password valid',
    await verifyPassword(passwordHash, newPassword)
  );

  assert(
    'Old password rejected',
    !(await verifyPassword(passwordHash, oldPassword))
  );

  const replay = await confirmPasswordReset(
    transactionalPool,
    request.token,
    newPassword
  );

  assert('Reset token replay rejected', replay.reset === false);

  const session = await client.query(
    `SELECT revoked_at
     FROM public.auth_sessions
     WHERE id = $1`,
    [sessionId]
  );

  assert(
    'Old session revoked',
    session.rows[0].revoked_at !== null
  );

  console.log('ALL PASSWORD RESET TESTS PASSED');
} finally {
  await client.query('ROLLBACK');
  client.release();
  await pool.end();
  console.log('TEST DATA ROLLED BACK');
}