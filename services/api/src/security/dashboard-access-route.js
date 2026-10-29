import { createSessionAuth } from './session-auth.js';
import { DASHBOARD_ROLES } from './dashboard-boundary.js';

export async function registerDashboardAccessRoute(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.get('/dashboard/access', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const result = await pool.query(
      `SELECT
         r.code AS role,
         m.organization_id,
         o.name AS organization_name,
         o.organization_type,
         o.status AS organization_status
       FROM public.memberships m
       JOIN public.roles r ON r.id = m.role_id
       LEFT JOIN public.organizations o
         ON o.id = m.organization_id
       WHERE m.user_id = $1
       ORDER BY r.code, m.organization_id NULLS FIRST`,
      [request.auth.userId]
    );

    const dashboards = [];

    for (const [dashboard, role] of Object.entries(DASHBOARD_ROLES)) {
      const matching = result.rows.filter(row => row.role === role);

      if (matching.length === 0) continue;

      if (role === 'travel' || role === 'vendor') {
        for (const row of matching) {
          if (
            row.organization_id &&
            row.organization_type === role &&
            (role === 'travel' ? ['pending', 'active'].includes(row.organization_status) : row.organization_status === 'active')
          ) {
            dashboards.push({
              dashboard,
              role,
              organizationId: row.organization_id,
              organizationName: row.organization_name
            });
          }
        }
        continue;
      }

      if (role === 'super_admin') {
        if (matching.some(row => row.organization_id === null)) {
          dashboards.push({
            dashboard,
            role,
            organizationId: null
          });
        }
        continue;
      }

      if (!matching.some(row => row.organization_id === null)) {
        continue;
      }

      dashboards.push({
        dashboard,
        role,
        organizationId: null
      });
    }

    return {
      authenticated: true,
      workspaceSwitching: false,
      dashboards
    };
  });
}