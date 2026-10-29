import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'node:crypto';

import {
  issueEmailVerification,
  consumeEmailVerification
} from './email-verification-service.js';

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

let transactionOpen = false;

function assert(name, condition) {
  console.log(`${name}: ${condition ? 'PASS' : 'FAIL'}`);

  if (!condition) {
    throw new Error(`TEST_FAILED: ${name}`);
  }
}

try {
  await client.query('BEGIN');
  transactionOpen = true;

  const userId = randomUUID();
  const email = `test-${userId}@example.invalid`;

  await client.query(
    `INSERT INTO public.users
       (id, email, full_name, status)
     VALUES ($1, $2, $3, $4)`,
    [userId, email, 'Segaloka Verification Test', 'active']
  );

  const transactionalPool = {
    connect: async () => ({
      query: async (sql, params) => {
        if (sql === 'BEGIN') {
          return client.query('SAVEPOINT verification_test');
        }

        if (sql === 'COMMIT') {
          return client.query('RELEASE SAVEPOINT verification_test');
        }

        if (sql === 'ROLLBACK') {
          await client.query('ROLLBACK TO SAVEPOINT verification_test');
          return client.query('RELEASE SAVEPOINT verification_test');
        }

        return client.query(sql, params);
      },
      release: () => {}
    })
  };

  const issued = await issueEmailVerification(
    transactionalPool,
    userId,
    email
  );

  assert(
    'Token issued',
    typeof issued.token === 'string' &&
    issued.token.length === 64
  );

  const stored = await client.query(
    `SELECT token_hash
     FROM public.email_verifications
     WHERE user_id = $1`,
    [userId]
  );

  assert(
    'Token hash stored',
    stored.rowCount === 1 &&
    stored.rows[0].token_hash !== issued.token
  );

  const first = await consumeEmailVerification(
    transactionalPool,
    issued.token
  );

  assert('Email verified', first.verified === true);

  const user = await client.query(
    `SELECT email_verified_at
     FROM public.users
     WHERE id = $1`,
    [userId]
  );

  assert(
    'Verification timestamp saved',
    user.rows[0].email_verified_at !== null
  );

  const second = await consumeEmailVerification(
    transactionalPool,
    issued.token
  );

  assert(
    'Token replay rejected',
    second.verified === false
  );

  console.log('ALL INTEGRATION TESTS PASSED');
} finally {
  if (transactionOpen) {
    try {
      await client.query('ROLLBACK');
      console.log('TEST DATA ROLLED BACK');
    } catch (error) {
      console.error('ROLLBACK FAILED:', error.message);
      process.exitCode = 1;
    }
  }

  client.release();
  await pool.end();
}