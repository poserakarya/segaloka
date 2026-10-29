import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHmac } from 'node:crypto';
import Fastify from 'fastify';
import pg from 'pg';

import {
  registerLoginAuthenticatorVerifyRoute
} from './login-authenticator-verify-route.js';

import {
  createLoginPreAuth
} from './login-pre-auth-service.js';

import {
  generateTotpSecret,
  generateTotp
} from './totp-crypto.js';

import {
  encryptTotpSecret
} from './totp-secret-crypto.js';

import {
  hashAccessToken
} from './access-token-service.js';

const { Pool } = pg;

if (
  !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST) ||
  process.env.DB_PORT !== '5434' ||
  process.env.DB_NAME !== 'segaloka' ||
  process.env.DB_USER !== 'segaloka_app'
) {
  throw new Error('STOP: Database bukan PostgreSQL lokal Segaloka.');
}

const originalIpSecret = process.env.AUTH_IP_HASH_SECRET;
const testIpSecret = randomBytes(32).toString('hex');
process.env.AUTH_IP_HASH_SECRET = testIpSecret;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 5,
  connectionTimeoutMillis: 5000
});

const app = Fastify({ logger: false });

const userId = randomUUID();
const email = `totp-e2e-${userId}@example.invalid`;
const secret = generateTotpSecret();

const ipHash = createHmac('sha256', testIpSecret)
  .update('127.0.0.1')
  .digest('hex');

let userCreated = false;
let testPassed = false;

