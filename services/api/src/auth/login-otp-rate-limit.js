import { createHmac } from 'node:crypto';

const WINDOW_MINUTES = 15;
const MAX_IP_ATTEMPTS = 20;

function hashIp(ip, secret) {
  if (
    typeof ip !== 'string' ||
    ip.length === 0 ||
    typeof secret !== 'string' ||
    !/^[0-9a-f]{64}$/.test(secret)
  ) {
    throw new Error('OTP_RATE_LIMIT_CONFIGURATION_INVALID');
  }

  return createHmac('sha256', secret)
    .update(ip)
    .digest('hex');
}

export async function reserveLoginOtpAttempt(
  pool,
  {
    ip,
    ipHashSecret = process.env.AUTH_IP_HASH_SECRET
  }
) {
  const ipHash = hashIp(ip, ipHashSecret);

  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query('BEGIN');
    transactionOpen = true;

    await client.query(
      `SELECT pg_advisory_xact_lock(
         hashtextextended($1, 0)
       )`,
      [`segaloka:otp:ip:${ipHash}`]
    );

    const counts = await client.query(
      `SELECT count(*)::integer AS total
       FROM public.auth_login_otp_attempts
       WHERE ip_hash = $1
         AND attempted_at > now() - interval '15 minutes'
         AND outcome IN (
           'reserved',
           'failure',
           'success'
         )`,
      [ipHash]
    );

    if (counts.rows[0].total >= MAX_IP_ATTEMPTS) {
      await client.query(
        `INSERT INTO public.auth_login_otp_attempts
           (ip_hash, outcome)
         VALUES ($1, 'blocked')`,
        [ipHash]
      );

      await client.query('COMMIT');
      transactionOpen = false;

      return {
        allowed: false,
        retryAfterSeconds: WINDOW_MINUTES * 60
      };
    }

    const reserved = await client.query(
      `INSERT INTO public.auth_login_otp_attempts
         (ip_hash, outcome)
       VALUES ($1, 'reserved')
       RETURNING id`,
      [ipHash]
    );

    await client.query('COMMIT');
    transactionOpen = false;

    return {
      allowed: true,
      attemptId: reserved.rows[0].id
    };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch {}
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function finishLoginOtpAttempt(
  pool,
  { attemptId, authenticated }
) {
  if (
    !Number.isSafeInteger(Number(attemptId)) ||
    Number(attemptId) <= 0 ||
    typeof authenticated !== 'boolean'
  ) {
    throw new Error('OTP_ATTEMPT_RESULT_INVALID');
  }

  const outcome = authenticated
    ? 'success'
    : 'failure';

  await pool.query(
    `UPDATE public.auth_login_otp_attempts
     SET outcome = $2
     WHERE id = $1
       AND outcome = 'reserved'`,
    [attemptId, outcome]
  );
}

export const LOGIN_OTP_RATE_LIMIT = Object.freeze({
  windowMinutes: WINDOW_MINUTES,
  maxIpAttempts: MAX_IP_ATTEMPTS
});