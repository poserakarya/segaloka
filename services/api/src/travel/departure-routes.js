import { createSessionAuth } from '../security/session-auth.js';
import { isTestDataOrganization } from '../security/test-data-policy.js';

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (typeof value !== 'string' || !datePattern.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}

export async function registerDepartureRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.get('/travel/departures', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const organizationId = request.query?.organizationId;

    if (typeof organizationId !== 'string' || !uuid.test(organizationId)) {
      return reply.code(400).send({
        code: 'INVALID_ORGANIZATION_ID'
      });
    }

    try {
      const access = await pool.query(
        `SELECT 1
         FROM public.memberships m
         JOIN public.roles r ON r.id = m.role_id
         JOIN public.organizations o
           ON o.id = m.organization_id
         WHERE m.user_id = $1
           AND m.organization_id = $2
           AND r.code = 'travel'
           AND o.organization_type = 'travel'
           AND o.status = 'active'
         LIMIT 1`,
        [request.auth.userId, organizationId]
      );

      if (access.rows.length === 0) {
        return reply.code(403).send({
          code: 'TRAVEL_ACCESS_DENIED'
        });
      }

      if (await isTestDataOrganization(pool, organizationId)) {
        return reply.code(409).send({
          code: 'TEST_DATA_DEPARTURE_NOT_ALLOWED'
        });
      }

      const result = await pool.query(
        `SELECT
           id,
           travel_organization_id,
           title,
           destination,
           departure_date,
           return_date,
           status,
           created_at,
           updated_at
         FROM public.travel_departures
         WHERE travel_organization_id = $1
         ORDER BY departure_date, id`,
        [organizationId]
      );

      return reply.code(200).send({
        departures: result.rows
      });
    } catch (error) {
      request.log.error(
        { err: error },
        'Departure listing failed'
      );

      return reply.code(500).send({
        code: 'DEPARTURE_LIST_FAILED'
      });
    }
  });

  app.post('/travel/departures', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const body = request.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return reply.code(400).send({ code: 'INVALID_BODY' });
    }

    const {
      organizationId,
      title,
      destination,
      departureDate,
      returnDate = null
    } = body;

    if (
      typeof organizationId !== 'string' ||
      !uuid.test(organizationId) ||
      typeof title !== 'string' ||
      !title.trim() ||
      title.length > 200 ||
      typeof destination !== 'string' ||
      !destination.trim() ||
      destination.length > 200 ||
      !validDate(departureDate) ||
      (returnDate !== null && !validDate(returnDate)) ||
      (returnDate !== null && returnDate < departureDate)
    ) {
      return reply.code(400).send({
        code: 'INVALID_DEPARTURE_INPUT'
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const access = await client.query(
        `SELECT 1
         FROM public.memberships m
         JOIN public.roles r ON r.id = m.role_id
         JOIN public.organizations o
           ON o.id = m.organization_id
         WHERE m.user_id = $1
           AND m.organization_id = $2
           AND r.code = 'travel'
           AND o.organization_type = 'travel'
           AND o.status = 'active'
         LIMIT 1`,
        [request.auth.userId, organizationId]
      );

      if (access.rows.length === 0) {
        await client.query('ROLLBACK');

        return reply.code(403).send({
          code: 'TRAVEL_ACCESS_DENIED'
        });
      }

      if (await isTestDataOrganization(client, organizationId)) {
        await client.query('ROLLBACK');
        return reply.code(409).send({
          code: 'TEST_DATA_DEPARTURE_NOT_ALLOWED'
        });
      }

      const inserted = await client.query(
        `INSERT INTO public.travel_departures (
           travel_organization_id,
           title,
           destination,
           departure_date,
           return_date
         )
         VALUES ($1, $2, $3, $4, $5)
         RETURNING
           id,
           travel_organization_id,
           title,
           destination,
           departure_date,
           return_date,
           status,
           created_at`,
        [
          organizationId,
          title.trim(),
          destination.trim(),
          departureDate,
          returnDate
        ]
      );

      const departure = inserted.rows[0];

      await client.query(
        `INSERT INTO public.audit_logs (
           actor_user_id,
           organization_id,
           action,
           entity_type,
           entity_id
         )
         VALUES (
           $1, $2, 'travel.departure.created',
           'travel_departure', $3
         )`,
        [
          request.auth.userId,
          organizationId,
          departure.id
        ]
      );

      await client.query(
        `INSERT INTO public.sync_outbox (
           organization_id,
           event_type,
           entity_type,
           entity_id,
           payload
         )
         VALUES (
           $1,
           'travel.departure.created',
           'travel_departure',
           $2,
           jsonb_build_object('organizationId', $1::uuid::text)
         )`,
        [organizationId, departure.id]
      );

      await client.query('COMMIT');

      return reply.code(201).send({ departure });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        request.log.error(
          { err: rollbackError },
          'Departure rollback failed'
        );
      }

      request.log.error(
        { err: error },
        'Departure creation failed'
      );

      return reply.code(500).send({
        code: 'DEPARTURE_CREATION_FAILED'
      });
    } finally {
      client.release();
    }
  });
}
