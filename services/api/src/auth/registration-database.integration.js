import 'dotenv/config';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';
import { registerPublicUser } from './registration-service.js';

const { Pool } = pg;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

const id = randomUUID().replaceAll('-', '');
const email = `registration-test-${id}@example.invalid`;
const password = `TestPassword-${id}!`;

let userId = null;
let cleanupNeeded = false;

try {
  await pool.query('SELECT 1');
  console.log('PostgreSQL connection: PASS');

  const result = await registerPublicUser(pool, {
    email,
    fullName: 'Segaloka Registration Test',
    password
  });

  assert(result?.userId, 'USER_ID_MISSING');
  assert(result?.verificationToken, 'VERIFICATION_TOKEN_MISSING');

  userId = result.userId;
  cleanupNeeded = true;

  console.log('Registration service: PASS');

  const users = await pool.query(
    `SELECT id, email, status, email_verified_at
     FROM public.users
     WHERE id = $1`,
    [userId]
  );

  assert(users.rowCount === 1, 'USER_NOT_PERSISTED');
  assert(users.rows[0].email === email, 'EMAIL_MISMATCH');
  assert(users.rows[0].status === 'active', 'USER_NOT_ACTIVE');
  assert(users.rows[0].email_verified_at === null, 'EMAIL_PREVERIFIED');

  console.log('User persisted: PASS');

  const credentials = await pool.query(
    `SELECT password_hash
     FROM public.user_credentials
     WHERE user_id = $1`,
    [userId]
  );

  assert(credentials.rowCount === 1, 'CREDENTIALS_NOT_PERSISTED');
  assert(
    credentials.rows[0].password_hash.startsWith('$argon2id$'),
    'PASSWORD_NOT_ARGON2ID'
  );
  assert(
    !credentials.rows[0].password_hash.includes(password),
    'PLAINTEXT_PASSWORD_DETECTED'
  );

  console.log('Argon2id credentials persisted: PASS');

  const memberships = await pool.query(
    `SELECT r.code
     FROM public.memberships m
     JOIN public.roles r ON r.id = m.role_id
     WHERE m.user_id = $1`,
    [userId]
  );

  assert(memberships.rowCount === 1, 'MEMBERSHIP_COUNT_INVALID');
  assert(
    memberships.rows[0].code === 'traveler',
    'TRAVELER_ROLE_MISSING'
  );

  console.log('Traveler membership persisted: PASS');

  const tokenHash = createHash('sha256')
    .update(result.verificationToken)
    .digest('hex');

  const verification = await pool.query(
    `SELECT token_hash, expires_at, consumed_at
     FROM public.email_verifications
     WHERE user_id = $1`,
    [userId]
  );

  assert(verification.rowCount === 1, 'VERIFICATION_NOT_PERSISTED');
  assert(
    verification.rows[0].token_hash === tokenHash,
    'VERIFICATION_HASH_MISMATCH'
  );
  assert(
    verification.rows[0].consumed_at === null,
    'VERIFICATION_ALREADY_CONSUMED'
  );
  assert(
    new Date(verification.rows[0].expires_at) > new Date(),
    'VERIFICATION_EXPIRED'
  );

  console.log('Verification token persisted securely: PASS');

  let duplicateRejected = false;

  try {
    await registerPublicUser(pool, {
      email,
      fullName: 'Duplicate Registration Test',
      password
    });
  } catch (error) {
    duplicateRejected = error?.message === 'EMAIL_ALREADY_REGISTERED';
  }

  assert(duplicateRejected, 'DUPLICATE_NOT_REJECTED');

  console.log('Duplicate email protection: PASS');
  console.log('REGISTRATION DATABASE TEST PASSED');
} catch (error) {
  console.error('REGISTRATION DATABASE TEST FAILED');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  try {
    if (cleanupNeeded && userId) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        await client.query(
          `DELETE FROM public.email_verifications
           WHERE user_id = $1`,
          [userId]
        );

        await client.query(
          `DELETE FROM public.memberships
           WHERE user_id = $1`,
          [userId]
        );

        await client.query(
          `DELETE FROM public.user_credentials
           WHERE user_id = $1`,
          [userId]
        );

        await client.query(
          `DELETE FROM public.users
           WHERE id = $1`,
          [userId]
        );

        await client.query('COMMIT');
        console.log('Temporary account cleanup: PASS');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  } catch (error) {
    console.error('Cleanup failed:', error.message);
    process.exitCode = 1;
  }

  await pool.end();
}