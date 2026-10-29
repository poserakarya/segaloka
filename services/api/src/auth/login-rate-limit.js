import { createHmac } from 'node:crypto';

const WINDOW_MINUTES = 15;
const MAX_EMAIL_FAILURES = 5;
const MAX_IP_FAILURES = 20;

function normalizeEmail(email) {
  return typeof email === 'string'
    ? email.trim().toLowerCase().slice(0, 254)
    : '';
}

function hashIp(ip, secret) {
  if (!ip) return null;

  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('AUTH_IP_HASH_SECRET_NOT_CONFIGURED');
  }

  return createHmac('sha256', secret)
    .update(String(ip))
    .digest('hex');
}

export async function checkLoginRateLimit(
  pool,
  { email, ip, ipHashSecret }
) {
  const normalized = normalizeEmail(email);
  const ipHash = hashIp(ip, ipHashSecret);

  const result = await pool.query(
    `SELECT
       count(*) FILTER (
         WHERE email_normalized = $1
           AND outcome = 'failure'
       )::integer AS email_failures,
       count(*) FILTER (
         WHERE $2::text IS NOT NULL
           AND ip_hash = $2
           AND outcome = 'failure'
       )::integer AS ip_failures
     FROM public.auth_attempts
     WHERE attempted_at > now() - interval '15 minutes'
       AND (
         email_normalized = $1
         OR ($2::text IS NOT NULL AND ip_hash = $2)
       )`,
    [normalized, ipHash]
  );

  const counts = result.rows[0];

  return {
    allowed:
      counts.email_failures < MAX_EMAIL_FAILURES &&
      counts.ip_failures < MAX_IP_FAILURES,
    retryAfterSeconds: WINDOW_MINUTES * 60
  };
}

export async function recordLoginAttempt(
  pool,
  { email, ip, ipHashSecret, outcome }
) {
  if (!['success', 'failure', 'blocked'].includes(outcome)) {
    throw new TypeError('INVALID_AUTH_OUTCOME');
  }

  await pool.query(
    `INSERT INTO public.auth_attempts
       (email_normalized, ip_hash, outcome)
     VALUES ($1, $2, $3)`,
    [
      normalizeEmail(email),
      hashIp(ip, ipHashSecret),
      outcome
    ]
  );
}

export const LOGIN_RATE_LIMIT = Object.freeze({
  windowMinutes: WINDOW_MINUTES,
  maxEmailFailures: MAX_EMAIL_FAILURES,
  maxIpFailures: MAX_IP_FAILURES
});