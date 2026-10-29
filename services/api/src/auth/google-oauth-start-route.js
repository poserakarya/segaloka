import {
  createGoogleOAuthState
} from './google-oauth-state-service.js';

const CALLBACK =
  'https://api.segaloka.com/auth/google/callback';

const GOOGLE_AUTHORIZATION_URL =
  'https://accounts.google.com/o/oauth2/v2/auth';

export async function registerGoogleOAuthStartRoute(
  app,
  pool
) {
  app.get(
    '/auth/google/start',
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      reply.header('Referrer-Policy', 'no-referrer');

      try {
        const result = await pool.query(
          `SELECT
             enabled,
             client_id,
             redirect_uri,
             scopes,
             client_secret_encrypted IS NOT NULL
               AS has_secret
           FROM public.oauth_provider_configs
           WHERE provider = 'google'
           LIMIT 1`
        );

        const config = result.rows[0];

        if (
          !config ||
          config.enabled !== true ||
          !config.client_id ||
          !config.has_secret ||
          config.redirect_uri !== CALLBACK
        ) {
          return reply.code(503).send({
            code: 'GOOGLE_LOGIN_UNAVAILABLE',
            message: 'Login Google belum tersedia.'
          });
        }

        const oauth = await createGoogleOAuthState(
          pool,
          CALLBACK
        );

        const url = new URL(GOOGLE_AUTHORIZATION_URL);

        url.searchParams.set(
          'client_id',
          config.client_id
        );

        url.searchParams.set(
          'redirect_uri',
          CALLBACK
        );

        url.searchParams.set(
          'response_type',
          'code'
        );

        url.searchParams.set(
          'scope',
          'openid email profile'
        );

        url.searchParams.set(
          'state',
          oauth.state
        );

        url.searchParams.set(
          'nonce',
          oauth.nonce
        );

        url.searchParams.set(
          'code_challenge',
          oauth.codeChallenge
        );

        url.searchParams.set(
          'code_challenge_method',
          'S256'
        );

        reply.header(
          'Set-Cookie',
          `__Host-segaloka_google_state=${oauth.state}; ` +
          'Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax'
        );

        return reply.redirect(
          url.toString(),
          302
        );
      } catch (error) {
        request.log.error(
          { err: error },
          'Google OAuth start failed'
        );

        return reply.code(503).send({
          code: 'GOOGLE_LOGIN_UNAVAILABLE',
          message: 'Login Google belum tersedia.'
        });
      }
    }
  );
}