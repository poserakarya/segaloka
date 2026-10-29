import { randomUUID } from 'node:crypto';
import {
  generateLoginOtp,
  hashLoginOtp,
  verifyLoginOtp,
  LOGIN_OTP_TTL_SECONDS,
  LOGIN_OTP_MAX_ATTEMPTS,
  LOGIN_OTP_RESEND_SECONDS
} from './login-otp-crypto.js';

export async function createLoginOtpInTransaction(client, {
  userId,
  channel,
  secret = process.env.AUTH_OTP_HASH_SECRET
}) {
  if (!['email', 'whatsapp', 'sms'].includes(channel)) {
    throw new Error('OTP_CHANNEL_INVALID');
  }



    const userResult = await client.query(
      `SELECT id, email, email_verified_at,
              phone_e164, phone_verified_at
       FROM public.users
       WHERE id = $1 AND status = 'active'
       FOR UPDATE`,
      [userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      throw new Error('OTP_USER_UNAVAILABLE');
    }

    const destination = channel === 'email'
      ? user.email_verified_at && user.email
      : user.phone_verified_at && user.phone_e164;

    if (!destination) {
      throw new Error('OTP_CHANNEL_NOT_VERIFIED');
    }

    const previous = await client.query(
      `SELECT last_sent_at
       FROM public.auth_login_otp
       WHERE user_id = $1
         AND channel = $2
          AND delivery_status IN ('pending', 'sent', 'unknown')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, channel]
    );

    if (
      previous.rows[0] &&
      Date.now() - new Date(
        previous.rows[0].last_sent_at
      ).getTime() < LOGIN_OTP_RESEND_SECONDS * 1000
    ) {
      throw new Error('OTP_RESEND_TOO_SOON');
    }

    const challengeId = randomUUID();
    const code = generateLoginOtp();
    const codeHash = hashLoginOtp({
      challengeId,
      code,
      secret
    });

    await client.query(
      `INSERT INTO public.auth_login_otp (
         id, user_id, channel, destination,
         code_hash, expires_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         now() + interval '5 minutes'
       )`,
      [
        challengeId,
        userId,
        channel,
        destination,
        codeHash
      ]
    );

    return {
      challengeId,
      code,
      channel,
      destination,
      expiresIn: LOGIN_OTP_TTL_SECONDS
    };

}

export async function createLoginOtp(pool, options) {
  if (!['email', 'whatsapp', 'sms'].includes(options?.channel)) {
    throw new Error('OTP_CHANNEL_INVALID');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await createLoginOtpInTransaction(
      client,
      options
    );

    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    throw error;
  } finally {
    client.release();
  }
}
export async function confirmLoginOtpDelivery(pool, {
  challengeId,
  userId
}) {
  if (
    typeof challengeId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(challengeId) ||
    typeof userId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(userId)
  ) {
    throw new TypeError('OTP_CONFIRM_INPUT_INVALID');
  }

  const client = await pool.connect();
  let active = false;

  try {
    await client.query('BEGIN');
    active = true;

    // Lock order: user terlebih dahulu, kemudian challenge.
    const userResult = await client.query(
      `SELECT id
       FROM public.users
       WHERE id = $1
         AND status = 'active'
       FOR UPDATE`,
      [userId]
    );

    if (userResult.rowCount !== 1) {
      await client.query('ROLLBACK');
      active = false;
      return { confirmed: false };
    }

    const challengeResult = await client.query(
      `SELECT id, user_id, delivery_status,
              consumed_at, expires_at
       FROM public.auth_login_otp
       WHERE id = $1
         AND user_id = $2
       FOR UPDATE`,
      [challengeId, userId]
    );

    const challenge = challengeResult.rows[0];

    if (
      !challenge ||
      challenge.delivery_status !== 'pending' ||
      challenge.consumed_at ||
      new Date(challenge.expires_at).getTime() <= Date.now()
    ) {
      await client.query('ROLLBACK');
      active = false;
      return { confirmed: false };
    }

    await client.query(
      `UPDATE public.auth_login_otp
       SET consumed_at = now()
       WHERE user_id = $1
         AND id <> $2
         AND consumed_at IS NULL
         AND delivery_status = 'sent'`,
      [userId, challengeId]
    );

    const updated = await client.query(
      `UPDATE public.auth_login_otp
       SET delivery_status = 'sent',
           last_sent_at = now()
       WHERE id = $1
         AND user_id = $2
         AND delivery_status = 'pending'
         AND consumed_at IS NULL
       RETURNING id`,
      [challengeId, userId]
    );

    if (updated.rowCount !== 1) {
      throw new Error('OTP_CONFIRM_UPDATE_FAILED');
    }

    await client.query('COMMIT');
    active = false;

    return { confirmed: true };
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

export async function recordLoginOtpDeliveryFailure(pool, {
  challengeId,
  userId,
  status
}) {
  if (
    typeof challengeId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(challengeId) ||
    typeof userId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(userId) ||
    !['failed', 'unknown'].includes(status)
  ) {
    throw new TypeError('OTP_DELIVERY_STATUS_INPUT_INVALID');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT id
       FROM public.users
       WHERE id = $1
       FOR UPDATE`,
      [userId]
    );

    if (userResult.rowCount !== 1) {
      await client.query('ROLLBACK');
      return { recorded: false };
    }

    const result = await client.query(
      `UPDATE public.auth_login_otp
       SET delivery_status = $3
       WHERE id = $1
         AND user_id = $2
         AND delivery_status = 'pending'
         AND consumed_at IS NULL
       RETURNING id`,
      [challengeId, userId, status]
    );

    await client.query('COMMIT');

    return {
      recorded: result.rowCount === 1,
      status
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original database error.
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function consumeLoginOtp(pool, {
  challengeId,
  code,
  secret = process.env.AUTH_OTP_HASH_SECRET
}) {
  if (
    typeof challengeId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(challengeId) ||
    typeof code !== 'string'
  ) {
    return { verified: false };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT id, user_id, code_hash,
              attempts, expires_at, consumed_at, delivery_status
       FROM public.auth_login_otp
       WHERE id = $1
       FOR UPDATE`,
      [challengeId]
    );

    const otp = result.rows[0];

    if (
      !otp ||
      otp.consumed_at ||
       otp.delivery_status !== 'sent' ||
      otp.attempts >= LOGIN_OTP_MAX_ATTEMPTS ||
      new Date(otp.expires_at).getTime() <= Date.now()
    ) {
      await client.query('COMMIT');
      return { verified: false };
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

      await client.query('COMMIT');
      return { verified: false };
    }

    await client.query(
      `UPDATE public.auth_login_otp
       SET consumed_at = now()
       WHERE id = $1`,
      [challengeId]
    );

    await client.query('COMMIT');

    return {
      verified: true,
      userId: otp.user_id
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function cancelLoginOtp(pool, {
  challengeId,
  userId
}) {
  if (
    typeof challengeId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(challengeId) ||
    typeof userId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(userId)
  ) {
    throw new TypeError('OTP_CANCEL_INPUT_INVALID');
  }

  const result = await pool.query(
    `UPDATE public.auth_login_otp
     SET consumed_at = now()
     WHERE id = $1
       AND user_id = $2
       AND consumed_at IS NULL
     RETURNING id`,
    [challengeId, userId]
  );

  return {
    cancelled: result.rowCount === 1
  };
}