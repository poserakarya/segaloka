import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true',
  max: 1
});

try {
  const result = await pool.query(`
    SELECT
      u.id,
      u.status,
      u.email_verified_at IS NOT NULL AS email_verified,
      c.password_hash IS NOT NULL AS has_password,
      c.password_hash LIKE '$argon2id$%' AS argon2id,
      r.code AS role
    FROM public.users u
    JOIN public.memberships m ON m.user_id = u.id
    JOIN public.roles r ON r.id = m.role_id
    LEFT JOIN public.user_credentials c ON c.user_id = u.id
    WHERE r.code = 'super_admin'
  `);

  console.log('Jumlah Admin Pusat:', result.rowCount);

  if (result.rowCount !== 1) {
    throw new Error('ADMIN_COUNT_INVALID');
  }

  const admin = result.rows[0];

  console.log('Status akun:', admin.status);
  console.log('Email terverifikasi:', admin.email_verified);
  console.log('Password tersedia:', admin.has_password);
  console.log('Hash Argon2id:', admin.argon2id);
  console.log('Role:', admin.role);

  if (
    admin.status === 'active' &&
    admin.email_verified &&
    admin.has_password &&
    admin.argon2id &&
    admin.role === 'super_admin'
  ) {
    console.log('PASS: Struktur akun Admin Pusat valid.');
  } else {
    console.log('PERIKSA: Ada kondisi akun yang perlu diperbaiki.');
  }
} catch (error) {
  console.error('STOP:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}