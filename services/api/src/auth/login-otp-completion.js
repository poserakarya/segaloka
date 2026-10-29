import {
  createSession
} from './session-service.js';

import {
  createAccessToken
} from './access-token-service.js';

import {
  verifyLoginOtp,
  LOGIN_OTP_MAX_ATTEMPTS
} from './login-otp-crypto.js';

export async function completeLoginOtp(pool, {
  challengeId,
  code,
  attemptId = null,
  secret = process.env.AUTH_OTP_HASH_SECRET
}) {
  if (
    typeof challengeId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(challengeId) ||
    typeof code !== 'string' ||
    !/^[0-9]{6}$/.test(code)
  ) {
    return { authenticated: false };
  }

  if (
    attemptId !== null &&
    (!Number.isSafeInteger(Number(attemptId)) ||
     Number(attemptId) <= 0)
  ) {
    throw new Error('OTP_ATTEMPT_RESULT_INVALID');
  }

  const client = await pool.connect();
  let active = false;

  async function finalizeAttempt(authenticated) {
    if (attemptId === null) return;

    const result = await client.query(
      `UPDATE public.auth_login_otp_attempts
       SET outcome = $2
       WHERE id = $1
         AND outcome = 'reserved'
       RETURNING id`,
      [attemptId, authenticated ? 'success' : 'failure']
    );

    if (result.rowCount !== 1) {
      throw new Error('OTP_ATTEMPT_FINALIZATION_FAILED');
    }
  }

  try {
    await client.query('BEGIN');
    active = true;

    // Lock order: user terlebih dahulu, kemudian OTP.
    const ownerResult = await client.query(
      `SELECT user_id
       FROM public.auth_login_otp
       WHERE id = $1`,
      [challengeId]
    );

    const owner = ownerResult.rows[0];

    if (!owner) {
      await finalizeAttempt(false);
      await client.query('COMMIT');
      active = false;
      return { authenticated: false };
    }

    const userResult = await client.query(
      `SELECT id, email, full_name,
              status, email_verified_at, phone_verified_at, two_factor_enabled
       FROM public.users
       WHERE id = $1
       FOR UPDATE`,
      [owner.user_id]
    );

    const user = userResult.rows[0];

    if (
      !user ||
      user.status !== 'active'
    ) {
      await finalizeAttempt(false);
      await client.query('COMMIT');
      active = false;
      return { authenticated: false };
    }

    const otpResult = await client.query(
      `SELECT id, user_id, channel, code_hash,
              attempts, expires_at, consumed_at,
               delivery_status
       FROM public.auth_login_otp
       WHERE id = $1
       FOR UPDATE`,
      [challengeId]
    );

    const otp = otpResult.rows[0];

    if (
      !otp ||
      otp.user_id !== user.id ||
      !['email', 'whatsapp', 'sms'].includes(otp.channel) ||
      (otp.channel === 'email' && !user.email_verified_at) ||
      (['whatsapp', 'sms'].includes(otp.channel) && !user.phone_verified_at) ||
      otp.consumed_at ||
       otp.delivery_status !== 'sent' ||
      otp.attempts >= LOGIN_OTP_MAX_ATTEMPTS ||
      new Date(otp.expires_at).getTime() <= Date.now()
    ) {
      await finalizeAttempt(false);
      await client.query('COMMIT');
      active = false;
      return { authenticated: false };
    }

    const valid = verifyLoginOtp({
      challengeId,
      code,
      expectedHash: otp.code_hash,
      secret
    });

    if (!valid) {
      await client.query(
        `UPDATE public.auth_login_otp
         SET attempts = attempts + 1
         WHERE id = $1`,
        [challengeId]
      );

      await finalizeAttempt(false);
      await client.query('COMMIT');
      active = false;
      return { authenticated: false };
    }

    const membershipResult = await client.query(
      `SELECT r.code AS role,
              m.organization_id
       FROM public.memberships m
       JOIN public.roles r ON r.id = m.role_id
       WHERE m.user_id = $1
       ORDER BY r.code, m.organization_id NULLS FIRST`,
      [user.id]
    );

    if (membershipResult.rows.length === 0) {
      await finalizeAttempt(false);
      await client.query('COMMIT');
      active = false;
      return { authenticated: false };
    }

    const session = await createSession(client, user.id);

    const mfaUpdate = await client.query(
      `UPDATE public.auth_sessions
       SET mfa_verified_at = now(),
           mfa_method = $2
       WHERE id = $1
         AND user_id = $3
         AND mfa_verified_at IS NULL
       RETURNING id`,
      [session.sessionId, otp.channel, user.id]
    );

    if (mfaUpdate.rowCount !== 1) {
      throw new Error('MFA_SESSION_VERIFICATION_FAILED');
    }
    const access = await createAccessToken(
      client,
      session.sessionId
    );

    if (!access) {
      throw new Error('OTP_ACCESS_TOKEN_FAILED');
    }

    await client.query(
      `UPDATE public.auth_login_otp
       SET consumed_at = now()
       WHERE id = $1`,
      [challengeId]
    );

    await finalizeAttempt(true);
    await client.query('COMMIT');
    active = false;

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        memberships: membershipResult.rows.map(row => ({
          role: row.role,
          organizationId: row.organization_id
        }))
      },
      session: {
        ...session,
        accessToken: access.accessToken,
        tokenType: access.tokenType,
        expiresIn: access.expiresIn,
        accessTokenExpiresAt: access.expiresAt
      }
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