// Pengelolaan izin per membership Travel oleh Super Admin (migrasi 0041,
// docs/rbac-membership-permissions.md). Tahap ini hanya Super Admin global
// yang boleh memberi/mencabut; pemilik Travel belum diaktifkan.
//
// - Aktor diverifikasi lewat sesi API + RBAC (membership super_admin global),
//   bukan dari input. Grant/revoke mensyaratkan sesi ber-MFA terverifikasi.
// - Membership target wajib milik organisasi Travel di path (data server).
// - Tidak ada self-grant/self-revoke (juga ditegakkan trigger database).
// - Setiap perubahan menulis audit_logs dan event sync_outbox di transaksi yang
//   sama; kegagalan salah satunya membatalkan perubahan izin.
import { createSessionAuth } from '../security/session-auth.js';
import { TRAVEL_MEMBERSHIP_PERMISSIONS } from '../security/membership-permission.js';
import { MEMBERSHIP_PERMISSION_ENTITY, recordSyncEvent } from '../sync/outbox.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function isSuperAdmin(db, userId) {
  const result = await db.query(
    `SELECT 1 FROM public.memberships m
     JOIN public.roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.organization_id IS NULL AND r.code = 'super_admin'
     LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0;
}

async function sessionMfaVerified(db, sessionId) {
  const result = await db.query(
    `SELECT 1 FROM public.auth_sessions s
     JOIN public.users u ON u.id = s.user_id
     WHERE s.id = $1 AND u.two_factor_enabled = true AND s.mfa_verified_at IS NOT NULL
     LIMIT 1`,
    [sessionId]
  );
  return result.rows.length > 0;
}

async function travelOrganization(db, organizationId) {
  const result = await db.query(
    `SELECT id FROM public.organizations WHERE id = $1 AND organization_type = 'travel'`,
    [organizationId]
  );
  return result.rows.length > 0;
}

function invalidParams(params) {
  return !UUID.test(params.organizationId || '') ||
    (params.membershipId !== undefined && !UUID.test(params.membershipId)) ||
    (params.code !== undefined && !TRAVEL_MEMBERSHIP_PERMISSIONS.includes(params.code));
}

export async function registerMembershipPermissionRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

  async function authorize(request, reply, { requireMfa }) {
    reply.header('Cache-Control', 'no-store');
    if (invalidParams(request.params)) {
      reply.code(400).send({ code: 'INVALID_MEMBERSHIP_PERMISSION_REQUEST' });
      return false;
    }
    if (!await isSuperAdmin(pool, request.auth.userId)) {
      reply.code(403).send({ code: 'SUPER_ADMIN_ACCESS_REQUIRED' });
      return false;
    }
    if (requireMfa && !await sessionMfaVerified(pool, request.auth.sessionId)) {
      reply.code(403).send({ code: 'MFA_REQUIRED_FOR_PERMISSION_CHANGE' });
      return false;
    }
    if (!await travelOrganization(pool, request.params.organizationId)) {
      reply.code(404).send({ code: 'TRAVEL_NOT_FOUND' });
      return false;
    }
    return true;
  }

  app.get('/control-center/travels/:organizationId/members', { preHandler: requireSession }, async (request, reply) => {
    if (!await authorize(request, reply, { requireMfa: false })) return;
    const result = await pool.query(
      `SELECT m.id AS "membershipId", m.user_id AS "userId", u.full_name AS "fullName",
              u.email, m.created_at AS "memberSince",
              COALESCE(
                jsonb_agg(jsonb_build_object('code', p.code, 'grantedAt', mp.granted_at, 'grantedBy', mp.granted_by)
                          ORDER BY p.code) FILTER (WHERE mp.id IS NOT NULL),
                '[]'::jsonb
              ) AS permissions
       FROM public.memberships m
       JOIN public.roles r ON r.id = m.role_id AND r.code = 'travel'
       JOIN public.users u ON u.id = m.user_id
       LEFT JOIN public.membership_permissions mp ON mp.membership_id = m.id AND mp.revoked_at IS NULL
       LEFT JOIN public.permissions p ON p.id = mp.permission_id
       WHERE m.organization_id = $1
       GROUP BY m.id, u.id
       ORDER BY u.full_name, m.id`,
      [request.params.organizationId]
    );
    return { source: 'postgresql', permissionCodes: TRAVEL_MEMBERSHIP_PERMISSIONS, items: result.rows };
  });

  async function change(request, reply, kind) {
    if (!await authorize(request, reply, { requireMfa: true })) return;
    const { organizationId, membershipId, code } = request.params;
    const actor = request.auth.userId;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const member = await client.query(
        `SELECT m.id, m.user_id
         FROM public.memberships m
         JOIN public.roles r ON r.id = m.role_id AND r.code = 'travel'
         JOIN public.organizations o ON o.id = m.organization_id AND o.organization_type = 'travel'
         WHERE m.id = $1 AND m.organization_id = $2
         FOR UPDATE OF m`,
        [membershipId, organizationId]
      );
      if (!member.rows.length) {
        await client.query('ROLLBACK');
        return reply.code(404).send({ code: 'TRAVEL_MEMBERSHIP_NOT_FOUND' });
      }
      if (member.rows[0].user_id === actor) {
        await client.query('ROLLBACK');
        return reply.code(403).send({ code: kind === 'grant' ? 'SELF_GRANT_FORBIDDEN' : 'SELF_REVOKE_FORBIDDEN' });
      }
      const permission = (await client.query('SELECT id FROM public.permissions WHERE code = $1', [code])).rows[0];
      if (!permission) {
        await client.query('ROLLBACK');
        return reply.code(400).send({ code: 'INVALID_MEMBERSHIP_PERMISSION_REQUEST' });
      }
      const active = (await client.query(
        `SELECT id FROM public.membership_permissions
         WHERE membership_id = $1 AND permission_id = $2 AND revoked_at IS NULL
         FOR UPDATE`,
        [membershipId, permission.id]
      )).rows[0];

      let rowId;
      if (kind === 'grant') {
        if (active) {
          await client.query('ROLLBACK');
          return reply.code(200).send({ membershipId, code, active: true, idempotent: true });
        }
        rowId = (await client.query(
          `INSERT INTO public.membership_permissions (membership_id, permission_id, granted_by)
           VALUES ($1, $2, $3) RETURNING id`,
          [membershipId, permission.id, actor]
        )).rows[0].id;
      } else {
        if (!active) {
          await client.query('ROLLBACK');
          return reply.code(200).send({ membershipId, code, active: false, idempotent: true });
        }
        rowId = active.id;
        await client.query(
          `UPDATE public.membership_permissions SET revoked_at = now(), revoked_by = $2 WHERE id = $1`,
          [rowId, actor]
        );
      }

      await client.query(
        `INSERT INTO public.audit_logs (actor_user_id, organization_id, action, entity_type, entity_id)
         VALUES ($1, $2, $3, 'membership_permission', $4)`,
        [actor, organizationId, `travel.membership_permission.${kind === 'grant' ? 'granted' : 'revoked'}`, rowId]
      );
      await recordSyncEvent(client, {
        organizationId,
        eventType: `travel.membership_permission.${kind === 'grant' ? 'granted' : 'revoked'}`,
        entityType: MEMBERSHIP_PERMISSION_ENTITY,
        entityId: rowId,
        payload: { membershipId, permission: code }
      });
      await client.query('COMMIT');
      return reply.code(kind === 'grant' ? 201 : 200).send({ membershipId, code, active: kind === 'grant', idempotent: false });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      request.log.error({ err: error }, 'Membership permission change failed');
      return reply.code(500).send({ code: 'MEMBERSHIP_PERMISSION_CHANGE_FAILED' });
    } finally {
      client.release();
    }
  }

  const path = '/control-center/travels/:organizationId/members/:membershipId/permissions/:code';
  app.put(path, { preHandler: requireSession }, (request, reply) => change(request, reply, 'grant'));
  app.delete(path, { preHandler: requireSession }, (request, reply) => change(request, reply, 'revoke'));
}
