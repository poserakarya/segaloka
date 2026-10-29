import { createHmac } from 'node:crypto';

const WINDOW_MINUTES = 15;
const MAX_EMAIL_ATTEMPTS = 5;
const MAX_IP_ATTEMPTS = 10;

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    throw new TypeError('INVALID_EMAIL');
  }

  const normalized = email.trim().toLowerCase();

  if (
    normalized.length < 3 ||
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    throw new TypeError('INVALID_EMAIL');
  }

  return normalized;
}

function hashIp(ip, secret) {
  if (typeof ip !== 'string' || !ip.trim()) {
    throw new Error('REGISTRATION_IP_REQUIRED');
  }

  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('AUTH_IP_HASH_SECRET_NOT_CONFIGURED');
  }

  return createHmac('sha256', secret)
    .update(ip)
    .digest('hex');
}

export async function withRegistrationLimit(
  pool,
  { email, ip, ipHashSecret },
  operation
) {
  if (typeof operation !== 'function') {
    throw new TypeError('REGISTRATION_OPERATION_REQUIRED');
  }

  const normalized = normalizeEmail(email);
  const ipHash = hashIp(ip, ipHashSecret);
  const client = await pool.connect();
  let clientReleased = false;

  const releaseClient = () => {
    if (!clientReleased) {
      clientReleased = true;
      client.release();
    }
  };

  let transactionOpen = false;

  try {
    await client.query('BEGIN');
    transactionOpen = true;

    // Serialize attempts for the same email or IP.
    // Acquire locks in deterministic order.
    const lockKeys = [
      `registration:email:${normalized}`,
      `registration:ip:${ipHash}`
    ].sort();

    for (const key of lockKeys) {
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [key]
      );
    }

    const counts = await client.query(
      `SELECT
         count(*) FILTER (
           WHERE email_normalized = $1
         )::integer AS email_attempts,
         count(*) FILTER (
           WHERE ip_hash = $2
         )::integer AS ip_attempts
       FROM public.auth_registration_attempts
       WHERE attempted_at > now() - interval '15 minutes'
         AND (
           email_normalized = $1
           OR ip_hash = $2
         )`,
      [normalized, ipHash]
    );

    const { email_attempts, ip_attempts } = counts.rows[0];

    if (
      email_attempts >= MAX_EMAIL_ATTEMPTS ||
      ip_attempts >= MAX_IP_ATTEMPTS
    ) {
      await client.query(
        `INSERT INTO public.auth_registration_attempts
           (email_normalized, ip_hash, outcome)
         VALUES ($1, $2, 'blocked')`,
        [normalized, ipHash]
      );

      await client.query('COMMIT');
      transactionOpen = false;

      return {
        allowed: false,
        retryAfterSeconds: WINDOW_MINUTES * 60
      };
    }

    // Reserve the attempt before releasing the concurrency locks.
    const reservation = await client.query(
      `INSERT INTO public.auth_registration_attempts
         (email_normalized, ip_hash, outcome)
       VALUES ($1, $2, 'failure')
       RETURNING id`,
      [normalized, ipHash]
    );

    const attemptId = reservation.rows[0].id;

    await client.query('COMMIT');
    transactionOpen = false;
    releaseClient();

    // Registration runs after the reservation is committed.
    // A failed operation retains the conservative 'failure' outcome.
    let result;

    try {
      result = await operation();
    } catch (error) {
      if (error?.message === 'EMAIL_ALREADY_REGISTERED') {
        await pool.query(
          `UPDATE public.auth_registration_attempts
           SET outcome = 'duplicate'
           WHERE id = $1`,
          [attemptId]
        );
      }

      throw error;
    }

    await pool.query(
      `UPDATE public.auth_registration_attempts
       SET outcome = 'success'
       WHERE id = $1`,
      [attemptId]
    );

    return {
      allowed: true,
      result
    };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve original error.
      }
    }

    throw error;
  } finally {
    releaseClient();
  }
}

export const REGISTRATION_RATE_LIMIT = Object.freeze({
  windowMinutes: WINDOW_MINUTES,
  maxEmailAttempts: MAX_EMAIL_ATTEMPTS,
  maxIpAttempts: MAX_IP_ATTEMPTS
});