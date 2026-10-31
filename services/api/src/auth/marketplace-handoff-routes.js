// Handoff login Marketplace -> enam dashboard non-admin (migrasi 0042).
//
// 1. BFF dashboard membuat verifier acak dan menyimpannya di cookie HttpOnly
//    host dashboard; challenge = sha256(verifier) dikirim ke Marketplace.
// 2. POST /auth/dashboard-handoff/tickets: server Marketplace (ingress
//    bertanda) dengan sesi pengguna meminta tiket. API memeriksa role/tenant
//    dari database (listDashboardTargets) dan menyimpan hash tiket, 60 detik.
// 3. POST /auth/dashboard-handoff/consume: BFF dashboard (ingress bertanda)
//    menukar tiket + verifier. Tiket dibakar pada percobaan pertama (benar
//    atau salah), akses diperiksa ulang, lalu sesi API BARU dibuat untuk
//    dashboard itu (status MFA disalin dari sesi Marketplace).
// Token tidak pernah dikirim lewat URL; tiket hanya ada di body POST.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { createSessionAuth } from '../security/session-auth.js';
import { listDashboardTargets } from '../security/dashboard-targets.js';
import { createSession } from './session-service.js';
import { createAccessToken } from './access-token-service.js';

export const HANDOFF_DASHBOARDS = Object.freeze(['travel', 'vendor', 'affiliate', 'agen', 'mitra', 'traveler']);
const TENANT_DASHBOARDS = new Set(['travel', 'vendor']);
const HEX64 = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const HANDOFF_TICKET_TTL_SECONDS = 60;

const sha256 = value => createHash('sha256').update(value).digest('hex');

