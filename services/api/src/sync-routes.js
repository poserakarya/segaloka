import { createSessionAuth } from './security/session-auth.js';
import { hasGlobalRole } from './security/global-role.js';
import { productionOrganizationFilter } from './security/test-data-policy.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CURSOR_PATTERN = /^\d{1,19}$/;
const MAX_CURSOR = 9223372036854775807n;
const POLL_INTERVAL_MS = 1500;
const SESSION_CHECK_INTERVAL_MS = 10000;
const HEARTBEAT_INTERVAL_MS = 20000;
const EVENT_BATCH_SIZE = 100;
const SSE_TRACE = process.env.SEGALOKA_SSE_TRACE === 'true';

const BOOKING_ENTITIES = `('travel_booking', 'travel_booking_participant')`;

function parseCursor(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string' || !CURSOR_PATTERN.test(value)) {
    return undefined;
  }

  const cursor = BigInt(value);

  return cursor <= MAX_CURSOR ? cursor : undefined;
}

function requestedCursor(request) {
  const lastEventId = request.headers['last-event-id'];
  return parseCursor(
    typeof lastEventId === 'string' ? lastEventId : request.query?.after
  );
}

function writeEvent(response, event, data, id) {
  if (id !== undefined) {
    response.write(`id: ${id}\n`);
  }

  const frame = `event: ${event}\n` +
    `data: ${JSON.stringify(data)}\n\n`;
  const writable = response.write(frame);
  if (SSE_TRACE) {
    console.log(JSON.stringify({ layer: 'api', event, id: id ?? null, bytes: Buffer.byteLength(frame), writable }));
  }
}

async function sessionStillValid(pool, auth) {
  const session = await pool.query(
    `SELECT 1
     FROM public.auth_access_tokens a
     JOIN public.auth_sessions s
       ON s.id = a.session_id
     JOIN public.users u
       ON u.id = s.user_id
     WHERE a.token_hash = $1
       AND a.expires_at > now()
       AND s.id = $2
       AND s.user_id = $3
       AND s.revoked_at IS NULL
       AND s.expires_at > now()
       AND u.status = 'active'
        AND (
          u.two_factor_enabled = false
          OR s.mfa_verified_at IS NOT NULL
        )
     LIMIT 1`,
    [auth.accessTokenHash, auth.sessionId, auth.userId]
  );

  return session.rows.length > 0;
}

// Stream SSE outbox bersama: kursor Last-Event-ID, retry untuk reconnect,
// heartbeat, cek sesi dan cek ulang akses berkala. fetchEvents menerima
// kursor dan wajib memfilter tenant/role/kepemilikan di SQL.
function openOutboxStream({
  request,
  reply,
  pool,
  cursor: startCursor,
  recheckAccess,
  fetchEvents,
  includePayload = false
}) {
  let cursor = startCursor;

  reply.hijack();

  const response = reply.raw;
  response.socket?.setNoDelay?.(true);
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff'
  });
  response.flushHeaders?.();
  response.write('retry: 3000\n');
  response.write(': connected\n\n');
  writeEvent(response, 'ready', { cursor: cursor.toString() }, cursor.toString());

  let closed = false;
  let timer;
  let lastSessionCheck = Date.now();
  let lastHeartbeat = Date.now();

  const stop = () => {
    closed = true;
    clearTimeout(timer);
  };

  response.on('close', stop);
  response.on('error', stop);

  const poll = async () => {
    if (closed) return;

    try {
      const now = Date.now();

      if (now - lastSessionCheck >= SESSION_CHECK_INTERVAL_MS) {
        lastSessionCheck = now;

        if (!await sessionStillValid(pool, request.auth)) {
          writeEvent(response, 'auth.expired', { code: 'INVALID_SESSION' });
          response.end();
          stop();
          return;
        }

        if (!await recheckAccess()) {
          writeEvent(response, 'auth.expired', { code: 'ACCESS_REVOKED' });
          response.end();
          stop();
          return;
        }
      }

      const events = await fetchEvents(cursor);

      for (const event of events) {
        cursor = BigInt(event.id);
        writeEvent(
          response,
          'change',
          {
            eventType: event.event_type,
            entityType: event.entity_type,
            entityId: event.entity_id,
            ...(includePayload ? { payload: event.payload } : {}),
            createdAt: event.created_at
          },
          cursor.toString()
        );
      }

      if (Date.now() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
        response.write(': keep-alive\n\n');
        lastHeartbeat = Date.now();
      }
    } catch (error) {
      request.log.error({ err: error }, 'Sync event delivery failed');
      writeEvent(response, 'sync.error', { code: 'SYNC_UNAVAILABLE' });
      response.end();
      stop();
      return;
    }

    if (!closed) {
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }
  };

  timer = setTimeout(poll, 0);
}

