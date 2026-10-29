import 'dotenv/config';
import pg from 'pg';
import { hashPassword } from '../src/auth/password.js';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true',
  max: 1
});

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }

  const input = Buffer.concat(chunks);
  chunks.forEach(chunk => chunk.fill(0));

  let password;
  try {
    password = input.toString('utf8');
  } finally {
    input.fill(0);
  }

  const hash = await hashPassword(password);
  password = null;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const admin = await client.query(`
      SELECT u.id
      FROM public.users u
      JOIN public.memberships m ON m.user_id = u.id
      JOIN public.roles r ON r.id = m.role_id
      WHERE r.code = 'super_admin'
      FOR UPDATE OF u
    `);

    if (admin.rowCount !== 1) {
      throw new Error('EXPECTED_ONE_SUPER_ADMIN');
    }

    const userId = admin.rows[0].id;

    const updated = await client.query(`
      UPDATE public.user_credentials
      SET password_hash = $1
      WHERE user_id = $2
    `, [hash, userId]);

    if (updated.rowCount !== 1) {
      throw new Error('CREDENTIAL_UPDATE_FAILED');
    }

    // Hapus token akses dan sesi lama secara transaksional.
    await client.query(`
      DELETE FROM public.auth_access_tokens
      WHERE session_id IN (
        SELECT id FROM public.auth_sessions
        WHERE user_id = $1
      )
    `, [userId]);

    await client.query(`
      DELETE FROM public.auth_sessions
      WHERE user_id = $1
    `, [userId]);

    await client.query(`
      INSERT INTO public.audit_logs
        (actor_user_id, action, entity_type, entity_id)
      VALUES ($1, 'auth.password_rotated', 'user', $1)
    `, [userId]);

    await client.query('COMMIT');

    console.log('PASS: Password Admin Pusat berhasil diganti.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

try {
  await main();
} catch (error) {
  console.error('STOP:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}