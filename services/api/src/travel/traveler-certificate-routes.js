import { createSessionAuth } from '../security/session-auth.js';
import { hasGlobalRole } from '../security/global-role.js';
import { registerTravelerCertificateDownloadRoutes } from './traveler-certificate-download-routes.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BASE_QUERY = `
  SELECT
    tc.id AS certificate_id,
    doc.document_number,
    doc.status AS document_status,
    doc.issued_at,
    p.user_id,
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
  JOIN public.documents doc
    ON doc.id = tc.document_id
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
  WHERE dt.code = 'TRAVEL_CERTIFICATE'
    AND doc.organization_id = d.travel_organization_id
    AND p.user_id = $1
`;

function serialize(row) {
  const valid =
    ['issued', 'revised'].includes(row.document_status) &&
    row.departure_status === 'departed' &&
    Boolean(row.departure_verified_at) &&
    ['confirmed', 'completed'].includes(row.booking_status) &&
    ['departed', 'completed'].includes(row.trip_status) &&
    row.travel_status === 'active';

  return {
    id: row.certificate_id,
    certificateNumber: row.document_number,
    participantName: row.participant_name,
    travelName: row.travel_name,
    tripTitle: row.trip_title,
    destination: row.destination,
    departureDate: row.departure_date,
    issuedAt: row.issued_at,
    documentStatus: row.document_status,
    valid,
    certificateType: 'TRAVEL_CERTIFICATE',
    disclaimer:
      'Bukan bukti resmi pemerintah atau sertifikasi penyelesaian ibadah.',
    poweredBy: 'Segaloka'
  };
}

export async function registerTravelerOwnCertificateRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);
  await registerTravelerCertificateDownloadRoutes(app, pool);

  app.get('/traveler/certificates', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    if (!await hasGlobalRole(pool, request.auth.userId, 'traveler')) {
      return reply.code(403).send({
        code: 'PORTAL_ROLE_REQUIRED'
      });
    }

    const result = await pool.query(
      BASE_QUERY + `
        ORDER BY doc.issued_at DESC, tc.id DESC
        LIMIT 100
      `,
      [request.auth.userId]
    );

    return reply.code(200).send({
      certificates: result.rows.map(serialize)
    });
  });

  app.get('/traveler/certificates/:id', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const certificateId = request.params.id;

    if (!UUID.test(certificateId)) {
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
      BASE_QUERY + `
        AND tc.id = $2
        LIMIT 1
      `,
      [request.auth.userId, certificateId]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({
        code: 'CERTIFICATE_NOT_FOUND'
      });
    }

    return reply.code(200).send({
      certificate: serialize(result.rows[0])
    });
  });
}