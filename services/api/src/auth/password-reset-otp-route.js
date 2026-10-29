import { verifyPasswordResetOtp } from './password-reset-otp-service.js';

const verifySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['challengeId', 'code'],
    properties: {
      challengeId: {
        type: 'string',
        pattern: '^[0-9a-f]{32}$'
      },
      code: {
        type: 'string',
        pattern: '^[0-9]{6}$'
      }
    }
  }
};

export async function registerPasswordResetOtpRoutes(app, pool) {
  app.post(
    '/auth/password/verify',
    {
      schema: verifySchema,
      bodyLimit: 1024
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');

      try {
        const result = await verifyPasswordResetOtp(
          pool,
          request.body.challengeId,
          request.body.code
        );

        if (!result.verified) {
          return reply.code(400).send({
            verified: false,
            code: 'INVALID_OR_EXPIRED_OTP',
            message: 'Kode OTP tidak valid atau kedaluwarsa.'
          });
        }

        return reply.code(200).send({
          verified: true,
          token: result.token,
          message: 'Kode OTP berhasil diverifikasi.'
        });
      } catch (error) {
        request.log.error(
          { errorCode: 'PASSWORD_RESET_OTP_FAILED' },
          'Password reset OTP verification failed'
        );

        return reply.code(500).send({
          verified: false,
          code: 'INTERNAL_ERROR',
          message: 'Verifikasi OTP sementara tidak tersedia.'
        });
      }
    }
  );
}