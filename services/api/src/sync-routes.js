import { createSessionAuth } from './security/session-auth.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CURSOR_PATTERN = /^\d{1,19}$/;
const MAX_CURSOR = 9223372036854775807n;
const POLL_INTERVAL_MS = 1500;
const SESSION_CHECK_INTERVAL_MS = 10000;
const HEARTBEAT_INTERVAL_MS = 20000;
const EVENT_BATCH_SIZE = 100;
const SSE_TRACE = process.env.SEGALOKA_SSE_TRACE === 'true';

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

export async function registerSyncRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

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

    const lastEventId = request.headers['last-event-id'];
    const rawCursor = typeof lastEventId === 'string'
      ? lastEventId
      : request.query?.after;
    const requestedCursor = parseCursor(rawCursor);

    if (requestedCursor === undefined) {
      return reply.code(400).send({
        code: 'INVALID_SYNC_CURSOR'
      });
    }

    let cursor = requestedCursor;

    try {
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
      const accessRow = access.rows[0];

      if (
        !accessRow?.organization_active ||
        (!accessRow.travel_member && !accessRow.super_admin)
      ) {
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
    let lastSessionCheck = 0;
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
        request.log.debug({ cursor: cursor.toString(), organizationId }, 'Sync poll');

        if (now - lastSessionCheck >= SESSION_CHECK_INTERVAL_MS) {
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
            [
              request.auth.accessTokenHash,
              request.auth.sessionId,
              request.auth.userId
            ]
          );

          lastSessionCheck = now;

          if (session.rows.length === 0) {
            writeEvent(response, 'auth.expired', {
              code: 'INVALID_SESSION'
            });
            response.end();
            stop();
            return;
          }
        }

        const events = await pool.query(
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
             AND event_type LIKE 'travel.departure.%'
             AND entity_type = 'travel_departure'
           ORDER BY id
           LIMIT $3`,
          [organizationId, cursor.toString(), EVENT_BATCH_SIZE]
        );

        if (events.rows.length > 0) {
          request.log.info({ count: events.rows.length, cursor: cursor.toString(), organizationId }, 'Sync events ready');
        }

        for (const event of events.rows) {
          cursor = BigInt(event.id);
          writeEvent(
            response,
            'change',
            {
              eventType: event.event_type,
              entityType: event.entity_type,
              entityId: event.entity_id,
              payload: event.payload,
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
        writeEvent(response, 'sync.error', {
          code: 'SYNC_UNAVAILABLE'
        });
        response.end();
        stop();
        return;
      }

      if (!closed) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    timer = setTimeout(poll, 0);
  });

  app.get('/sync/affiliate/events', {
    preHandler: requireSession
  }, async (request, reply) => {
    const permission = await pool.query(
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
    );
    if (permission.rowCount === 0) {
      return reply.code(403).send({ code: 'AFFILIATE_SYNC_ACCESS_DENIED' });
    }

    const raw = request.headers['last-event-id'] ?? request.query?.after;
    const requested = parseCursor(raw);
    if (requested === undefined) {
      return reply.code(400).send({ code: 'INVALID_SYNC_CURSOR' });
    }

    let cursor = requested;
    const owner = request.auth.userId;
    const latest = await pool.query(
      `SELECT COALESCE(MAX(id), 0)::text AS cursor
       FROM public.sync_outbox
       WHERE entity_type = 'affiliate_referral_link'
         AND payload->>'affiliateUserId' = $1`,
      [owner]
    );
    if (cursor === null) cursor = BigInt(latest.rows[0].cursor);

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
    response.write('retry: 3000\n: connected\n\n');
    writeEvent(response, 'ready', { cursor: cursor.toString() }, cursor.toString());

    let closed = false;
    let timer;
    const stop = () => { closed = true; clearTimeout(timer); };
    response.on('close', stop);
    response.on('error', stop);

    const poll = async () => {
      if (closed) return;
      const events = await pool.query(
        `SELECT id::text, event_type, entity_type, entity_id, payload, created_at
         FROM public.sync_outbox
         WHERE id > $1::bigint
           AND entity_type = 'affiliate_referral_link'
           AND payload->>'affiliateUserId' = $2
         ORDER BY id LIMIT $3`,
        [cursor.toString(), owner, EVENT_BATCH_SIZE]
      );
      for (const event of events.rows) {
        cursor = BigInt(event.id);
        writeEvent(response, 'change', {
          eventType: event.event_type,
          entityType: event.entity_type,
          entityId: event.entity_id,
          payload: event.payload,
          createdAt: event.created_at
        }, cursor.toString());
      }
      if (!closed) timer = setTimeout(poll, POLL_INTERVAL_MS);
    };
    timer = setTimeout(poll, 0);
  });
}
