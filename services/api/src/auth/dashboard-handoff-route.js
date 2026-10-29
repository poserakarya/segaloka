import { createHash, timingSafeEqual } from 'node:crypto';
import { createSessionAuth } from '../security/session-auth.js';
import {
  createDashboardHandoff,
  consumeDashboardHandoff
} from './dashboard-handoff-service.js';

const HEX = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f-]{36}$/i;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function equalHash(a, b) {
  if (!HEX.test(a || '') || !HEX.test(b || '')) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

export async function registerDashboardHandoffRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.post('/auth/dashboard/handoff', {
    preHandler: requireSession,
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['refreshToken', 'binding'],
        properties: {
          refreshToken: { type: 'string', pattern: '^[0-9a-f]{64}$' },
          binding: { type: 'string', pattern: '^[0-9a-f]{64}$' }
        }
      }
    },
    bodyLimit: 2048
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    // Fail closed until browser-bound challenge verification is implemented.
    return reply.code(503).send({
      code: 'HANDOFF_CHALLENGE_NOT_READY'
    });

    if (!request.verifiedClientIp) {
      return reply.code(403).send({ code: 'INGRESS_REQUIRED' });
    }

    const refreshToken = request.body.refreshToken;
    const refreshHash = sha256(refreshToken);

    const result = await pool.query(
      `SELECT s.id, s.user_id, u.email, u.full_name, u.status
       FROM public.auth_sessions s
       JOIN public.users u ON u.id = s.user_id
       WHERE s.id = $1
         AND s.user_id = $2
         AND s.refresh_token_hash = $3
         AND s.revoked_at IS NULL
         AND s.expires_at > now()
         AND (u.two_factor_enabled = false OR s.mfa_verified_at IS NOT NULL)
         AND u.status = 'active'`,
      [
        request.auth.sessionId,
        request.auth.userId,
        refreshHash
      ]
    );

    if (result.rowCount !== 1) {
      return reply.code(401).send({ code: 'INVALID_HANDOFF_SESSION' });
    }

    const user = result.rows[0];

    const membership = await pool.query(
      `SELECT m.organization_id
       FROM public.memberships m
       JOIN public.roles r ON r.id = m.role_id
       JOIN public.organizations o ON o.id = m.organization_id
       WHERE m.user_id = $1
         AND r.code = 'travel'
         AND o.organization_type = 'travel'
         AND o.status IN ('pending', 'active')`,
      [user.user_id]
    );

    if (membership.rowCount === 0) {
      return reply.code(403).send({ code: 'TRAVEL_ACCESS_REQUIRED' });
    }

    if (membership.rowCount > 1) {
      return reply.code(409).send({ code: 'MULTIPLE_TRAVEL_ORGANIZATIONS' });
    }

    const client = await pool.connect();

    try {
      const ticket = await createDashboardHandoff(client, {
        dashboard: 'travel',
        binding: request.body.binding,
        user: {
          id: user.user_id,
          email: user.email,
          fullName: user.full_name,
          status: user.status
        },
        session: {
          sessionId: request.auth.sessionId,
          accessToken: request.headers.authorization.slice(7),
          refreshToken
        }
      });

      return reply.code(200).send(ticket);
    } finally {
      client.release();
    }
  });

  app.post('/auth/dashboard/handoff/consume', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['ticket', 'binding'],
        properties: {
          ticket: { type: 'string', pattern: '^[0-9a-f]{64}$' },
          binding: { type: 'string', pattern: '^[0-9a-f]{64}$' }
        }
      }
    },
    bodyLimit: 2048
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    if (!request.verifiedClientIp) {
      return reply.code(403).send({ code: 'INGRESS_REQUIRED' });
    }

    const configuredSecret = process.env.DASHBOARD_HANDOFF_SECRET;
    const providedSecret = request.headers['x-segaloka-handoff-secret'];

    if (
      typeof configuredSecret !== 'string' ||
      !/^[0-9a-f]{64}$/.test(configuredSecret)
    ) {
      return reply.code(503).send({
        code: 'HANDOFF_CONFIGURATION_UNAVAILABLE'
      });
    }

    if (
      typeof providedSecret !== 'string' ||
      !equalHash(configuredSecret, providedSecret)
    ) {
      return reply.code(403).send({
        code: 'HANDOFF_SERVICE_FORBIDDEN'
      });
    }

    const result = await consumeDashboardHandoff(pool, request.body);

    if (!result) {
      return reply.code(401).send({ code: 'INVALID_OR_EXPIRED_HANDOFF' });
    }

    return reply.code(200).send(result);
  });
}