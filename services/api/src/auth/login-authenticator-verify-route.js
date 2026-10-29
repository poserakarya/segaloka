import { createHash } from 'node:crypto';
import { verifyTotp } from './totp-crypto.js';
import { decryptTotpSecret } from './totp-secret-crypto.js';
import { createSession } from './session-service.js';
import { createAccessToken } from './access-token-service.js';
import { getClientIp } from '../security/trusted-proxy.js';
import { reserveLoginOtpAttempt } from './login-otp-rate-limit.js';

const schema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['preAuthTicket', 'code'],
    properties: {
      preAuthTicket: {
        type: 'string',
        pattern: '^[0-9a-f]{64}$'
      },
      code: {
        type: 'string',
        pattern: '^[0-9]{6}$'
      }
    }
  }
};

export async function registerLoginAuthenticatorVerifyRoute(app, pool) {
  app.post('/auth/login/verify-authenticator', {
    schema,
    bodyLimit: 2048
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    let reservation;

    try {
      reservation = await reserveLoginOtpAttempt(pool, {
        ip: getClientIp(request)
      });
    } catch {
      return reply.code(503).send({
        authenticated: false,
        code: 'VERIFICATION_UNAVAILABLE'
      });
    }

    if (!reservation.allowed) {
      reply.header(
        'Retry-After',
        String(reservation.retryAfterSeconds || 900)
      );

      return reply.code(429).send({
        authenticated: false,
        code: 'OTP_RATE_LIMITED'
      });
    }

    const ticketHash = createHash('sha256')
      .update(request.body.preAuthTicket)
      .digest('hex');

    let client;

    try {
      client = await pool.connect();
    } catch {
      return reply.code(503).send({
        authenticated: false,
        code: 'VERIFICATION_UNAVAILABLE'
      });
    }

    let active = false;

    async function finalizeAttempt(success) {
      const result = await client.query(
        `UPDATE public.auth_login_otp_attempts
         SET outcome = $2
         WHERE id = $1
           AND outcome = 'reserved'
         RETURNING id`,
        [reservation.attemptId, success ? 'success' : 'failure']
      );

      if (result.rowCount !== 1) {
        throw new Error('TOTP_ATTEMPT_FINALIZATION_FAILED');
      }
    }

    async function reject() {
      await finalizeAttempt(false);
      await client.query('COMMIT');
      active = false;

      return reply.code(401).send({
        authenticated: false,
        code: 'INVALID_OR_EXPIRED_AUTHENTICATOR',
        message: 'Kode atau sesi verifikasi tidak valid.'
      });
    }

    try {
      await client.query('BEGIN');
      active = true;

      const ownerResult = await client.query(
        `SELECT user_id
         FROM public.auth_login_pre_auth
         WHERE ticket_hash = $1`,
        [ticketHash]
      );

      const owner = ownerResult.rows[0];

      if (!owner) return await reject();

      // Lock order: user -> pre-auth -> authenticator.
      const userResult = await client.query(
        `SELECT id, email, full_name, status, two_factor_enabled
         FROM public.users
         WHERE id = $1
         FOR UPDATE`,
        [owner.user_id]
      );

      const user = userResult.rows[0];

      if (
        !user ||
        user.status !== 'active' ||
        user.two_factor_enabled !== true
      ) {
        return await reject();
      }

      const ticketResult = await client.query(
        `SELECT id, attempts
         FROM public.auth_login_pre_auth
         WHERE ticket_hash = $1
           AND user_id = $2
           AND consumed_at IS NULL
           AND expires_at > now()
           AND attempts < 5
         FOR UPDATE`,
        [ticketHash, user.id]
      );

      if (ticketResult.rowCount !== 1) {
        return await reject();
      }

      const enrollmentResult = await client.query(
        `SELECT secret_encrypted, encryption_iv,
                encryption_tag, last_used_counter
         FROM public.auth_totp_authenticators
         WHERE user_id = $1
           AND enabled_at IS NOT NULL
         FOR UPDATE`,
        [user.id]
      );

      const enrollment = enrollmentResult.rows[0];

      if (!enrollment) {
        await client.query(
          `UPDATE public.auth_login_pre_auth
           SET attempts = attempts + 1
           WHERE id = $1
             AND consumed_at IS NULL
             AND attempts < 5`,
          [ticketResult.rows[0].id]
        );

        return await reject();
      }

      const secret = decryptTotpSecret({
        userId: user.id,
        secretEncrypted: enrollment.secret_encrypted,
        encryptionIv: enrollment.encryption_iv,
        encryptionTag: enrollment.encryption_tag
      });

      const verification = verifyTotp({
        secret,
        code: request.body.code
      });

      const previousCounter =
        enrollment.last_used_counter === null
          ? -1
          : Number(enrollment.last_used_counter);

      if (
        !verification.valid ||
        verification.counter <= previousCounter
      ) {
        await client.query(
          `UPDATE public.auth_login_pre_auth
           SET attempts = attempts + 1
           WHERE id = $1`,
          [ticketResult.rows[0].id]
        );

        return await reject();
      }

      const membershipResult = await client.query(
        `SELECT r.code AS role, m.organization_id
         FROM public.memberships m
         JOIN public.roles r ON r.id = m.role_id
         WHERE m.user_id = $1
         ORDER BY r.code, m.organization_id NULLS FIRST`,
        [user.id]
      );

      if (membershipResult.rowCount === 0) {
        await client.query(
          `UPDATE public.auth_login_pre_auth
           SET attempts = attempts + 1
           WHERE id = $1
             AND consumed_at IS NULL
             AND attempts < 5`,
          [ticketResult.rows[0].id]
        );

        return await reject();
      }

      const session = await createSession(client, user.id);

      const marked = await client.query(
        `UPDATE public.auth_sessions
         SET mfa_verified_at = now(),
             mfa_method = 'authenticator'
         WHERE id = $1
           AND user_id = $2
           AND mfa_verified_at IS NULL
         RETURNING id`,
        [session.sessionId, user.id]
      );

      if (marked.rowCount !== 1) {
        throw new Error('TOTP_SESSION_MARK_FAILED');
      }

      const access = await createAccessToken(
        client,
        session.sessionId
      );

      if (!access) {
        throw new Error('TOTP_ACCESS_TOKEN_FAILED');
      }

      await client.query(
        `UPDATE public.auth_totp_authenticators
         SET last_used_counter = $2,
             updated_at = now()
         WHERE user_id = $1`,
        [user.id, verification.counter]
      );

      const consumed = await client.query(
        `UPDATE public.auth_login_pre_auth
         SET consumed_at = now(),
             attempts = attempts + 1
         WHERE id = $1
           AND consumed_at IS NULL
         RETURNING id`,
        [ticketResult.rows[0].id]
      );

      if (consumed.rowCount !== 1) {
        throw new Error('TOTP_TICKET_CONSUMPTION_FAILED');
      }

      await finalizeAttempt(true);
      await client.query('COMMIT');
      active = false;

      return reply.code(200).send({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          memberships: membershipResult.rows.map(row => ({
            role: row.role,
            organizationId: row.organization_id
          }))
        },
        session: {
          ...session,
          accessToken: access.accessToken,
          tokenType: access.tokenType,
          expiresIn: access.expiresIn,
          accessTokenExpiresAt: access.expiresAt
        }
      });
    } catch {
      if (active) {
        try {
          await client.query('ROLLBACK');
        } catch {}
      }

      return reply.code(500).send({
        authenticated: false,
        code: 'AUTHENTICATOR_VERIFICATION_FAILED'
      });
    } finally {
      client.release();
    }
  });
}