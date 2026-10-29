import { randomBytes } from 'node:crypto';

const HEX64 = /^[0-9a-f]{64}$/;

export function createHandoffConsumer({
  consumeTicket,
  verifySession,
  verifyDashboardAccess,
  createSession
}) {
  if (
    typeof consumeTicket !== 'function' ||
    typeof verifySession !== 'function' ||
    typeof verifyDashboardAccess !== 'function' ||
    typeof createSession !== 'function'
  ) {
    throw new Error('INVALID_HANDOFF_DEPENDENCIES');
  }

  return async function completeHandoff({ ticket, binding }) {
    if (
      typeof ticket !== 'string' ||
      !HEX64.test(ticket) ||
      typeof binding !== 'string' ||
      !HEX64.test(binding)
    ) {
      return { status: 400, code: 'INVALID_HANDOFF_INPUT' };
    }

    const consumed = await consumeTicket({ ticket, binding });

    if (
      consumed?.status !== 200 ||
      consumed?.data?.authenticated !== true ||
      consumed.data.dashboard !== 'travel'
    ) {
      return { status: 401, code: 'INVALID_OR_EXPIRED_HANDOFF' };
    }

    const payload = consumed.data;
    const accessToken = payload.session?.accessToken;
    const refreshToken = payload.session?.refreshToken;

    if (
      typeof accessToken !== 'string' ||
      !HEX64.test(accessToken) ||
      typeof refreshToken !== 'string' ||
      !HEX64.test(refreshToken)
    ) {
      return { status: 502, code: 'INVALID_HANDOFF_SESSION' };
    }

    const me = await verifySession(accessToken);

    if (
      me?.status !== 200 ||
      me?.data?.authenticated !== true ||
      typeof me.data.user?.id !== 'string' ||
      !Array.isArray(me.data.memberships) ||
      !me.data.memberships.some(m =>
        typeof m.role === 'string' &&
        (
          m.role === 'travel' ||
          m.role.startsWith('TRAVEL_')
        ) &&
        typeof m.organizationId === 'string' &&
        m.organizationId.length > 0
      )
    ) {
      return { status: 403, code: 'TRAVEL_ACCESS_REQUIRED' };
    }

    if (payload.user?.id !== me.data.user.id) {
      return { status: 403, code: 'HANDOFF_USER_MISMATCH' };
    }

    if (typeof verifyDashboardAccess !== 'function') {
      return { status: 503, code: 'DASHBOARD_ACCESS_CHECK_UNAVAILABLE' };
    }

    const access = await verifyDashboardAccess(accessToken);

    const dashboards = Array.isArray(access?.data?.dashboards)
      ? access.data.dashboards
      : [];

    if (access?.status !== 200) {
      return {
        status: access?.status === 401 ? 401 : 503,
        code: 'DASHBOARD_ACCESS_CHECK_FAILED'
      };
    }

    const travelOrganizationIds = new Set(
      me.data.memberships
        .filter(m =>
          typeof m.role === 'string' &&
          (m.role === 'travel' || m.role.startsWith('TRAVEL_')) &&
          typeof m.organizationId === 'string' &&
          m.organizationId.length > 0
        )
        .map(m => m.organizationId)
    );

    const allowed = dashboards.some(item =>
      item?.dashboard === 'travel' &&
      item?.role === 'travel' &&
      typeof item?.organizationId === 'string' &&
      item.organizationId.length > 0 &&
      travelOrganizationIds.has(item.organizationId)
    );

    if (!allowed) {
      return { status: 403, code: 'TRAVEL_DASHBOARD_ACCESS_DENIED' };
    }

    const sessionId = randomBytes(32).toString('hex');

    await createSession(sessionId, me.data.user.id, {
      accessToken,
      refreshToken,
      user: me.data.user,
      memberships: me.data.memberships
    });

    return {
      status: 200,
      authenticated: true,
      sessionId
    };
  };
}