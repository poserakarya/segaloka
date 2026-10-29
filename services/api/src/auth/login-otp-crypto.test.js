import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import {
  generateLoginOtp,
  hashLoginOtp,
  verifyLoginOtp
} from './login-otp-crypto.js';

const secret = 'ab'.repeat(32);

test('OTP selalu enam digit', () => {
  for (let i = 0; i < 100; i++) {
    assert.match(generateLoginOtp(), /^[0-9]{6}$/);
  }
});

test('OTP benar dapat diverifikasi', () => {
  const challengeId = randomUUID();
  const code = '012345';

  const expectedHash = hashLoginOtp({
    challengeId,
    code,
    secret
  });

  assert.equal(
    verifyLoginOtp({
      challengeId,
      code,
      expectedHash,
      secret
    }),
    true
  );
});

test('OTP salah ditolak', () => {
  const challengeId = randomUUID();

  const expectedHash = hashLoginOtp({
    challengeId,
    code: '123456',
    secret
  });

  assert.equal(
    verifyLoginOtp({
      challengeId,
      code: '654321',
      expectedHash,
      secret
    }),
    false
  );
});

test('OTP tidak berlaku untuk challenge lain', () => {
  const expectedHash = hashLoginOtp({
    challengeId: randomUUID(),
    code: '123456',
    secret
  });

  assert.equal(
    verifyLoginOtp({
      challengeId: randomUUID(),
      code: '123456',
      expectedHash,
      secret
    }),
    false
  );
});

test('Secret tidak valid ditolak', () => {
  assert.throws(
    () => hashLoginOtp({
      challengeId: randomUUID(),
      code: '123456',
      secret: 'invalid'
    }),
    /OTP_SECRET_INVALID/
  );
});