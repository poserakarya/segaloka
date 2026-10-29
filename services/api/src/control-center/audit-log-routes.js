import { createSessionAuth } from '../security/session-auth.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const ACTION_PATTERN = /^[a-zA-Z0-9._:-]{1,80}$/;
const ENTITY_PATTERN = /^[a-zA-Z0-9._:-]{1,80}$/;

function parsePage(query = {}) {
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query.limit || DEFAULT_LIMIT, 10) || DEFAULT_LIMIT));
  const offset = Math.max(0, Number.parseInt(query.offset || '0', 10) || 0);
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 120) : '';
  const action = typeof query.action === 'string' && ACTION_PATTERN.test(query.action) ? query.action : '';
  const entityType = typeof query.entityType === 'string' && ENTITY_PATTERN.test(query.entityType) ? query.entityType : '';
  return { limit, offset, q, action, entityType };
}

async function requireSuperAdmin(pool, userId) {
  const result = await pool.query(
    `SELECT 1 FROM public.memberships m
     JOIN public.roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.organization_id IS NULL
       AND r.code = 'super_admin' LIMIT 1`,
    [userId]
  );
  return result.rowCount > 0;
}

export async function registerControlCenterAuditLogRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);
  app.get('/control-center/audit-logs', { preHandler: requireSession }, async (request, reply) => {
    if (!await requireSuperAdmin(pool, request.auth.userId)) {
      return reply.code(403).send({ code: 'SUPER_ADMIN_ACCESS_REQUIRED' });
    }

    const { limit, offset, q, action, entityType } = parsePage(request.query);
    const result = await pool.query(
      `SELECT al.id, al.action, al.entity_type, al.entity_id, al.created_at,
              u.full_name AS actor_name, o.name AS organization_name,
              COUNT(*) OVER ()::int AS total_count
       FROM public.audit_logs al
       LEFT JOIN public.users u ON u.id = al.actor_user_id
       LEFT JOIN public.organizations o ON o.id = al.organization_id
       WHERE o.is_test_data IS NOT TRUE
         AND ($1 = '' OR al.action = $1)
         AND ($2 = '' OR al.entity_type = $2)
         AND ($3 = '' OR al.action ILIKE $4 OR al.entity_type ILIKE $4
              OR COALESCE(al.entity_id::text, '') ILIKE $4
              OR COALESCE(u.full_name, '') ILIKE $4
              OR COALESCE(o.name, '') ILIKE $4)
       ORDER BY al.created_at DESC, al.id DESC
       LIMIT $5 OFFSET $6`,
      [action, entityType, q, `%${q}%`, limit, offset]
    );

    return {
      source: 'postgresql',
      items: result.rows.map(row => ({
        id: row.id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        actor: row.actor_name || 'System',
        organization: row.organization_name,
        createdAt: row.created_at
      })),
      pagination: { limit, offset, total: result.rows[0]?.total_count || 0 }
    };
  });
}
