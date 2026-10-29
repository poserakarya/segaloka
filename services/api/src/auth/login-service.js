import { verifyPassword, hashPassword } from './password.js';


const DUMMY_HASH = await hashPassword(
  'Segaloka-Dummy-Password-Never-Used-2026!'
);

export async function loginWithPassword(pool, input) {
  const email = typeof input?.email === 'string'
    ? input.email.trim().toLowerCase()
    : '';

  const password = input?.password;

  if (
    email.length < 3 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof password !== 'string' ||
    password.length > 128
  ) {
    return { authenticated: false, reason: 'INVALID_CREDENTIALS' };
  }

  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.full_name,
       u.status,
       u.email_verified_at,
       c.password_hash
     FROM public.users u
     JOIN public.user_credentials c ON c.user_id = u.id
     WHERE lower(u.email) = $1
     LIMIT 1
     FOR UPDATE OF u`,
    [email]
  );

  const user = result.rows[0];

  const validPassword = await verifyPassword(
    user?.password_hash || DUMMY_HASH,
    password
  );

  if (
    !user ||
    !validPassword ||
    user.status !== 'active'
  ) {
    return { authenticated: false, reason: 'INVALID_CREDENTIALS' };
  }

  const membershipResult = await pool.query(
    `SELECT
       r.code AS role,
       m.organization_id
     FROM public.memberships m
     JOIN public.roles r ON r.id = m.role_id
     WHERE m.user_id = $1
     ORDER BY r.code, m.organization_id NULLS FIRST`,
    [user.id]
  );

  if (membershipResult.rows.length === 0) {
    return { authenticated: false, reason: 'INVALID_CREDENTIALS' };
  }

  return {
    authenticated: false,
    credentialsVerified: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      memberships: membershipResult.rows.map(row => ({
        role: row.role,
        organizationId: row.organization_id
      }))
    }
  };
}