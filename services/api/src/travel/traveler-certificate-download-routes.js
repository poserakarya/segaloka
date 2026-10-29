import { createSessionAuth } from '../security/session-auth.js';
import { hasGlobalRole } from '../security/global-role.js';
import { decryptCertificateToken } from './certificate-token-crypto.js';
import { createCertificatePdf } from './certificate-pdf.js';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function publicOrigin() {
  const raw = process.env.PUBLIC_CERTIFICATE_BASE_URL;

  if (!raw) return null;

  try {
    const url = new URL(raw);

    if (
      url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname)
      )
    ) {
      return null;
    }

    if (url.username || url.password || url.search || url.hash) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export async function registerTravelerCertificateDownloadRoutes(
  app,
  pool
) {
  const requireSession = createSessionAuth(pool);

  app.get('/traveler/certificates/:id/pdf', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const id = request.params.id;

    if (!UUID.test(id)) {
      return reply.code(400).send({
        code: 'INVALID_CERTIFICATE_ID'
      });
    }

    if (!await hasGlobalRole(pool, request.auth.userId, 'traveler')) {
      return reply.code(403).send({
        code: 'PORTAL_ROLE_REQUIRED'
      });
    }

    const result = await pool.query(
      `SELECT
         tc.encrypted_verification_token,
         doc.verification_token_hash,
         doc.document_number,
         doc.status AS document_status,
         doc.issued_at,
         p.full_name AS participant_name,
         p.departure_status,
         p.departure_verified_at,
         b.status AS booking_status,
         d.status AS trip_status,
         d.title AS trip_title,
         d.destination,
         d.departure_date,
         o.name AS travel_name,
         o.status AS travel_status
       FROM public.traveler_travel_certificates tc
       JOIN public.documents doc ON doc.id = tc.document_id
       JOIN public.document_types dt
         ON dt.id = doc.document_type_id
       JOIN public.travel_booking_participants p
         ON p.id = tc.participant_id
       JOIN public.travel_bookings b
         ON b.id = p.booking_id
       JOIN public.travel_departures d
         ON d.id = b.departure_id
       JOIN public.organizations o
         ON o.id = d.travel_organization_id
       WHERE tc.id = $1
         AND p.user_id = $2
         AND dt.code = 'TRAVEL_CERTIFICATE'
         AND doc.organization_id = d.travel_organization_id
       LIMIT 1`,
      [id, request.auth.userId]
    );

    const row = result.rows[0];

    if (!row) {
      return reply.code(404).send({
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
      return reply.code(409).send({
        code: 'CERTIFICATE_NOT_CURRENTLY_VALID'
      });
    }

    if (!row.encrypted_verification_token) {
      return reply.code(409).send({
        code: 'CERTIFICATE_LEGACY_TOKEN_UNAVAILABLE'
      });
    }

    const origin = publicOrigin();

    if (!origin) {
      return reply.code(503).send({
        code: 'CERTIFICATE_PUBLIC_URL_NOT_CONFIGURED'
      });
    }

    let token;

    try {
      token = decryptCertificateToken(
        row.encrypted_verification_token,
        row.verification_token_hash
      );
    } catch (error) {
      request.log.error(
        { err: error, certificateId: id },
        'Certificate token decryption failed'
      );

      return reply.code(503).send({
        code: 'CERTIFICATE_TOKEN_UNAVAILABLE'
      });
    }

    const certificate = {
      certificateNumber: row.document_number,
      participantName: row.participant_name,
      travelName: row.travel_name,
      tripTitle: row.trip_title,
      destination: row.destination,
      departureDate: row.departure_date,
      issuedAt: row.issued_at
    };

    const verificationUrl =
      `${origin}/certificates/verify/${token}`;

    const pdf = await createCertificatePdf(
      certificate,
      verificationUrl
    );

    reply.header('Content-Type', 'application/pdf');
    reply.header(
      'Content-Disposition',
      'attachment; filename="segaloka-certificate.pdf"'
    );

    return reply.send(pdf);
  });
}