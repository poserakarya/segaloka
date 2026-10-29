import 'dotenv/config';
import { signIngressRequest } from '../security/ingress-identity-v3.js';

import pg from 'pg';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { hashPassword } from './password.js';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 3,
  connectionTimeoutMillis: 5000
});

const id = randomUUID();
const email = `http-login-${id}@example.invalid`;
const password = `Test-${randomUUID()}-Segaloka!`;
const url = 'http://127.0.0.1:4190/auth/login';

let fixtureCreated = false;

function assert(name, condition) {
  console.log(`${name}: ${condition ? 'PASS' : 'FAIL'}`);

  if (!condition) {
    throw new Error(`TEST_FAILED: ${name}`);
  }
}

try {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const role = await client.query(
      `SELECT id FROM public.roles WHERE code = 'traveler'`
    );

    if (role.rows.length !== 1) {
      throw new Error('TRAVELER_ROLE_NOT_FOUND');
    }

    await client.query(
      `INSERT INTO public.users
         (id, email, full_name, status, email_verified_at)
       VALUES ($1, $2, 'HTTP Login Test', 'active', now())`,
      [id, email]
    );

    await client.query(
      `INSERT INTO public.user_credentials
         (user_id, password_hash)
       VALUES ($1, $2)`,
      [id, await hashPassword(password)]
    );

    await client.query(
      `INSERT INTO public.memberships
         (user_id, role_id, organization_id)
       VALUES ($1, $2, NULL)`,
      [id, role.rows[0].id]
    );

    await client.query('COMMIT');
    fixtureCreated = true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const response = await new Promise((resolve, reject) => {
    const request = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...signIngressRequest(
            process.env.INGRESS_IDENTITY_SECRET,
            {
              ip: '127.0.0.1',
              method: 'POST',
              target: '/auth/login',
              body: Buffer.from(JSON.stringify({ email, password }))
            }
          )
        },
        timeout: 10000
      },
      incoming => {
        const chunks = [];

        incoming.on('data', chunk => chunks.push(chunk));

        incoming.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');

          resolve({
            status: incoming.statusCode,
            headers: {
              get(name) {
                return incoming.headers[name.toLowerCase()];
              }
            },
            async json() {
              return JSON.parse(body);
            }
          });
        });

        incoming.on('error', reject);
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error('HTTP_TEST_TIMEOUT'));
    });

    request.on('error', reject);
    request.end(JSON.stringify({ email, password }));
  });

  // Jangan cetak body respons karena berisi token.
  assert('HTTP login returns 200', response.status === 200);

  const data = await response.json();

  assert('Authenticated true', data.authenticated === true);
  assert('Correct user returned', data.user?.id === id);
  assert(
    'Traveler role returned',
    data.user?.memberships?.some(
      membership => membership.role === 'traveler'
    ) === true
  );

  assert(
    'Refresh token returned',
    /^[0-9a-f]{64}$/.test(data.session?.refreshToken || '')
  );

  assert(
    'No-store cache header',
    response.headers.get('cache-control') === 'no-store'
  );

  const sessions = await pool.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_sessions
     WHERE user_id = $1
       AND revoked_at IS NULL`,
    [id]
  );

  assert(
    'Session persisted in PostgreSQL',
    sessions.rows[0].total === 1
  );

  const attempts = await pool.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_attempts
     WHERE email_normalized = $1
       AND outcome = 'success'`,
    [email]
  );

  assert(
    'Login success recorded',
    attempts.rows[0].total === 1
  );

  console.log('ALL HTTP LOGIN TESTS PASSED');
} finally {
  try {
    if (fixtureCreated) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        await client.query(
          `DELETE FROM public.auth_attempts
           WHERE email_normalized = $1`,
          [email]
        );

        await client.query(
          `DELETE FROM public.auth_refresh_token_history
           WHERE user_id = $1`,
          [id]
        );

        await client.query(
          `DELETE FROM public.auth_sessions
           WHERE user_id = $1`,
          [id]
        );

        await client.query(
          `DELETE FROM public.memberships
           WHERE user_id = $1`,
          [id]
        );

        await client.query(
          `DELETE FROM public.user_credentials
           WHERE user_id = $1`,
          [id]
        );

        await client.query(
          `DELETE FROM public.users
           WHERE id = $1`,
          [id]
        );

        await client.query('COMMIT');
        console.log('TEST DATA CLEANED');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('TEST CLEANUP FAILED');
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}