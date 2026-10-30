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

// Exchange hanya untuk pemanggil server-ke-server yang menandatangani request
// ingress (route server website). Respons berisi bidang minimum yang dipakai
// pemanggil untuk menyetel cookie httpOnly: tanpa sessionId internal maupun
// data pribadi pengguna, dan schema respons menolak bidang tambahan.
const TOKEN = { type: 'string', pattern: '^[0-9a-f]{64}$' };
const EXCHANGE_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['authenticated', 'user', 'session'],
  properties: {
    authenticated: { type: 'boolean', const: true },
    user: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: { id: { type: 'string' } }
    },
    session: {
      type: 'object',
      additionalProperties: false,
      required: ['accessToken', 'refreshToken'],
      properties: {
        accessToken: TOKEN,
        refreshToken: TOKEN,
        tokenType: { type: 'string' },
        expiresIn: { type: 'integer' },
        accessTokenExpiresAt: { type: 'string' }
      }
    }
  }
};

export function exchangeResponseBody(payload) {
  const session = payload?.session || {};
  const body = {
    authenticated: true,
    user: { id: String(payload?.user?.id || '') },
    session: {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken
    }
  };
  if (typeof session.tokenType === 'string') body.session.tokenType = session.tokenType;
  if (Number.isInteger(session.expiresIn)) body.session.expiresIn = session.expiresIn;
  if (session.accessTokenExpiresAt != null) {
    body.session.accessTokenExpiresAt = new Date(session.accessTokenExpiresAt).toISOString();
  }
  return body;
}

export async function registerGoogleOAuthExchangeRoute(
  app,
  pool,
  { consume = consumeGoogleOAuthExchange } = {}
) {
  app.post(
    '/auth/google/exchange',
    {
      schema: {
        response: { 200: EXCHANGE_RESPONSE_SCHEMA },
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
      reply.header('Pragma', 'no-cache');

      if (!request.verifiedClientIp) {
        return reply.code(403).send({
          authenticated: false,
          code: 'GOOGLE_EXCHANGE_INGRESS_REQUIRED'
        });
      }

      // Browser selalu mengirim Origin pada POST lintas origin; pemanggil
      // server (website) tidak. Token tidak pernah dikembalikan ke konteks
      // browser, dan kode exchange tidak dikonsumsi.
      if (request.headers.origin !== undefined) {
        return reply.code(403).send({
          authenticated: false,
          code: 'GOOGLE_EXCHANGE_SERVER_ONLY'
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
        const result = await consume(
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

        return reply.code(200).send(exchangeResponseBody(result));
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
