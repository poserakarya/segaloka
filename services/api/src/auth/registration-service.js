import { hashPassword } from './password.js';
import { createEmailVerificationToken } from './email-token.js';

export async function registerPublicUser(pool, input) {
  const { email, fullName, password, phoneE164 } = input ?? {};

  if (typeof email !== 'string') {
    throw new TypeError('INVALID_EMAIL');
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    throw new TypeError('INVALID_EMAIL');
  }

  if (
    typeof fullName !== 'string' ||
    fullName.trim().length < 2 ||
    fullName.trim().length > 150
  ) {
    throw new TypeError('INVALID_FULL_NAME');
  }

  if (
    typeof phoneE164 !== 'string' ||
    !/^\+[1-9][0-9]{7,14}$/.test(phoneE164)
  ) {
    throw new TypeError('INVALID_PHONE');
  }

  const passwordHash = await hashPassword(password);
  const verification = createEmailVerificationToken();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const created = await client.query(
      `INSERT INTO public.users
         (email, full_name, phone_e164, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id`,
      [normalizedEmail, fullName.trim(), phoneE164]
    );

    const userId = created.rows[0].id;

    await client.query(
      `INSERT INTO public.user_credentials
         (user_id, password_hash)
       VALUES ($1, $2)`,
      [userId, passwordHash]
    );

    const membership = await client.query(
      `INSERT INTO public.memberships
         (user_id, role_id)
       SELECT $1, id
       FROM public.roles
       WHERE code = 'traveler'
       RETURNING id`,
      [userId]
    );

    if (membership.rowCount !== 1) {
      throw new Error('TRAVELER_ROLE_NOT_FOUND');
    }

    await client.query(
      `INSERT INTO public.email_verifications
         (user_id, email, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [
        userId,
        normalizedEmail,
        verification.tokenHash,
        verification.expiresAt
      ]
    );

    await client.query('COMMIT');

    return {
      userId,
      email: normalizedEmail,
      verificationToken: verification.token,
      verificationExpiresAt: verification.expiresAt
    };
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }

    throw error;
  } finally {
    client.release();
  }
}