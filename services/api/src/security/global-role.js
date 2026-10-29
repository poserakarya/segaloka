export async function hasGlobalRole(pool, userId, role) {
  const result = await pool.query(
    `SELECT 1
     FROM public.memberships m
     JOIN public.roles r ON r.id = m.role_id
     WHERE m.user_id = $1
       AND m.organization_id IS NULL
       AND r.code = $2
     LIMIT 1`,
    [userId, role]
  );

  return result.rows.length > 0;
}
