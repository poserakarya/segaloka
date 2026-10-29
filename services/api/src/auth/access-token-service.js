import { randomBytes, createHash } from 'node:crypto';

export const ACCESS_TOKEN_TTL_SECONDS = 900;

export function hashAccessToken(token) {
  if (typeof token !== 'string' ||
      !/^[0-9a-f]{64}$/.test(token)) {
    throw new Error('INVALID_ACCESS_TOKEN_FORMAT');
  }

  return createHash('sha256')
    .update(token)
    .digest('hex');
}

export async function createAccessToken(pool, sessionId) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('ACCESS_TOKEN_POOL_REQUIRED');
  }

  if (typeof sessionId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(sessionId)) {
    throw new Error('INVALID_SESSION_ID');
  }

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashAccessToken(token);

  const result = await pool.query(
    `INSERT INTO public.auth_access_tokens (
       session_id,
       token_hash,
       expires_at
     )
     SELECT
       s.id,
       $2,
       now() + interval '15 minutes'
     FROM public.auth_sessions s
     JOIN public.users u
       ON u.id = s.user_id
     WHERE s.id = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > now()
        AND (u.two_factor_enabled = false OR s.mfa_verified_at IS NOT NULL)
       AND u.status = 'active'
       
     RETURNING expires_at`,
    [sessionId, tokenHash]
  );

  if (result.rowCount !== 1) {
    return null;
  }

  return {
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    expiresAt: result.rows[0].expires_at
  };
}