import {
  consumeGoogleOAuthExchange
} from './google-oauth-exchange-service.js';

const BINDING_COOKIE =
  'segaloka_google_binding';

function readBindingCookie(header) {
  if (typeof header !== 'string') return null;

  const matches = header
    .split(';')
    .map(part => part.trim())
    .filter(part =>
      part.startsWith(`${BINDING_COOKIE}=`)
    );

  if (matches.length !== 1) return null;

  const value = matches[0].slice(
    BINDING_COOKIE.length + 1
  );

  return /^[0-9a-f]{64}$/.test(value)
    ? value
    : null;
}

export async function registerGoogleOAuthExchangeRoute(
  app,
  pool
) {
  app.post(
    '/auth/google/exchange',
    {
      config: {
        cors: {
          origin: [
            'https://segaloka.com',
            'https://www.segaloka.com',
            'https://dashboard.segaloka.com',
            'https://dev.segaloka.com',
            'https://dev.dashboard.segaloka.com'
          ],
          credentials: true
        }
      },
      schema: {
        body: {
          type: 'object',
          required: ['code'],
          additionalProperties: false,
          properties: {
            code: {
              type: 'string',
              pattern: '^[0-9a-f]{64}$'
            }
          }
        }
      }
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      reply.header('Referrer-Policy', 'no-referrer');
      reply.header('X-Content-Type-Options', 'nosniff');

      if (!request.verifiedClientIp) {
        return reply.code(403).send({
          authenticated: false,
          code: 'GOOGLE_EXCHANGE_INGRESS_REQUIRED'
        });
      }

      const binding = readBindingCookie(
        request.headers.cookie
      );

      if (!binding) {
        return reply.code(401).send({
          authenticated: false,
          code: 'GOOGLE_EXCHANGE_BINDING_MISSING'
        });
      }

      try {
        const result = await consumeGoogleOAuthExchange(
          pool,
          {
            code: request.body.code,
            browserBinding: binding
          }
        );

        if (!result) {
          return reply.code(401).send({
            authenticated: false,
            code: 'INVALID_OR_EXPIRED_GOOGLE_EXCHANGE'
          });
        }

        reply.header(
          'Set-Cookie',
          `${BINDING_COOKIE}=; Path=/; Max-Age=0; ` +
          'Domain=.segaloka.com; HttpOnly; Secure; SameSite=Lax'
        );

        return reply.code(200).send(result);
      } catch (error) {
        request.log.error(
          { err: error },
          'Google OAuth exchange failed'
        );

        return reply.code(503).send({
          authenticated: false,
          code: 'GOOGLE_EXCHANGE_UNAVAILABLE'
        });
      }
    }
  );
}
