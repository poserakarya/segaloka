import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { randomBytes } from 'node:crypto';
import {
  createGoogleOAuthExchange,
  consumeGoogleOAuthExchange
} from './google-oauth-exchange-service.js';
import {
  signIngressRequest,
  verifyIngressRequest
} from '../../../../projects/Segaloka-webs/src/lib/segaloka-ingress-v3.mjs';
import { TEST_DATABASE_SKIP, testDatabaseConfig } from '../../test/support/test-database.js';

const { Pool } = pg;
const database = testDatabaseConfig();
const USER_ID = '5880901b-8238-4ed6-98ba-8d84311455b6';
const SESSION_ID = '741d38b2-16e2-4872-b16f-2e13e9ca4428';
const TEST_TIMEOUT = 10000;

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), TEST_TIMEOUT);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function usingClient(pool, callback) {
  const client = await withTimeout(pool.connect(), 'POOL_CONNECT');
  try { return await withTimeout(callback(client), 'CLIENT_OPERATION'); }
  finally { client.release(); }
}

async function issueExchange(pool) {
  return usingClient(pool, client => createGoogleOAuthExchange(client, {
    user: {
      id: USER_ID,
      email: 'local-test@example.invalid',
      fullName: 'Local Integration Test',
      memberships: [{ role: 'traveler', organizationId: null }]
    },
    session: {
      sessionId: SESSION_ID,
      refreshToken: 'a'.repeat(64),
      accessToken: 'b'.repeat(64)
    }
  }));
}

test('Google OAuth exchange passes runtime security cases', {
  skip: database ? false : TEST_DATABASE_SKIP,
  timeout: TEST_TIMEOUT * 2
}, async () => {
  const previousKey = process.env.OAUTH_CONFIG_ENCRYPTION_KEY;
  process.env.OAUTH_CONFIG_ENCRYPTION_KEY = randomBytes(32).toString('hex');
  const pool = new Pool({
    ...database,
    max: 4,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 1000
  });

  let original;
  let createdUser = false;
  let createdSession = false;
  try {
    // Fixture terisolasi di database *_test: dibuat bila belum ada dan
    // dihapus lagi di akhir bila dibuat oleh tes ini.
    createdUser = (await pool.query(
      `INSERT INTO public.users (id, email, full_name, status, email_verified_at)
       VALUES ($1, 'local-test@example.invalid', 'Local Integration Test', 'active', now())
       ON CONFLICT (id) DO NOTHING`,
      [USER_ID]
    )).rowCount === 1;
    createdSession = (await pool.query(
      `INSERT INTO public.auth_sessions (id, user_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, encode(digest($3, 'sha256'), 'hex'), now() + interval '1 hour')
       ON CONFLICT (id) DO NOTHING`,
      [SESSION_ID, USER_ID, randomBytes(32).toString('hex')]
    )).rowCount === 1;
    original = (await pool.query(
      'SELECT mfa_verified_at, mfa_method, revoked_at, expires_at FROM public.auth_sessions WHERE id = $1',
      [SESSION_ID]
    )).rows[0];
    assert.ok(original, 'isolated test session is required');

    await pool.query(
      `UPDATE public.auth_sessions
       SET mfa_verified_at = now(), mfa_method = 'google',
           revoked_at = NULL, expires_at = now() + interval '1 hour'
       WHERE id = $1`,
      [SESSION_ID]
    );

    const valid = await issueExchange(pool);
    const authenticated = await withTimeout(
      consumeGoogleOAuthExchange(pool, valid), 'VALID_EXCHANGE'
    );
    assert.equal(authenticated?.authenticated, true);

    const reused = await consumeGoogleOAuthExchange(pool, valid);
    assert.equal(reused, null);

    const wrongBinding = await issueExchange(pool);
    const rejectedBinding = await consumeGoogleOAuthExchange(pool, {
      code: wrongBinding.code,
      browserBinding: 'c'.repeat(64)
    });
    assert.equal(rejectedBinding, null);

    const expired = await issueExchange(pool);
    await pool.query(
      `UPDATE public.auth_oauth_exchanges
       SET created_at = now() - interval '2 minutes',
           expires_at = now() - interval '1 second'
       WHERE exchange_code_hash = encode(digest($1, 'sha256'), 'hex')`,
      [expired.code]
    );
    const rejectedExpired = await consumeGoogleOAuthExchange(pool, expired);
    assert.equal(rejectedExpired, null);

    const revoked = await issueExchange(pool);
    await pool.query(
      'UPDATE public.auth_sessions SET revoked_at = now() WHERE id = $1',
      [SESSION_ID]
    );
    const rejectedRevoked = await consumeGoogleOAuthExchange(pool, revoked);
    assert.equal(rejectedRevoked, null);
    await pool.query(
      'UPDATE public.auth_sessions SET revoked_at = NULL WHERE id = $1',
      [SESSION_ID]
    );

    const body = Buffer.from(JSON.stringify({ code: valid.code }));
    const secret = 'x'.repeat(32);
    const signed = signIngressRequest(secret, {
      ip: '127.0.0.1', method: 'POST', target: '/auth/google/exchange', body
    });
    assert.ok(verifyIngressRequest(signed, secret, {
      method: 'POST', target: '/auth/google/exchange', body
    }));
    signed['x-segaloka-client-signature'] = '0'.repeat(64);
    assert.equal(verifyIngressRequest(signed, secret, {
      method: 'POST', target: '/auth/google/exchange', body
    }), null);
  } finally {
    await pool.query(
      'DELETE FROM public.auth_oauth_exchanges WHERE session_id = $1',
      [SESSION_ID]
    );
    if (createdSession) {
      await pool.query('DELETE FROM public.auth_sessions WHERE id = $1', [SESSION_ID]);
    } else if (original) {
      await pool.query(
        `UPDATE public.auth_sessions
         SET revoked_at = $2, mfa_verified_at = $3, mfa_method = $4,
             expires_at = $5
         WHERE id = $1`,
        [SESSION_ID, original.revoked_at ?? null,
          original.mfa_verified_at ?? null, original.mfa_method ?? null,
          original.expires_at]
      );
    }
    if (createdUser) {
      await pool.query('DELETE FROM public.users WHERE id = $1', [USER_ID]);
    }
    await withTimeout(pool.end(), 'POOL_CLOSE');
    if (previousKey === undefined) delete process.env.OAUTH_CONFIG_ENCRYPTION_KEY;
    else process.env.OAUTH_CONFIG_ENCRYPTION_KEY = previousKey;
  }
});
