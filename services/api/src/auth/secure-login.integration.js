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
  max: 5,
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

const id = randomUUID();
const email = `atomic-${id}@example.invalid`;
const password = 'Segaloka-Atomic-Test-2026!';
const ip = `atomic-ip-${id}`;
const options = { ip, ipHashSecret: secret };

let client;
let fixtureCommitted = false;

try {
  client = await pool.connect();
  await client.query('BEGIN');

  const role = await client.query(
    `SELECT id FROM public.roles WHERE code = 'traveler'`
  );

  if (role.rows.length !== 1) {
    throw new Error('TRAVELER_ROLE_NOT_FOUND');
  }

  await client.query(
    `INSERT INTO public.users
       (id, email, full_name, status, email_verified_at)
     VALUES ($1, $2, 'Atomic Login Test', 'active', now())`,
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
  fixtureCommitted = true;
  client.release();
  client = null;

  const success = await secureLogin(
    pool,
    { email, password },
    options
  );

  assert(
    'Secure login accepted',
    success.authenticated === true
  );

  const successfulSessions = await pool.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_sessions
     WHERE user_id = $1`,
    [id]
  );

  assert(
    'Successful session committed',
    successfulSessions.rows[0].total === 1
  );

  const successfulAttempts = await pool.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_attempts
     WHERE email_normalized = $1
       AND outcome = 'success'`,
    [email]
  );

  assert(
    'Successful attempt committed',
    successfulAttempts.rows[0].total === 1
  );

  // Trigger sementara untuk mensimulasikan kegagalan audit.
  // Dibuat di transaksi terpisah agar tidak mengubah skema permanen.
  client = await pool.connect();
  await client.query('BEGIN');

  await client.query(`
    CREATE OR REPLACE FUNCTION pg_temp.reject_login_audit()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RAISE EXCEPTION 'TEST_AUDIT_FAILURE';
    END;
    $$
  `);

  // Pengujian kegagalan audit menggunakan pool pembungkus
  // yang menolak INSERT audit setelah INSERT sesi.
  await client.query('ROLLBACK');
  client.release();
  client = null;

  const before = await pool.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_sessions
     WHERE user_id = $1`,
    [id]
  );

  const originalConnect = pool.connect.bind(pool);

  const wrappedPool = {
    async connect() {
      const connection = await originalConnect();

      return {
        async query(sql, params) {
          if (
            typeof sql === 'string' &&
            /INSERT\s+INTO\s+public\.auth_attempts/i.test(sql)
          ) {
            throw new Error('TEST_AUDIT_FAILURE');
          }

          return connection.query(sql, params);
        },
        release() {
          connection.release();
        }
      };
    }
  };

  let failureCaught = false;

  try {
    await secureLogin(
      wrappedPool,
      { email, password },
      options
    );
  } catch (error) {
    failureCaught =
      error.message === 'TEST_AUDIT_FAILURE';
  }

  assert(
    'Audit failure propagated',
    failureCaught
  );

  const after = await pool.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_sessions
     WHERE user_id = $1`,
    [id]
  );

  assert(
    'Session rolled back on audit failure',
    after.rows[0].total === before.rows[0].total
  );

  console.log('ALL ATOMIC LOGIN TESTS PASSED');
} finally {
  if (client) {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }

  if (fixtureCommitted) {
    const cleanup = await pool.connect();

    try {
      await cleanup.query('BEGIN');

      await cleanup.query(
        `DELETE FROM public.auth_attempts
         WHERE email_normalized = $1`,
        [email]
      );

      await cleanup.query(
        `DELETE FROM public.auth_sessions
         WHERE user_id = $1`,
        [id]
      );

      await cleanup.query(
        `DELETE FROM public.memberships
         WHERE user_id = $1`,
        [id]
      );

      await cleanup.query(
        `DELETE FROM public.user_credentials
         WHERE user_id = $1`,
        [id]
      );

      await cleanup.query(
        `DELETE FROM public.users
         WHERE id = $1`,
        [id]
      );

      await cleanup.query('COMMIT');
      console.log('TEST DATA CLEANED');
    } catch (error) {
      await cleanup.query('ROLLBACK');
      console.error('TEST CLEANUP FAILED');
      throw error;
    } finally {
      cleanup.release();
    }
  }

  await pool.end();
}