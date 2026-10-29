import { consumeEmailVerification } from './email-verification-service.js';

const verificationSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['token'],
    properties: {
      token: {
        type: 'string',
        pattern: '^[0-9a-f]{64}$',
        minLength: 64,
        maxLength: 64
      }
    }
  }
};

export async function registerEmailVerificationRoute(app, pool) {
  app.post(
    '/auth/verify-email',
    {
      schema: verificationSchema,
      bodyLimit: 1024,
      onRequest: async (request, reply) => {
        reply.header('Cache-Control', 'no-store');
      }
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');

      try {
        const result = await consumeEmailVerification(
          pool,
          request.body.token
        );

        if (!result.verified) {
          return reply.code(400).send({
            verified: false,
            code: 'INVALID_VERIFICATION_TOKEN',
            message: 'Token verifikasi tidak valid atau kedaluwarsa.'
          });
        }

        return reply.code(200).send({
          verified: true,
          code: 'EMAIL_VERIFIED',
          message: 'Alamat email berhasil diverifikasi.'
        });
      } catch (error) {
        request.log.error(
          { errorCode: 'EMAIL_VERIFICATION_FAILED' },
          'Email verification failed'
        );

        return reply.code(500).send({
          verified: false,
          code: 'INTERNAL_ERROR',
          message: 'Terjadi gangguan pada layanan verifikasi email.'
        });
      }
    }
  );
}