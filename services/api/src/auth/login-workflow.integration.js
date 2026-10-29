import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { hashPassword } from './password.js';
import { loginWithProtection } from './login-workflow.js';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 1,
  connectionTimeoutMillis: 5000
});

const secret = process.env.AUTH_IP_HASH_SECRET;

if (!/^[0-9a-f]{64}$/.test(secret || '')) {
  throw new Error('AUTH_IP_HASH_SECRET_INVALID');
}

function assert(name, passed) {
  console.log(`${name}: ${passed ? 'PASS' : 'FAIL'}`);
  if (!passed) throw new Error(`TEST_FAILED: ${name}`);
}

let client;

try {
  client = await pool.connect();
  await client.query('BEGIN');

  const id = randomUUID();
  const email = `workflow-${id}@example.invalid`;
  const password = 'Segaloka-Workflow-Test-2026!';
  const ip = `integration-${id}`;

  const role = await client.query(
    `SELECT id FROM public.roles WHERE code = 'traveler'`
  );

  if (role.rows.length !== 1) {
    throw new Error('TRAVELER_ROLE_NOT_FOUND');
  }

  await client.query(
    `INSERT INTO public.users
       (id, email, full_name, status, email_verified_at)
     VALUES ($1, $2, 'Workflow Test', 'active', now())`,
    [id, email]
  );

  await client.query(
    `INSERT INTO public.user_credentials
       (user_id, password_hash)
     VALUES ($1, $2)`,
    [id, await hashPassword(password)]
  );

  await client.query(
    `INSERT INTO public.memberships
       (user_id, role_id, organization_id)
     VALUES ($1, $2, NULL)`,
    [id, role.rows[0].id]
  );

  const testPool = {
    query: (sql, params) => client.query(sql, params)
  };

  const options = {
    ip,
    ipHashSecret: secret
  };

  const success = await loginWithProtection(
    testPool,
    { email, password },
    options
  );

  assert(
    'Valid login accepted',
    success.authenticated === false && success.credentialsVerified === true
  );

  assert(
    'Credential verification does not issue a session',
    success.session === undefined
  );

  for (let i = 0; i < 5; i++) {
    const failed = await loginWithProtection(
      testPool,
      { email, password: 'Wrong-Password-2026!' },
      options
    );

    assert(
      `Invalid password ${i + 1} rejected`,
      failed.authenticated === false &&
      failed.reason === 'INVALID_CREDENTIALS'
    );
  }

  const blocked = await loginWithProtection(
    testPool,
    { email, password },
    options
  );

  assert(
    'Rate limit blocks correct password',
    blocked.authenticated === false &&
    blocked.reason === 'RATE_LIMITED'
  );

  const attempts = await client.query(
    `SELECT outcome, count(*)::integer AS total
     FROM public.auth_attempts
     WHERE email_normalized = $1
     GROUP BY outcome`,
    [email]
  );

  const counts = Object.fromEntries(
    attempts.rows.map(row => [row.outcome, row.total])
  );

  assert('Success recorded', counts.success === 1);
  assert('Failures recorded', counts.failure === 5);
  assert('Blocked attempt recorded', counts.blocked === 1);

  const sessions = await client.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_sessions
     WHERE user_id = $1`,
    [id]
  );

  assert(
    'No session created during credential verification',
    sessions.rows[0].total === 0
  );

  console.log('ALL WORKFLOW DATABASE TESTS PASSED');
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