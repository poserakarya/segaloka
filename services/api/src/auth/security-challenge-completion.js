import {
  verifySecurityOtp,
  SECURITY_OTP_MAX_ATTEMPTS
} from './security-otp-crypto.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function completeSecurityChallenge(pool, {
  userId,
  sessionId,
  challengeId,
  purpose,
  code
}) {
  if (
    !UUID_PATTERN.test(userId) ||
    !UUID_PATTERN.test(sessionId) ||
    !UUID_PATTERN.test(challengeId) ||
    !['enable_2fa', 'disable_2fa'].includes(purpose) ||
    typeof code !== 'string' ||
    !/^[0-9]{6}$/.test(code)
  ) {
    return { success: false, code: 'INVALID_REQUEST' };
  }

  const client = await pool.connect();
  let active = false;

  try {
    await client.query('BEGIN');
    active = true;

    const userResult = await client.query(
      `SELECT id, two_factor_enabled, status,
              email, email_verified_at,
              phone_e164, phone_verified_at
       FROM public.users
       WHERE id = $1
       FOR UPDATE`,
      [userId]
    );

    const user = userResult.rows[0];

    if (!user || user.status !== 'active') {
      await client.query('ROLLBACK');
      active = false;
      return { success: false, code: 'INVALID_ACCOUNT' };
    }

    const expectedEnabled = purpose === 'disable_2fa';

    if (user.two_factor_enabled !== expectedEnabled) {
      await client.query('ROLLBACK');
      active = false;
      return { success: false, code: 'INVALID_TWO_FACTOR_STATE' };
    }

    const sessionResult = await client.query(
      `SELECT id, mfa_verified_at
       FROM public.auth_sessions
       WHERE id = $1
         AND user_id = $2
         AND revoked_at IS NULL
         AND expires_at > now()
       FOR UPDATE`,
      [sessionId, userId]
    );

    if (sessionResult.rowCount !== 1) {
      await client.query('ROLLBACK');
      active = false;
      return { success: false, code: 'INVALID_SESSION' };
    }

    if (
      purpose === 'disable_2fa' &&
      !sessionResult.rows[0].mfa_verified_at
    ) {
      await client.query('ROLLBACK');
      active = false;
      return {
        success: false,
        code: 'MFA_SESSION_REQUIRED'
      };
    }

    const challengeResult = await client.query(
      `SELECT *
       FROM public.auth_security_challenges
       WHERE id = $1
         AND user_id = $2
         AND session_id = $3
         AND purpose = $4
       FOR UPDATE`,
      [challengeId, userId, sessionId, purpose]
    );

    const challenge = challengeResult.rows[0];

    if (
      !challenge ||
      challenge.consumed_at ||
      challenge.attempts >= SECURITY_OTP_MAX_ATTEMPTS ||
      new Date(challenge.expires_at).getTime() <= Date.now()
    ) {
      await client.query('ROLLBACK');
      active = false;
      return { success: false, code: 'INVALID_OR_EXPIRED_OTP' };
    }

    const currentDestination = challenge.channel === 'email'
      ? user.email_verified_at && user.email
      : challenge.channel === 'whatsapp'
        ? user.phone_verified_at && user.phone_e164
        : null;

    if (!currentDestination || currentDestination !== challenge.destination) {
      await client.query('ROLLBACK');
      active = false;
      return { success: false, code: 'CHANNEL_CHANGED' };
    }

    const valid = verifySecurityOtp({
      challengeId,
      purpose,
      code,
      expectedHash: challenge.code_hash
    });

    if (!valid) {
      await client.query(
        `UPDATE public.auth_security_challenges
         SET attempts = attempts + 1
         WHERE id = $1`,
        [challengeId]
      );

      await client.query('COMMIT');
      active = false;

      return { success: false, code: 'INVALID_OR_EXPIRED_OTP' };
    }

    await client.query(
      `UPDATE public.auth_security_challenges
       SET consumed_at = now()
       WHERE id = $1`,
      [challengeId]
    );

    await client.query(
      `UPDATE public.users
       SET two_factor_enabled = $2
       WHERE id = $1`,
      [userId, purpose === 'enable_2fa']
    );

    await client.query(
      `UPDATE public.auth_sessions
       SET revoked_at = now()
       WHERE user_id = $1
         AND revoked_at IS NULL`,
      [userId]
    );

    await client.query('COMMIT');
    active = false;

    return {
      success: true,
      enabled: purpose === 'enable_2fa',
      loginRequired: true
    };
  } catch (error) {
    if (active) {
      try {
        await client.query('ROLLBACK');
      } catch {}
    }
    throw error;
  } finally {
    client.release();
  }
}