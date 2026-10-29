/**
 * Segaloka — Two-Factor Authentication Methods
 *
 * Login:
 * - 2FA disabled: password authentication only.
 * - 2FA enabled: require an enrolled verification method.
 *
 * Email verification during registration is separate
 * from login two-factor authentication.
 */

export const TWO_FACTOR_METHODS = Object.freeze({
  AUTHENTICATOR: 'authenticator',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  SMS: 'sms'
});

export async function getTwoFactorSettings(pool, userId) {
  if (!userId) {
    throw new Error('USER_ID_REQUIRED');
  }

  const result = await pool.query(
    `SELECT
       id,
       two_factor_enabled,
       email_verified_at,
       phone_verified_at,
       EXISTS (
         SELECT 1
         FROM public.auth_totp_authenticators t
         WHERE t.user_id = public.users.id
           AND t.enabled_at IS NOT NULL
       ) AS authenticator_enabled
     FROM public.users
     WHERE id = $1
       AND status = 'active'`,
    [userId]
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  return {
    enabled: user.two_factor_enabled === true,

    // A verified destination is required before OTP delivery.
    availableMethods: {
      email: Boolean(user.email_verified_at),
      whatsapp: Boolean(user.phone_verified_at),
      sms: Boolean(user.phone_verified_at),

      authenticator: Boolean(user.authenticator_enabled)
    }
  };
}

export function getAllowedLoginMethods(settings) {
  if (!settings || settings.enabled !== true) {
    return [];
  }

  return ['authenticator', 'email', 'whatsapp']
    .filter(method => settings.availableMethods?.[method] === true);
}

export function requiresTwoFactor(settings) {
  return settings?.enabled === true;
}
