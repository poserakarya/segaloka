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
const nonce = 'segaloka-stream-test';
const jwk = publicKey.export({ format: 'jwk' });

function makeToken() {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    kid: 'stream-test-key'
  };

  const payload = {
    iss: 'https://accounts.google.com',
    aud: clientId,
    sub: 'stream-test-subject',
    email: 'test@example.com',
    email_verified: true,
    nonce,
    iat: now,
    exp: now + 3600
  };

  const encoded = [
    Buffer.from(JSON.stringify(header)).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url')
  ].join('.');

  return encoded + '.' +
    sign('RSA-SHA256', Buffer.from(encoded), privateKey)
      .toString('base64url');
}

function responseFromText(text, headers = {}) {
  const bytes = new TextEncoder().encode(text);

  return {
    ok: true,
    headers: new Headers(headers),
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      }
    })
  };
}

function verifyWithResponse(response) {
  return verifyGoogleIdToken(makeToken(), {
    clientId,
    nonceHash: sha256Hex(nonce),
    fetchImpl: async () => response
  });
}

const validJwks = JSON.stringify({
  keys: [{
    ...jwk,
    kid: 'stream-test-key',
    use: 'sig',
    alg: 'RS256'
  }]
});

test('Valid streamed JWKS is accepted', async () => {
  const result = await verifyWithResponse(
    responseFromText(validJwks)
  );

  assert.equal(result.subject, 'stream-test-subject');
});

test('JWKS larger than 64 KB is rejected', async () => {
  const oversized = JSON.stringify({
    keys: [{
      ...jwk,
      kid: 'stream-test-key',
      use: 'sig',
      alg: 'RS256'
    }],
    padding: 'x'.repeat(70000)
  });

  await assert.rejects(
    verifyWithResponse(responseFromText(oversized)),
    /GOOGLE_JWKS_TOO_LARGE/
  );
});

test('Oversized Content-Length is rejected', async () => {
  await assert.rejects(
    verifyWithResponse(
      responseFromText(validJwks, {
        'content-length': '70000'
      })
    ),
    /GOOGLE_JWKS_TOO_LARGE/
  );
});

test('Malformed streamed JWKS is rejected', async () => {
  await assert.rejects(
    verifyWithResponse(
      responseFromText('{"keys":')
    )
  );
});

test('JWKS with too many keys is rejected', async () => {
  const manyKeys = JSON.stringify({
    keys: Array.from({ length: 21 }, () => ({
      ...jwk,
      kid: 'stream-test-key',
      use: 'sig',
      alg: 'RS256'
    }))
  });

  await assert.rejects(
    verifyWithResponse(responseFromText(manyKeys)),
    /INVALID_GOOGLE_JWKS/
  );
});