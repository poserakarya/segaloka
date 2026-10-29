import { requestPasswordResetAndSend } from './password-reset-workflow.js';
import { confirmPasswordReset } from './password-reset-service.js';

const forgotSchema = {
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

const resetSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['token', 'newPassword'],
    properties: {
      token: {
        type: 'string',
        pattern: '^[0-9a-f]{64}$',
        minLength: 64,
        maxLength: 64
      },
      newPassword: {
        type: 'string',
        minLength: 12,
        maxLength: 128
      }
    }
  }
};

const noStore = async (request, reply) => {
  reply.header('Cache-Control', 'no-store');
};

export async function registerPasswordResetRoutes(app, pool) {
  app.post(
    '/auth/password/forgot',
    {
      schema: forgotSchema,
      bodyLimit: 1024,
      onRequest: noStore
    },
    async (request, reply) => {
      try {
        const result = await requestPasswordResetAndSend(
          pool,
          request.body.email
        );

        return reply.code(200).send(result);
      } catch (error) {
        if (error.message === 'INVALID_EMAIL') {
          return reply.code(400).send({
            accepted: false,
            code: 'INVALID_EMAIL',
            message: 'Format email tidak valid.'
          });
        }

        request.log.error(
          { errorCode: 'PASSWORD_RESET_FAILED' }, 'Password reset request failed'
        );

        return reply.code(500).send({
          accepted: false,
          code: 'INTERNAL_ERROR',
          message: 'Terjadi gangguan pada layanan reset password.'
        });
      }
    }
  );

  app.post(
    '/auth/password/reset',
    {
      schema: resetSchema,
      bodyLimit: 2048,
      onRequest: noStore
    },
    async (request, reply) => {
      try {
        const result = await confirmPasswordReset(
          pool,
          request.body.token,
          request.body.newPassword
        );

        if (!result.reset) {
          return reply.code(400).send({
            reset: false,
            code: 'INVALID_RESET_TOKEN',
            message: 'Token reset tidak valid atau kedaluwarsa.'
          });
        }

        return reply.code(200).send({
          reset: true,
          code: 'PASSWORD_RESET',
          message: 'Kata sandi berhasil diperbarui.'
        });
      } catch (error) {
        if (
          error instanceof TypeError ||
          error.message === 'INVALID_PASSWORD'
        ) {
          return reply.code(400).send({
            reset: false,
            code: 'INVALID_PASSWORD',
            message: 'Kata sandi baru tidak memenuhi persyaratan.'
          });
        }

        request.log.error(
          { errorCode: 'PASSWORD_RESET_CONFIRMATION_FAILED' }, 'Password reset confirmation failed'
        );

        return reply.code(500).send({
          reset: false,
          code: 'INTERNAL_ERROR',
          message: 'Terjadi gangguan pada layanan reset password.'
        });
      }
    }
  );
}