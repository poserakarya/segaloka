import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { hashPassword } from './password.js';
import { secureLogin } from './secure-login-service.js';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 12,
  connectionTimeoutMillis: 10000
});

const secret = process.env.AUTH_IP_HASH_SECRET;

if (!/^[0-9a-f]{64}$/.test(secret || '')) {
  throw new Error('AUTH_IP_HASH_SECRET_INVALID');
}

const id = randomUUID();
const email = `parallel-${id}@example.invalid`;
const ip = `parallel-ip-${id}`;
const password = 'Segaloka-Parallel-Test-2026!';

function assert(name, passed) {
  console.log(`${name}: ${passed ? 'PASS' : 'FAIL'}`);

  if (!passed) {
    throw new Error(`TEST_FAILED: ${name}`);
  }
}

let fixtureCreated = false;

try {
  const role = await pool.query(
    `SELECT id FROM public.roles WHERE code = 'traveler'`
  );

  if (role.rows.length !== 1) {
    throw new Error('TRAVELER_ROLE_NOT_FOUND');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO public.users
         (id, email, full_name, status, email_verified_at)
       VALUES ($1, $2, 'Parallel Login Test', 'active', now())`,
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

    await client.query('COMMIT');
    fixtureCreated = true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const requests = Array.from(
    { length: 10 },
    () => secureLogin(
      pool,
      {
        email,
        password: 'Incorrect-Password-2026!'
      },
      {
        ip,
        ipHashSecret: secret
      }
    )
  );

  const results = await Promise.all(requests);

  const failures = results.filter(
    result =>
      result.authenticated === false &&
      result.reason === 'INVALID_CREDENTIALS'
  );

  const blocked = results.filter(
    result =>
      result.authenticated === false &&
      result.reason === 'RATE_LIMITED'
  );

  assert(
    'Ten parallel requests completed',
    results.length === 10
  );

  assert(
    'Exactly five invalid credentials',
    failures.length === 5
  );

  assert(
    'Exactly five requests rate limited',
    blocked.length === 5
  );

  const attempts = await pool.query(
    `SELECT outcome, count(*)::integer AS total
     FROM public.auth_attempts
     WHERE email_normalized = $1
     GROUP BY outcome`,
    [email]
  );

  const counts = Object.fromEntries(
    attempts.rows.map(row => [row.outcome, row.total])
  );

  assert(
    'Five failures persisted',
    counts.failure === 5
  );

  assert(
    'Five blocks persisted',
    counts.blocked === 5
  );

  const sessions = await pool.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_sessions
     WHERE user_id = $1`,
    [id]
  );

  assert(
    'No session created',
    sessions.rows[0].total === 0
  );

  console.log('ALL PARALLEL LOGIN TESTS PASSED');
} finally {
  try {
    if (fixtureCreated) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        await client.query(
          `DELETE FROM public.auth_attempts
           WHERE email_normalized = $1`,
          [email]
        );

        await client.query(
          `DELETE FROM public.auth_sessions
           WHERE user_id = $1`,
          [id]
        );

        await client.query(
          `DELETE FROM public.memberships
           WHERE user_id = $1`,
          [id]
        );

        await client.query(
          `DELETE FROM public.user_credentials
           WHERE user_id = $1`,
          [id]
        );

        await client.query(
          `DELETE FROM public.users
           WHERE id = $1`,
          [id]
        );

        await client.query('COMMIT');
        console.log('TEST DATA CLEANED');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}