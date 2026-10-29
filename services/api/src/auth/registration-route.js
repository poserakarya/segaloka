import { getClientIp } from '../security/trusted-proxy.js';
import { registerAndSendVerification } from './registration-workflow.js';
import { withRegistrationLimit } from './registration-rate-limit.js';

const registrationSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'fullName', 'password', 'phoneE164'],
    properties: {
      email: {
        type: 'string',
        minLength: 3,
        maxLength: 254
      },
      fullName: {
        type: 'string',
        minLength: 2,
        maxLength: 150
      },
      password: {
        type: 'string',
        minLength: 12,
        maxLength: 128
      },
      phoneE164: {
        type: 'string',
        pattern: '^\\+[1-9][0-9]{7,14}$',
        minLength: 9,
        maxLength: 16
      }
    }
  }
};

const acceptedResponse = Object.freeze({
  accepted: true,
  message:
    'Jika pendaftaran dapat diproses, instruksi verifikasi akan dikirim ke email.'
});

export async function registerRegistrationRoute(
  app,
  pool,
  {
    register = registerAndSendVerification,
    limit = withRegistrationLimit
  } = {}
) {
  app.post(
    '/auth/register',
    {
      schema: registrationSchema,
      preValidation: async (request, reply) => {
        const body = request.body;
        const allowed = new Set(['email', 'fullName', 'password', 'phoneE164']);
        if (
          body &&
          typeof body === 'object' &&
          !Array.isArray(body) &&
          Object.keys(body).some((key) => !allowed.has(key))
        ) {
          return reply.code(400).send({
            accepted: false,
            code: 'REGISTRATION_EXTRA_FIELDS',
            message: 'Data pendaftaran mengandung field yang tidak diizinkan.'
          });
        }
      },
      bodyLimit: 4096,
      onRequest: async (_request, reply) => {
        reply.header('Cache-Control', 'no-store');
      }
    },
    async (request, reply) => {
      try {
        const limited = await limit(
          pool,
          {
            email: request.body.email,
            ip: getClientIp(request),
            ipHashSecret: process.env.AUTH_IP_HASH_SECRET
          },
          async () => register(
            pool,
            request.body
          )
        );

        if (!limited.allowed) {
          reply.header(
            'Retry-After',
            String(limited.retryAfterSeconds)
          );

          return reply.code(429).send({
            accepted: false,
            code: 'REGISTRATION_RATE_LIMITED',
            message:
              'Terlalu banyak percobaan pendaftaran. Silakan coba lagi nanti.'
          });
        }

        return reply.code(202).send(acceptedResponse);
      } catch (error) {
        if (error?.message === 'EMAIL_ALREADY_REGISTERED') {
          return reply.code(202).send(acceptedResponse);
        }

        if (
          error?.message === 'INVALID_EMAIL' ||
          error?.message === 'INVALID_FULL_NAME' ||
          error?.message === 'INVALID_PASSWORD' ||
          error?.message === 'INVALID_PHONE'
        ) {
          return reply.code(400).send({
            accepted: false,
            code: 'INVALID_REGISTRATION_DATA',
            message: 'Data pendaftaran tidak valid.'
          });
        }

        request.log.error(
          { err: error },
          'Registration request failed'
        );

        return reply.code(500).send({
          accepted: false,
          code: 'INTERNAL_ERROR',
          message: 'Terjadi gangguan pada layanan pendaftaran.'
        });
      }
    }
  );
}