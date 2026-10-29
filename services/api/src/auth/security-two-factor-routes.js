import { createSessionAuth } from '../security/session-auth.js';
import { createSecurityChallenge } from './security-challenge-service.js';
import { completeSecurityChallenge } from './security-challenge-completion.js';
import { cancelSecurityChallenge } from './security-challenge-cancel.js';
import { sendSecurityOtpEmail } from './security-otp-email.js';

const UUID_PATTERN =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

const PURPOSES = ['enable_2fa', 'disable_2fa'];

const challengeSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['purpose', 'channel', 'password'],
    properties: {
      purpose: { type: 'string', enum: PURPOSES },
      channel: { type: 'string', enum: ['email'] },
      password: { type: 'string', minLength: 1, maxLength: 128 },
      language: { type: 'string', enum: ['ID', 'EN', 'AR'] }
    }
  }
};

const confirmSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['challengeId', 'purpose', 'code'],
    properties: {
      challengeId: { type: 'string', pattern: UUID_PATTERN },
      purpose: { type: 'string', enum: PURPOSES },
      code: { type: 'string', pattern: '^[0-9]{6}$' }
    }
  }
};

const REQUEST_ERRORS = {
  INVALID_REQUEST: 400,
  INVALID_PASSWORD: 401,
  INVALID_ACCOUNT: 401,
  INVALID_SESSION: 401,
  MFA_SESSION_REQUIRED: 403,
  CHANNEL_NOT_VERIFIED: 403,
  INVALID_TWO_FACTOR_STATE: 409,
  RESEND_TOO_SOON: 429,
  INVALID_OR_EXPIRED_OTP: 400,
  CHANNEL_CHANGED: 409
};

function failure(reply, code) {
  return reply.code(REQUEST_ERRORS[code] || 400).send({
    success: false,
    code
  });
}

export async function registerSecurityTwoFactorRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.post(
    '/auth/security/2fa/challenge',
    {
      preHandler: requireSession,
      schema: challengeSchema,
      bodyLimit: 4096
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');

      const { userId, sessionId } = request.auth;
      const { purpose, channel, password, language } = request.body;

      let challenge;

      try {
        challenge = await createSecurityChallenge(pool, {
          userId,
          sessionId,
          purpose,
          channel,
          password
        });
      } catch {
        return reply.code(503).send({
          success: false,
          code: 'SECURITY_SERVICE_UNAVAILABLE'
        });
      }

      if (!challenge.created) {
        return failure(reply, challenge.code);
      }

      try {
        await sendSecurityOtpEmail({
          email: challenge.destination,
          code: challenge.code,
          purpose,
          language: language || 'ID'
        });
      } catch {
        try {
          const cancelled = await cancelSecurityChallenge(pool, {
            challengeId: challenge.challengeId,
            userId,
            sessionId,
            purpose
          });

          if (!cancelled.cancelled) {
            return reply.code(503).send({
              success: false,
              code: 'SECURITY_CHALLENGE_CANCELLATION_UNCONFIRMED'
            });
          }
        } catch {
          return reply.code(503).send({
            success: false,
            code: 'SECURITY_CHALLENGE_CANCELLATION_UNCONFIRMED'
          });
        }

        return reply.code(503).send({
          success: false,
          code: 'OTP_DELIVERY_UNAVAILABLE'
        });
      }

      return reply.code(200).send({
        success: true,
        code: 'OTP_SENT',
        challengeId: challenge.challengeId,
        channel: 'email',
        expiresIn: challenge.expiresIn
      });
    }
  );

  app.post(
    '/auth/security/2fa/confirm',
    {
      preHandler: requireSession,
      schema: confirmSchema,
      bodyLimit: 1024
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');

      const { userId, sessionId } = request.auth;
      const { challengeId, purpose, code } = request.body;

      let result;

      try {
        result = await completeSecurityChallenge(pool, {
          userId,
          sessionId,
          challengeId,
          purpose,
          code
        });
      } catch {
        return reply.code(503).send({
          success: false,
          code: 'SECURITY_SERVICE_UNAVAILABLE'
        });
      }

      if (!result.success) {
        return failure(reply, result.code);
      }

      return reply.code(200).send({
        success: true,
        enabled: result.enabled,
        loginRequired: true
      });
    }
  );
}
