export const DASHBOARD_ROLES = Object.freeze({
  'control-center': 'super_admin',
  travel: 'travel',
  vendor: 'vendor',
  affiliate: 'affiliate',
  mitra: 'mitra',
  agen: 'agen',
  traveler: 'traveler'
});

export function resolveDashboardAccess({
  memberships,
  dashboard,
  organizationId = null
}) {
  const requiredRole = DASHBOARD_ROLES[dashboard];

  if (!requiredRole) {
    return {
      allowed: false,
      reason: 'UNKNOWN_DASHBOARD'
    };
  }

  if (!Array.isArray(memberships)) {
    return {
      allowed: false,
      reason: 'INVALID_MEMBERSHIPS'
    };
  }

  const matching = memberships.filter(
    item => item?.role === requiredRole
  );

  if (matching.length === 0) {
    return {
      allowed: false,
      reason: 'ROLE_NOT_ALLOWED'
    };
  }

  if (requiredRole === 'travel' || requiredRole === 'vendor') {
    if (!organizationId) {
      return {
        allowed: false,
        reason: 'ORGANIZATION_REQUIRED'
      };
    }

    const organizationMatch = matching.some(
      item => item.organizationId === organizationId
    );

    if (!organizationMatch) {
      return {
        allowed: false,
        reason: 'ORGANIZATION_NOT_ALLOWED'
      };
    }
  }

  return {
    allowed: true,
    dashboard,
    role: requiredRole
  };
}