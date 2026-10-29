import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import {
  createSession,
  rotateSession
} from './session-service.js';

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
const email = `fh306-${userId}@example.invalid`;
let fixtureCreated = false;

function assert(name, condition) {
  console.log(`${name}: ${condition ? 'PASS' : 'FAIL'}`);
  if (!condition) {
    throw new Error(`TEST_FAILED: ${name}`);
  }
}

try {
  await pool.query(
    `INSERT INTO public.users
       (id, email, full_name, status, email_verified_at)
     VALUES ($1, $2, 'FH306 Test', 'active', now())`,
    [userId, email]
  );

  fixtureCreated = true;

  const initial = await createSession(pool, userId);

  const results = await Promise.allSettled([
    rotateSession(pool, initial.refreshToken),
    rotateSession(pool, initial.refreshToken)
  ]);

  const successes = results.filter(
    result => result.status === 'fulfilled' &&
      result.value?.refreshToken
  );

  const rejected = results.filter(
    result => result.status === 'fulfilled' &&
      result.value === null
  );

  const errors = results.filter(
    result => result.status === 'rejected'
  );

  console.log('Successful rotations:', successes.length);
  console.log('Rejected rotations:', rejected.length);
  console.log('Unexpected errors:', errors.length);

  assert('No database/runtime errors', errors.length === 0);
  assert('Exactly one rotation succeeds', successes.length === 1);
  assert('Second request rejected', rejected.length === 1);

  const state = await pool.query(
    `SELECT revoked_at
     FROM public.auth_sessions
     WHERE id = $1`,
    [initial.sessionId]
  );

  assert('Session exists', state.rows.length === 1);

  const revoked = state.rows[0].revoked_at !== null;

  console.log('Session revoked after concurrent refresh:', revoked);

  const current = successes[0].value.refreshToken;
  const next = await rotateSession(pool, current);

  console.log('Winning refresh token remains usable:', next !== null);

  const history = await pool.query(
    `SELECT count(*)::integer AS total,
            count(replay_detected_at)::integer AS replay_count
     FROM public.auth_refresh_token_history
     WHERE session_id = $1`,
    [initial.sessionId]
  );

  console.log('History records:', history.rows[0].total);
  console.log('Replay detections:', history.rows[0].replay_count);

  console.log('Q8-FH306 CONCURRENCY OBSERVATION COMPLETE');
} finally {
  try {
    if (fixtureCreated) {
      await pool.query(
        `DELETE FROM public.users WHERE id = $1`,
        [userId]
      );
      console.log('TEST DATA CLEANED');
    }
  } finally {
    await pool.end();
  }
}