try {
  const roleResult = await pool.query(
    `SELECT id FROM public.roles WHERE lower(code) = 'traveler'`
  );

  assert.equal(roleResult.rowCount, 1);

  await pool.query(
    `INSERT INTO public.users
       (id, email, full_name, status,
        email_verified_at, two_factor_enabled)
     VALUES ($1, $2, $3, 'active', now(), true)`,
    [userId, email, 'TOTP E2E Test']
  );

  userCreated = true;

  await pool.query(
    `INSERT INTO public.memberships
       (user_id, role_id, organization_id)
     VALUES ($1, $2, NULL)`,
    [userId, roleResult.rows[0].id]
  );

  const encrypted = encryptTotpSecret({
    userId,
    secret
  });

  await pool.query(
    `INSERT INTO public.auth_totp_authenticators
       (user_id, secret_encrypted, encryption_iv,
        encryption_tag, enabled_at)
     VALUES ($1, $2, $3, $4, now())`,
    [
      userId,
      encrypted.secretEncrypted,
      encrypted.encryptionIv,
      encrypted.encryptionTag
    ]
  );

  const preAuthTickets = await Promise.all([
    createLoginPreAuth(pool, userId),
    createLoginPreAuth(pool, userId)
  ]);

  await registerLoginAuthenticatorVerifyRoute(app, pool);
  await app.ready();

  const code = generateTotp({ secret });

  const concurrentResponses = await Promise.all(
    preAuthTickets.map(({ ticket }) =>
      app.inject({
        method: 'POST',
        url: '/auth/login/verify-authenticator',
        payload: {
          preAuthTicket: ticket,
          code
        }
      })
    )
  );

  const successfulIndexes = concurrentResponses
    .map((result, index) => ({
      statusCode: result.statusCode,
      index
    }))
    .filter((result) => result.statusCode === 200)
    .map((result) => result.index);

  const rejectedCount = concurrentResponses
    .filter((result) => result.statusCode === 401)
    .length;

  assert.equal(
    successfulIndexes.length,
    1,
    `Harus tepat satu login berhasil: ${concurrentResponses.map((r) => r.statusCode).join(',')}`
  );

  assert.equal(
    rejectedCount,
    1,
    `Harus tepat satu login ditolak: ${concurrentResponses.map((r) => r.statusCode).join(',')}`
  );

  const preAuth = preAuthTickets[successfulIndexes[0]];
  const response = concurrentResponses[successfulIndexes[0]];

  console.log('PASS: Tepat satu login bersamaan berhasil');
  console.log('PASS: Permintaan login kedua ditolak');

  assert.equal(
    response.statusCode,
    200,
    `Login gagal: HTTP ${response.statusCode}; code=${response.json().code ?? 'unknown'}`
  );

  const body = response.json();

  assert.equal(body.authenticated, true);
  assert.equal(body.user.id, userId);
  assert.match(body.session.refreshToken, /^[0-9a-f]{64}$/);
  assert.match(body.session.accessToken, /^[0-9a-f]{64}$/);

  console.log('PASS: HTTP login Google Authenticator');

  const sessionResult = await pool.query(
    `SELECT mfa_verified_at, mfa_method
     FROM public.auth_sessions
     WHERE id = $1 AND user_id = $2`,
    [body.session.sessionId, userId]
  );

  assert.equal(sessionResult.rowCount, 1);
  assert.ok(sessionResult.rows[0].mfa_verified_at);
  assert.equal(sessionResult.rows[0].mfa_method, 'authenticator');

  console.log('PASS: Sesi MFA tersimpan');

  const accessResult = await pool.query(
    `SELECT id
     FROM public.auth_access_tokens
     WHERE session_id = $1
       AND token_hash = $2
       AND expires_at > now()`,
    [
      body.session.sessionId,
      hashAccessToken(body.session.accessToken)
    ]
  );

  assert.equal(accessResult.rowCount, 1);

  console.log('PASS: Access token valid di PostgreSQL');

  const ticketResult = await pool.query(
    `SELECT consumed_at
     FROM public.auth_login_pre_auth
     WHERE user_id = $1`,
    [userId]
  );

  assert.equal(
    ticketResult.rowCount,
    2,
    'Dua tiket pre-auth harus tercatat untuk pengujian konkurensi'
  );

  assert.ok(
    ticketResult.rows.some((ticket) => ticket.consumed_at),
    'Tiket yang berhasil digunakan harus dikonsumsi'
  );

  console.log('PASS: Dua tiket pre-auth tercatat');
  console.log('PASS: Tiket login berhasil dikonsumsi');

  const replayResponse = await app.inject({
    method: 'POST',
    url: '/auth/login/verify-authenticator',
    payload: {
      preAuthTicket: preAuth.ticket,
      code
    }
  });

  assert.equal(replayResponse.statusCode, 401);

  console.log('PASS: Penggunaan ulang tiket ditolak');

  // Uji replay: tiket baru, tetapi counter TOTP sudah digunakan.
  const sessionCountBeforeReplay = await pool.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_sessions
     WHERE user_id = $1
       AND revoked_at IS NULL
       AND expires_at > now()`,
    [userId]
  );

  const freshPreAuth = await createLoginPreAuth(pool, userId);

  const reusedCodeResponse = await app.inject({
    method: 'POST',
    url: '/auth/login/verify-authenticator',
    payload: {
      preAuthTicket: freshPreAuth.ticket,
      code
    }
  });

  assert.equal(
    reusedCodeResponse.statusCode,
    401,
    'TOTP yang sudah digunakan harus ditolak'
  );

  const sessionCountAfterReplay = await pool.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_sessions
     WHERE user_id = $1
       AND revoked_at IS NULL
       AND expires_at > now()`,
    [userId]
  );

  assert.equal(
    sessionCountAfterReplay.rows[0].total,
    sessionCountBeforeReplay.rows[0].total,
    'Replay tidak boleh menerbitkan sesi tambahan'
  );

  console.log('PASS: Kode TOTP yang digunakan ulang ditolak');
  console.log('PASS: Replay tidak menerbitkan sesi tambahan');
  console.log('Q8-FH290 REPLAY TEST PASS');
  testPassed = true;
} finally {
  let cleanupError;

  try {
    if (userCreated) {
      await pool.query(
        `DELETE FROM public.memberships WHERE user_id = $1`,
        [userId]
      );

      await pool.query(
        `DELETE FROM public.users WHERE id = $1`,
        [userId]
      );
    }

    await pool.query(
      `DELETE FROM public.auth_login_otp_attempts
       WHERE ip_hash = $1`,
      [ipHash]
    );

    const remaining = await pool.query(
      `SELECT
         (SELECT count(*) FROM public.users WHERE id = $1)
       + (SELECT count(*) FROM public.memberships WHERE user_id = $1)
       + (SELECT count(*) FROM public.auth_sessions WHERE user_id = $1)
       + (SELECT count(*) FROM public.auth_login_pre_auth WHERE user_id = $1)
       + (SELECT count(*) FROM public.auth_totp_authenticators WHERE user_id = $1)
       + (SELECT count(*) FROM public.auth_login_otp_attempts WHERE ip_hash = $2)
       AS total`,
      [userId, ipHash]
    );

    assert.equal(Number(remaining.rows[0].total), 0);

    console.log('PASS: Data pengujian dibersihkan');
  } catch (error) {
    cleanupError = error;
  } finally {
    await app.close();
    await pool.end();

    if (originalIpSecret === undefined) {
      delete process.env.AUTH_IP_HASH_SECRET;
    } else {
      process.env.AUTH_IP_HASH_SECRET = originalIpSecret;
    }
  }

  if (cleanupError) {
    throw new Error(
      `TEST_FIXTURE_CLEANUP_FAILED: ${cleanupError.message}`
    );
  }
}

if (testPassed) {
  console.log('Q8-FH288 TOTP E2E TEST PASS');
}