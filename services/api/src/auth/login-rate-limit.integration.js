import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import {
  checkLoginRateLimit,
  recordLoginAttempt
} from './login-rate-limit.js';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 1,
  connectionTimeoutMillis: 5000
});

const secret = 'integration-test-only-secret-' + randomUUID();
const id = randomUUID();
const email = `rate-${id}@example.invalid`;
const ip = `test-ip-${id}`;

function assert(name, condition) {
  console.log(`${name}: ${condition ? 'PASS' : 'FAIL'}`);
  if (!condition) throw new Error(`TEST_FAILED: ${name}`);
}

let client;

try {
  client = await pool.connect();
  await client.query('BEGIN');

  const testPool = {
    query: (sql, params) => client.query(sql, params)
  };

  const base = { email, ip, ipHashSecret: secret };

  const initial = await checkLoginRateLimit(testPool, base);
  assert('Initial request allowed', initial.allowed === true);

  for (let i = 0; i < 4; i++) {
    await recordLoginAttempt(testPool, {
      ...base,
      outcome: 'failure'
    });
  }

  const afterFour = await checkLoginRateLimit(testPool, base);
  assert('Four failures allowed', afterFour.allowed === true);

  await recordLoginAttempt(testPool, {
    ...base,
    outcome: 'failure'
  });

  const afterFive = await checkLoginRateLimit(testPool, base);
  assert('Five email failures blocked', afterFive.allowed === false);

  const differentIp = await checkLoginRateLimit(testPool, {
    email,
    ip: `different-${id}`,
    ipHashSecret: secret
  });

  assert(
    'Email limit applies across IPs',
    differentIp.allowed === false
  );

  const otherEmail = await checkLoginRateLimit(testPool, {
    email: `other-${id}@example.invalid`,
    ip: `different-${id}`,
    ipHashSecret: secret
  });

  assert(
    'Unrelated email and IP allowed',
    otherEmail.allowed === true
  );

  const sharedIp = `shared-${id}`;

  for (let i = 0; i < 20; i++) {
    await recordLoginAttempt(testPool, {
      email: `shared-${i}-${id}@example.invalid`,
      ip: sharedIp,
      ipHashSecret: secret,
      outcome: 'failure'
    });
  }

  const ipLimited = await checkLoginRateLimit(testPool, {
    email: `new-${id}@example.invalid`,
    ip: sharedIp,
    ipHashSecret: secret
  });

  assert('Twenty IP failures blocked', ipLimited.allowed === false);

  const stored = await client.query(
    `SELECT ip_hash
     FROM public.auth_attempts
     WHERE email_normalized = $1`,
    [email]
  );

  assert(
    'IP stored as HMAC hash',
    stored.rows.length === 5 &&
    stored.rows.every(
      row => /^[0-9a-f]{64}$/.test(row.ip_hash) &&
        row.ip_hash !== ip
    )
  );

  console.log('ALL RATE LIMIT TESTS PASSED');
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