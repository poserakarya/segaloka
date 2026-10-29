import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHmac } from 'node:crypto';
import Fastify from 'fastify';
import pg from 'pg';

import { registerLoginAuthenticatorVerifyRoute } from './login-authenticator-verify-route.js';
import { createLoginPreAuth } from './login-pre-auth-service.js';
import { generateTotpSecret, generateTotp } from './totp-crypto.js';
import { encryptTotpSecret } from './totp-secret-crypto.js';

const { Pool } = pg;

if (
  !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST) ||
  process.env.DB_PORT !== '5434' ||
  process.env.DB_NAME !== 'segaloka' ||
  process.env.DB_USER !== 'segaloka_app'
) {
  throw new Error('STOP: Database bukan PostgreSQL lokal Segaloka.');
}

if (!/^[0-9a-f]{64}$/.test(
  process.env.SEGALOKA_TOTP_ENCRYPTION_KEY ?? ''
)) {
  throw new Error('STOP: Kunci enkripsi TOTP tidak valid.');
}

const originalIpSecret = process.env.AUTH_IP_HASH_SECRET;
process.env.AUTH_IP_HASH_SECRET = randomBytes(32).toString('hex');
const ipSecret = process.env.AUTH_IP_HASH_SECRET;

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
const email = `totp-rollback-${userId}@example.invalid`;
const secret = generateTotpSecret();
const triggerName = 'trg_q8_fh296h_test_failure';
const functionName = 'q8_fh296h_test_failure';

const ipHash = createHmac('sha256', ipSecret)
  .update('127.0.0.1')
  .digest('hex');

let userCreated = false;
let triggerCreated = false;
let functionCreated = false;
let testPassed = false;
let cleanupError;

