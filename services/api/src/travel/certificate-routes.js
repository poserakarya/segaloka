import { registerCertificateRevokeRoutes } from './certificate-revoke-routes.js';
import { registerTravelerOwnCertificateRoutes } from './traveler-certificate-routes.js';
import { createCertificatePdf } from './certificate-pdf.js';
import { encryptCertificateToken } from './certificate-token-crypto.js';
import { randomBytes, createHash } from 'node:crypto';
import { createSessionAuth } from '../security/session-auth.js';
import { isTestDataOrganization } from '../security/test-data-policy.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{64}$/i;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function hasTravelAccess(client, userId, organizationId) {
  const result = await client.query(
    `SELECT 1
     FROM public.memberships m
     JOIN public.roles r ON r.id = m.role_id
     JOIN public.organizations o ON o.id = m.organization_id
     WHERE m.user_id = $1
       AND m.organization_id = $2
       AND r.code = 'travel'
       AND o.organization_type = 'travel'
       AND o.status = 'active'
       AND EXISTS (
         SELECT 1
         FROM public.role_permissions rp
         JOIN public.permissions p
           ON p.id = rp.permission_id
         WHERE rp.role_id = m.role_id
           AND p.code = 'travel.certificates.issue'
       )
     LIMIT 1`,
    [userId, organizationId]
  );

  return result.rows.length > 0;
}

