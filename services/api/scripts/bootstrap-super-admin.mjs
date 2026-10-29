import 'dotenv/config';
import pg from 'pg';
import { hashPassword, validatePassword } from '../src/auth/password.js';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true',
  max: 1,
  connectionTimeoutMillis: 5000
});

const rl = createInterface({
  input: stdin,
  output: stdout
});

async function main() {
  const email = (
    await rl.question('Email Admin Pusat: ')
  ).trim().toLowerCase();

  const fullName = (
    await rl.question('Nama lengkap: ')
  ).trim();

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error('INVALID_EMAIL');
  }

  if (fullName.length < 2 || fullName.length > 150) {
    throw new Error('INVALID_FULL_NAME');
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('INTERACTIVE_TERMINAL_REQUIRED');
  }

  rl.pause();

  stdout.write('Password Admin Pusat: ');

  const password = await new Promise((resolve, reject) => {
    let value = '';

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function cleanup() {
      stdin.setRawMode(false);
      stdin.removeListener('data', onData);
      stdout.write('\n');
    }

    function onData(chunk) {
      for (const character of chunk) {
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value);
          return;
        }

        if (character === '\u0003') {
          cleanup();
          reject(new Error('CANCELLED'));
          return;
        }

        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          continue;
        }

        value += character;
      }
    }

    stdin.on('data', onData);
  });

  rl.close();

  const validation = validatePassword(password);

  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const passwordHash = await hashPassword(password);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Serialize concurrent bootstrap attempts.
    await client.query(
      'SELECT pg_advisory_xact_lock($1, $2)',
      [73642, 1001]
    );

    const existingAdmin = await client.query(
      `SELECT u.id
       FROM public.memberships m
       JOIN public.roles r ON r.id = m.role_id
       JOIN public.users u ON u.id = m.user_id
       WHERE r.code = 'super_admin'
       LIMIT 1`
    );

    if (existingAdmin.rowCount > 0) {
      throw new Error('SUPER_ADMIN_ALREADY_EXISTS');
    }

    const existingEmail = await client.query(
      `SELECT id
       FROM public.users
       WHERE lower(email) = $1
       LIMIT 1`,
      [email]
    );

    if (existingEmail.rowCount > 0) {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }

    const role = await client.query(
      `SELECT id
       FROM public.roles
       WHERE code = 'super_admin'
       LIMIT 1`
    );

    if (role.rowCount !== 1) {
      throw new Error('SUPER_ADMIN_ROLE_NOT_FOUND');
    }

    const created = await client.query(
      `INSERT INTO public.users
         (email, full_name, status, email_verified_at)
       VALUES ($1, $2, 'active', now())
       RETURNING id`,
      [email, fullName]
    );

    const userId = created.rows[0].id;

    await client.query(
      `INSERT INTO public.user_credentials
         (user_id, password_hash)
       VALUES ($1, $2)`,
      [userId, passwordHash]
    );

    await client.query(
      `INSERT INTO public.memberships
         (user_id, role_id)
       VALUES ($1, $2)`,
      [userId, role.rows[0].id]
    );

    await client.query(
      `INSERT INTO public.audit_logs
         (actor_user_id, action, entity_type, entity_id)
       VALUES ($1, $2, $3, $4)`,
      [
        userId,
        'bootstrap.super_admin.created',
        'user',
        userId
      ]
    );

    await client.query('COMMIT');

    console.log('PASS: Admin Pusat berhasil dibuat.');
    console.log('Role: super_admin');
    console.log('Email: ' + email);
    console.log('Status: active');
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
  rl.close();
  await pool.end();
}