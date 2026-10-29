import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import {
  createSession,
  rotateSession
} from './session-service.js';
import { createAccessToken } from './access-token-service.js';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 5,
  connectionTimeoutMillis: 5000
});

const userId = randomUUID();
const email = `fh307c-${userId}@example.invalid`;
let fixtureCreated = false;

function assert(name, condition) {
  console.log(`${name}: ${condition ? 'PASS' : 'FAIL'}`);
  if (!condition) throw new Error(`TEST_FAILED: ${name}`);
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function sessionState(sessionId) {
  const result = await pool.query(
    `SELECT revoked_at FROM public.auth_sessions WHERE id = $1`,
    [sessionId]
  );
  return result.rows[0];
}

async function replayCount(sessionId) {
  const result = await pool.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_refresh_token_history
     WHERE session_id = $1
       AND replay_detected_at IS NOT NULL`,
    [sessionId]
  );
  return result.rows[0].total;
}

try {
  await pool.query(
    `INSERT INTO public.users
       (id, email, full_name, status, email_verified_at)
     VALUES ($1, $2, 'FH307C Test', 'active', now())`,
    [userId, email]
  );
  fixtureCreated = true;

  console.log('\n=== 1. CONCURRENT REFRESH ===');

  const a = await createSession(pool, userId);

  const results = await Promise.allSettled([
    rotateSession(pool, a.refreshToken),
    rotateSession(pool, a.refreshToken)
  ]);

  const successful = results.filter(
    x => x.status === 'fulfilled' && x.value?.refreshToken
  );
  const rejected = results.filter(
    x => x.status === 'fulfilled' && x.value === null
  );
  const errors = results.filter(x => x.status === 'rejected');

  assert('No unexpected errors', errors.length === 0);
  assert('Exactly one refresh succeeds', successful.length === 1);
  assert('Second refresh rejected', rejected.length === 1);

  assert(
    'Session survives concurrent refresh',
    (await sessionState(a.sessionId))?.revoked_at === null
  );

  assert(
    'No replay recorded inside grace window',
    await replayCount(a.sessionId) === 0
  );

  const winner = successful[0].value.refreshToken;
  const next = await rotateSession(pool, winner);

  assert('Winning refresh token usable', !!next?.refreshToken);

  console.log('\n=== 2. DELAYED REPLAY ===');

  const b = await createSession(pool, userId);
  const rotatedB = await rotateSession(pool, b.refreshToken);

  assert('Session B rotation succeeds', !!rotatedB?.refreshToken);

  await wait(2500);

  const delayedReplay = await rotateSession(pool, b.refreshToken);

  assert('Old token rejected after grace', delayedReplay === null);
  assert('Replay recorded after grace', await replayCount(b.sessionId) === 1);
  assert(
    'Session B revoked after grace',
    (await sessionState(b.sessionId))?.revoked_at !== null
  );

  assert(
    'New token B rejected after revocation',
    await rotateSession(pool, rotatedB.refreshToken) === null
  );

  console.log('\n=== 3. SESSION ISOLATION ===');

  assert(
    'Session A remains active',
    (await sessionState(a.sessionId))?.revoked_at === null
  );

  const currentA = await rotateSession(pool, next.refreshToken);

  assert('Session A can still refresh', !!currentA?.refreshToken);

  console.log('\nQ8-FH307C ALL TESTS PASSED');
} finally {
  try {
    if (fixtureCreated) {
      await pool.query(
        `DELETE FROM public.users WHERE id = $1`,
        [userId]
      );

      const remaining = await pool.query(
        `SELECT count(*)::integer AS total
         FROM public.auth_sessions
         WHERE user_id = $1`,
        [userId]
      );

      assert('Fixture sessions cleaned', remaining.rows[0].total === 0);
      console.log('TEST DATA CLEANED');
    }
  } finally {
    await pool.end();
  }
}