import { randomBytes, createHash } from 'node:crypto';
import { createAccessToken } from './access-token-service.js';

const SESSION_DAYS = 7;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function validToken(token) {
  return typeof token === 'string' &&
    /^[0-9a-f]{64}$/.test(token);
}

export async function createSession(pool, userId) {
  const token = randomBytes(32).toString('hex');

  const result = await pool.query(
    `INSERT INTO public.auth_sessions
       (user_id, refresh_token_hash, expires_at)
     VALUES (
       $1,
       $2,
       now() + interval '7 days'
     )
     RETURNING id, expires_at`,
    [userId, hashToken(token)]
  );

  return {
    refreshToken: token,
    sessionId: result.rows[0].id,
    expiresAt: result.rows[0].expires_at
  };
}

export async function rotateSession(
  pool,
  refreshToken,
  options = {}
) {
  const { issueAccessToken = false } = options;
  if (!validToken(refreshToken)) {
    return null;
  }

  const oldHash = hashToken(refreshToken);
  const client = await pool.connect();
  let inTransaction = false;

  try {
    await client.query('BEGIN');
    inTransaction = true;

    // Cari pemilik token tanpa mengunci sesi terlebih dahulu.
    const ownerResult = await client.query(
      `SELECT user_id
       FROM public.auth_sessions
       WHERE refresh_token_hash = $1`,
      [oldHash]
    );

    const owner = ownerResult.rows[0];

    if (owner) {
      // Urutan lock konsisten: pengguna, kemudian sesi.
      await client.query(
        `SELECT id
         FROM public.users
         WHERE id = $1
         FOR UPDATE`,
        [owner.user_id]
      );
    }

    // Validasi ulang sesi setelah user lock diperoleh.
    const result = await client.query(
      `SELECT s.id, s.user_id, s.expires_at
       FROM public.auth_sessions s
       JOIN public.users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > now()
          AND (u.two_factor_enabled = false OR s.mfa_verified_at IS NOT NULL)
         AND u.status = 'active'
         
       FOR UPDATE OF s`,
      [oldHash]
    );

    const session = result.rows[0];

    if (!session) {
      const replay = await client.query(
        `UPDATE public.auth_refresh_token_history
         SET replay_detected_at =
           COALESCE(replay_detected_at, now())
         WHERE token_hash = $1
           AND expires_at > now()
            AND rotated_at <= now() - interval '2 seconds'
         RETURNING session_id`,
        [oldHash]
      );

      if (replay.rowCount > 0) {
        const sessionIds = [
          ...new Set(replay.rows.map(row => row.session_id))
        ];
      
        await client.query(
          `UPDATE public.auth_sessions
           SET revoked_at = COALESCE(revoked_at, now())
           WHERE id = ANY($1::uuid[])
             AND revoked_at IS NULL`,
          [sessionIds]
        );
      }
      
      await client.query('COMMIT');
      inTransaction = false;
      
      // Do not reveal whether an invalid token was previously used.
      return null;
    }

    const newToken = randomBytes(32).toString('hex');

    await client.query(
      `INSERT INTO public.auth_refresh_token_history
         (session_id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [
        session.id,
        session.user_id,
        oldHash,
        session.expires_at
      ]
    );

    await client.query(
      `UPDATE public.auth_sessions
       SET refresh_token_hash = $1,
           last_used_at = now()
       WHERE id = $2`,
      [hashToken(newToken), session.id]
    );

    let access = null;

    if (issueAccessToken) {
      access = await createAccessToken(
        client,
        session.id
      );

      if (!access) {
        throw new Error('ACCESS_TOKEN_ISSUANCE_FAILED');
      }
    }

    await client.query('COMMIT');
    inTransaction = false;

    return {
      refreshToken: newToken,
      sessionId: session.id,
      userId: session.user_id,
      ...(access ? {
        accessToken: access.accessToken,
        tokenType: access.tokenType,
        expiresIn: access.expiresIn,
        accessTokenExpiresAt: access.expiresAt
      } : {})
    };
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
export async function revokeSession(pool, refreshToken) {
  if (!validToken(refreshToken)) {
    return false;
  }

  const result = await pool.query(
    `UPDATE public.auth_sessions
     SET revoked_at = now()
     WHERE refresh_token_hash = $1
       AND revoked_at IS NULL
     RETURNING id`,
    [hashToken(refreshToken)]
  );

  return result.rowCount === 1;
}

export async function revokeAllUserSessions(pool, userId) {
  const result = await pool.query(
    `UPDATE public.auth_sessions
     SET revoked_at = now()
     WHERE user_id = $1
       AND revoked_at IS NULL`,
    [userId]
  );

  return result.rowCount;
}

export const SESSION_TTL_DAYS = SESSION_DAYS;