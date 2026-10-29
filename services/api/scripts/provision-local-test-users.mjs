import pg from 'pg';
import argon2 from 'argon2';

const apply = process.argv.includes('--apply');
const database = process.env.DB_NAME || 'segaloka_local_e2e';
if (database !== 'segaloka_local_e2e') {
  throw new Error('Refusing to run outside segaloka_local_e2e');
}
if (!apply) {
  console.log('Dry run only. Re-run with --apply to provision local test users.');
  process.exit(0);
}

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  database,
  user: process.env.DB_USER || 'app_runtime',
  password: process.env.DB_PASSWORD || '',
  ssl: false
});
const password = process.env.TEST_USER_PASSWORD;
if (typeof password !== 'string' || password.length < 16) {
  throw new Error('Set TEST_USER_PASSWORD to a non-production password of at least 16 characters.');
}

const users = [
  ['super-admin.local@invalid.test', 'Local Super Admin', 'super_admin', null],
  ['travel.local@invalid.test', 'Local Travel', 'travel', 'travel'],
  ['vendor.local@invalid.test', 'Local Vendor', 'vendor', 'vendor'],
  ['affiliate.local@invalid.test', 'Local Affiliate', 'affiliate', null],
  ['agen.local@invalid.test', 'Local Agen', 'agen', 'travel'],
  ['mitra.local@invalid.test', 'Local Mitra', 'mitra', 'travel'],
  ['traveler.local@invalid.test', 'Local Traveler', 'traveler', null]
];

const client = await pool.connect();
try {
  await client.query('BEGIN');
  const organizations = {};
  for (const [name, type] of [['Local Test Travel', 'travel'], ['Local Test Vendor', 'vendor']]) {
    const existing = await client.query(
      'SELECT id FROM public.organizations WHERE name = $1 ORDER BY created_at, id LIMIT 1', [name]
    );
    if (existing.rows[0]) {
      organizations[type] = existing.rows[0].id;
    } else {
      const result = await client.query(
        `INSERT INTO public.organizations (name, organization_type, status)
         VALUES ($1, $2, 'active') RETURNING id`, [name, type]
      );
      organizations[type] = result.rows[0].id;
    }
  }
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  for (const [email, fullName, role, organizationType] of users) {
    const user = await client.query(
      `INSERT INTO public.users (email, full_name, status, email_verified_at)
       VALUES ($1, $2, 'active', now())
       ON CONFLICT ((lower(email))) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`, [email, fullName]
    );
    const roleRow = await client.query('SELECT id FROM public.roles WHERE code = $1', [role]);
    await client.query(
      `INSERT INTO public.user_credentials (user_id, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [user.rows[0].id, hash]
    );
    await client.query(
      `INSERT INTO public.memberships (user_id, organization_id, role_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [user.rows[0].id, organizationType ? organizations[organizationType] : null, roleRow.rows[0].id]
    );
  }
  await client.query('COMMIT');
  console.log('Provisioned local test users only in segaloka_local_e2e.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
