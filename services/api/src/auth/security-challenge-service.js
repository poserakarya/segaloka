import { randomUUID } from 'node:crypto';
import { verifyPassword } from './password.js';

import {
  generateSecurityOtp,
  hashSecurityOtp,
  SECURITY_OTP_TTL_SECONDS,
  SECURITY_OTP_RESEND_SECONDS
} from './security-otp-crypto.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PURPOSES = ['enable_2fa', 'disable_2fa'];
const CHANNELS = ['email', 'whatsapp'];

export async function createSecurityChallenge(pool, {
  userId,
  sessionId,
  purpose,
  channel,
  password
}) {
  if (
    !UUID_PATTERN.test(userId) ||
    !UUID_PATTERN.test(sessionId) ||
    !PURPOSES.includes(purpose) ||
    !CHANNELS.includes(channel) ||
    typeof password !== 'string' ||
    password.length === 0 ||
    password.length > 128
  ) {
    return { created: false, code: 'INVALID_REQUEST' };
  }

  const client = await pool.connect();
  let inTransaction = false;

  try {
    await client.query('BEGIN');
    inTransaction = true;

    const userResult = await client.query(
      `SELECT
         u.id,
         u.email,
         u.email_verified_at,
         u.phone_e164,
         u.phone_verified_at,
         u.two_factor_enabled,
         c.password_hash
       FROM public.users u
       JOIN public.user_credentials c
         ON c.user_id = u.id
       WHERE u.id = $1
         AND u.status = 'active'
       FOR UPDATE OF u`,
      [userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      return await rollbackResult(
        client,
        'INVALID_ACCOUNT',
        () => { inTransaction = false; }
      );
    }

    const validPassword = await verifyPassword(
      user.password_hash,
      password
    );

    if (!validPassword) {
      return await rollbackResult(
        client,
        'INVALID_PASSWORD',
        () => { inTransaction = false; }
      );
    }

    if (
      (purpose === 'enable_2fa' && user.two_factor_enabled) ||
      (purpose === 'disable_2fa' && !user.two_factor_enabled)
    ) {
      return await rollbackResult(
        client,
        'INVALID_TWO_FACTOR_STATE',
        () => { inTransaction = false; }
      );
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
      return await rollbackResult(
        client,
        'INVALID_SESSION',
        () => { inTransaction = false; }
      );
    }

    if (
      purpose === 'disable_2fa' &&
      !sessionResult.rows[0].mfa_verified_at
    ) {
      return await rollbackResult(
        client,
        'MFA_SESSION_REQUIRED',
        () => { inTransaction = false; }
      );
    }

    const destination = channel === 'email'
      ? user.email_verified_at && user.email
      : user.phone_verified_at && user.phone_e164;

    if (!destination) {
      return await rollbackResult(
        client,
        'CHANNEL_NOT_VERIFIED',
        () => { inTransaction = false; }
      );
    }

    const previous = await client.query(
      `SELECT last_sent_at
       FROM public.auth_security_challenges
       WHERE user_id = $1
         AND purpose = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, purpose]
    );

    if (
      previous.rows[0] &&
      Date.now() -
        new Date(previous.rows[0].last_sent_at).getTime() <
        SECURITY_OTP_RESEND_SECONDS * 1000
    ) {
      return await rollbackResult(
        client,
        'RESEND_TOO_SOON',
        () => { inTransaction = false; }
      );
    }

    const challengeId = randomUUID();
    const code = generateSecurityOtp();

    const codeHash = hashSecurityOtp({
      challengeId,
      purpose,
      code
    });

    await client.query(
      `UPDATE public.auth_security_challenges
       SET consumed_at = now()
       WHERE user_id = $1
         AND purpose = $2
         AND consumed_at IS NULL`,
      [userId, purpose]
    );

    await client.query(
      `INSERT INTO public.auth_security_challenges (
         id,
         user_id,
         session_id,
         purpose,
         channel,
         destination,
         code_hash,
         expires_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         now() + interval '5 minutes'
       )`,
      [
        challengeId,
        userId,
        sessionId,
        purpose,
        channel,
        destination,
        codeHash
      ]
    );

    await client.query('COMMIT');
    inTransaction = false;

    return {
      created: true,
      challengeId,
      purpose,
      channel,
      destination,
      code,
      expiresIn: SECURITY_OTP_TTL_SECONDS
    };
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch {}
    }

    throw error;
  } finally {
    client.release();
  }
}

async function rollbackResult(client, code, markComplete) {
  await client.query('ROLLBACK');
  markComplete();
  return { created: false, code };
}