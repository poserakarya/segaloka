import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

import {
  createGoogleOAuthState,
  consumeGoogleOAuthState,
  decryptGooglePKCEVerifier
} from './google-oauth-state-service.js';

import { sha256Hex } from './google-oauth-parameters.js';

const originalKey = process.env.OAUTH_CONFIG_ENCRYPTION_KEY;

process.env.OAUTH_CONFIG_ENCRYPTION_KEY =
  randomBytes(32).toString('hex');

const CALLBACK =
  'https://api.segaloka.com/auth/google/callback';

function createMockPool() {
  const records = new Map();

  return {
    records,

    async query(sql, values) {
      if (sql.includes('INSERT INTO public.oauth_states')) {
        const [
          stateHash,
          nonceHash,
          encryptedVerifier,
          redirectUri
        ] = values;

        records.set(stateHash, {
          nonceHash,
          encryptedVerifier,
          redirectUri,
          consumed: false,
          expiresAt: Date.now() + 600000
        });

        return { rowCount: 1, rows: [] };
      }

      if (sql.includes('UPDATE public.oauth_states')) {
        const record = records.get(values[0]);

        if (
          !record ||
          record.consumed ||
          record.expiresAt <= Date.now()
        ) {
          return { rowCount: 0, rows: [] };
        }

        record.consumed = true;

        return {
          rowCount: 1,
          rows: [{
            nonce_hash: record.nonceHash,
            code_verifier_encrypted:
              record.encryptedVerifier,
            redirect_uri: record.redirectUri
          }]
        };
      }

      throw new Error('UNEXPECTED_SQL');
    }
  };
}

test('OAuth state can be created and consumed', async () => {
  const pool = createMockPool();

  const created = await createGoogleOAuthState(
    pool,
    CALLBACK
  );

  assert.match(created.state, /^[A-Za-z0-9_-]{43}$/);
  assert.match(created.nonce, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(created.codeChallengeMethod, 'S256');
  assert.equal(created.expiresInSeconds, 600);

  const consumed = await consumeGoogleOAuthState(
    pool,
    created.state
  );

  assert.ok(consumed);
  assert.equal(consumed.nonceHash, sha256Hex(created.nonce));
  assert.equal(consumed.redirectUri, CALLBACK);
  assert.match(
    consumed.codeVerifier,
    /^[A-Za-z0-9_-]{43,128}$/
  );
});

test('OAuth state cannot be replayed', async () => {
  const pool = createMockPool();

  const created = await createGoogleOAuthState(
    pool,
    CALLBACK
  );

  const first = await consumeGoogleOAuthState(
    pool,
    created.state
  );

  const second = await consumeGoogleOAuthState(
    pool,
    created.state
  );

  assert.ok(first);
  assert.equal(second, null);
});

test('Invalid OAuth state is rejected', async () => {
  const pool = createMockPool();

  assert.equal(
    await consumeGoogleOAuthState(pool, 'invalid'),
    null
  );
});

test('Expired OAuth state is rejected', async () => {
  const pool = createMockPool();

  const created = await createGoogleOAuthState(
    pool,
    CALLBACK
  );

  pool.records.get(
    sha256Hex(created.state)
  ).expiresAt = Date.now() - 1000;

  assert.equal(
    await consumeGoogleOAuthState(pool, created.state),
    null
  );
});

test('Tampered PKCE ciphertext is rejected', async () => {
  const pool = createMockPool();

  const created = await createGoogleOAuthState(
    pool,
    CALLBACK
  );

  const record = pool.records.get(
    sha256Hex(created.state)
  );

  const parts = record.encryptedVerifier.split(':');

  const data = parts[3];
  parts[3] = (data[0] === 'a' ? 'b' : 'a') +
    data.slice(1);

  assert.throws(() => {
    decryptGooglePKCEVerifier(parts.join(':'));
  });
});

test('Invalid callback URL is rejected', async () => {
  const pool = createMockPool();

  await assert.rejects(
    createGoogleOAuthState(
      pool,
      'https://example.com/callback'
    ),
    /INVALID_OAUTH_REDIRECT_URI/
  );
});

test.after(() => {
  if (originalKey === undefined) {
    delete process.env.OAUTH_CONFIG_ENCRYPTION_KEY;
  } else {
    process.env.OAUTH_CONFIG_ENCRYPTION_KEY = originalKey;
  }
});