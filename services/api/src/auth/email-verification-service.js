import {
  createEmailVerificationToken,
  hashEmailToken
} from './email-token.js';

export async function issueEmailVerification(pool, userId, email) {
  const { token, tokenHash, expiresAt } =
    createEmailVerificationToken();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const user = await client.query(
      `SELECT id, email, email_verified_at
       FROM public.users
       WHERE id = $1
       FOR UPDATE`,
      [userId]
    );

    if (user.rowCount !== 1) {
      throw new Error('USER_NOT_FOUND');
    }

    if (user.rows[0].email_verified_at !== null) {
      throw new Error('EMAIL_ALREADY_VERIFIED');
    }

    if (user.rows[0].email.toLowerCase() !== email.toLowerCase()) {
      throw new Error('EMAIL_MISMATCH');
    }

    await client.query(
      `UPDATE public.email_verifications
       SET consumed_at = now()
       WHERE user_id = $1
         AND consumed_at IS NULL`,
      [userId]
    );

    await client.query(
      `INSERT INTO public.email_verifications
       (user_id, email, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [userId, email, tokenHash, expiresAt]
    );

    await client.query('COMMIT');

    return { token, expiresAt };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function consumeEmailVerification(pool, token) {
  let tokenHash;

  try {
    tokenHash = hashEmailToken(token);
  } catch {
    return { verified: false };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT id, user_id, email
       FROM public.email_verifications
       WHERE token_hash = $1
         AND consumed_at IS NULL
         AND expires_at > now()
       FOR UPDATE`,
      [tokenHash]
    );

    if (result.rowCount !== 1) {
      await client.query('ROLLBACK');
      return { verified: false };
    }

    const verification = result.rows[0];

    const updated = await client.query(
      `UPDATE public.users
       SET email_verified_at = now(),
           updated_at = now()
       WHERE id = $1
         AND lower(email) = lower($2)
         AND email_verified_at IS NULL
       RETURNING id`,
      [verification.user_id, verification.email]
    );

    if (updated.rowCount !== 1) {
      await client.query('ROLLBACK');
      return { verified: false };
    }

    await client.query(
      `UPDATE public.email_verifications
       SET consumed_at = now()
       WHERE id = $1`,
      [verification.id]
    );

    await client.query('COMMIT');

    return { verified: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}