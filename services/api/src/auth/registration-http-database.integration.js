import 'dotenv/config';
import { randomUUID, createHmac } from 'node:crypto';
import Fastify from 'fastify';
import pg from 'pg';
import { registerRegistrationRoute } from './registration-route.js';
import { registerAndSendVerification } from './registration-workflow.js';

const { Pool } = pg;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true',
  max: 3,
  connectionTimeoutMillis: 5000
});

const app = Fastify({ logger: false });

const runId = randomUUID().replaceAll('-', '');
const email = `http-registration-${runId}@example.invalid`;
const ip = '127.0.0.1';
const secret = process.env.AUTH_IP_HASH_SECRET;

const ipHash = createHmac('sha256', secret)
  .update(ip)
  .digest('hex');

const input = {
  email,
  fullName: 'Segaloka HTTP Registration Test',
  password: `SecurePassword-${runId}!`
};

let userId = null;

try {
  assert(
    typeof secret === 'string' && secret.length >= 32,
    'IP_HASH_SECRET_MISSING'
  );

  await pool.query('SELECT 1');
  console.log('PostgreSQL connection: PASS');

  await registerRegistrationRoute(app, pool, {
    register: (db, data) =>
      registerAndSendVerification(db, data, {
        send: async () => ({ id: 'isolated-test' })
      })
  });

  await app.ready();

  const first = await app.inject({
    method: 'POST',
    url: '/auth/register',
    remoteAddress: ip,
    payload: input
  });

  assert(first.statusCode === 202, 'NEW_REGISTRATION_HTTP_STATUS');
  assert(first.headers['cache-control'] === 'no-store', 'CACHE_CONTROL_MISSING');

  console.log('New registration HTTP 202: PASS');

  const user = await pool.query(
    `SELECT id, email, email_verified_at
     FROM public.users
     WHERE email = $1`,
    [email]
  );

  assert(user.rowCount === 1, 'USER_NOT_PERSISTED');
  assert(user.rows[0].email_verified_at === null, 'USER_PREVERIFIED');

  userId = user.rows[0].id;

  const membership = await pool.query(
    `SELECT r.code
     FROM public.memberships m
     JOIN public.roles r ON r.id = m.role_id
     WHERE m.user_id = $1`,
    [userId]
  );

  assert(membership.rowCount === 1, 'MEMBERSHIP_MISSING');
  assert(membership.rows[0].code === 'traveler', 'ROLE_INVALID');

  console.log('User and traveler membership persisted: PASS');

  const second = await app.inject({
    method: 'POST',
    url: '/auth/register',
    remoteAddress: ip,
    payload: input
  });

  assert(second.statusCode === 202, 'DUPLICATE_HTTP_STATUS');
  assert(second.body === first.body, 'PUBLIC_RESPONSE_DIFFERENT');

  console.log('Duplicate HTTP 202: PASS');
  console.log('Identical public response: PASS');

  const attempts = await pool.query(
    `SELECT outcome, count(*)::integer AS total
     FROM public.auth_registration_attempts
     WHERE email_normalized = $1
     GROUP BY outcome`,
    [email]
  );

  const outcomes = Object.fromEntries(
    attempts.rows.map(row => [row.outcome, row.total])
  );

  assert(outcomes.success === 1, 'SUCCESS_AUDIT_MISSING');
  assert(outcomes.duplicate === 1, 'DUPLICATE_AUDIT_MISSING');

  console.log('Registration audit success: PASS');
  console.log('Registration audit duplicate: PASS');
  console.log('HTTP DATABASE REGISTRATION TEST PASSED');
} catch (error) {
  console.error('HTTP DATABASE REGISTRATION TEST FAILED');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `DELETE FROM public.auth_registration_attempts
         WHERE email_normalized = $1`,
        [email]
      );

      const lookup = await client.query(
        `SELECT id FROM public.users WHERE email = $1`,
        [email]
      );

      if (lookup.rowCount === 1) {
        const id = lookup.rows[0].id;

        await client.query(
          'DELETE FROM public.email_verifications WHERE user_id = $1',
          [id]
        );

        await client.query(
          'DELETE FROM public.memberships WHERE user_id = $1',
          [id]
        );

        await client.query(
          'DELETE FROM public.user_credentials WHERE user_id = $1',
          [id]
        );

        await client.query(
          'DELETE FROM public.users WHERE id = $1',
          [id]
        );
      }

      await client.query('COMMIT');
      console.log('Temporary database cleanup: PASS');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Cleanup failed:', error.message);
    process.exitCode = 1;
  }

  await app.close();
  await pool.end();
}