async function latestCursor(pool) {
  const latest = await pool.query(
    `SELECT COALESCE(MAX(id), 0)::text AS cursor
     FROM public.sync_outbox`
  );
  return BigInt(latest.rows[0].cursor);
}

const EVENT_FIELDS = `
  e.id::text,
  e.event_type,
  e.entity_type,
  e.entity_id,
  e.created_at`;

export async function registerSyncRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

  // Travel: event organisasi sendiri (keberangkatan dan booking).
  app.get('/sync/events', {
    preHandler: requireSession
  }, async (request, reply) => {
    const organizationId = request.query?.organizationId;

    if (
      typeof organizationId !== 'string' ||
      !UUID_PATTERN.test(organizationId)
    ) {
      return reply.code(400).send({
        code: 'INVALID_ORGANIZATION_ID'
      });
    }

    let cursor = requestedCursor(request);

    if (cursor === undefined) {
      return reply.code(400).send({
        code: 'INVALID_SYNC_CURSOR'
      });
    }

    const travelAccess = async () => {
      const access = await pool.query(
        `SELECT
           EXISTS (
             SELECT 1
             FROM public.organizations o
             WHERE o.id = $2
               AND o.organization_type = 'travel'
               AND o.status = 'active'
           ) AS organization_active,
           EXISTS (
             SELECT 1
             FROM public.memberships m
             JOIN public.roles r ON r.id = m.role_id
             WHERE m.user_id = $1
               AND m.organization_id = $2
               AND r.code = 'travel'
           ) AS travel_member,
           EXISTS (
             SELECT 1
             FROM public.memberships m
             JOIN public.roles r ON r.id = m.role_id
             WHERE m.user_id = $1
               AND m.organization_id IS NULL
               AND r.code = 'super_admin'
           ) AS super_admin`,
        [request.auth.userId, organizationId]
      );
      const row = access.rows[0];
      return Boolean(row?.organization_active && (row.travel_member || row.super_admin));
    };

    try {
      if (!await travelAccess()) {
        return reply.code(403).send({
          code: 'SYNC_ACCESS_DENIED'
        });
      }

      if (cursor === null) {
        const latest = await pool.query(
          `SELECT COALESCE(MAX(id), 0)::text AS cursor
           FROM public.sync_outbox
           WHERE organization_id = $1`,
          [organizationId]
        );
        cursor = BigInt(latest.rows[0].cursor);
      }
    } catch (error) {
      request.log.error({ err: error }, 'Sync subscription setup failed');
      return reply.code(503).send({
        code: 'SYNC_UNAVAILABLE'
      });
    }

    openOutboxStream({
      request,
      reply,
      pool,
      cursor,
      includePayload: true,
      recheckAccess: travelAccess,
      fetchEvents: async after => (await pool.query(
        `SELECT
           id::text,
           event_type,
           entity_type,
           entity_id,
           payload,
           created_at
         FROM public.sync_outbox
         WHERE organization_id = $1
           AND id > $2::bigint
           AND (
             (event_type LIKE 'travel.departure.%' AND entity_type = 'travel_departure')
             OR (event_type LIKE 'travel.booking.%' AND entity_type IN ${BOOKING_ENTITIES})
           )
         ORDER BY id
         LIMIT $3`,
        [organizationId, after.toString(), EVENT_BATCH_SIZE]
      )).rows
    });
  });

  // Agen dan Mitra: hanya booking milik akun ini pada Travel yang memiliki
  // hubungan approved dengan akun tersebut (sama dengan GET /agen|mitra/bookings).
  for (const [role, relationshipType] of [['agen', 'agent'], ['mitra', 'partner']]) {
    app.get(`/sync/${role}/events`, {
      preHandler: requireSession
    }, async (request, reply) => {
      let cursor = requestedCursor(request);

      if (cursor === undefined) {
        return reply.code(400).send({ code: 'INVALID_SYNC_CURSOR' });
      }

      const access = () => hasGlobalRole(pool, request.auth.userId, role);

      let productionFilter;
      try {
        if (!await access()) {
          return reply.code(403).send({ code: 'SYNC_ACCESS_DENIED' });
        }
        productionFilter = await productionOrganizationFilter(pool, 'o');
        if (cursor === null) cursor = await latestCursor(pool);
      } catch (error) {
        request.log.error({ err: error }, 'Sync subscription setup failed');
        return reply.code(503).send({ code: 'SYNC_UNAVAILABLE' });
      }

      openOutboxStream({
        request,
        reply,
        pool,
        cursor,
        recheckAccess: access,
        fetchEvents: async after => (await pool.query(
          `SELECT ${EVENT_FIELDS}
           FROM public.sync_outbox e
           JOIN public.travel_bookings b
             ON b.id::text = e.payload->>'bookingId'
           JOIN public.travel_departures d
             ON d.id = b.departure_id
           JOIN public.organizations o
             ON o.id = d.travel_organization_id
           JOIN public.travel_partner_relationships rel
             ON rel.partner_user_id = b.booking_user_id
            AND rel.travel_organization_id = d.travel_organization_id
            AND rel.relationship_type = $3
            AND rel.status = 'approved'
           WHERE e.id > $1::bigint
             AND e.entity_type IN ${BOOKING_ENTITIES}
             AND e.organization_id = d.travel_organization_id
             AND b.booking_user_id = $2
             AND o.organization_type = 'travel'
             AND o.status = 'active'${productionFilter}
           ORDER BY e.id
           LIMIT $4`,
          [after.toString(), request.auth.userId, relationshipType, EVENT_BATCH_SIZE]
        )).rows
      });
    });
  }

  // Traveler: booking milik akun ini atau yang menjadikannya peserta
  // (sama dengan GET /traveler/bookings).
  app.get('/sync/traveler/events', {
    preHandler: requireSession
  }, async (request, reply) => {
    let cursor = requestedCursor(request);

    if (cursor === undefined) {
      return reply.code(400).send({ code: 'INVALID_SYNC_CURSOR' });
    }

    const access = () => hasGlobalRole(pool, request.auth.userId, 'traveler');

    let productionFilter;
    try {
      if (!await access()) {
        return reply.code(403).send({ code: 'SYNC_ACCESS_DENIED' });
      }
      productionFilter = await productionOrganizationFilter(pool, 'o');
      if (cursor === null) cursor = await latestCursor(pool);
    } catch (error) {
      request.log.error({ err: error }, 'Sync subscription setup failed');
      return reply.code(503).send({ code: 'SYNC_UNAVAILABLE' });
    }

    openOutboxStream({
      request,
      reply,
      pool,
      cursor,
      recheckAccess: access,
      fetchEvents: async after => (await pool.query(
        `SELECT ${EVENT_FIELDS}
         FROM public.sync_outbox e
         JOIN public.travel_bookings b
           ON b.id::text = e.payload->>'bookingId'
         JOIN public.travel_departures d
           ON d.id = b.departure_id
         JOIN public.organizations o
           ON o.id = d.travel_organization_id
         WHERE e.id > $1::bigint
           AND e.entity_type IN ${BOOKING_ENTITIES}
           AND e.organization_id = d.travel_organization_id
           AND (
             b.booking_user_id = $2
             OR EXISTS (
               SELECT 1
               FROM public.travel_booking_participants p
               WHERE p.booking_id = b.id
                 AND p.user_id = $2
             )
           )${productionFilter}
         ORDER BY e.id
         LIMIT $3`,
        [after.toString(), request.auth.userId, EVENT_BATCH_SIZE]
      )).rows
    });
  });

  // Control Center: hanya super_admin global; semua organisasi produksi.
  app.get('/sync/control-center/events', {
    preHandler: requireSession
  }, async (request, reply) => {
    let cursor = requestedCursor(request);

    if (cursor === undefined) {
      return reply.code(400).send({ code: 'INVALID_SYNC_CURSOR' });
    }

    const access = () => hasGlobalRole(pool, request.auth.userId, 'super_admin');

    let productionFilter;
    try {
      if (!await access()) {
        return reply.code(403).send({ code: 'SYNC_ACCESS_DENIED' });
      }
      productionFilter = await productionOrganizationFilter(pool, 'o');
      if (cursor === null) cursor = await latestCursor(pool);
    } catch (error) {
      request.log.error({ err: error }, 'Sync subscription setup failed');
      return reply.code(503).send({ code: 'SYNC_UNAVAILABLE' });
    }

    openOutboxStream({
      request,
      reply,
      pool,
      cursor,
      recheckAccess: access,
      fetchEvents: async after => (await pool.query(
        `SELECT ${EVENT_FIELDS}
         FROM public.sync_outbox e
         JOIN public.organizations o
           ON o.id = e.organization_id
         WHERE e.id > $1::bigint
           AND (e.entity_type IN ('travel_departure', 'travel_branch') OR e.entity_type IN ${BOOKING_ENTITIES})
           AND o.organization_type = 'travel'${productionFilter}
         ORDER BY e.id
         LIMIT $2`,
        [after.toString(), EVENT_BATCH_SIZE]
      )).rows
    });
  });

  // Affiliate: link referral milik akun ini.
  app.get('/sync/affiliate/events', {
    preHandler: requireSession
  }, async (request, reply) => {
    const access = async () => (await pool.query(
      `SELECT 1
       FROM public.memberships m
       JOIN public.roles r ON r.id = m.role_id
       JOIN public.role_permissions rp ON rp.role_id = r.id
       JOIN public.permissions p ON p.id = rp.permission_id
       WHERE m.user_id = $1 AND m.organization_id IS NULL
         AND r.code = 'affiliate'
         AND p.code = 'affiliate.referral_links.read'
       LIMIT 1`,
      [request.auth.userId]
    )).rowCount > 0;

    let cursor = requestedCursor(request);
    if (cursor === undefined) {
      return reply.code(400).send({ code: 'INVALID_SYNC_CURSOR' });
    }

    const owner = request.auth.userId;

    try {
      if (!await access()) {
        return reply.code(403).send({ code: 'AFFILIATE_SYNC_ACCESS_DENIED' });
      }
      if (cursor === null) {
        const latest = await pool.query(
          `SELECT COALESCE(MAX(id), 0)::text AS cursor
           FROM public.sync_outbox
           WHERE entity_type = 'affiliate_referral_link'
             AND payload->>'affiliateUserId' = $1`,
          [owner]
        );
        cursor = BigInt(latest.rows[0].cursor);
      }
    } catch (error) {
      request.log.error({ err: error }, 'Sync subscription setup failed');
      return reply.code(503).send({ code: 'SYNC_UNAVAILABLE' });
    }

    openOutboxStream({
      request,
      reply,
      pool,
      cursor,
      includePayload: true,
      recheckAccess: access,
      fetchEvents: async after => (await pool.query(
        `SELECT id::text, event_type, entity_type, entity_id, payload, created_at
         FROM public.sync_outbox
         WHERE id > $1::bigint
           AND entity_type = 'affiliate_referral_link'
           AND payload->>'affiliateUserId' = $2
         ORDER BY id LIMIT $3`,
        [after.toString(), owner, EVENT_BATCH_SIZE]
      )).rows
    });
  });
}
