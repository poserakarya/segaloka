import {
  completePasswordOnlyLogin
} from './password-only-login-service.js';
import {
  getLoginChannelAvailability,
  filterAvailableLoginChannels
} from './login-channel-availability.js';
import { getClientIp } from '../security/trusted-proxy.js';
import { secureLogin } from './secure-login-service.js';
import {
  getTwoFactorSettings,
  getAllowedLoginMethods
} from './two-factor-methods.js';
import { createLoginPreAuth } from './login-pre-auth-service.js';

const loginSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        minLength: 3,
        maxLength: 254
      },
      password: {
        type: 'string',
        minLength: 1,
        maxLength: 128
      },
      language: {
        type: 'string',
        enum: ['ID', 'EN', 'AR']
      }
    }
  }
};

export async function registerLoginRoute(app, pool) {
  app.post(
    '/auth/login',
    {
      schema: loginSchema,
      bodyLimit: 4096
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');

      try {
        const result = await secureLogin(
          pool,
          request.body,
          {
            ip: getClientIp(request)
          }
        );

        if (result.reason === 'RATE_LIMITED') {
          const retryAfter = Math.max(
            1,
            Math.ceil(result.retryAfterSeconds || 900)
          );

          reply.header('Retry-After', String(retryAfter));

          return reply.code(429).send({
            authenticated: false,
            code: 'RATE_LIMITED',
            message: 'Terlalu banyak percobaan login.'
          });
        }

        if (
          result.credentialsVerified !== true ||
          !result.user?.id
        ) {
          return reply.code(401).send({
            authenticated: false,
            code: 'INVALID_CREDENTIALS',
            message: 'Email atau kata sandi tidak valid.'
          });
        }

        const settings = await getTwoFactorSettings(
          pool,
          result.user.id
        );

        if (!settings) {
          throw new Error('LOGIN_USER_UNAVAILABLE');
        }

        if (settings.enabled === false) {
          const session = await completePasswordOnlyLogin(
            pool,
            result.user.id
          );

          if (!session) {
            return reply.code(403).send({
              authenticated: false,
              code: 'LOGIN_STATE_CHANGED',
              message: 'Status keamanan akun berubah. Silakan masuk kembali.'
            });
          }

          return reply.code(200).send({
            authenticated: true,
            session
          });
        }
        const availableMethods = filterAvailableLoginChannels(
  getAllowedLoginMethods(settings),
  getLoginChannelAvailability()
);

        if (availableMethods.length === 0) {
          return reply.code(403).send({
            authenticated: false,
            code: 'TWO_FACTOR_METHOD_UNAVAILABLE',
            message: 'Metode verifikasi belum tersedia.'
          });
        }

        const preAuth = await createLoginPreAuth(
          pool,
          result.user.id
        );

        return reply.code(200).send({
          authenticated: false,
          code: 'OTP_CHANNEL_REQUIRED',
          preAuthTicket: preAuth.ticket,
          availableMethods,
          expiresIn: preAuth.expiresIn
        });
      } catch (error) {
        request.log.error(
          { errorCode: 'LOGIN_REQUEST_FAILED' },
          'Login request failed'
        );

        return reply.code(500).send({
          authenticated: false,
          code: 'INTERNAL_ERROR',
          message: 'Terjadi gangguan pada layanan login.'
        });
      }
    }
  );
}