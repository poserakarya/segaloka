import { createSessionAuth } from '../security/session-auth.js';

export async function registerMeRoute(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.get('/auth/me', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const userId = request.auth.userId;

    const result = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.full_name,
         u.status,
         m.organization_id,
         r.code AS role
       FROM public.users u
       LEFT JOIN public.memberships m
         ON m.user_id = u.id
       LEFT JOIN public.roles r
         ON r.id = m.role_id
       WHERE u.id = $1
       ORDER BY r.code, m.organization_id NULLS FIRST`,
      [userId]
    );

    const rows = result.rows;

    if (rows.length === 0) {
      return reply.code(401).send({
        authenticated: false,
        code: 'USER_NOT_FOUND'
      });
    }

    return {
      authenticated: true,
      user: {
        id: rows[0].id,
        email: rows[0].email,
        fullName: rows[0].full_name,
        status: rows[0].status
      },
      memberships: rows
        .filter(row => row.role !== null)
        .map(row => ({
          role: row.role,
          organizationId: row.organization_id
        }))
    };
  });
}