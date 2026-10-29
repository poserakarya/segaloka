import { verifyPassword } from './password.js';

import {
  generateTotpSecret,
  verifyTotp,
  createTotpUri
} from './totp-crypto.js';

import {
  encryptTotpSecret,
  decryptTotpSecret
} from './totp-secret-crypto.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENROLLMENT_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function invalid(code) {
  return { success: false, code };
}

async function transaction(pool, work) {
  const client = await pool.connect();
  let active = false;

  try {
    await client.query('BEGIN');
    active = true;

    const result = await work(client);

    await client.query('COMMIT');
    active = false;

    return result;
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

export async function beginTotpEnrollment(pool, {
  userId,
  sessionId,
  password
}) {
  if (
    !UUID.test(userId) ||
    !UUID.test(sessionId) ||
    typeof password !== 'string' ||
    password.length < 1 ||
    password.length > 128
  ) {
    return invalid('INVALID_REQUEST');
  }

  return transaction(pool, async client => {
    const userResult = await client.query(
      `SELECT u.id, u.email, u.two_factor_enabled,
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
      return invalid('INVALID_ACCOUNT');
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
      return invalid('INVALID_SESSION');
    }

    if (
      user.two_factor_enabled === true &&
      !sessionResult.rows[0].mfa_verified_at
    ) {
      return invalid('MFA_SESSION_REQUIRED');
    }

    const validPassword = await verifyPassword(
      user.password_hash,
      password
    );

    if (!validPassword) {
      return invalid('INVALID_PASSWORD');
    }

    const existing = await client.query(
      `SELECT enabled_at
       FROM public.auth_totp_authenticators
       WHERE user_id = $1
       FOR UPDATE`,
      [userId]
    );

    if (existing.rows[0]?.enabled_at) {
      return invalid('AUTHENTICATOR_ALREADY_ENABLED');
    }

    const pending = await client.query(
      `SELECT enrollment_expires_at
       FROM public.auth_totp_authenticators
       WHERE user_id = $1`,
      [userId]
    );

    if (
      pending.rows[0]?.enrollment_expires_at &&
      new Date(
        pending.rows[0].enrollment_expires_at
      ).getTime() > Date.now()
    ) {
      return invalid('ENROLLMENT_ALREADY_PENDING');
    }

    const secret = generateTotpSecret();

    const encrypted = encryptTotpSecret({
      userId,
      secret
    });

    await client.query(
      `INSERT INTO public.auth_totp_authenticators (
         user_id,
         secret_encrypted,
         encryption_iv,
         encryption_tag,
         enabled_at,
         last_used_counter,
         enrollment_expires_at,
         enrollment_attempts,
         enrollment_session_id
       )
       VALUES (
         $1, $2, $3, $4,
         NULL, NULL,
         now() + interval '10 minutes',
         0, $5
       )
       ON CONFLICT (user_id)
       DO UPDATE SET
         secret_encrypted = EXCLUDED.secret_encrypted,
         encryption_iv = EXCLUDED.encryption_iv,
         encryption_tag = EXCLUDED.encryption_tag,
         enabled_at = NULL,
         last_used_counter = NULL,
         enrollment_expires_at =
           EXCLUDED.enrollment_expires_at,
         enrollment_attempts = 0,
         enrollment_session_id =
           EXCLUDED.enrollment_session_id,
         updated_at = now()
       WHERE public.auth_totp_authenticators.enabled_at IS NULL`,
      [
        userId,
        encrypted.secretEncrypted,
        encrypted.encryptionIv,
        encrypted.encryptionTag,
        sessionId
      ]
    );

    return {
      success: true,
      provisioningUri: createTotpUri({
        secret,
        accountName: user.email
      }),
      expiresIn: ENROLLMENT_MINUTES * 60
    };
  });
}

export async function confirmTotpEnrollment(pool, {
  userId,
  sessionId,
  code
}) {
  if (
    !UUID.test(userId) ||
    !UUID.test(sessionId) ||
    typeof code !== 'string' ||
    !/^[0-9]{6}$/.test(code)
  ) {
    return invalid('INVALID_REQUEST');
  }

  return transaction(pool, async client => {
    const userResult = await client.query(
      `SELECT id, two_factor_enabled
       FROM public.users
       WHERE id = $1
         AND status = 'active'
       FOR UPDATE`,
      [userId]
    );

    if (userResult.rowCount !== 1) {
      return invalid('INVALID_ACCOUNT');
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
      return invalid('INVALID_SESSION');
    }

    if (
      userResult.rows[0].two_factor_enabled === true &&
      !sessionResult.rows[0].mfa_verified_at
    ) {
      return invalid('MFA_SESSION_REQUIRED');
    }

    const enrollmentResult = await client.query(
      `SELECT *
       FROM public.auth_totp_authenticators
       WHERE user_id = $1
       FOR UPDATE`,
      [userId]
    );

    const enrollment = enrollmentResult.rows[0];

    if (
      !enrollment ||
      enrollment.enabled_at ||
      enrollment.enrollment_session_id !== sessionId ||
      !enrollment.enrollment_expires_at ||
      new Date(enrollment.enrollment_expires_at).getTime()
        <= Date.now() ||
      enrollment.enrollment_attempts >= MAX_ATTEMPTS
    ) {
      return invalid('INVALID_OR_EXPIRED_ENROLLMENT');
    }

    const secret = decryptTotpSecret({
      userId,
      secretEncrypted: enrollment.secret_encrypted,
      encryptionIv: enrollment.encryption_iv,
      encryptionTag: enrollment.encryption_tag
    });

    const verification = verifyTotp({
      secret,
      code
    });

    if (
      !verification.valid ||
      (
        enrollment.last_used_counter !== null &&
        verification.counter <=
          Number(enrollment.last_used_counter)
      )
    ) {
      await client.query(
        `UPDATE public.auth_totp_authenticators
         SET enrollment_attempts =
           enrollment_attempts + 1,
             updated_at = now()
         WHERE user_id = $1`,
        [userId]
      );

      return invalid('INVALID_TOTP_CODE');
    }

    await client.query(
      `UPDATE public.auth_totp_authenticators
       SET enabled_at = now(),
           last_used_counter = $2,
           enrollment_expires_at = NULL,
           enrollment_attempts = 0,
           enrollment_session_id = NULL,
           updated_at = now()
       WHERE user_id = $1
         AND enabled_at IS NULL`,
      [userId, verification.counter]
    );

    // Aktivasi authenticator sekaligus mengaktifkan 2FA akun.
    await client.query(
      `UPDATE public.users
       SET two_factor_enabled = true
       WHERE id = $1`,
      [userId]
    );

    // Semua sesi lama harus login ulang.
    await client.query(
      `UPDATE public.auth_sessions
       SET revoked_at = now()
       WHERE user_id = $1
         AND revoked_at IS NULL`,
      [userId]
    );

    return {
      success: true,
      enabled: true,
      loginRequired: true
    };
  });
}

export async function getTotpEnrollmentStatus(pool, userId) {
  if (!UUID.test(userId)) {
    return invalid('INVALID_REQUEST');
  }

  const result = await pool.query(
    `SELECT
       enabled_at IS NOT NULL AS enabled,
       (
         enabled_at IS NULL
         AND enrollment_expires_at > now()
         AND enrollment_attempts < $2
       ) AS pending
     FROM public.auth_totp_authenticators
     WHERE user_id = $1`,
    [userId, MAX_ATTEMPTS]
  );

  return {
    success: true,
    enabled: result.rows[0]?.enabled === true,
    pending: result.rows[0]?.pending === true
  };
}