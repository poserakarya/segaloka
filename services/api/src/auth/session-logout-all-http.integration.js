import 'dotenv/config';
import { signIngressRequest } from '../security/ingress-identity-v3.js';

import http from 'node:http';
import pg from 'pg';
import { randomUUID, createHash } from 'node:crypto';
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
const email = `session-http-${id}@example.invalid`;
const password = `Test-${randomUUID()}-Segaloka!`;
const baseUrl = `http://127.0.0.1:${process.env.API_PORT}`;

const otherId = randomUUID();
const otherEmail = `session-other-${otherId}@example.invalid`;
const otherPassword = `Test-${randomUUID()}-Segaloka!`;

let fixtureCreated = false;

function assert(name, condition) {
  console.log(`${name}: ${condition ? 'PASS' : 'FAIL'}`);

  if (!condition) {
    throw new Error(`TEST_FAILED: ${name}`);
  }
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function post(path, body, accessToken = null) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      `${baseUrl}${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...signIngressRequest(
            process.env.INGRESS_IDENTITY_SECRET,
            {
              ip: '127.0.0.1',
              method: 'POST',
              target: path,
              body: Buffer.from(JSON.stringify(body))
            }
          )
        },
        timeout: 10000
      },
      response => {
        const chunks = [];

        response.on('data', chunk => chunks.push(chunk));

        response.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let data;

          try {
            data = JSON.parse(raw);
          } catch {
            reject(new Error('INVALID_JSON_RESPONSE'));
            return;
          }

          resolve({
            status: response.statusCode,
            cacheControl: response.headers['cache-control'],
            data
          });
        });

        response.on('error', reject);
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error('HTTP_TEST_TIMEOUT'));
    });

    request.on('error', reject);
    request.end(JSON.stringify(body));
  });
}

async function getMe(accessToken) {
  return new Promise((resolve, reject) => {
    const path = '/auth/me';

    const request = http.request(
      `${baseUrl}${path}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...signIngressRequest(
            process.env.INGRESS_IDENTITY_SECRET,
            {
              ip: '127.0.0.1',
              method: 'GET',
              target: path,
              body: Buffer.alloc(0)
            }
          )
        },
        timeout: 10000
      },
      response => {
        const chunks = [];

        response.on('data', chunk => chunks.push(chunk));
        response.on('error', reject);

        response.on('end', () => {
          try {
            resolve({
              status: response.statusCode,
              cacheControl: response.headers['cache-control'],
              data: JSON.parse(Buffer.concat(chunks).toString('utf8'))
            });
          } catch {
            reject(new Error('INVALID_ME_JSON_RESPONSE'));
          }
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error('HTTP_ME_TIMEOUT'));
    });

    request.on('error', reject);
    request.end();
  });
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
       VALUES ($1, $2, 'Session HTTP Test', 'active', now())`,
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

    await client.query(
      `INSERT INTO public.users
         (id, email, full_name, status, email_verified_at)
       VALUES ($1, $2, 'Session Other Test', 'active', now())`,
      [otherId, otherEmail]
    );

    await client.query(
      `INSERT INTO public.user_credentials
         (user_id, password_hash)
       VALUES ($1, $2)`,
      [otherId, await hashPassword(otherPassword)]
    );

    await client.query(
      `INSERT INTO public.memberships
         (user_id, role_id, organization_id)
       VALUES ($1, $2, NULL)`,
      [otherId, role.rows[0].id]
    );

    await client.query('COMMIT');
    fixtureCreated = true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  console.log('\n=== LOGIN THREE SESSIONS ===');

  const loginA1 = await post('/auth/login', { email, password });
  const loginA2 = await post('/auth/login', { email, password });
  const loginB = await post('/auth/login', {
    email: otherEmail,
    password: otherPassword
  });

  assert('Login A1 HTTP 200', loginA1.status === 200);
  assert('Login A2 HTTP 200', loginA2.status === 200);
  assert('Login B HTTP 200', loginB.status === 200);

  const a1 = loginA1.data.session;
  const a2 = loginA2.data.session;
  const b = loginB.data.session;

  assert('Three distinct session IDs',
    new Set([a1.sessionId, a2.sessionId, b.sessionId]).size === 3);

  assert('Access A1 active', (await getMe(a1.accessToken)).status === 200);
  assert('Access A2 active', (await getMe(a2.accessToken)).status === 200);
  assert('Access B active', (await getMe(b.accessToken)).status === 200);

  console.log('\n=== LOGOUT ALL USER A ===');

  const logout = await post(
    '/auth/logout-all',
    {},
    a1.accessToken
  );

  assert('Logout-all HTTP 200', logout.status === 200);
  assert('Logout-all success', logout.data.success === true);
  assert('Two sessions revoked', logout.data.revokedCount === 2);

  console.log('\n=== DATABASE VERIFICATION ===');

  const sessionsA = await pool.query(
    `SELECT id, revoked_at
     FROM public.auth_sessions
     WHERE user_id = $1`,
    [id]
  );

  const sessionsB = await pool.query(
    `SELECT id, revoked_at
     FROM public.auth_sessions
     WHERE user_id = $1`,
    [otherId]
  );

  assert('User A has two sessions', sessionsA.rows.length === 2);
  assert('All A sessions revoked',
    sessionsA.rows.every(row => row.revoked_at !== null));

  assert('User B has one session', sessionsB.rows.length === 1);
  assert('User B session active',
    sessionsB.rows[0].revoked_at === null);
  console.log('\n=== ACCESS TOKEN VERIFICATION ===');

  assert('Access A1 rejected',
    (await getMe(a1.accessToken)).status === 401);

  assert('Access A2 rejected',
    (await getMe(a2.accessToken)).status === 401);

  assert('Access B remains valid',
    (await getMe(b.accessToken)).status === 200);

  console.log('\n=== REFRESH TOKEN VERIFICATION ===');

  const refreshA1 = await post('/auth/refresh', {
    refreshToken: a1.refreshToken
  });

  const refreshA2 = await post('/auth/refresh', {
    refreshToken: a2.refreshToken
  });

  const refreshB = await post('/auth/refresh', {
    refreshToken: b.refreshToken
  });

  assert('Refresh A1 rejected', refreshA1.status === 401);
  assert('Refresh A2 rejected', refreshA2.status === 401);
  assert('Refresh B HTTP 200', refreshB.status === 200);

  assert('Refreshed B access valid',
    (await getMe(refreshB.data.session.accessToken)).status === 200);

  console.log('\nQ8-FH311N ALL HTTP TESTS PASSED');
} finally {
  try {
    if (fixtureCreated) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        await client.query(
          `DELETE FROM public.auth_attempts
           WHERE email_normalized IN ($1, $2)`,
          [email, otherEmail]
        );

        await client.query(
          `DELETE FROM public.auth_refresh_token_history
           WHERE user_id = ANY($1::uuid[])`,
          [[id, otherId]]
        );

        await client.query(
          `DELETE FROM public.auth_sessions
           WHERE user_id = ANY($1::uuid[])`,
          [[id, otherId]]
        );

        await client.query(
          `DELETE FROM public.memberships
           WHERE user_id = ANY($1::uuid[])`,
          [[id, otherId]]
        );

        await client.query(
          `DELETE FROM public.user_credentials
           WHERE user_id = ANY($1::uuid[])`,
          [[id, otherId]]
        );

        await client.query(
          `DELETE FROM public.users
           WHERE id = ANY($1::uuid[])`,
          [[id, otherId]]
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