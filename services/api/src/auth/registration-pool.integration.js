import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { withRegistrationLimit } from './registration-rate-limit.js';

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
  max: 2,
  connectionTimeoutMillis: 3000,
  query_timeout: 5000
});

const runId = randomUUID().replaceAll('-', '');
const email = `pool-${runId}@example.invalid`;
const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
const secret = process.env.AUTH_IP_HASH_SECRET;

let operations = 0;
let blocked = 0;
let completed = 0;

try {
  assert(
    typeof secret === 'string' && secret.length >= 32,
    'IP_HASH_SECRET_MISSING'
  );

  await pool.query('SELECT 1');

  console.log('PostgreSQL connection: PASS');
  console.log('Pool maximum: 2');

  const tasks = Array.from({ length: 8 }, async () => {
    const result = await withRegistrationLimit(
      pool,
      { email, ip, ipHashSecret: secret },
      async () => {
        operations++;

        const client = await pool.connect();

        try {
          await client.query('SELECT pg_sleep(0.05)');
        } finally {
          client.release();
        }

        return { success: true };
      }
    );

    if (result.allowed) {
      completed++;
    } else {
      blocked++;
    }

    return result;
  });

  const results = await Promise.all(tasks);

  assert(results.length === 8, 'RESULT_COUNT_INVALID');
  assert(completed === 5, 'ALLOWED_COUNT_INVALID');
  assert(blocked === 3, 'BLOCKED_COUNT_INVALID');
  assert(operations === 5, 'OPERATION_COUNT_INVALID');

  console.log('Concurrent requests: 8');
  console.log('Allowed requests: 5');
  console.log('Blocked requests: 3');
  console.log('Operation executions: 5');
  console.log('Pool concurrency: PASS');
  console.log('Rate limit concurrency: PASS');
  console.log('REGISTRATION POOL TEST PASSED');
} catch (error) {
  console.error('REGISTRATION POOL TEST FAILED');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  try {
    await pool.query(
      `DELETE FROM public.auth_registration_attempts
       WHERE email_normalized = $1`,
      [email]
    );

    console.log('Temporary test records cleanup: PASS');
  } catch (error) {
    console.error('Temporary cleanup failed:', error.message);
    process.exitCode = 1;
  }

  await pool.end();
}