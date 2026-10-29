import {
  consumeLoginPreAuth
} from './login-pre-auth-service.js';

import {
  createLoginOtpInTransaction,
  confirmLoginOtpDelivery,
  recordLoginOtpDeliveryFailure
} from './login-otp-service.js';

import {
  dispatchLoginOtp
} from './login-otp-dispatcher.js';

import {
  getLoginChannelAvailability
} from './login-channel-availability.js';

const schema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['preAuthTicket', 'channel'],
    properties: {
      preAuthTicket: {
        type: 'string',
        pattern: '^[0-9a-f]{64}$'
      },
      channel: {
        type: 'string',
        enum: ['email', 'whatsapp', 'sms']
      },
      language: {
        type: 'string',
        enum: ['ID', 'EN', 'AR']
      }
    }
  }
};

export async function registerLoginSelectChannelRoute(app, pool) {
  app.post(
    '/auth/login/select-channel',
    {
      schema,
      bodyLimit: 2048
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');

      const {
        preAuthTicket,
        channel,
        language = 'ID'
      } = request.body;

      if (getLoginChannelAvailability()[channel] !== true) {
        return reply.code(503).send({
          authenticated: false,
          code: 'OTP_CHANNEL_UNAVAILABLE',
          message: 'Kanal verifikasi belum tersedia.'
        });
      }

      let challenge;
      let userId;
      let fullName;

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const consumed = await consumeLoginPreAuth(
          client,
          {
            ticket: preAuthTicket,
            channel
          }
        );

        if (!consumed) {
          await client.query('ROLLBACK');

          return reply.code(401).send({
            authenticated: false,
            code: 'INVALID_OR_EXPIRED_PRE_AUTH',
            message: 'Sesi verifikasi tidak valid atau kedaluwarsa.'
          });
        }

        userId = consumed.userId;

        challenge = await createLoginOtpInTransaction(
          client,
          {
            userId,
            channel
          }
        );

        const userResult = await client.query(
          `SELECT full_name
           FROM public.users
           WHERE id = $1`,
          [userId]
        );

        fullName = userResult.rows[0]?.full_name || '';

        await client.query('COMMIT');
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {}

        if (error.message === 'OTP_RESEND_TOO_SOON') {
          return reply.code(429).send({
            authenticated: false,
            code: 'OTP_RESEND_TOO_SOON',
            message: 'Tunggu sebelum meminta OTP kembali.'
          });
        }

        request.log.error(
          { errorCode: 'OTP_CHANNEL_CREATION_FAILED' },
          'OTP channel creation failed'
        );

        return reply.code(500).send({
          authenticated: false,
          code: 'INTERNAL_ERROR',
          message: 'Verifikasi belum dapat diproses.'
        });
      } finally {
        client.release();
      }

      try {
        const delivery = await dispatchLoginOtp({
          channel,
          destination: challenge.destination,
          code: challenge.code,
          fullName,
          language
        });

        if (!delivery?.accepted || !delivery.messageId) {
          const error = new Error('OTP_DELIVERY_UNKNOWN');
          error.deliveryStatus = 'unknown';
          throw error;
        }

        const confirmation = await confirmLoginOtpDelivery(
          pool,
          {
            challengeId: challenge.challengeId,
            userId
          }
        );

        if (!confirmation.confirmed) {
          throw new Error('OTP_DELIVERY_CONFIRMATION_FAILED');
        }

        return reply.code(200).send({
          authenticated: false,
          code: 'OTP_REQUIRED',
          challengeId: challenge.challengeId,
          channel,
          expiresIn: challenge.expiresIn
        });
      } catch (error) {
        const status =
          error.deliveryStatus === 'failed' ||
          error.message === 'RESEND_NOT_CONFIGURED'
            ? 'failed'
            : 'unknown';

        try {
          await recordLoginOtpDeliveryFailure(pool, {
            challengeId: challenge.challengeId,
            userId,
            status
          });
        } catch (recordError) {
          request.log.error(
            { errorCode: 'OTP_DELIVERY_STATUS_UPDATE_FAILED' },
            'OTP delivery status update failed'
          );
        }

        return reply.code(503).send({
          authenticated: false,
          code: 'OTP_DELIVERY_UNAVAILABLE',
          message: 'Pengiriman kode verifikasi belum tersedia.'
        });
      }
    }
  );
}