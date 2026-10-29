import 'dotenv/config';
import pg from 'pg';
import { verifyPassword } from '../src/auth/password.js';

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
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }

  const input = Buffer.concat(chunks);
  chunks.forEach(chunk => chunk.fill(0));

  let credentials;

  try {
    credentials = JSON.parse(input.toString('utf8'));
  } finally {
    input.fill(0);
  }

  const email = credentials.email.trim().toLowerCase();

  const result = await pool.query(`
    SELECT
      u.id,
      u.status,
      u.email_verified_at IS NOT NULL AS verified,
      c.password_hash
    FROM public.users u
    JOIN public.user_credentials c ON c.user_id = u.id
    JOIN public.memberships m ON m.user_id = u.id
    JOIN public.roles r ON r.id = m.role_id
    WHERE lower(u.email) = $1
      AND r.code = 'super_admin'
    LIMIT 1
  `, [email]);

  console.log('Akun ditemukan:', result.rowCount === 1);

  if (result.rowCount !== 1) {
    console.log('STOP: Email tidak cocok dengan Admin Pusat.');
    process.exitCode = 1;
  } else {
    const admin = result.rows[0];

    const valid = await verifyPassword(
      admin.password_hash,
      credentials.password
    );

    credentials.password = null;

    console.log('Password cocok:', valid);
    console.log('Status aktif:', admin.status === 'active');
    console.log('Email terverifikasi:', admin.verified);

    if (valid && admin.status === 'active' && admin.verified) {
      console.log('PASS: Kredensial Admin Pusat valid.');
    } else {
      console.log('STOP: Kredensial belum valid.');
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error('STOP:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}