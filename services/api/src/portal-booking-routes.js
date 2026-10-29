import { createSessionAuth } from './security/session-auth.js';
import { hasGlobalRole } from './security/global-role.js';
import { productionOrganizationFilter } from './security/test-data-policy.js';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 100;

function serializeBookings(rows) {
  return rows.map(row => ({
    id: row.id,
    bookingNumber: row.booking_number,
    status: row.status,
    createdAt: row.created_at,
    departure: {
      id: row.departure_id,
      title: row.title,
      destination: row.destination,
      departureDate: row.departure_date,
      returnDate: row.return_date
    },
    participants: row.participants
  }));
}

const BOOKING_FIELDS = `
  b.id,
  b.booking_number,
  b.status,
  b.created_at,
  d.id AS departure_id,
  d.title,
  d.destination,
  d.departure_date,
  d.return_date,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'fullName', p.full_name,
        'departureStatus', p.departure_status
      )
      ORDER BY p.created_at, p.id
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'::jsonb
  ) AS participants
`;

function registerPartnerBookingRoutes(app, pool, role, relationshipType) {
  const requireSession = createSessionAuth(pool);
  const collectionPath = `/${role}/bookings`;

  app.get(collectionPath, {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    if (!await hasGlobalRole(pool, request.auth.userId, role)) {
      return reply.code(403).send({
        code: 'PORTAL_ROLE_REQUIRED'
      });
    }

    const productionFilter = await productionOrganizationFilter(pool, 'o');
    const result = await pool.query(
      `SELECT ${BOOKING_FIELDS}
       FROM public.travel_bookings b
       JOIN public.travel_departures d
         ON d.id = b.departure_id
       JOIN public.organizations o
         ON o.id = d.travel_organization_id
       JOIN public.travel_partner_relationships rel
         ON rel.partner_user_id = b.booking_user_id
        AND rel.travel_organization_id = d.travel_organization_id
        AND rel.relationship_type = $2
        AND rel.status = 'approved'
       LEFT JOIN public.travel_booking_participants p
         ON p.booking_id = b.id
       WHERE b.booking_user_id = $1
         AND o.organization_type = 'travel'
         AND o.status = 'active'${productionFilter}
       GROUP BY b.id, d.id
       ORDER BY b.created_at DESC, b.id
       LIMIT ${PAGE_SIZE}`,
      [request.auth.userId, relationshipType]
    );

    return reply.code(200).send({
      bookings: serializeBookings(result.rows)
    });
  });

  app.get(`${collectionPath}/:id`, {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    if (!UUID.test(request.params.id)) {
      return reply.code(400).send({
        code: 'INVALID_BOOKING_ID'
      });
    }

    if (!await hasGlobalRole(pool, request.auth.userId, role)) {
      return reply.code(403).send({
        code: 'PORTAL_ROLE_REQUIRED'
      });
    }

    const productionFilter = await productionOrganizationFilter(pool, 'o');
    const result = await pool.query(
      `SELECT ${BOOKING_FIELDS}
       FROM public.travel_bookings b
       JOIN public.travel_departures d
         ON d.id = b.departure_id
       JOIN public.organizations o
         ON o.id = d.travel_organization_id
       JOIN public.travel_partner_relationships rel
         ON rel.partner_user_id = b.booking_user_id
        AND rel.travel_organization_id = d.travel_organization_id
        AND rel.relationship_type = $3
        AND rel.status = 'approved'
       LEFT JOIN public.travel_booking_participants p
         ON p.booking_id = b.id
       WHERE b.id = $1
         AND b.booking_user_id = $2
         AND o.organization_type = 'travel'
         AND o.status = 'active'${productionFilter}
       GROUP BY b.id, d.id
       LIMIT 1`,
      [request.params.id, request.auth.userId, relationshipType]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({
        code: 'BOOKING_NOT_FOUND'
      });
    }

    return reply.code(200).send({
      booking: serializeBookings(result.rows)[0]
    });
  });
}

export async function registerPortalBookingRoutes(app, pool) {
  registerPartnerBookingRoutes(app, pool, 'agen', 'agent');
  registerPartnerBookingRoutes(app, pool, 'mitra', 'partner');

  const requireSession = createSessionAuth(pool);

  app.get('/traveler/bookings', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    if (!await hasGlobalRole(pool, request.auth.userId, 'traveler')) {
      return reply.code(403).send({
        code: 'PORTAL_ROLE_REQUIRED'
      });
    }

    const productionFilter = await productionOrganizationFilter(pool, 'o');
    const result = await pool.query(
      `SELECT ${BOOKING_FIELDS}
       FROM public.travel_bookings b
       JOIN public.travel_departures d
         ON d.id = b.departure_id
       JOIN public.organizations o ON o.id = d.travel_organization_id
       LEFT JOIN public.travel_booking_participants p
         ON p.booking_id = b.id
        AND p.user_id = $1
       WHERE (
           b.booking_user_id = $1
           OR p.id IS NOT NULL
         )${productionFilter}
       GROUP BY b.id, d.id
       ORDER BY b.created_at DESC, b.id
       LIMIT ${PAGE_SIZE}`,
      [request.auth.userId]
    );

    return reply.code(200).send({
      bookings: serializeBookings(result.rows)
    });
  });

  app.get('/traveler/bookings/:id', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    if (!UUID.test(request.params.id)) {
      return reply.code(400).send({
        code: 'INVALID_BOOKING_ID'
      });
    }

    if (!await hasGlobalRole(pool, request.auth.userId, 'traveler')) {
      return reply.code(403).send({
        code: 'PORTAL_ROLE_REQUIRED'
      });
    }

    const productionFilter = await productionOrganizationFilter(pool, 'o');
    const result = await pool.query(
      `SELECT ${BOOKING_FIELDS}
       FROM public.travel_bookings b
       JOIN public.travel_departures d
         ON d.id = b.departure_id
       JOIN public.organizations o ON o.id = d.travel_organization_id
       LEFT JOIN public.travel_booking_participants p
         ON p.booking_id = b.id
        AND p.user_id = $2
       WHERE b.id = $1
         AND (
           b.booking_user_id = $2
           OR p.id IS NOT NULL
         )${productionFilter}
       GROUP BY b.id, d.id
       LIMIT 1`,
      [request.params.id, request.auth.userId]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({
        code: 'BOOKING_NOT_FOUND'
      });
    }

    return reply.code(200).send({
      booking: serializeBookings(result.rows)[0]
    });
  });
}