try {
  const role = await pool.query(
    `SELECT id FROM public.roles WHERE lower(code) = 'traveler'`
  );
  assert.equal(role.rowCount, 1);

  await pool.query(
    `INSERT INTO public.users
       (id, email, full_name, status, email_verified_at,
        two_factor_enabled)
     VALUES ($1, $2, $3, 'active', now(), true)`,
    [userId, email, 'TOTP Rollback Test']
  );
  userCreated = true;

  await pool.query(
    `INSERT INTO public.memberships (user_id, role_id, organization_id)
     VALUES ($1, $2, NULL)`,
    [userId, role.rows[0].id]
  );

  const encrypted = encryptTotpSecret({ userId, secret });

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

  const preAuth = await createLoginPreAuth(pool, userId);
  const before = await pool.query(
    `SELECT last_used_counter
     FROM public.auth_totp_authenticators
     WHERE user_id = $1`,
    [userId]
  );
  assert.equal(before.rowCount, 1);

  // Fail only for this isolated fixture; other accounts are unaffected.
  await pool.query(`
    CREATE FUNCTION public.${functionName}()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $rollback_test$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM public.auth_sessions s
        JOIN public.users u ON u.id = s.user_id
        WHERE s.id = NEW.session_id
          AND u.email LIKE 'totp-rollback-%@example.invalid'
      ) THEN
        RAISE EXCEPTION 'Q8_TEST_ACCESS_TOKEN_INSERT_FAILURE'
          USING ERRCODE = 'P0001';
      END IF;

      RETURN NEW;
    END;
    $rollback_test$;
  `);
  functionCreated = true;

  await pool.query(`
    CREATE TRIGGER ${triggerName}
    BEFORE INSERT ON public.auth_access_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.${functionName}();
  `);
  triggerCreated = true;

  await registerLoginAuthenticatorVerifyRoute(app, pool);
  await app.ready();

  const response = await app.inject({
    method: 'POST',
    url: '/auth/login/verify-authenticator',
    payload: {
      preAuthTicket: preAuth.ticket,
      code: generateTotp({ secret })
    }
  });

  assert.equal(response.statusCode, 500);
  assert.equal(response.json().authenticated, false);
  assert.equal(
    response.json().code,
    'AUTHENTICATOR_VERIFICATION_FAILED'
  );
  console.log('PASS: Kegagalan access token menghasilkan HTTP 500 generik');

  const state = await pool.query(
    `SELECT
       (SELECT count(*) FROM public.auth_sessions
        WHERE user_id = $1) AS sessions,
       (SELECT count(*) FROM public.auth_access_tokens t
        JOIN public.auth_sessions s ON s.id = t.session_id
        WHERE s.user_id = $1) AS access_tokens,
       (SELECT count(*) FROM public.auth_login_pre_auth
        WHERE user_id = $1 AND consumed_at IS NOT NULL) AS consumed_tickets,
       (SELECT last_used_counter
        FROM public.auth_totp_authenticators
        WHERE user_id = $1) AS current_counter,
       (SELECT attempts FROM public.auth_login_pre_auth
        WHERE user_id = $1) AS attempts`,
    [userId]
  );

  assert.equal(state.rowCount, 1);
  assert.equal(Number(state.rows[0].sessions), 0);
  assert.equal(Number(state.rows[0].access_tokens), 0);
  assert.equal(Number(state.rows[0].consumed_tickets), 0);
  assert.equal(
    state.rows[0].current_counter === null
      ? null
      : Number(state.rows[0].current_counter),
    before.rows[0].last_used_counter === null
      ? null
      : Number(before.rows[0].last_used_counter)
  );

  console.log('PASS: Tidak ada sesi parsial');
  console.log('PASS: Tidak ada access token parsial');
  console.log('PASS: Tiket tidak dikonsumsi oleh transaksi gagal');
  console.log('PASS: Counter TOTP tidak berubah');

  testPassed = true;
} finally {
  try {
    // Remove the temporary failure mechanism before other cleanup.
    if (triggerCreated) {
      await pool.query(
        `DROP TRIGGER IF EXISTS ${triggerName}
         ON public.auth_access_tokens`
      );
      triggerCreated = false;
    }

    if (functionCreated) {
      await pool.query(
        `DROP FUNCTION IF EXISTS public.${functionName}()`
      );
      functionCreated = false;
    }

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
      `DELETE FROM public.auth_login_otp_attempts WHERE ip_hash = $1`,
      [ipHash]
    );

    const remaining = await pool.query(
      `SELECT
         (SELECT count(*) FROM public.users WHERE id = $1)
       + (SELECT count(*) FROM public.auth_sessions WHERE user_id = $1)
       + (SELECT count(*) FROM public.auth_access_tokens t
          JOIN public.auth_sessions s ON s.id = t.session_id
          WHERE s.user_id = $1)
       + (SELECT count(*) FROM public.auth_login_pre_auth WHERE user_id = $1)
       + (SELECT count(*) FROM public.auth_totp_authenticators WHERE user_id = $1)
       + (SELECT count(*) FROM public.auth_login_otp_attempts WHERE ip_hash = $2)
       AS total`,
      [userId, ipHash]
    );

    assert.equal(Number(remaining.rows[0].total), 0);

    const objects = await pool.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM pg_trigger
           WHERE tgname = $1 AND NOT tgisinternal
         ) AS trigger_exists,
         EXISTS (
           SELECT 1 FROM pg_proc
           WHERE proname = $2
             AND pronamespace = 'public'::regnamespace
         ) AS function_exists`,
      [triggerName, functionName]
    );

    assert.equal(objects.rows[0].trigger_exists, false);
    assert.equal(objects.rows[0].function_exists, false);

    console.log('PASS: Fixture dan objek pengujian dibersihkan');
  } catch (error) {
    cleanupError = error;
  } finally {
    await app.close().catch(() => {});
    await pool.end().catch(() => {});

    if (originalIpSecret === undefined) {
      delete process.env.AUTH_IP_HASH_SECRET;
    } else {
      process.env.AUTH_IP_HASH_SECRET = originalIpSecret;
    }
  }

  if (cleanupError) {
    throw new Error(
      `ROLLBACK_TEST_CLEANUP_FAILED: ${cleanupError.message}`
    );
  }
}

if (testPassed) {
  console.log('Q8-FH296I ROLLBACK TEST PASS');
}