import { createSessionAuth } from '../security/session-auth.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function parsePage(query) {
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query?.limit || DEFAULT_LIMIT, 10) || DEFAULT_LIMIT));
  const offset = Math.max(0, Number.parseInt(query?.offset || '0', 10) || 0);
  const search = typeof query?.q === 'string' ? query.q.trim().slice(0, 120) : '';
  return { limit, offset, search };
}

async function requireSuperAdmin(pool, userId) {
  const result = await pool.query(
    `SELECT 1 FROM public.memberships m JOIN public.roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.organization_id IS NULL AND r.code = 'super_admin' LIMIT 1`,
    [userId]
  );
  return result.rowCount > 0;
}

export async function registerControlCenterVendorRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);
  app.get('/control-center/vendors', { preHandler: requireSession }, async (request, reply) => {
    if (!await requireSuperAdmin(pool, request.auth.userId)) {
      return reply.code(403).send({ code: 'SUPER_ADMIN_ACCESS_REQUIRED' });
    }
    const { limit, offset, search } = parsePage(request.query);
    const result = await pool.query(
      `SELECT o.id, o.name, o.status, COUNT(m.id)::int AS membership_count,
              COUNT(*) OVER ()::int AS total_count
       FROM public.organizations o LEFT JOIN public.memberships m ON m.organization_id = o.id
       WHERE o.organization_type = 'vendor' AND o.is_test_data = FALSE
         AND ($1 = '' OR o.name ILIKE $2 OR o.id::text ILIKE $2)
       GROUP BY o.id, o.name, o.status ORDER BY o.name ASC, o.id ASC LIMIT $3 OFFSET $4`,
      [search, `%${search}%`, limit, offset]
    );
    return {
      source: 'postgresql',
      items: result.rows.map(row => ({ id: row.id, name: row.name, status: row.status, membershipCount: row.membership_count })),
      pagination: { limit, offset, total: result.rows[0]?.total_count || 0 }
    };
  });
}
