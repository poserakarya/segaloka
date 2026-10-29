import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  createGoogleOAuthParameters,
  sha256Hex
} from './google-oauth-parameters.js';

test('OAuth parameters are unique', () => {
  const first = createGoogleOAuthParameters();
  const second = createGoogleOAuthParameters();

  assert.notEqual(first.state, second.state);
  assert.notEqual(first.nonce, second.nonce);
  assert.notEqual(first.codeVerifier, second.codeVerifier);
});

test('state and nonce hashes match SHA-256', () => {
  const params = createGoogleOAuthParameters();

  assert.equal(params.stateHash, sha256Hex(params.state));
  assert.equal(params.nonceHash, sha256Hex(params.nonce));
  assert.match(params.stateHash, /^[0-9a-f]{64}$/);
  assert.match(params.nonceHash, /^[0-9a-f]{64}$/);
});

test('PKCE S256 challenge is correct', () => {
  const params = createGoogleOAuthParameters();

  const expected = createHash('sha256')
    .update(params.codeVerifier, 'ascii')
    .digest('base64url');

  assert.equal(params.codeChallenge, expected);
  assert.equal(params.codeChallengeMethod, 'S256');
  assert.match(params.codeVerifier, /^[A-Za-z0-9_-]{43,128}$/);
});

test('OAuth values do not expose each other', () => {
  const params = createGoogleOAuthParameters();

  assert.notEqual(params.state, params.nonce);
  assert.notEqual(params.state, params.codeVerifier);
  assert.notEqual(params.nonce, params.codeVerifier);
});