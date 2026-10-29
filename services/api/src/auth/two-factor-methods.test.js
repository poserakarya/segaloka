import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getTwoFactorSettings,
  getAllowedLoginMethods,
  requiresTwoFactor
} from './two-factor-methods.js';

function mockPool(user) {
  return {
    async query(_sql, params) {
      assert.equal(params[0], 'user-1');
      return { rows: user ? [user] : [] };
    }
  };
}

test('2FA disabled does not require OTP', async () => {
  const settings = await getTwoFactorSettings(
    mockPool({
      id: 'user-1',
      two_factor_enabled: false,
      email_verified_at: null,
      phone_verified_at: null
    }),
    'user-1'
  );

  assert.equal(requiresTwoFactor(settings), false);
  assert.deepEqual(getAllowedLoginMethods(settings), []);
});

test('2FA enabled allows verified email and WhatsApp', async () => {
  const settings = await getTwoFactorSettings(
    mockPool({
      id: 'user-1',
      two_factor_enabled: true,
      email_verified_at: new Date(),
      phone_verified_at: new Date()
    }),
    'user-1'
  );

  assert.equal(requiresTwoFactor(settings), true);
  assert.deepEqual(
    getAllowedLoginMethods(settings),
    ['email', 'whatsapp']
  );
});

test('unverified channels are unavailable', async () => {
  const settings = await getTwoFactorSettings(
    mockPool({
      id: 'user-1',
      two_factor_enabled: true,
      email_verified_at: null,
      phone_verified_at: null
    }),
    'user-1'
  );

  assert.deepEqual(getAllowedLoginMethods(settings), []);
});

test('unknown user has no 2FA settings', async () => {
  const settings = await getTwoFactorSettings(
    mockPool(null),
    'user-1'
  );

  assert.equal(settings, null);
});

test('authenticator is unavailable until enrollment exists', async () => {
  const settings = await getTwoFactorSettings(
    mockPool({
      id: 'user-1',
      two_factor_enabled: true,
      email_verified_at: new Date(),
      phone_verified_at: null
    }),
    'user-1'
  );

  assert.equal(settings.availableMethods.authenticator, false);
});