function equalHex(a, b) {
  return HEX64.test(a) && HEX64.test(b) && timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

// Target dashboard yang sah untuk user; organizationId wajib untuk Travel/
// Vendor dan harus salah satu organisasi miliknya.
export async function resolveHandoffTarget(db, userId, dashboard, organizationId) {
  const targets = (await listDashboardTargets(db, userId)).filter(item => item.dashboard === dashboard);
  if (!targets.length) return { error: 'DASHBOARD_ACCESS_DENIED' };
  if (!TENANT_DASHBOARDS.has(dashboard)) return { target: { ...targets[0], organizationId: null } };
  if (organizationId) {
    const match = targets.find(item => item.organizationId === organizationId);
    return match ? { target: match } : { error: 'DASHBOARD_ACCESS_DENIED' };
  }
  if (targets.length > 1) {
    return {
      error: 'WORKSPACE_SELECTION_REQUIRED',
      workspaces: targets.map(item => ({ organizationId: item.organizationId, organizationName: item.organizationName }))
    };
  }
  return { target: targets[0] };
}

export async function registerMarketplaceHandoffRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.post('/auth/dashboard-handoff/tickets', {
    preHandler: requireSession,
    bodyLimit: 2048,
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['dashboard', 'challenge'],
        properties: {
          dashboard: { type: 'string', enum: [...HANDOFF_DASHBOARDS] },
          challenge: { type: 'string', pattern: '^[0-9a-f]{64}$' },
          organizationId: { type: 'string', pattern: '^[0-9a-fA-F-]{36}$' }
        }
      }
    }
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (!request.verifiedClientIp) return reply.code(403).send({ code: 'INGRESS_REQUIRED' });
    const { dashboard, challenge, organizationId } = request.body;
    if (organizationId && !UUID.test(organizationId)) return reply.code(400).send({ code: 'INVALID_HANDOFF_REQUEST' });

    const resolved = await resolveHandoffTarget(pool, request.auth.userId, dashboard, organizationId);
    if (resolved.error === 'WORKSPACE_SELECTION_REQUIRED') {
      return reply.code(409).send({ code: resolved.error, workspaces: resolved.workspaces });
    }
    if (resolved.error) return reply.code(403).send({ code: resolved.error });

    const ticket = randomBytes(32).toString('hex');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO public.dashboard_handoff_tickets
           (dashboard, ticket_hash, challenge, source_session_id, user_id, organization_id, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, now() + make_interval(secs => $7))
         RETURNING id`,
        [dashboard, sha256(ticket), challenge, request.auth.sessionId, request.auth.userId,
          resolved.target.organizationId, HANDOFF_TICKET_TTL_SECONDS]
      );
      await client.query(
        `INSERT INTO public.audit_logs (actor_user_id, organization_id, action, entity_type, entity_id)
         VALUES ($1, $2, 'auth.dashboard_handoff.issued', 'dashboard_handoff_ticket', $3)`,
        [request.auth.userId, resolved.target.organizationId, inserted.rows[0].id]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      request.log.error({ err: error }, 'Dashboard handoff ticket failed');
      return reply.code(503).send({ code: 'HANDOFF_UNAVAILABLE' });
    } finally {
      client.release();
    }
    return reply.code(201).send({ ticket, dashboard, expiresIn: HANDOFF_TICKET_TTL_SECONDS });
  });

  app.post('/auth/dashboard-handoff/consume', {
    bodyLimit: 2048,
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['dashboard', 'ticket', 'verifier'],
        properties: {
          dashboard: { type: 'string', enum: [...HANDOFF_DASHBOARDS] },
          ticket: { type: 'string', pattern: '^[0-9a-f]{64}$' },
          verifier: { type: 'string', pattern: '^[0-9a-f]{64}$' }
        }
      }
    }
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (!request.verifiedClientIp) return reply.code(403).send({ code: 'INGRESS_REQUIRED' });
    const { dashboard, ticket, verifier } = request.body;
    const denied = () => reply.code(401).send({ authenticated: false, code: 'INVALID_OR_EXPIRED_HANDOFF' });

    const client = await pool.connect();
    let open = false;
    try {
      await client.query('BEGIN');
      open = true;
      // Tiket dibakar pada percobaan pertama: replay dan tebakan verifier gagal.
      const burned = await client.query(
        `UPDATE public.dashboard_handoff_tickets
         SET consumed_at = now()
         WHERE ticket_hash = $1 AND consumed_at IS NULL
         RETURNING id, dashboard, challenge, source_session_id, user_id, organization_id,
                   expires_at > now() AS fresh`,
        [sha256(ticket)]
      );
      const row = burned.rows[0];
      if (!row || !row.fresh || row.dashboard !== dashboard || !equalHex(sha256(verifier), row.challenge)) {
        await client.query('COMMIT');
        open = false;
        return denied();
      }

      const source = (await client.query(
        `SELECT s.mfa_verified_at, s.mfa_method
         FROM public.auth_sessions s
         JOIN public.users u ON u.id = s.user_id
         WHERE s.id = $1 AND s.user_id = $2
           AND s.revoked_at IS NULL AND s.expires_at > now()
           AND u.status = 'active'
           AND (u.two_factor_enabled = false OR s.mfa_verified_at IS NOT NULL)`,
        [row.source_session_id, row.user_id]
      )).rows[0];
      const access = source && await resolveHandoffTarget(client, row.user_id, dashboard, row.organization_id);
      if (!source || !access?.target) {
        await client.query('COMMIT');
        open = false;
        return denied();
      }

      const session = await createSession(client, row.user_id);
      if (source.mfa_verified_at) {
        await client.query(
          `UPDATE public.auth_sessions SET mfa_verified_at = now(), mfa_method = $2 WHERE id = $1`,
          [session.sessionId, source.mfa_method]
        );
      }
      const accessToken = await createAccessToken(client, session.sessionId);
      if (!accessToken) throw new Error('HANDOFF_ACCESS_TOKEN_FAILED');
      await client.query(
        `INSERT INTO public.audit_logs (actor_user_id, organization_id, action, entity_type, entity_id)
         VALUES ($1, $2, 'auth.dashboard_handoff.consumed', 'dashboard_handoff_ticket', $3)`,
        [row.user_id, row.organization_id, row.id]
      );
      await client.query('COMMIT');
      open = false;

      return reply.code(200).send({
        authenticated: true,
        dashboard,
        organizationId: row.organization_id,
        session: {
          sessionId: session.sessionId,
          refreshToken: session.refreshToken,
          accessToken: accessToken.accessToken,
          tokenType: accessToken.tokenType,
          expiresIn: accessToken.expiresIn,
          accessTokenExpiresAt: accessToken.expiresAt
        }
      });
    } catch (error) {
      if (open) await client.query('ROLLBACK').catch(() => {});
      request.log.error({ err: error }, 'Dashboard handoff consume failed');
      return reply.code(503).send({ code: 'HANDOFF_UNAVAILABLE' });
    } finally {
      client.release();
    }
  });
}
