import { createHash } from 'node:crypto';

const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

function extractBearerToken(authorization) {
  if (typeof authorization !== 'string') {
    return null;
  }

  const match = /^Bearer ([0-9a-f]{64})$/i.exec(
    authorization.trim()
  );

  return match ? match[1] : null;
}

export function createSessionAuth(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('SESSION_AUTH_POOL_REQUIRED');
  }

  return async function requireSession(request, reply) {
    reply.header('Cache-Control', 'no-store');

    const token = extractBearerToken(
      request.headers.authorization
    );

    if (!token || !TOKEN_PATTERN.test(token)) {
      return reply.code(401).send({
        authenticated: false,
        code: 'AUTH_REQUIRED',
        message: 'Sesi pengguna diperlukan.'
      });
    }

    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

    try {
      const result = await pool.query(
        `SELECT
           s.id AS session_id,
           s.user_id,
           s.expires_at
         FROM public.auth_access_tokens a
         JOIN public.auth_sessions s
           ON s.id = a.session_id
         JOIN public.users u
           ON u.id = s.user_id
         WHERE a.token_hash = $1
           AND a.expires_at > now()
           AND s.revoked_at IS NULL
           AND s.expires_at > now()
        AND (u.two_factor_enabled = false OR s.mfa_verified_at IS NOT NULL)
           AND u.status = 'active'
           
         LIMIT 1`,
        [tokenHash]
      );

      const session = result.rows[0];

      if (!session) {
        return reply.code(401).send({
          authenticated: false,
          code: 'INVALID_SESSION',
          message: 'Sesi tidak valid atau telah berakhir.'
        });
      }

      request.auth = {
        userId: session.user_id,
        sessionId: session.session_id,
        accessTokenHash: tokenHash
      };
    } catch (error) {
      request.log.error(
        { errorCode: 'SESSION_AUTH_FAILED' },
        'Session authentication failed'
      );

      return reply.code(503).send({
        authenticated: false,
        code: 'AUTH_SERVICE_UNAVAILABLE',
        message: 'Validasi sesi sedang tidak tersedia.'
      });
    }
  };
}