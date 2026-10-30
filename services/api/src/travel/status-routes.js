import { createSessionAuth } from '../security/session-auth.js';
import { isTestDataOrganization } from '../security/test-data-policy.js';
import { recordBookingEvent, recordSyncEvent, DEPARTURE_ENTITY } from '../sync/outbox.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function run(pool, request, reply, work) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);

    if (result.status >= 400) {
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
    }

    return reply.code(result.status).send(result.body);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      request.log.error({ err: rollbackError }, 'Rollback failed');
    }

    request.log.error({ err: error }, 'Travel status operation failed');

    return reply.code(500).send({
      code: 'TRAVEL_STATUS_OPERATION_FAILED'
    });
  } finally {
    client.release();
  }
}

const fail = (status, code) => ({ status, body: { code } });

async function authorized(client, userId, organizationId) {
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

async function audit(client, userId, organizationId, action, type, id) {
  await client.query(
    `INSERT INTO public.audit_logs (
       actor_user_id, organization_id, action, entity_type, entity_id
     ) VALUES ($1, $2, $3, $4, $5)`,
    [userId, organizationId, action, type, id]
  );
}

export async function registerTravelStatusRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.post('/travel/bookings/:id/confirm', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const id = request.params.id;

    if (!UUID.test(id)) {
      return reply.code(400).send({ code: 'INVALID_BOOKING_ID' });
    }

    return run(pool, request, reply, async client => {
      const result = await client.query(
        `SELECT b.id, b.status, b.departure_id, d.travel_organization_id,
                d.status AS departure_status
         FROM public.travel_bookings b
         JOIN public.travel_departures d ON d.id = b.departure_id
         WHERE b.id = $1
         FOR UPDATE OF b`,
        [id]
      );

      const booking = result.rows[0];
      if (!booking) return fail(404, 'BOOKING_NOT_FOUND');

      if (await isTestDataOrganization(client, booking.travel_organization_id)) {
        return fail(409, 'TEST_DATA_BOOKING_NOT_ALLOWED');
      }

      if (!(await authorized(
        client, request.auth.userId, booking.travel_organization_id
      ))) {
        return fail(403, 'TRAVEL_ACCESS_DENIED');
      }

      if (
        booking.status !== 'pending' ||
        booking.departure_status !== 'scheduled'
      ) {
        return fail(409, 'BOOKING_CONFIRMATION_NOT_ALLOWED');
      }

      const participants = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM public.travel_booking_participants
         WHERE booking_id = $1`,
        [id]
      );

      if (participants.rows[0].total < 1) {
        return fail(409, 'BOOKING_HAS_NO_PARTICIPANTS');
      }

      const updated = await client.query(
        `UPDATE public.travel_bookings
         SET status = 'confirmed', updated_at = now()
         WHERE id = $1 AND status = 'pending'
         RETURNING id, status, updated_at`,
        [id]
      );

      if (updated.rows.length !== 1) {
        return fail(409, 'BOOKING_CONFIRMATION_CONFLICT');
      }

      await audit(
        client, request.auth.userId, booking.travel_organization_id,
        'travel.booking.confirmed', 'travel_booking', id
      );

      await recordBookingEvent(client, {
        organizationId: booking.travel_organization_id,
        eventType: 'travel.booking.confirmed',
        bookingId: id,
        departureId: booking.departure_id
      });

      return { status: 200, body: { booking: updated.rows[0] } };
    });
  });

  app.post('/travel/departures/:id/mark-departed', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const id = request.params.id;

    if (!UUID.test(id)) {
      return reply.code(400).send({ code: 'INVALID_DEPARTURE_ID' });
    }

    return run(pool, request, reply, async client => {
      const result = await client.query(
        `SELECT id, travel_organization_id, status, departure_date
         FROM public.travel_departures
         WHERE id = $1
         FOR UPDATE`,
        [id]
      );

      const departure = result.rows[0];
      if (!departure) return fail(404, 'DEPARTURE_NOT_FOUND');

      if (await isTestDataOrganization(client, departure.travel_organization_id)) {
        return fail(409, 'TEST_DATA_DEPARTURE_NOT_ALLOWED');
      }

      if (!(await authorized(
        client, request.auth.userId, departure.travel_organization_id
      ))) {
        return fail(403, 'TRAVEL_ACCESS_DENIED');
      }

      if (departure.status !== 'scheduled') {
        return fail(409, 'DEPARTURE_STATUS_NOT_SCHEDULED');
      }

      const readiness = await client.query(
        `SELECT
           (departure_date <= CURRENT_DATE) AS date_reached,
           EXISTS (
             SELECT 1 FROM public.travel_bookings
             WHERE departure_id = $1
               AND status = 'confirmed'
           ) AS has_confirmed_booking
         FROM public.travel_departures
         WHERE id = $1`,
        [id]
      );

      const ready = readiness.rows[0];

      if (!ready?.date_reached || !ready?.has_confirmed_booking) {
        return fail(409, 'DEPARTURE_NOT_READY');
      }

      const updated = await client.query(
        `UPDATE public.travel_departures
         SET status = 'departed', updated_at = now()
         WHERE id = $1 AND status = 'scheduled'
         RETURNING id, status, departure_date`,
        [id]
      );

      if (updated.rows.length !== 1) {
        return fail(409, 'DEPARTURE_STATUS_CONFLICT');
      }

      await audit(
        client, request.auth.userId, departure.travel_organization_id,
        'travel.departure.marked_departed', 'travel_departure', id
      );

      await recordSyncEvent(client, {
        organizationId: departure.travel_organization_id,
        eventType: 'travel.departure.departed',
        entityType: DEPARTURE_ENTITY,
        entityId: id
      });

      return { status: 200, body: { departure: updated.rows[0] } };
    });
  });
}
