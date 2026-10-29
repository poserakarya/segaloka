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
const baseUrl = 'http://127.0.0.1:4190';

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

async function post(path, body) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      `${baseUrl}${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

    await client.query('COMMIT');
    fixtureCreated = true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  console.log('=== LOGIN ===');

  const login = await post('/auth/login', {
    email,
    password
  });

  assert('Login HTTP 200', login.status === 200);
  assert('Login authenticated', login.data.authenticated === true);
  const issuedSessionId = login.data.session?.sessionId;

  assert(
    'Login session ID valid',
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(issuedSessionId || '')
  );

  const loginIdentity = await pool.query(
    `SELECT user_id, revoked_at
     FROM public.auth_sessions
     WHERE id = $1`,
    [issuedSessionId]
  );

  assert(
    'Correct user',
    loginIdentity.rows.length === 1 &&
      loginIdentity.rows[0].user_id === id &&
      loginIdentity.rows[0].revoked_at === null
  );

  const loginAccessToken = login.data.session?.accessToken;

  assert(
    'Login access token valid',
    /^[0-9a-f]{64}$/.test(loginAccessToken || '')
  );

  const meAfterLogin = await getMe(loginAccessToken);

  assert('Login access token HTTP 200', meAfterLogin.status === 200);
  assert('Login access token correct user', meAfterLogin.data.user?.id === id);
  const firstToken = login.data.session?.refreshToken;

  assert(
    'First refresh token valid',
    /^[0-9a-f]{64}$/.test(firstToken || '')
  );

  console.log('');
  console.log('=== REFRESH ===');

  const refresh = await post('/auth/refresh', {
    refreshToken: firstToken
  });

  assert('Refresh HTTP 200', refresh.status === 200);
  assert(
    'Refresh authenticated',
    refresh.data.authenticated === true
  );

  const refreshAccessToken = refresh.data.session?.accessToken;

  assert(
    'Refresh access token valid',
    /^[0-9a-f]{64}$/.test(refreshAccessToken || '')
  );

  const meAfterRefresh = await getMe(refreshAccessToken);

  assert('Refresh access token HTTP 200', meAfterRefresh.status === 200);
  assert('Refresh access token correct user', meAfterRefresh.data.user?.id === id);
  const secondToken = refresh.data.session?.refreshToken;

  assert(
    'Second refresh token valid',
    /^[0-9a-f]{64}$/.test(secondToken || '')
  );

  assert('Token rotated', secondToken !== firstToken);

  assert(
    'Session ID preserved',
    refresh.data.session?.sessionId ===
      login.data.session?.sessionId
  );

  assert(
    'Refresh cache disabled',
    refresh.cacheControl === 'no-store'
  );

  const stored = await pool.query(
    `SELECT refresh_token_hash, revoked_at
     FROM public.auth_sessions
     WHERE id = $1
       AND user_id = $2`,
    [login.data.session.sessionId, id]
  );

  assert('Exactly one session', stored.rows.length === 1);

  assert(
    'New token hash persisted',
    stored.rows[0].refresh_token_hash ===
      tokenHash(secondToken)
  );

  assert(
    'Session still active',
    stored.rows[0].revoked_at === null
  );

  console.log('');
  console.log('=== OLD TOKEN REJECTION ===');

  const oldTokenAttempt = await post('/auth/refresh', {
    refreshToken: firstToken
  });

  assert(
    'Old token rejected HTTP 401',
    oldTokenAttempt.status === 401
  );

  console.log('');
  console.log('=== LOGOUT ===');

  const logout = await post('/auth/logout', {
    refreshToken: secondToken
  });

  assert('Logout HTTP 200', logout.status === 200);
  assert('Logout success', logout.data.success === true);

  const revoked = await pool.query(
    `SELECT revoked_at
     FROM public.auth_sessions
     WHERE id = $1
       AND user_id = $2`,
    [login.data.session.sessionId, id]
  );

  assert(
    'Session revoked in PostgreSQL',
    revoked.rows.length === 1 &&
      revoked.rows[0].revoked_at !== null
  );

  const meAfterLogoutLoginToken = await getMe(loginAccessToken);
  const meAfterLogoutRefreshToken = await getMe(refreshAccessToken);

  assert(
    'Login access token revoked HTTP 401',
    meAfterLogoutLoginToken.status === 401
  );

  assert(
    'Refresh access token revoked HTTP 401',
    meAfterLogoutRefreshToken.status === 401
  );
  const afterLogout = await post('/auth/refresh', {
    refreshToken: secondToken
  });

  assert(
    'Logged-out token rejected HTTP 401',
    afterLogout.status === 401
  );

  const repeatedLogout = await post('/auth/logout', {
    refreshToken: secondToken
  });

  assert(
    'Repeated logout idempotent HTTP 200',
    repeatedLogout.status === 200
  );

  console.log('');
  console.log('ALL SESSION HTTP TESTS PASSED');
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