import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import {
  createSession,
  rotateSession
} from './session-service.js';
import { createAccessToken } from './access-token-service.js';
import { createSessionAuth } from '../security/session-auth.js';

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
const email = `fh305-${userId}@example.invalid`;
let fixtureCreated = false;

function assert(name, condition) {
  console.log(`${name}: ${condition ? 'PASS' : 'FAIL'}`);
  if (!condition) throw new Error(`TEST_FAILED: ${name}`);
}

async function validateAccessToken(token) {
  const request = {
    headers: { authorization: `Bearer ${token}` },
    log: { error() {} }
  };

  const reply = {
    statusCode: 200,
    header() { return this; },
    code(value) {
      this.statusCode = value;
      return this;
    },
    send(payload) {
      this.payload = payload;
      return this;
    }
  };

  await createSessionAuth(pool)(request, reply);

  return {
    statusCode: reply.statusCode,
    auth: request.auth
  };
}

try {
  await pool.query(
    `INSERT INTO public.users
       (id, email, full_name, status, email_verified_at)
     VALUES ($1, $2, 'FH305 Test', 'active', now())`,
    [userId, email]
  );

  fixtureCreated = true;

  const sessionA = await createSession(pool, userId);
  const sessionB = await createSession(pool, userId);

  assert('Two distinct sessions', sessionA.sessionId !== sessionB.sessionId);

  const accessA = await createAccessToken(pool, sessionA.sessionId);
  const accessB = await createAccessToken(pool, sessionB.sessionId);

  assert('Access token A issued', !!accessA?.accessToken);
  assert('Access token B issued', !!accessB?.accessToken);

  const beforeA = await validateAccessToken(accessA.accessToken);
  const beforeB = await validateAccessToken(accessB.accessToken);

  assert('Access A valid before replay', beforeA.statusCode === 200 && beforeA.auth?.userId === userId);
  assert('Access B valid before replay', beforeB.statusCode === 200 && beforeB.auth?.userId === userId);

  const rotatedA = await rotateSession(pool, sessionA.refreshToken);

  assert('Session A rotated', !!rotatedA?.refreshToken);

  const replay = await rotateSession(pool, sessionA.refreshToken);

  assert('Replay rejected', replay === null);

  const state = await pool.query(
    `SELECT id, revoked_at
     FROM public.auth_sessions
     WHERE user_id = $1`,
    [userId]
  );

  const byId = new Map(state.rows.map(row => [row.id, row]));

  assert('Session A revoked', byId.get(sessionA.sessionId)?.revoked_at !== null);
  assert('Session B remains active', byId.get(sessionB.sessionId)?.revoked_at === null);

  const afterA = await validateAccessToken(accessA.accessToken);
  const afterB = await validateAccessToken(accessB.accessToken);

  assert('Access A rejected after replay', afterA.statusCode === 401);
  assert('Access B remains valid', afterB.statusCode === 200 && afterB.auth?.userId === userId);

  const refreshA = await rotateSession(pool, rotatedA.refreshToken);
  const refreshB = await rotateSession(pool, sessionB.refreshToken);

  assert('Refresh A rejected', refreshA === null);
  assert('Refresh B succeeds', !!refreshB?.refreshToken);

  console.log('Q8-FH305 ALL ISOLATION TESTS PASSED');
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

      assert('Test sessions cleaned', remaining.rows[0].total === 0);
      console.log('TEST DATA CLEANED');
    }
  } finally {
    await pool.end();
  }
}