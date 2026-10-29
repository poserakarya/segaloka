import 'dotenv/config';
import pg from 'pg';
import { randomUUID, createHash } from 'node:crypto';
import { createSession, rotateSession } from './session-service.js';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 3,
  connectionTimeoutMillis: 5000
});

const userId = randomUUID();
const email = `replay-test-${userId}@example.invalid`;
let fixtureCreated = false;

function assert(name, condition) {
  console.log(`${name}: ${condition ? 'PASS' : 'FAIL'}`);
  if (!condition) throw new Error(`TEST_FAILED: ${name}`);
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

try {
  console.log('=== 1. BUAT AKUN SEMENTARA ===');

  await pool.query(
    `INSERT INTO public.users
       (id, email, full_name, status, email_verified_at)
     VALUES ($1, $2, 'Replay Test', 'active', now())`,
    [userId, email]
  );

  fixtureCreated = true;

  const initial = await createSession(pool, userId);

  assert(
    'Initial token valid',
    /^[0-9a-f]{64}$/.test(initial.refreshToken)
  );

  console.log('=== 2. ROTASI TOKEN ===');

  const rotated = await rotateSession(
    pool,
    initial.refreshToken
  );

  assert('Rotation succeeded', rotated !== null);

  assert(
    'New token generated',
    /^[0-9a-f]{64}$/.test(rotated?.refreshToken || '') &&
    rotated.refreshToken !== initial.refreshToken
  );

  assert(
    'Session ID unchanged',
    rotated.sessionId === initial.sessionId
  );

  const history = await pool.query(
    `SELECT token_hash, session_id, user_id, replay_detected_at
     FROM public.auth_refresh_token_history
     WHERE session_id = $1`,
    [initial.sessionId]
  );

  assert('Exactly one history record', history.rows.length === 1);

  assert(
    'Old token hash stored',
    history.rows[0].token_hash === hashToken(initial.refreshToken)
  );

  assert(
    'History linked to correct user',
    history.rows[0].user_id === userId
  );

  assert(
    'Replay initially absent',
    history.rows[0].replay_detected_at === null
  );

  const active = await pool.query(
    `SELECT refresh_token_hash, revoked_at
     FROM public.auth_sessions
     WHERE id = $1`,
    [initial.sessionId]
  );

  assert(
    'New token persisted',
    active.rows.length === 1 &&
    active.rows[0].refresh_token_hash === hashToken(rotated.refreshToken)
  );

  console.log('=== 3. DETEKSI REPLAY ===');

  const replay = await rotateSession(pool, initial.refreshToken);

  assert('Old token rejected', replay === null);

  const detected = await pool.query(
    `SELECT replay_detected_at
     FROM public.auth_refresh_token_history
     WHERE session_id = $1 AND token_hash = $2`,
    [initial.sessionId, hashToken(initial.refreshToken)]
  );

  assert(
    'Replay timestamp recorded',
    detected.rows.length === 1 &&
    detected.rows[0].replay_detected_at !== null
  );

  const stillActive = await pool.query(
    `SELECT revoked_at
     FROM public.auth_sessions
     WHERE id = $1`,
    [initial.sessionId]
  );

  assert(
    'Session revoked after replay',
    stillActive.rows.length === 1 &&
    stillActive.rows[0].revoked_at !== null
  );

  console.log('=== 4. VERIFIKASI TOKEN BARU ===');

  const nextRotation = await rotateSession(
    pool,
    rotated.refreshToken
  );

  assert(
    'Current token rejected after replay',
    nextRotation === null
  );

  const historyCount = await pool.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_refresh_token_history
     WHERE session_id = $1`,
    [initial.sessionId]
  );

  assert(
    'No second rotation after replay',
    historyCount.rows[0].total === 1
  );

  console.log('ALL REPLAY TESTS PASSED');
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

      const remainingHistory = await pool.query(
        `SELECT count(*)::integer AS total
         FROM public.auth_refresh_token_history
         WHERE user_id = $1`,
        [userId]
      );

      assert('Sessions cleaned', remaining.rows[0].total === 0);
      assert('History cleaned', remainingHistory.rows[0].total === 0);

      console.log('TEST DATA CLEANED');
    }
  } finally {
    await pool.end();
  }
}