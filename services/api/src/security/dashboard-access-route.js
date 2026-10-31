import { createSessionAuth } from './session-auth.js';
import { listDashboardTargets } from './dashboard-targets.js';

export async function registerDashboardAccessRoute(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.get('/dashboard/access', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const dashboards = await listDashboardTargets(pool, request.auth.userId);

    return {
      authenticated: true,
      workspaceSwitching: false,
      dashboards
    };
  });
}