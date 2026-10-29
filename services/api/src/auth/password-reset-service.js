import { randomBytes, createHash } from 'node:crypto';
import { hashPassword } from './password.js';

const TOKEN_TTL_MINUTES = 15;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordReset(pool, email) {
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    throw new TypeError('INVALID_EMAIL');
  }

  const normalized = email.trim().toLowerCase();
  const client = await pool.connect();
  let resetData = null;
  let inTransaction = false;

  try {
    await client.query('BEGIN');
    inTransaction = true;

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

    if (user) {
      const limits = await client.query(
        `SELECT
           count(*) FILTER (
             WHERE created_at > now() - interval '24 hours'
           )::integer AS daily_count,
           max(created_at) AS last_created
         FROM public.password_reset_requests
         WHERE user_id = $1`,
        [user.id]
      );

      const { daily_count, last_created } = limits.rows[0];

      const cooldownPassed =
        !last_created ||
        Date.now() - new Date(last_created).getTime() >= 60000;

      if (daily_count < 5 && cooldownPassed) {
        const token = randomBytes(32).toString('hex');
        const tokenHash = hashToken(token);

        await client.query(
          `UPDATE public.password_reset_requests
           SET consumed_at = now()
           WHERE user_id = $1
             AND consumed_at IS NULL`,
          [user.id]
        );

        await client.query(
          `INSERT INTO public.password_reset_requests
             (user_id, token_hash, expires_at)
           VALUES (
             $1, $2,
             now() + interval '15 minutes'
           )`,
          [user.id, tokenHash]
        );

        resetData = {
          email: user.email,
          fullName: user.full_name,
          token,
          expiresInMinutes: TOKEN_TTL_MINUTES
        };
      }
    }

    await client.query('COMMIT');
    inTransaction = false;

    return resetData;
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

export async function confirmPasswordReset(
  pool,
  token,
  newPassword
) {
  if (
    typeof token !== 'string' ||
    !/^[0-9a-f]{64}$/.test(token)
  ) {
    return { reset: false };
  }

  const passwordHash = await hashPassword(newPassword);
  const tokenHash = hashToken(token);

  const client = await pool.connect();
  let inTransaction = false;

  try {
    await client.query('BEGIN');
    inTransaction = true;

    // Temukan pemilik token tanpa mengambil row lock token.
    const ownerResult = await client.query(
      `SELECT r.user_id
       FROM public.password_reset_requests r
       WHERE r.token_hash = $1`,
      [tokenHash]
    );

    const owner = ownerResult.rows[0];

    if (!owner) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return { reset: false };
    }

    // Kunci pengguna sebelum token dan sesi.
    const userResult = await client.query(
      `SELECT id
       FROM public.users
       WHERE id = $1
         AND status = 'active'
       FOR UPDATE`,
      [owner.user_id]
    );

    if (userResult.rowCount !== 1) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return { reset: false };
    }

    // Validasi ulang token setelah mendapatkan user lock.
    const result = await client.query(
      `SELECT r.id, r.user_id
       FROM public.password_reset_requests r
       WHERE r.token_hash = $1
         AND r.user_id = $2
         AND r.consumed_at IS NULL
         AND r.expires_at > now()
       FOR UPDATE OF r`,
      [tokenHash, owner.user_id]
    );

    const request = result.rows[0];

    if (!request) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return { reset: false };
    }

    await client.query(
      `UPDATE public.user_credentials
       SET password_hash = $1,
           password_changed_at = now(),
           updated_at = now()
       WHERE user_id = $2`,
      [passwordHash, request.user_id]
    );

    await client.query(
      `UPDATE public.password_reset_requests
       SET consumed_at = now()
       WHERE user_id = $1
         AND consumed_at IS NULL`,
      [request.user_id]
    );

    await client.query(
      `UPDATE public.auth_sessions
       SET revoked_at = now()
       WHERE user_id = $1
         AND revoked_at IS NULL`,
      [request.user_id]
    );

    await client.query('COMMIT');
    inTransaction = false;

    return { reset: true };
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