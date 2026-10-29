import { completeLoginOtp } from './login-otp-completion.js';
import { getClientIp } from '../security/trusted-proxy.js';
import {
  reserveLoginOtpAttempt
} from './login-otp-rate-limit.js';

const verifyOtpSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['challengeId', 'code'],
    properties: {
      challengeId: {
        type: 'string',
        format: 'uuid'
      },
      code: {
        type: 'string',
        pattern: '^[0-9]{6}$'
      }
    }
  }
};

export async function registerLoginOtpVerifyRoute(app, pool) {
  app.post(
    '/auth/login/verify-otp',
    {
      schema: verifyOtpSchema,
      bodyLimit: 2048
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');

      let reservation;

      try {
        reservation = await reserveLoginOtpAttempt(pool, {
          ip: getClientIp(request)
        });
      } catch (error) {
        request.log.error(
          { errorCode: 'OTP_RATE_LIMIT_FAILED' },
          'OTP rate limit failed'
        );

        return reply.code(503).send({
          authenticated: false,
          code: 'OTP_VERIFICATION_UNAVAILABLE',
          message: 'Verifikasi sementara tidak tersedia.'
        });
      }

      if (!reservation.allowed) {
        reply.header(
          'Retry-After',
          String(reservation.retryAfterSeconds || 900)
        );

        return reply.code(429).send({
          authenticated: false,
          code: 'OTP_RATE_LIMITED',
          message: 'Terlalu banyak percobaan verifikasi.'
        });
      }

      try {
        const result = await completeLoginOtp(
          pool,
          {
            challengeId: request.body.challengeId,
            code: request.body.code,
            attemptId: reservation.attemptId
          }
        );


        if (!result.authenticated) {
          return reply.code(401).send({
            authenticated: false,
            code: 'INVALID_OR_EXPIRED_OTP',
            message: 'Kode OTP tidak valid atau kedaluwarsa.'
          });
        }

        return reply.code(200).send({
          authenticated: true,
          user: result.user,
          session: result.session
        });
      } catch (error) {
        request.log.error(
          { errorCode: 'OTP_VERIFICATION_FAILED' },
          'OTP verification request failed'
        );

        return reply.code(500).send({
          authenticated: false,
          code: 'INTERNAL_ERROR',
          message: 'Verifikasi OTP belum dapat diproses.'
        });
      }
    }
  );
}