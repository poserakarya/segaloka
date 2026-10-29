import {
  rotateSession,
  revokeSession,
  revokeAllUserSessions
} from './session-service.js';
import { createSessionAuth } from '../security/session-auth.js';

const tokenSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['refreshToken'],
    properties: {
      refreshToken: {
        type: 'string',
        pattern: '^[0-9a-f]{64}$'
      }
    }
  }
};

export async function registerSessionRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);
  app.post(
    '/auth/refresh',
    {
      schema: tokenSchema,
      bodyLimit: 2048
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');

      try {
        const session = await rotateSession(
          pool,
          request.body.refreshToken,
          { issueAccessToken: true }
        );

        if (!session) {
          return reply.code(401).send({
            authenticated: false,
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Sesi tidak valid atau telah berakhir.'
          });
        }

        return reply.code(200).send({
          authenticated: true,
          session
        });
      } catch (error) {
        request.log.error(
          { err: error },
          'Refresh session failed'
        );

        return reply.code(500).send({
          authenticated: false,
          code: 'INTERNAL_ERROR',
          message: 'Terjadi gangguan pada layanan sesi.'
        });
      }
    }
  );

  app.post(
    '/auth/logout',
    {
      schema: tokenSchema,
      bodyLimit: 2048
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');

      try {
        await revokeSession(
          pool,
          request.body.refreshToken
        );

        return reply.code(200).send({
          success: true,
          message: 'Permintaan logout diproses.'
        });
      } catch (error) {
        request.log.error(
          { err: error },
          'Logout failed'
        );

        return reply.code(500).send({
          success: false,
          code: 'INTERNAL_ERROR',
          message: 'Terjadi gangguan pada layanan logout.'
        });
      }
    }
  );
  app.post(
    '/auth/logout-all',
    {
      preHandler: requireSession,
      schema: {
        body: {
          type: 'object',
          additionalProperties: false
        }
      },
      bodyLimit: 256
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');

      try {
        const revokedCount = await revokeAllUserSessions(
          pool,
          request.auth.userId
        );

        return reply.code(200).send({
          success: true,
          revokedCount,
          message: 'Seluruh sesi pengguna telah dicabut.'
        });
      } catch (error) {
        request.log.error(
          { errorCode: 'LOGOUT_ALL_FAILED' },
          'Logout all sessions failed'
        );

        return reply.code(500).send({
          success: false,
          code: 'INTERNAL_ERROR',
          message: 'Gagal mencabut seluruh sesi.'
        });
      }
    }
  );
}