import { randomBytes } from 'node:crypto';
import { createSessionAuth } from '../security/session-auth.js';
import { isTestDataOrganization } from '../security/test-data-policy.js';
import { recordBookingEvent, recordParticipantEvent } from '../sync/outbox.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = value => typeof value === 'string' && UUID.test(value);

async function travelAccess(client, userId, organizationId) {
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
     LIMIT 1`,
    [userId, organizationId]
  );

  return result.rows.length > 0;
}

// Entitlement langganan Travel: subscription trialing/active yang masih
// berlaku, dengan override organisasi lebih diutamakan daripada paket.
async function travelEntitlementEnabled(client, organizationId, code) {
  const result = await client.query(
    `SELECT 1
     FROM public.organization_subscriptions os
     JOIN public.entitlements e ON e.code = $2
     LEFT JOIN public.plan_entitlements pe
       ON pe.plan_id = os.plan_id
      AND pe.entitlement_id = e.id
     LEFT JOIN public.organization_entitlement_overrides oe
       ON oe.organization_id = os.organization_id
      AND oe.entitlement_id = e.id
     WHERE os.organization_id = $1
       AND os.status IN ('trialing', 'active')
       AND (os.current_period_end IS NULL OR os.current_period_end > now())
       AND COALESCE(oe.enabled, pe.enabled, false) = true
     LIMIT 1`,
    [organizationId, code]
  );

  return result.rows.length > 0;
}

// Agen (relationship 'agent') dan Mitra (relationship 'partner') wajib
// memiliki role global portal dan hubungan approved dengan Travel tersebut.
async function approvedPartnerAccess(client, userId, organizationId) {
  const result = await client.query(
    `SELECT 1
     FROM public.travel_partner_relationships rel
     JOIN public.memberships m
       ON m.user_id = rel.partner_user_id
      AND m.organization_id IS NULL
     JOIN public.roles r ON r.id = m.role_id
     WHERE rel.partner_user_id = $1
       AND rel.travel_organization_id = $2
       AND rel.status = 'approved'
       AND (
         (rel.relationship_type = 'agent' AND r.code = 'agen') OR
         (rel.relationship_type = 'partner' AND r.code = 'mitra')
       )
     LIMIT 1`,
    [userId, organizationId]
  );

  return result.rows.length > 0;
}

// Hanya Travel berwenang atau Agen/Mitra yang disetujui Travel tersebut yang
// boleh membuat booking; keduanya mensyaratkan entitlement bookings.manage
// milik Travel. Traveler dan role lain tidak dibuka lewat endpoint ini.
async function bookingCreationAccess(client, userId, organizationId) {
  const staff = await travelAccess(client, userId, organizationId);
  const partner = staff
    ? false
    : await approvedPartnerAccess(client, userId, organizationId);

  if (!staff && !partner) {
    return fail(403, 'BOOKING_CREATION_NOT_ALLOWED');
  }

  if (!await travelEntitlementEnabled(client, organizationId, 'bookings.manage')) {
    return fail(403, 'BOOKINGS_MANAGE_REQUIRED');
  }

  return null;
}

async function transaction(pool, request, reply, work) {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const response = await work(client);

    if (response.status >= 400) {
      await client.query('ROLLBACK');
      return reply.code(response.status).send(response.body);
    }

    await client.query('COMMIT');
    return reply.code(response.status).send(response.body);
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        request.log.error({ err: rollbackError }, 'Rollback failed');
      }
    }

    request.log.error({ err: error }, 'Travel booking operation failed');

    return reply.code(500).send({
      code: 'TRAVEL_BOOKING_OPERATION_FAILED'
    });
  } finally {
    if (client) client.release();
  }
}

const fail = (status, code) => ({
  status,
  body: { code }
});

async function audit(client, actor, organization, action, type, id) {
  await client.query(
    `INSERT INTO public.audit_logs (
       actor_user_id, organization_id, action, entity_type, entity_id
     ) VALUES ($1, $2, $3, $4, $5)`,
    [actor, organization, action, type, id]
  );
}

export async function registerBookingRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.post('/travel/bookings', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const body = request.body;

    if (
      !body || typeof body !== 'object' || Array.isArray(body) ||
      !isUuid(body.departureId)
    ) {
      return reply.code(400).send({ code: 'INVALID_BOOKING_INPUT' });
    }

    return transaction(pool, request, reply, async client => {
      const found = await client.query(
        `SELECT
           d.id,
           d.travel_organization_id,
           d.status
         FROM public.travel_departures d
         JOIN public.organizations o
           ON o.id = d.travel_organization_id
         WHERE d.id = $1
           AND o.status = 'active'
         FOR UPDATE OF d`,
        [body.departureId]
      );

      const departure = found.rows[0];

      if (!departure || departure.status !== 'scheduled') {
        return fail(409, 'DEPARTURE_NOT_AVAILABLE');
      }

      if (await isTestDataOrganization(client, departure.travel_organization_id)) {
        return fail(409, 'TEST_DATA_BOOKING_NOT_ALLOWED');
      }

      const denied = await bookingCreationAccess(
        client,
        request.auth.userId,
        departure.travel_organization_id
      );

      if (denied) return denied;

      const bookingNumber =
        'SLK-BKG-' + randomBytes(12).toString('hex').toUpperCase();

      const inserted = await client.query(
        `INSERT INTO public.travel_bookings (
           departure_id, booking_user_id, booking_number
         )
         VALUES ($1, $2, $3)
         RETURNING id, departure_id, booking_user_id,
                   booking_number, status, created_at`,
        [departure.id, request.auth.userId, bookingNumber]
      );

      const booking = inserted.rows[0];

      await audit(
        client,
        request.auth.userId,
        departure.travel_organization_id,
        'travel.booking.created',
        'travel_booking',
        booking.id
      );

      await recordBookingEvent(client, {
        organizationId: departure.travel_organization_id,
        eventType: 'travel.booking.created',
        bookingId: booking.id,
        departureId: departure.id
      });

      return { status: 201, body: { booking } };
    });
  });

  app.post('/travel/bookings/:id/participants', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const bookingId = request.params.id;
    const body = request.body;

    if (
      !isUuid(bookingId) ||
      !body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.fullName !== 'string' ||
      !body.fullName.trim() ||
      body.fullName.trim().length > 200 ||
      (body.userId !== undefined &&
       body.userId !== null &&
       !isUuid(body.userId))
    ) {
      return reply.code(400).send({ code: 'INVALID_PARTICIPANT_INPUT' });
    }

    return transaction(pool, request, reply, async client => {
      const found = await client.query(
        `SELECT
           b.id, b.status, b.booking_user_id,
           d.travel_organization_id,
           d.status AS departure_status
         FROM public.travel_bookings b
         JOIN public.travel_departures d ON d.id = b.departure_id
         WHERE b.id = $1
         FOR UPDATE OF b`,
        [bookingId]
      );

      const booking = found.rows[0];
      if (!booking) return fail(404, 'BOOKING_NOT_FOUND');

      if (await isTestDataOrganization(client, booking.travel_organization_id)) {
        return fail(409, 'TEST_DATA_BOOKING_NOT_ALLOWED');
      }

      const staff = await travelAccess(
        client, request.auth.userId, booking.travel_organization_id
      );

      if (!staff && booking.booking_user_id !== request.auth.userId) {
        return fail(403, 'BOOKING_ACCESS_DENIED');
      }

      if (
        !['pending', 'confirmed'].includes(booking.status) ||
        booking.departure_status !== 'scheduled'
      ) {
        return fail(409, 'BOOKING_NOT_EDITABLE');
      }

      const userId = body.userId ?? null;

      if (!staff && userId !== null && userId !== request.auth.userId) {
        return fail(403, 'PARTICIPANT_USER_ACCESS_DENIED');
      }

      const inserted = await client.query(
        `INSERT INTO public.travel_booking_participants (
           booking_id, user_id, full_name
         )
         VALUES ($1, $2, $3)
         RETURNING id, booking_id, user_id, full_name,
                   departure_status, created_at`,
        [bookingId, userId, body.fullName.trim()]
      );

      const participant = inserted.rows[0];

      await audit(
        client,
        request.auth.userId,
        booking.travel_organization_id,
        'travel.participant.created',
        'travel_booking_participant',
        participant.id
      );

      await recordParticipantEvent(client, {
        organizationId: booking.travel_organization_id,
        eventType: 'travel.booking.participant_added',
        participantId: participant.id,
        bookingId
      });

      return { status: 201, body: { participant } };
    });
  });

  app.get('/travel/bookings/:id', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const bookingId = request.params.id;

    if (!isUuid(bookingId)) {
      return reply.code(400).send({ code: 'INVALID_BOOKING_ID' });
    }

    return transaction(pool, request, reply, async client => {
      const found = await client.query(
        `SELECT
           b.id, b.booking_number, b.status,
           b.booking_user_id, b.created_at,
           d.id AS departure_id,
           d.title, d.destination,
           d.departure_date, d.return_date,
           d.travel_organization_id
         FROM public.travel_bookings b
         JOIN public.travel_departures d ON d.id = b.departure_id
         WHERE b.id = $1`,
        [bookingId]
      );

      const booking = found.rows[0];
      if (!booking) return fail(404, 'BOOKING_NOT_FOUND');

      const staff = await travelAccess(
        client, request.auth.userId, booking.travel_organization_id
      );

      if (!staff && booking.booking_user_id !== request.auth.userId) {
        return fail(404, 'BOOKING_NOT_FOUND');
      }

      const participants = await client.query(
        `SELECT id, full_name, user_id, departure_status
         FROM public.travel_booking_participants
         WHERE booking_id = $1
         ORDER BY created_at, id`,
        [bookingId]
      );

      return {
        status: 200,
        body: { booking, participants: participants.rows }
      };
    });
  });

  // Daftar booking satu organisasi Travel. Hanya anggota Travel org tersebut
  // dengan entitlement bookings.manage; tidak ada data org lain.
  app.get('/travel/bookings', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const organizationId = request.query?.organizationId;

    if (!isUuid(organizationId)) {
      return reply.code(400).send({ code: 'INVALID_ORGANIZATION_ID' });
    }

    return transaction(pool, request, reply, async client => {
      if (!await travelAccess(client, request.auth.userId, organizationId)) {
        return fail(403, 'TRAVEL_ACCESS_DENIED');
      }

      if (!await travelEntitlementEnabled(client, organizationId, 'bookings.manage')) {
        return fail(403, 'BOOKINGS_MANAGE_REQUIRED');
      }

      const result = await client.query(
        `SELECT
           b.id,
           b.booking_number,
           b.status,
           b.created_at,
           u.full_name AS booker_name,
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
         FROM public.travel_bookings b
         JOIN public.travel_departures d ON d.id = b.departure_id
         JOIN public.users u ON u.id = b.booking_user_id
         LEFT JOIN public.travel_booking_participants p ON p.booking_id = b.id
         WHERE d.travel_organization_id = $1
         GROUP BY b.id, d.id, u.full_name
         ORDER BY b.created_at DESC, b.id
         LIMIT 200`,
        [organizationId]
      );

      return {
        status: 200,
        body: {
          bookings: result.rows.map(row => ({
            id: row.id,
            bookingNumber: row.booking_number,
            status: row.status,
            createdAt: row.created_at,
            bookerName: row.booker_name,
            departure: {
              id: row.departure_id,
              title: row.title,
              destination: row.destination,
              departureDate: row.departure_date,
              returnDate: row.return_date
            },
            participants: row.participants
          }))
        }
      };
    });
  });

  app.post('/travel/participants/:id/verify-departure', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const participantId = request.params.id;

    if (!isUuid(participantId)) {
      return reply.code(400).send({ code: 'INVALID_PARTICIPANT_ID' });
    }

    return transaction(pool, request, reply, async client => {
      const found = await client.query(
        `SELECT
           p.id,
           p.booking_id,
           p.departure_status,
           b.status AS booking_status,
           d.status AS departure_status_record,
           d.departure_date,
           d.travel_organization_id
         FROM public.travel_booking_participants p
         JOIN public.travel_bookings b ON b.id = p.booking_id
         JOIN public.travel_departures d ON d.id = b.departure_id
         WHERE p.id = $1
         FOR UPDATE OF p`,
        [participantId]
      );

      const participant = found.rows[0];
      if (!participant) return fail(404, 'PARTICIPANT_NOT_FOUND');

      const staff = await travelAccess(
        client, request.auth.userId, participant.travel_organization_id
      );

      if (!staff) return fail(403, 'TRAVEL_ACCESS_DENIED');

      if (
        !['confirmed', 'completed'].includes(participant.booking_status) ||
        !['departed', 'completed'].includes(
          participant.departure_status_record
        ) ||
        participant.departure_status !== 'not_verified'
      ) {
        return fail(409, 'DEPARTURE_VERIFICATION_NOT_ALLOWED');
      }

      const updated = await client.query(
        `UPDATE public.travel_booking_participants
         SET departure_status = 'departed',
             departure_verified_by = $2,
             departure_verified_at = now(),
             updated_at = now()
         WHERE id = $1
           AND departure_status = 'not_verified'
           AND departure_verified_at IS NULL
         RETURNING id, departure_status, departure_verified_at`,
        [participantId, request.auth.userId]
      );

      if (updated.rows.length !== 1) {
        return fail(409, 'DEPARTURE_VERIFICATION_CONFLICT');
      }

      await audit(
        client,
        request.auth.userId,
        participant.travel_organization_id,
        'travel.participant.departure_verified',
        'travel_booking_participant',
        participantId
      );

      await recordParticipantEvent(client, {
        organizationId: participant.travel_organization_id,
        eventType: 'travel.booking.participant_departed',
        participantId,
        bookingId: participant.booking_id
      });

      return {
        status: 200,
        body: { participant: updated.rows[0] }
      };
    });
  });
}
