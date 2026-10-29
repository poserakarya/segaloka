import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createLoginOtp,
  consumeLoginOtp
} from './login-otp-service.js';

test('Channel OTP tidak valid ditolak', async () => {
  await assert.rejects(
    createLoginOtp(null, {
      userId: 'test',
      channel: 'invalid-channel'
    }),
    /OTP_CHANNEL_INVALID/
  );
});

test('Challenge ID tidak valid ditolak', async () => {
  const result = await consumeLoginOtp(null, {
    challengeId: 'invalid',
    code: '123456'
  });

  assert.deepEqual(result, { verified: false });
});

test('Kode tanpa challenge ditolak', async () => {
  const result = await consumeLoginOtp(null, {
    challengeId: '',
    code: ''
  });

  assert.equal(result.verified, false);
});