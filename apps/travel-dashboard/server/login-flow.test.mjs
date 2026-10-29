import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyLoginResponse
} from './login-flow.mjs';

const ticket = 'a'.repeat(64);

test('password login without 2FA returns authenticated session', () => {
  const result = classifyLoginResponse({
    authenticated: true,
    session: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token'
    }
  });

  assert.equal(result.type, 'authenticated');
});

test('enabled 2FA requires a verified method selection', () => {
  const result = classifyLoginResponse({
    authenticated: false,
    code: 'OTP_CHANNEL_REQUIRED',
    preAuthTicket: ticket,
    availableMethods: [
      'authenticator',
      'email',
      'whatsapp'
    ],
    expiresIn: 300
  });

  assert.equal(result.type, 'verification_required');

  assert.deepEqual(result.availableMethods, [
    'authenticator',
    'email',
    'whatsapp'
  ]);
});

test('invalid pre-auth ticket is rejected', () => {
  const result = classifyLoginResponse({
    authenticated: false,
    code: 'OTP_CHANNEL_REQUIRED',
    preAuthTicket: 'invalid',
    availableMethods: ['email']
  });

  assert.equal(result.type, 'invalid');
});

test('missing session tokens are rejected', () => {
  const result = classifyLoginResponse({
    authenticated: true,
    session: {}
  });

  assert.equal(result.type, 'invalid');
});

test('unknown verification methods are rejected', () => {
  const result = classifyLoginResponse({
    authenticated: false,
    code: 'OTP_CHANNEL_REQUIRED',
    preAuthTicket: ticket,
    availableMethods: ['unknown']
  });

  assert.equal(result.type, 'invalid');
});