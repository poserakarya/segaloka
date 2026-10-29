import {
  createSession
} from './session-service.js';

import {
  createAccessToken
} from './access-token-service.js';

import {
  createGoogleOAuthExchange
} from './google-oauth-exchange-service.js';

export async function completeGoogleOAuthLogin(
  pool,
  identity
) {
  if (
    !identity ||
    identity.provider !== 'google' ||
    typeof identity.subject !== 'string' ||
    !identity.subject ||
    identity.emailVerified !== true
  ) {
    return {
      authenticated: false,
      code: 'INVALID_GOOGLE_IDENTITY'
    };
  }

  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query('BEGIN');
    transactionOpen = true;

    const result = await client.query(
      `SELECT
         u.id,
         u.email,
         u.full_name,
         u.status
       FROM public.user_identities i
       JOIN public.users u
         ON u.id = i.user_id
       WHERE i.provider = 'google'
         AND i.provider_subject = $1
       FOR UPDATE OF u`,
      [identity.subject]
    );

    const user = result.rows[0];

    if (!user || user.status !== 'active') {
      await client.query('ROLLBACK');
      transactionOpen = false;

      return {
        authenticated: false,
        code: 'GOOGLE_ACCOUNT_NOT_LINKED'
      };
    }

    const membershipsResult = await client.query(
      `SELECT
         r.code AS role,
         m.organization_id
       FROM public.memberships m
       JOIN public.roles r
         ON r.id = m.role_id
       WHERE m.user_id = $1
       ORDER BY r.code, m.organization_id NULLS FIRST`,
      [user.id]
    );

    if (membershipsResult.rowCount === 0) {
      await client.query('ROLLBACK');
      transactionOpen = false;

      return {
        authenticated: false,
        code: 'GOOGLE_ACCOUNT_ACCESS_DENIED'
      };
    }

    const session = await createSession(
      client,
      user.id
    );

    const verified = await client.query(
      `UPDATE public.auth_sessions
       SET mfa_verified_at = now(),
           mfa_method = 'google'
       WHERE id = $1
         AND user_id = $2
         AND mfa_verified_at IS NULL
       RETURNING id`,
      [session.sessionId, user.id]
    );

    if (verified.rowCount !== 1) {
      throw new Error('GOOGLE_MFA_SESSION_FAILED');
    }

    const access = await createAccessToken(
      client,
      session.sessionId
    );

    if (!access) {
      throw new Error('GOOGLE_ACCESS_TOKEN_FAILED');
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      memberships: membershipsResult.rows.map(
        row => ({
          role: row.role,
          organizationId: row.organization_id
        })
      )
    };

    const exchange = await createGoogleOAuthExchange(
      client,
      {
        user: userPayload,
        session: {
          ...session,
          accessToken: access.accessToken,
          tokenType: access.tokenType,
          expiresIn: access.expiresIn,
          accessTokenExpiresAt: access.expiresAt
        }
      }
    );

    await client.query('COMMIT');
    transactionOpen = false;

    return {
      authenticated: true,
      exchange: {
        code: exchange.code,
        browserBinding: exchange.browserBinding,
        expiresIn: exchange.expiresIn
      }
    };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch {}
    }

    throw error;
  } finally {
    client.release();
  }
}