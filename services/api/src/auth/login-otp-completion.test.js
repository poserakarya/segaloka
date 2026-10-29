import test from 'node:test';
import assert from 'node:assert/strict';

import {
  completeLoginOtp
} from './login-otp-completion.js';

test('Challenge invalid ditolak', async () => {
  const result = await completeLoginOtp(null, {
    challengeId: 'invalid',
    code: '123456'
  });

  assert.equal(result.authenticated, false);
});

test('OTP non-numerik ditolak', async () => {
  const result = await completeLoginOtp(null, {
    challengeId: '00000000-0000-4000-8000-000000000000',
    code: 'abcdef'
  });

  assert.equal(result.authenticated, false);
});

test('OTP kurang enam digit ditolak', async () => {
  const result = await completeLoginOtp(null, {
    challengeId: '00000000-0000-4000-8000-000000000000',
    code: '12345'
  });

  assert.equal(result.authenticated, false);
});