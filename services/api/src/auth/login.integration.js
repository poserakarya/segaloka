import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { loginWithPassword } from './login-service.js';
import { hashPassword } from './password.js';

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

function assert(name, condition) {
  console.log(`${name}: ${condition ? 'PASS' : 'FAIL'}`);
  if (!condition) throw new Error(`TEST_FAILED: ${name}`);
}

try {
  client = await pool.connect();
  await client.query('BEGIN');

  const userId = randomUUID();
  const email = `login-${userId}@example.invalid`;
  const password = 'Segaloka-Test-Password-2026!';

  const role = await client.query(
    `SELECT id FROM public.roles WHERE code = 'traveler'`
  );

  if (role.rows.length !== 1) {
    throw new Error('TRAVELER_ROLE_NOT_FOUND');
  }

  await client.query(
    `INSERT INTO public.users
       (id, email, full_name, status, email_verified_at)
     VALUES ($1, $2, 'Login Test', 'active', now())`,
    [userId, email]
  );

  await client.query(
    `INSERT INTO public.user_credentials
       (user_id, password_hash)
     VALUES ($1, $2)`,
    [userId, await hashPassword(password)]
  );

  await client.query(
    `INSERT INTO public.memberships
       (user_id, role_id, organization_id)
     VALUES ($1, $2, NULL)`,
    [userId, role.rows[0].id]
  );

  const testPool = {
    query: (sql, params) => client.query(sql, params)
  };

  const valid = await loginWithPassword(testPool, {
    email,
    password
  });

  assert(
    'Valid credentials accepted',
    valid.authenticated === false && valid.credentialsVerified === true
  );

  assert(
    'Correct user returned',
    valid.user?.id === userId &&
    valid.user?.email === email
  );

  assert(
    'Traveler role loaded',
    valid.user?.memberships?.some(
      item => item.role === 'traveler'
    )
  );

  assert(
    'Credential verification does not issue a session',
    valid.session === undefined
  );

  const session = await client.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_sessions
     WHERE user_id = $1`,
    [userId]
  );

  assert(
    'No session created before authentication completion',
    session.rows[0].total === 0
  );

  const wrongPassword = await loginWithPassword(testPool, {
    email,
    password: 'Wrong-Password-2026!'
  });

  assert(
    'Wrong password rejected',
    wrongPassword.authenticated === false
  );

  const unknownEmail = await loginWithPassword(testPool, {
    email: 'unknown@example.invalid',
    password
  });

  assert(
    'Unknown email rejected',
    unknownEmail.authenticated === false &&
    unknownEmail.reason === wrongPassword.reason
  );

  await client.query(
    `UPDATE public.users
     SET email_verified_at = NULL
     WHERE id = $1`,
    [userId]
  );

  const unverified = await loginWithPassword(testPool, {
    email,
    password
  });

  assert(
    'Unverified account rejected',
    unverified.authenticated === false
  );

  await client.query(
    `UPDATE public.users
     SET email_verified_at = now(),
         status = 'disabled'
     WHERE id = $1`,
    [userId]
  );

  const disabled = await loginWithPassword(testPool, {
    email,
    password
  });

  assert(
    'Disabled account rejected',
    disabled.authenticated === false
  );

  console.log('ALL LOGIN TESTS PASSED');
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