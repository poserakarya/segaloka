import { resendEmailVerification } from './resend-verification-service.js';

const schema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['email'],
    properties: {
      email: {
        type: 'string',
        minLength: 3,
        maxLength: 254
      }
    }
  }
};

export async function registerResendVerificationRoute(app, pool) {
  app.post(
    '/auth/resend-verification',
    {
      schema,
      bodyLimit: 1024,
      onRequest: async (_request, reply) => {
        reply.header('Cache-Control', 'no-store');
      }
    },
    async (request, reply) => {
      try {
        const result = await resendEmailVerification(
          pool,
          request.body.email
        );

        return reply.code(202).send(result);
      } catch (error) {
        if (error?.message === 'INVALID_EMAIL') {
          return reply.code(400).send({
            accepted: false,
            code: 'INVALID_EMAIL'
          });
        }

        request.log.error(
          { err: error },
          'Resend verification failed'
        );

        return reply.code(500).send({
          accepted: false,
          code: 'INTERNAL_ERROR',
          message: 'Layanan sedang mengalami gangguan.'
        });
      }
    }
  );
}