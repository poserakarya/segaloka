import { randomBytes, createHash } from 'node:crypto';

export const LOGIN_PRE_AUTH_TTL_SECONDS = 300;

function hashTicket(ticket) {
  return createHash('sha256')
    .update(ticket)
    .digest('hex');
}

function validTicket(ticket) {
  return typeof ticket === 'string' &&
    /^[0-9a-f]{64}$/.test(ticket);
}

export async function createLoginPreAuth(pool, userId) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('PRE_AUTH_POOL_REQUIRED');
  }

  if (
    typeof userId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(userId)
  ) {
    throw new Error('PRE_AUTH_USER_INVALID');
  }

  const ticket = randomBytes(32).toString('hex');

  const result = await pool.query(
    `INSERT INTO public.auth_login_pre_auth
       (user_id, ticket_hash, expires_at)
     VALUES (
       $1,
       $2,
       now() + interval '5 minutes'
     )
     RETURNING id, expires_at`,
    [userId, hashTicket(ticket)]
  );

  return {
    ticket,
    expiresIn: LOGIN_PRE_AUTH_TTL_SECONDS,
    expiresAt: result.rows[0].expires_at
  };
}

/**
 * Must be called inside an existing database transaction.
 *
 * The caller must create the OTP challenge using the same
 * transaction and COMMIT only after challenge creation succeeds.
 */
export async function consumeLoginPreAuth(
  client,
  { ticket, channel }
) {
  if (!client || typeof client.query !== 'function') {
    throw new Error('PRE_AUTH_CLIENT_REQUIRED');
  }

  if (
    !validTicket(ticket) ||
    !['email', 'whatsapp', 'sms', 'authenticator'].includes(channel)
  ) {
    return null;
  }

  const ticketHash = hashTicket(ticket);

  const ownerResult = await client.query(
    `SELECT user_id
     FROM public.auth_login_pre_auth
     WHERE ticket_hash = $1`,
    [ticketHash]
  );

  const owner = ownerResult.rows[0];

  if (!owner) {
    return null;
  }

  // Consistent lock order: user, then pre-auth ticket.
  const userResult = await client.query(
    `SELECT id, status, two_factor_enabled, email_verified_at,
            phone_verified_at
     FROM public.users
     WHERE id = $1
     FOR UPDATE`,
    [owner.user_id]
  );

  const user = userResult.rows[0];

  if (
    !user ||
    user.status !== 'active' ||
    user.two_factor_enabled !== true ||
    (channel === 'email' && !user.email_verified_at) ||
    (['whatsapp', 'sms'].includes(channel) && !user.phone_verified_at)
  ) {
    return null;
  }

  const consumed = await client.query(
    `UPDATE public.auth_login_pre_auth
     SET consumed_at = now(),
         attempts = attempts + 1
     WHERE ticket_hash = $1
       AND user_id = $2
       AND consumed_at IS NULL
       AND expires_at > now()
       AND attempts < 5
     RETURNING user_id`,
    [ticketHash, user.id]
  );

  if (consumed.rowCount !== 1) {
    return null;
  }

  return {
    userId: user.id,
    channel
  };
}