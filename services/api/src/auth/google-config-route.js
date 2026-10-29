import { createSessionAuth } from '../security/session-auth.js';
import { encryptOAuthSecret } from './oauth-config-crypto.js';

const CALLBACK_URL =
  'https://api.segaloka.com/auth/google/callback';

const SCOPES = ['openid', 'email', 'profile'];

function validClientId(value) {
  return typeof value === 'string' &&
    /^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(value);
}

function publicConfig(row) {
  return {
    provider: row.provider,
    enabled: row.enabled,
    clientId: row.client_id,
    redirectUri: row.redirect_uri,
    scopes: row.scopes,
    hasSecret: row.has_secret,
    configuredAt: row.configured_at,
    updatedAt: row.updated_at
  };
}

export async function registerGoogleConfigRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

  async function requireSuperAdmin(request, reply) {
    await requireSession(request, reply);

    if (reply.sent || !request.auth?.userId) return;

    const result = await pool.query(
      `SELECT 1
       FROM public.memberships m
       JOIN public.roles r ON r.id = m.role_id
       WHERE m.user_id = $1
         AND m.organization_id IS NULL
         AND r.code = 'super_admin'
       LIMIT 1`,
      [request.auth.userId]
    );

    if (result.rowCount === 0) {
      return reply.code(403).send({
        code: 'SUPER_ADMIN_REQUIRED'
      });
    }
  }

  app.get('/admin/integrations/google', {
    preHandler: requireSuperAdmin
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const result = await pool.query(
      `SELECT provider, enabled, client_id,
              redirect_uri, scopes,
              client_secret_encrypted IS NOT NULL AS has_secret,
              configured_at, updated_at
       FROM public.oauth_provider_configs
       WHERE provider = 'google'`
    );

    if (!result.rows[0]) {
      return reply.code(404).send({
        code: 'GOOGLE_PROVIDER_NOT_FOUND'
      });
    }

    return publicConfig(result.rows[0]);
  });

  app.put('/admin/integrations/google', {
    preHandler: requireSuperAdmin
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const body = request.body;

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      typeof body.enabled !== 'boolean' ||
      (body.clientId !== undefined &&
        typeof body.clientId !== 'string') ||
      (body.clientSecret !== undefined &&
        typeof body.clientSecret !== 'string') ||
      (body.redirectUri !== undefined &&
        typeof body.redirectUri !== 'string')
    ) {
      return reply.code(400).send({
        code: 'INVALID_GOOGLE_CONFIG'
      });
    }

    if (
      body.redirectUri !== undefined &&
      body.redirectUri !== CALLBACK_URL
    ) {
      return reply.code(400).send({
        code: 'INVALID_REDIRECT_URI'
      });
    }

    if (
      body.clientId !== undefined &&
      !validClientId(body.clientId)
    ) {
      return reply.code(400).send({
        code: 'INVALID_GOOGLE_CLIENT_ID'
      });
    }

    if (
      body.clientSecret !== undefined &&
      (!body.clientSecret ||
        body.clientSecret.length > 4096)
    ) {
      return reply.code(400).send({
        code: 'INVALID_GOOGLE_CLIENT_SECRET'
      });
    }

    let encryptedSecret = null;

    if (body.clientSecret !== undefined) {
      encryptedSecret = encryptOAuthSecret(body.clientSecret);
    }

    const client = await pool.connect();
    let transactionOpen = false;

    try {
      await client.query('BEGIN');
      transactionOpen = true;

      const current = await client.query(
        `SELECT *
         FROM public.oauth_provider_configs
         WHERE provider = 'google'
         FOR UPDATE`
      );

      if (current.rowCount === 0) {
        await client.query('ROLLBACK');
        transactionOpen = false;

        return reply.code(404).send({
          code: 'GOOGLE_PROVIDER_NOT_FOUND'
        });
      }

      const existing = current.rows[0];

      const clientId =
        body.clientId ?? existing.client_id;

      const secret =
        encryptedSecret ?? existing.client_secret_encrypted;

      const redirectUri =
        body.redirectUri ?? existing.redirect_uri;

      if (
        body.enabled &&
        (
          !validClientId(clientId) ||
          !secret ||
          redirectUri !== CALLBACK_URL
        )
      ) {
        await client.query('ROLLBACK');
        transactionOpen = false;

        return reply.code(400).send({
          code: 'GOOGLE_CONFIG_INCOMPLETE'
        });
      }

      const updated = await client.query(
        `UPDATE public.oauth_provider_configs
         SET enabled = $1,
             client_id = $2,
             client_secret_encrypted = $3,
             redirect_uri = $4,
             configured_by = $5,
             configured_at = NOW(),
             updated_at = NOW()
         WHERE provider = 'google'
         RETURNING provider, enabled, client_id,
                   redirect_uri, scopes,
                   client_secret_encrypted IS NOT NULL AS has_secret,
                   configured_at, updated_at`,
        [
          body.enabled,
          clientId,
          secret,
          redirectUri,
          request.auth.userId
        ]
      );

      await client.query(
        `INSERT INTO public.audit_logs (
           actor_user_id,
           organization_id,
           action,
           entity_type,
           entity_id
         )
         VALUES ($1, NULL, $2, 'oauth_provider_config', NULL)`,
        [
          request.auth.userId,
          body.enabled
            ? 'oauth.google.config.enabled'
            : 'oauth.google.config.updated_disabled'
        ]
      );

      await client.query('COMMIT');
      transactionOpen = false;

      return publicConfig(updated.rows[0]);
    } catch (error) {
      if (transactionOpen) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          request.log.error(
            { err: rollbackError },
            'Google OAuth configuration rollback failed'
          );
        }
      }

      request.log.error(
        { err: error },
        'Google OAuth configuration update failed'
      );

      return reply.code(503).send({
        code: 'GOOGLE_CONFIG_UPDATE_FAILED'
      });
    } finally {
      client.release();
    }
  });
}