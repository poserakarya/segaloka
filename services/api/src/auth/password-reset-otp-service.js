import { randomInt, randomBytes, createHmac, createHash, timingSafeEqual } from 'node:crypto';

const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const DAILY_LIMIT = 5;
const COOLDOWN_MS = 60_000;

function otpDigest(challengeId, code) {
  const secret = process.env.PASSWORD_RESET_OTP_SECRET;

  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('PASSWORD_RESET_OTP_SECRET_NOT_CONFIGURED');
  }

  return createHmac('sha256', secret)
    .update(`password-reset:${challengeId}:${code}`)
    .digest('hex');
}

function tokenDigest(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createPasswordResetOtp(pool, email) {
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    throw new TypeError('INVALID_EMAIL');
  }

  const normalized = email.trim().toLowerCase();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT u.id, u.email, u.full_name
       FROM public.users u
       JOIN public.user_credentials c ON c.user_id = u.id
       WHERE lower(u.email) = $1
         AND u.status = 'active'
       FOR UPDATE OF u`,
      [normalized]
    );

    const user = result.rows[0];

    if (!user) {
      await client.query('COMMIT');
      return null;
    }

    const limits = await client.query(
      `SELECT
         count(*) FILTER (
           WHERE created_at > now() - interval '24 hours'
         )::integer AS daily_count,
         max(created_at) AS last_created
       FROM public.password_reset_otp_challenges
       WHERE user_id = $1`,
      [user.id]
    );

    const { daily_count, last_created } = limits.rows[0];

    const cooldownPassed =
      !last_created ||
      Date.now() - new Date(last_created).getTime() >= COOLDOWN_MS;

    if (daily_count >= DAILY_LIMIT || !cooldownPassed) {
      await client.query('COMMIT');
      return null;
    }

    const challengeId = randomBytes(16).toString('hex');
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const digest = otpDigest(challengeId, code);

    await client.query(
      `UPDATE public.password_reset_otp_challenges
       SET consumed_at = now()
       WHERE user_id = $1 AND consumed_at IS NULL`,
      [user.id]
    );

    await client.query(
      `INSERT INTO public.password_reset_otp_challenges
         (id, user_id, otp_hash, expires_at)
       VALUES ($1::uuid, $2, $3, now() + interval '5 minutes')`,
      [
        `${challengeId.slice(0, 8)}-${challengeId.slice(8, 12)}-${challengeId.slice(12, 16)}-${challengeId.slice(16, 20)}-${challengeId.slice(20)}`,
        user.id,
        digest
      ]
    );

    await client.query('COMMIT');

    return {
      email: user.email,
      fullName: user.full_name,
      challengeId,
      code,
      expiresInMinutes: OTP_TTL_MINUTES
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyPasswordResetOtp(pool, challengeId, code) {
  if (
    typeof challengeId !== 'string' ||
    !/^[0-9a-f]{32}$/.test(challengeId) ||
    typeof code !== 'string' ||
    !/^[0-9]{6}$/.test(code)
  ) {
    return { verified: false };
  }

  const uuid = `${challengeId.slice(0, 8)}-${challengeId.slice(8, 12)}-${challengeId.slice(12, 16)}-${challengeId.slice(16, 20)}-${challengeId.slice(20)}`;
  const digest = otpDigest(challengeId, code);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const ownerResult = await client.query(
      `SELECT user_id
       FROM public.password_reset_otp_challenges
       WHERE id = $1::uuid`,
      [uuid]
    );

    const owner = ownerResult.rows[0];

    if (!owner) {
      await client.query('ROLLBACK');
      return { verified: false };
    }

    const activeUser = await client.query(
      `SELECT id FROM public.users
       WHERE id = $1 AND status = 'active'
       FOR UPDATE`,
      [owner.user_id]
    );

    if (!activeUser.rowCount) {
      await client.query('ROLLBACK');
      return { verified: false };
    }

    const result = await client.query(
      `SELECT id, user_id, otp_hash, attempts
       FROM public.password_reset_otp_challenges
       WHERE id = $1::uuid
         AND user_id = $2
         AND consumed_at IS NULL
         AND verified_at IS NULL
         AND expires_at > now()
         AND attempts < $3
       FOR UPDATE`,
      [uuid, owner.user_id, MAX_ATTEMPTS]
    );

    const challenge = result.rows[0];

    if (!challenge) {
      await client.query('ROLLBACK');
      return { verified: false };
    }

    const matches = timingSafeEqual(
      Buffer.from(challenge.otp_hash, 'hex'),
      Buffer.from(digest, 'hex')
    );

    if (!matches) {
      await client.query(
        `UPDATE public.password_reset_otp_challenges
         SET attempts = attempts + 1,
             consumed_at = CASE
               WHEN attempts + 1 >= $2 THEN now()
               ELSE consumed_at
             END
         WHERE id = $1::uuid`,
        [uuid, MAX_ATTEMPTS]
      );

      await client.query('COMMIT');
      return { verified: false };
    }

    const token = randomBytes(32).toString('hex');

    await client.query(
      `UPDATE public.password_reset_otp_challenges
       SET verified_at = now(), consumed_at = now()
       WHERE id = $1::uuid`,
      [uuid]
    );

    await client.query(
      `UPDATE public.password_reset_requests
       SET consumed_at = now()
       WHERE user_id = $1 AND consumed_at IS NULL`,
      [challenge.user_id]
    );

    await client.query(
      `INSERT INTO public.password_reset_requests
         (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '5 minutes')`,
      [challenge.user_id, tokenDigest(token)]
    );

    await client.query('COMMIT');

    return { verified: true, token };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}