export async function registerTravelerCertificateRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);
  await registerCertificateRevokeRoutes(app, pool);
  await registerTravelerOwnCertificateRoutes(app, pool);

  app.post('/travel/participants/:id/certificate', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const participantId = request.params.id;

    if (!UUID.test(participantId)) {
      return reply.code(400).send({
        code: 'INVALID_PARTICIPANT_ID'
      });
    }

    const client = await pool.connect();
    let committed = false;

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT
           p.id,
           p.full_name,
           p.departure_status,
           p.departure_verified_at,
           b.status AS booking_status,
           d.status AS trip_status,
           d.title,
           d.destination,
           d.departure_date,
           d.travel_organization_id,
           o.name AS travel_name
         FROM public.travel_booking_participants p
         JOIN public.travel_bookings b
           ON b.id = p.booking_id
         JOIN public.travel_departures d
           ON d.id = b.departure_id
         JOIN public.organizations o
           ON o.id = d.travel_organization_id
         WHERE p.id = $1
         FOR UPDATE OF p`,
        [participantId]
      );

      const participant = result.rows[0];

      if (!participant) {
        await client.query('ROLLBACK');
        return reply.code(404).send({
          code: 'PARTICIPANT_NOT_FOUND'
        });
      }

      const allowed = await hasTravelAccess(
        client,
        request.auth.userId,
        participant.travel_organization_id
      );

      if (!allowed) {
        await client.query('ROLLBACK');
        return reply.code(403).send({
          code: 'TRAVEL_ACCESS_DENIED'
        });
      }

      if (await isTestDataOrganization(client, participant.travel_organization_id)) {
        await client.query('ROLLBACK');
        return reply.code(409).send({
          code: 'TEST_DATA_CERTIFICATE_NOT_ALLOWED'
        });
      }

      if (
        participant.departure_status !== 'departed' ||
        !participant.departure_verified_at ||
        !['confirmed', 'completed'].includes(participant.booking_status) ||
        !['departed', 'completed'].includes(participant.trip_status)
      ) {
        await client.query('ROLLBACK');
        return reply.code(409).send({
          code: 'DEPARTURE_NOT_VERIFIED'
        });
      }

      const existing = await client.query(
        `SELECT id
         FROM public.traveler_travel_certificates
         WHERE participant_id = $1`,
        [participantId]
      );

      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return reply.code(409).send({
          code: 'CERTIFICATE_ALREADY_ISSUED'
        });
      }

      const type = await client.query(
        `SELECT id
         FROM public.document_types
         WHERE code = 'TRAVEL_CERTIFICATE'
           AND is_active = true
         LIMIT 1`
      );

      if (type.rows.length !== 1) {
        await client.query('ROLLBACK');
        return reply.code(409).send({
          code: 'CERTIFICATE_DOCUMENT_TYPE_UNAVAILABLE'
        });
      }

      const verificationToken = randomBytes(32).toString('hex');
      const documentNumber =
        'SLK-TC-' + randomBytes(12).toString('hex').toUpperCase();

      const data = {
        certificateType: 'TRAVEL_CERTIFICATE',
        participantName: participant.full_name,
        travelName: participant.travel_name,
        tripTitle: participant.title,
        destination: participant.destination,
        departureDate: participant.departure_date,
        departureVerifiedAt: participant.departure_verified_at,
        statement: 'Keterangan partisipasi perjalanan yang telah diverifikasi oleh Travel penyelenggara.',
        disclaimer: 'Bukan bukti resmi pemerintah atau sertifikasi penyelesaian ibadah.',
        poweredBy: 'Segaloka'
      };

      const inserted = await client.query(
        `INSERT INTO public.documents (
           organization_id,
           document_type_id,
           template_id,
           document_number,
           verification_token_hash,
           status,
           data,
           created_by,
           issued_at
         )
         VALUES (
           $1, $2, NULL, $3, $4,
           'issued', $5::jsonb, $6, now()
         )
         RETURNING id, document_number, status, issued_at`,
        [
          participant.travel_organization_id,
          type.rows[0].id,
          documentNumber,
          hashToken(verificationToken),
          JSON.stringify(data),
          request.auth.userId
        ]
      );

      const document = inserted.rows[0];

      await client.query(
        `INSERT INTO public.document_revisions (
           document_id,
           revision_number,
           data_snapshot,
           created_by
         )
         VALUES ($1, 1, $2::jsonb, $3)`,
        [
          document.id,
          JSON.stringify(data),
          request.auth.userId
        ]
      );

      const encryptedVerificationToken =
         encryptCertificateToken(verificationToken);

       const certificate = await client.query(
         `INSERT INTO public.traveler_travel_certificates (
            participant_id,
            document_id,
            encrypted_verification_token
          )
          VALUES ($1, $2, $3)
          RETURNING id, document_id, created_at`,
         [
           participantId,
           document.id,
           encryptedVerificationToken
         ]
       );

      await client.query(
        `INSERT INTO public.document_events (
           document_id, actor_user_id, action, metadata
         )
         VALUES ($1, $2, 'issued', '{"revision":1}'::jsonb)`,
        [document.id, request.auth.userId]
      );

      await client.query(
        `INSERT INTO public.audit_logs (
           actor_user_id,
           organization_id,
           action,
           entity_type,
           entity_id
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          request.auth.userId,
          participant.travel_organization_id,
          'travel.traveler_certificate.issued',
          'traveler_travel_certificate',
          certificate.rows[0].id
        ]
      );

      await client.query('COMMIT');
      committed = true;

      return reply.code(201).send({
        certificate: certificate.rows[0],
        document,
        verificationToken,
        verificationPath:
          `/certificates/verify/${verificationToken}`
      });
    } catch (error) {
      if (!committed) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          request.log.error({ err: rollbackError }, 'Certificate rollback failed');
        }
      }

      if (error.code === '23505') {
        return reply.code(409).send({
          code: 'CERTIFICATE_ALREADY_ISSUED'
        });
      }

      request.log.error({ err: error }, 'Certificate issuance failed');

      return reply.code(500).send({
        code: 'CERTIFICATE_ISSUANCE_FAILED'
      });
    } finally {
      client.release();
    }
  });

  app.get('/certificates/:token/pdf', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const token = request.params.token;

    if (!TOKEN.test(token)) {
      return reply.code(400).send({
        code: 'INVALID_VERIFICATION_TOKEN'
      });
    }

    const baseUrl = process.env.PUBLIC_CERTIFICATE_BASE_URL;

    if (!baseUrl) {
      return reply.code(503).send({
        code: 'CERTIFICATE_PUBLIC_URL_NOT_CONFIGURED'
      });
    }

    let origin;

    try {
      const parsed = new URL(baseUrl);

      if (
        parsed.protocol !== 'https:' &&
        !(
          parsed.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(parsed.hostname)
        )
      ) {
        throw new Error('Invalid certificate origin');
      }

      origin = parsed.origin;
    } catch {
      return reply.code(503).send({
        code: 'CERTIFICATE_PUBLIC_URL_INVALID'
      });
    }

    const verification = await app.inject({
      method: 'GET',
      url: `/certificates/verify/${token}`
    });

    if (verification.statusCode !== 200) {
      return reply.code(404).send({
        code: 'CERTIFICATE_NOT_FOUND'
      });
    }

    const certificate = verification.json();

    if (certificate.valid !== true) {
      return reply.code(409).send({
        code: 'CERTIFICATE_NOT_CURRENTLY_VALID'
      });
    }

    const verificationUrl =
      `${origin}/certificates/verify/${token}`;

    const pdf = await createCertificatePdf(
      certificate,
      verificationUrl
    );

    reply.header('Content-Type', 'application/pdf');
    reply.header(
      'Content-Disposition',
      `attachment; filename="segaloka-certificate.pdf"`
    );

    return reply.send(pdf);
  });
  app.get('/certificates/verify/:token', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const token = request.params.token;

    if (!TOKEN.test(token)) {
      return reply.code(400).send({
        valid: false,
        code: 'INVALID_VERIFICATION_TOKEN'
      });
    }

    const result = await pool.query(
      `SELECT
         doc.document_number,
         doc.status AS document_status,
         doc.issued_at,
         p.full_name,
         p.departure_status,
         p.departure_verified_at,
         b.status AS booking_status,
         d.status AS trip_status,
         d.title,
         d.destination,
         d.departure_date,
         o.name AS travel_name,
         o.status AS travel_status
       FROM public.documents doc
       JOIN public.document_types dt
         ON dt.id = doc.document_type_id
       JOIN public.traveler_travel_certificates tc
         ON tc.document_id = doc.id
       JOIN public.travel_booking_participants p
         ON p.id = tc.participant_id
       JOIN public.travel_bookings b
         ON b.id = p.booking_id
       JOIN public.travel_departures d
         ON d.id = b.departure_id
       JOIN public.organizations o
         ON o.id = d.travel_organization_id
       WHERE doc.verification_token_hash = $1
         AND dt.code = 'TRAVEL_CERTIFICATE'
         AND doc.organization_id = d.travel_organization_id
       LIMIT 1`,
      [hashToken(token)]
    );

    const row = result.rows[0];

    if (!row) {
      return reply.code(404).send({
        valid: false,
        code: 'CERTIFICATE_NOT_FOUND'
      });
    }

    const valid =
      ['issued', 'revised'].includes(row.document_status) &&
      row.departure_status === 'departed' &&
      Boolean(row.departure_verified_at) &&
      ['confirmed', 'completed'].includes(row.booking_status) &&
      ['departed', 'completed'].includes(row.trip_status) &&
      row.travel_status === 'active';

    if (!valid) {
      return reply.code(200).send({
        valid: false,
        code: 'CERTIFICATE_NOT_CURRENTLY_VALID'
      });
    }

    return reply.code(200).send({
      valid: true,
      certificateNumber: row.document_number,
      participantName: row.full_name,
      travelName: row.travel_name,
      tripTitle: row.title,
      destination: row.destination,
      departureDate: row.departure_date,
      issuedAt: row.issued_at,
      certificateType: 'TRAVEL_CERTIFICATE',
      disclaimer: 'Bukan bukti resmi pemerintah atau sertifikasi penyelesaian ibadah.',
      poweredBy: 'Segaloka'
    });
  });
}
