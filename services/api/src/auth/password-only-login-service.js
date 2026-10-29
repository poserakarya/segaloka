import { createSession } from './session-service.js';
import { createAccessToken } from './access-token-service.js';

export async function completePasswordOnlyLogin(pool, userId) {
  const client = await pool.connect();
  let active = false;

  try {
    await client.query('BEGIN');
    active = true;

    const user = await client.query(
      `SELECT id
       FROM public.users
       WHERE id = $1
         AND status = 'active'
         AND two_factor_enabled = false
       FOR UPDATE`,
      [userId]
    );

    if (user.rowCount !== 1) {
      await client.query('ROLLBACK');
      active = false;
      return null;
    }

    const session = await createSession(client, userId);
    const access = await createAccessToken(
      client,
      session.sessionId
    );

    if (!access) {
      throw new Error('PASSWORD_ACCESS_TOKEN_FAILED');
    }

    await client.query('COMMIT');
    active = false;

    return {
      ...session,
      ...access,
      accessTokenExpiresAt: access.expiresAt
    };
  } catch (error) {
    if (active) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client.release();
  }
}