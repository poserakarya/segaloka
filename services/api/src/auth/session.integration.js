import 'dotenv/config';
import pg from 'pg';
import { randomUUID, createHash } from 'node:crypto';
import {
  createSession,
  rotateSession,
  revokeSession,
  revokeAllUserSessions
} from './session-service.js';

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
const userId = randomUUID();
const email = `session-${userId}@example.invalid`;

let savepoint = 0;

const testPool = {
  async query(sql, params) {
    return client.query(sql, params);
  },
  async connect() {
    return {
      async query(sql, params) {
        const command = sql.trim().toUpperCase();

        if (command === 'BEGIN') {
          savepoint++;
          return client.query(`SAVEPOINT session_test_${savepoint}`);
        }

        if (command === 'COMMIT') {
          const result = await client.query(
            `RELEASE SAVEPOINT session_test_${savepoint}`
          );
          savepoint--;
          return result;
        }

        if (command === 'ROLLBACK') {
          await client.query(
            `ROLLBACK TO SAVEPOINT session_test_${savepoint}`
          );
          const result = await client.query(
            `RELEASE SAVEPOINT session_test_${savepoint}`
          );
          savepoint--;
          return result;
        }

        return client.query(sql, params);
      },
      release() {}
    };
  }
};

function assert(name, condition) {
  console.log(`${name}: ${condition ? 'PASS' : 'FAIL'}`);

  if (!condition) {
    throw new Error(`TEST_FAILED: ${name}`);
  }
}

try {
  await client.query('BEGIN');

  await client.query(
    `INSERT INTO public.users
       (id, email, full_name, status, email_verified_at)
     VALUES ($1, $2, 'Session Test', 'active', now())`,
    [userId, email]
  );

  const first = await createSession(testPool, userId);

  assert(
    'Session created',
    /^[0-9a-f]{64}$/.test(first.refreshToken) &&
    Boolean(first.sessionId)
  );

  const stored = await client.query(
    `SELECT refresh_token_hash, revoked_at
     FROM public.auth_sessions
     WHERE id = $1`,
    [first.sessionId]
  );

  assert(
    'Refresh token stored as hash',
    stored.rows.length === 1 &&
    stored.rows[0].refresh_token_hash ===
      createHash('sha256')
        .update(first.refreshToken)
        .digest('hex') &&
    stored.rows[0].refresh_token_hash !== first.refreshToken
  );

  const rotated = await rotateSession(
    testPool,
    first.refreshToken
  );

  assert(
    'Refresh token rotated',
    rotated?.sessionId === first.sessionId &&
    rotated.refreshToken !== first.refreshToken
  );

  const oldToken = await rotateSession(
    testPool,
    first.refreshToken
  );

  assert('Old refresh token rejected', oldToken === null);

  const logout = await revokeSession(
    testPool,
    rotated.refreshToken
  );

  assert('Logout revoked session', logout === true);

  const revokedToken = await rotateSession(
    testPool,
    rotated.refreshToken
  );

  assert('Revoked token rejected', revokedToken === null);

  const second = await createSession(testPool, userId);
  const third = await createSession(testPool, userId);

  const revokedCount = await revokeAllUserSessions(
    testPool,
    userId
  );

  assert(
    'All active sessions revoked',
    revokedCount === 2
  );

  const remaining = await client.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_sessions
     WHERE user_id = $1
       AND revoked_at IS NULL`,
    [userId]
  );

  assert(
    'No active sessions remain',
    remaining.rows[0].total === 0
  );

  assert(
    'Distinct session tokens',
    second.refreshToken !== third.refreshToken
  );

  console.log('ALL SESSION TESTS PASSED');
} finally {
  try {
    await client.query('ROLLBACK');
    console.log('TEST DATA ROLLED BACK');
  } finally {
    client.release();
    await pool.end();
  }
}