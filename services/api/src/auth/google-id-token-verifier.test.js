import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateKeyPairSync,
  sign
} from 'node:crypto';

import { sha256Hex } from './google-oauth-parameters.js';
import { verifyGoogleIdToken } from './google-id-token-verifier.js';

const { privateKey, publicKey } = generateKeyPairSync(
  'rsa',
  { modulusLength: 2048 }
);

const clientId = 'test.apps.googleusercontent.com';
const nonce = 'test-nonce-123';
const jwk = publicKey.export({ format: 'jwk' });

function token(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    kid: 'test-key'
  };

  const payload = {
    iss: 'https://accounts.google.com',
    aud: clientId,
    sub: 'google-subject-123',
    email: 'traveler@example.com',
    email_verified: true,
    nonce,
    iat: now,
    exp: now + 3600,
    ...overrides
  };

  const body = [
    Buffer.from(JSON.stringify(header)).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url')
  ].join('.');

  const signature = sign(
    'RSA-SHA256',
    Buffer.from(body),
    privateKey
  ).toString('base64url');

  return `${body}.${signature}`;
}

const fetchImpl = async () => ({
  ok: true,
  json: async () => ({
    keys: [{
      ...jwk,
      kid: 'test-key',
      use: 'sig',
      alg: 'RS256'
    }]
  })
});

function check(value) {
  return verifyGoogleIdToken(value, {
    clientId,
    nonceHash: sha256Hex(nonce),
    fetchImpl
  });
}

test('Valid Google ID Token accepted', async () => {
  const result = await check(token());

  assert.equal(result.provider, 'google');
  assert.equal(result.subject, 'google-subject-123');
  assert.equal(result.emailVerified, true);
});

test('Wrong audience rejected', async () => {
  await assert.rejects(
    check(token({ aud: 'another-client' }))
  );
});

test('Expired token rejected', async () => {
  await assert.rejects(
    check(token({ exp: 1 }))
  );
});

test('Wrong nonce rejected', async () => {
  await assert.rejects(
    check(token({ nonce: 'wrong-nonce' }))
  );
});

test('Unverified email rejected', async () => {
  await assert.rejects(
    check(token({ email_verified: false }))
  );
});

test('Wrong issuer rejected', async () => {
  await assert.rejects(
    check(token({ iss: 'https://example.com' }))
  );
});

test('Invalid signature rejected', async () => {
  const valid = token();
  const parts = valid.split('.');

  parts[2] = 'invalid-signature';

  await assert.rejects(
    check(parts.join('.'))
  );
});