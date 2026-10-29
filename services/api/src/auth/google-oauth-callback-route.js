import {
  resolveGoogleCallbackIdentity
} from './google-oauth-callback-service.js';

import {
  completeGoogleOAuthLogin
} from './google-oauth-login-service.js';

const STATE_COOKIE = '__Host-segaloka_google_state';
const BINDING_COOKIE = 'segaloka_google_binding';

function readStateCookie(header) {
  if (typeof header !== 'string') return null;

  const matches = header
    .split(';')
    .map(part => part.trim())
    .filter(part => part.startsWith(`${STATE_COOKIE}=`));

  if (matches.length !== 1) return null;

  return matches[0].slice(STATE_COOKIE.length + 1);
}

export async function registerGoogleOAuthCallbackRoute(app, pool) {
  app.get(
    '/auth/google/callback',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            code: { type: 'string', maxLength: 4096 },
            state: { type: 'string', maxLength: 128 },
            error: { type: 'string', maxLength: 128 },
            error_description: {
              type: 'string',
              maxLength: 1024
            }
          }
        }
      }
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      reply.header('Referrer-Policy', 'no-referrer');
      reply.header('X-Content-Type-Options', 'nosniff');

      reply.header(
        'Set-Cookie',
        `${STATE_COOKIE}=; Path=/; Max-Age=0; ` +
        'HttpOnly; Secure; SameSite=Lax'
      );

      if (request.query.error) {
        return reply.code(400).send({
          authenticated: false,
          code: 'GOOGLE_AUTHORIZATION_FAILED'
        });
      }

      try {
        const resolved = await resolveGoogleCallbackIdentity(
          pool,
          {
            code: request.query.code,
            state: request.query.state,
            cookieState: readStateCookie(
              request.headers.cookie
            )
          }
        );

        if (!resolved.ok) {
          return reply.code(401).send({
            authenticated: false,
            code: resolved.code
          });
        }

        const login = await completeGoogleOAuthLogin(
          pool,
          resolved.identity
        );

        if (!login.authenticated) {
          return reply.code(403).send({
            authenticated: false,
            code: login.code
          });
        }

        const binding = login.exchange.browserBinding;

        reply.header(
          'Set-Cookie',
          [
            `${STATE_COOKIE}=; Path=/; Max-Age=0; ` +
              'HttpOnly; Secure; SameSite=Lax',
            `${BINDING_COOKIE}=${binding}; ` +
              'Path=/; Max-Age=60; Domain=.segaloka.com; ' +
              'HttpOnly; Secure; SameSite=Lax'
          ]
        );

        const destination = new URL(
          'https://segaloka.com/auth/google/complete'
        );

        destination.searchParams.set(
          'code',
          login.exchange.code
        );

        return reply.redirect(destination.toString(), 303);
      } catch (error) {
        request.log.error(
          { err: error },
          'Google OAuth callback failed'
        );

        return reply.code(503).send({
          authenticated: false,
          code: 'GOOGLE_CALLBACK_UNAVAILABLE'
        });
      }
    }
  );
}
