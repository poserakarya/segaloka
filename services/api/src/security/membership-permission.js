// Izin per membership organisasi Travel (migrasi 0041). Izin melekat pada
// satu membership role 'travel' di satu organisasi Travel aktif, jadi izin di
// organisasi A tidak berlaku di organisasi B. organizationId wajib berasal dari
// data yang diakses di server (bukan input klien). Diperiksa dari database
// setiap request (tanpa cache), sehingga pencabutan langsung berlaku.
export const TRAVEL_MEMBERSHIP_PERMISSIONS = Object.freeze([
  'travel.certificates.issue',
  'travel.certificates.revoke',
  'travel.partners.read',
  'travel.partners.manage',
  'travel.partners.approve'
]);

export async function hasTravelMembershipPermission(client, { userId, organizationId, permission }) {
  if (!TRAVEL_MEMBERSHIP_PERMISSIONS.includes(permission)) {
    throw new Error('UNKNOWN_TRAVEL_MEMBERSHIP_PERMISSION');
  }
  const result = await client.query(
    `SELECT 1
     FROM public.memberships m
     JOIN public.roles r
       ON r.id = m.role_id AND r.code = 'travel'
     JOIN public.organizations o
       ON o.id = m.organization_id
      AND o.organization_type = 'travel'
      AND o.status = 'active'
     JOIN public.membership_permissions mp
       ON mp.membership_id = m.id AND mp.revoked_at IS NULL
     JOIN public.permissions p
       ON p.id = mp.permission_id AND p.code = $3
     WHERE m.user_id = $1
       AND m.organization_id = $2
     LIMIT 1`,
    [userId, organizationId, permission]
  );
  return result.rows.length > 0;
}
