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

  console.log('\n=== LOGIN DEVICE A AND B ===');

  const loginA = await post('/auth/login', { email, password });
  const loginB = await post('/auth/login', { email, password });

  assert('Login A HTTP 200', loginA.status === 200);
  assert('Login B HTTP 200', loginB.status === 200);

  const a = loginA.data.session;
  const b = loginB.data.session;

  assert('Session A exists', !!a?.sessionId);
  assert('Session B exists', !!b?.sessionId);
  assert('Session IDs distinct', a.sessionId !== b.sessionId);

  assert('Access A valid format',
    /^[0-9a-f]{64}$/.test(a.accessToken || ''));

  assert('Access B valid format',
    /^[0-9a-f]{64}$/.test(b.accessToken || ''));

  const meA = await getMe(a.accessToken);
  const meB = await getMe(b.accessToken);

  assert('Access A HTTP 200', meA.status === 200);
  assert('Access B HTTP 200', meB.status === 200);
  assert('Identity A correct', meA.data.user?.id === id);
  assert('Identity B correct', meB.data.user?.id === id);

  console.log('\n=== ROTATE SESSION A ===');

  const rotated = await post('/auth/refresh', {
    refreshToken: a.refreshToken
  });

  assert('Refresh A HTTP 200', rotated.status === 200);

  const currentA = rotated.data.session;

  assert('Session A ID preserved',
    currentA?.sessionId === a.sessionId);

  assert('Refresh token A rotated',
    currentA?.refreshToken !== a.refreshToken);

  const rotatedMeA = await getMe(currentA.accessToken);

  assert('Rotated access A HTTP 200',
    rotatedMeA.status === 200);

  console.log('\n=== DELAYED REPLAY A ===');

  await new Promise(resolve => setTimeout(resolve, 2500));

  const replay = await post('/auth/refresh', {
    refreshToken: a.refreshToken
  });

  assert('Old refresh A rejected HTTP 401',
    replay.status === 401);

  console.log('\n=== POSTGRESQL SESSION STATE ===');

  const sessions = await pool.query(
    `SELECT id, revoked_at
     FROM public.auth_sessions
     WHERE user_id = $1`,
    [id]
  );

  assert('Exactly two sessions',
    sessions.rows.length === 2);

  const stateA = sessions.rows.find(
    row => row.id === a.sessionId
  );

  const stateB = sessions.rows.find(
    row => row.id === b.sessionId
  );

  assert('Session A revoked',
    !!stateA?.revoked_at);

  assert('Session B remains active',
    stateB?.revoked_at === null);

  const replayHistory = await pool.query(
    `SELECT count(*)::integer AS total
     FROM public.auth_refresh_token_history
     WHERE session_id = $1
       AND replay_detected_at IS NOT NULL`,
    [a.sessionId]
  );

  assert('Replay A recorded in PostgreSQL',
    replayHistory.rows[0].total === 1);

  console.log('\n=== ACCESS TOKEN ISOLATION ===');

  const originalAccessA = await getMe(a.accessToken);
  const rotatedAccessA = await getMe(currentA.accessToken);
  const survivingAccessB = await getMe(b.accessToken);

  assert('Original access A rejected HTTP 401',
    originalAccessA.status === 401);

  assert('Rotated access A rejected HTTP 401',
    rotatedAccessA.status === 401);

  assert('Access B remains HTTP 200',
    survivingAccessB.status === 200);

  assert('Access B identity correct',
    survivingAccessB.data.user?.id === id);

  console.log('\n=== REFRESH TOKEN ISOLATION ===');

  const rejectedCurrentA = await post('/auth/refresh', {
    refreshToken: currentA.refreshToken
  });

  assert('Current refresh A rejected HTTP 401',
    rejectedCurrentA.status === 401);

  const refreshB = await post('/auth/refresh', {
    refreshToken: b.refreshToken
  });

  assert('Refresh B HTTP 200',
    refreshB.status === 200);

  assert('Session B ID preserved',
    refreshB.data.session?.sessionId === b.sessionId);

  const finalAccessB = await getMe(
    refreshB.data.session?.accessToken
  );

  assert('New access B HTTP 200',
    finalAccessB.status === 200);

  assert('New access B identity correct',
    finalAccessB.data.user?.id === id);

  console.log('\nQ8-FH310B ALL HTTP TESTS PASSED');
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