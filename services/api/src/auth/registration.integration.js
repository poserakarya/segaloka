import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'node:crypto';

import { registerPublicUser } from './registration-service.js';
import { verifyPassword } from './password.js';
import { hashEmailToken } from './email-token.js';

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
let savepointActive = false;

function assert(name, condition) {
  console.log(`${name}: ${condition ? 'PASS' : 'FAIL'}`);
  if (!condition) throw new Error(`TEST_FAILED: ${name}`);
}

const transactionalPool = {
  connect: async () => ({
    query: async (sql, params) => {
      if (sql === 'BEGIN') {
        if (savepointActive) {
          throw new Error('NESTED_TEST_TRANSACTION');
        }
        await client.query('SAVEPOINT registration_test');
        savepointActive = true;
        return;
      }

      if (sql === 'COMMIT') {
        await client.query('RELEASE SAVEPOINT registration_test');
        savepointActive = false;
        return;
      }

      if (sql === 'ROLLBACK') {
        await client.query('ROLLBACK TO SAVEPOINT registration_test');
        await client.query('RELEASE SAVEPOINT registration_test');
        savepointActive = false;
        return;
      }

      return client.query(sql, params);
    },
    release: () => {}
  })
};

try {
  await client.query('BEGIN');
  transactionOpen = true;

  const unique = randomUUID();
  const email = `TEST-${unique}@EXAMPLE.INVALID`;
  const password = 'Segaloka-Registration-Test-2026';

  const registered = await registerPublicUser(
    transactionalPool,
    {
      email,
      fullName: 'Segaloka Test User',
      password
    }
  );

  assert(
    'Email normalized',
    registered.email === email.toLowerCase()
  );

  const user = await client.query(
    `SELECT email, email_verified_at
     FROM public.users
     WHERE id = $1`,
    [registered.userId]
  );

  assert(
    'User created',
    user.rowCount === 1
  );

  assert(
    'Email not verified',
    user.rows[0].email_verified_at === null
  );

  const credential = await client.query(
    `SELECT password_hash
     FROM public.user_credentials
     WHERE user_id = $1`,
    [registered.userId]
  );

  assert(
    'Argon2id stored',
    credential.rowCount === 1 &&
    credential.rows[0].password_hash.startsWith('$argon2id$')
  );

  assert(
    'Password verification',
    await verifyPassword(
      credential.rows[0].password_hash,
      password
    )
  );

  const roles = await client.query(
    `SELECT r.code
     FROM public.memberships m
     JOIN public.roles r ON r.id = m.role_id
     WHERE m.user_id = $1`,
    [registered.userId]
  );

  assert(
    'Traveler role only',
    roles.rowCount === 1 &&
    roles.rows[0].code === 'traveler'
  );

  const token = await client.query(
    `SELECT token_hash, expires_at
     FROM public.email_verifications
     WHERE user_id = $1`,
    [registered.userId]
  );

  assert(
    'Verification token hash stored',
    token.rowCount === 1 &&
    token.rows[0].token_hash ===
      hashEmailToken(registered.verificationToken)
  );

  let duplicateRejected = false;

  try {
    await registerPublicUser(
      transactionalPool,
      {
        email: email.toLowerCase(),
        fullName: 'Duplicate Test',
        password
      }
    );
  } catch (error) {
    duplicateRejected =
      error.message === 'EMAIL_ALREADY_REGISTERED';
  }

  assert('Duplicate email rejected', duplicateRejected);

  console.log('ALL REGISTRATION TESTS PASSED');
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