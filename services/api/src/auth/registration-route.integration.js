import 'dotenv/config';
import Fastify from 'fastify';
import { registerRegistrationRoute } from './registration-route.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const app = Fastify({ logger: false });

const calls = [];

const fakePool = {
  async connect() {
    return {
      async query(sql, params = []) {
        calls.push({ sql, params });

        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [], rowCount: 0 };
        }

        if (sql.includes('pg_advisory_xact_lock')) {
          return { rows: [{}], rowCount: 1 };
        }

        if (sql.includes('count(*) FILTER')) {
          return {
            rows: [{
              email_attempts: 5,
              ip_attempts: 0
            }],
            rowCount: 1
          };
        }

        if (
          sql.includes('INSERT INTO public.auth_registration_attempts') &&
          sql.includes("'blocked'")
        ) {
          return { rows: [], rowCount: 1 };
        }

        throw new Error('UNEXPECTED_SQL');
      },
      release() {}
    };
  }
};

try {
  await registerRegistrationRoute(app, fakePool);
  await app.ready();

  const validBody = {
    email: 'test@example.invalid',
    fullName: 'Test Segaloka',
    password: 'PasswordPengujian123!'
  };

  const limited = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: validBody
  });

  assert(limited.statusCode === 429, 'RATE_LIMIT_STATUS_INVALID');
  assert(
    limited.json().code === 'REGISTRATION_RATE_LIMITED',
    'RATE_LIMIT_BODY_INVALID'
  );
  assert(
    limited.headers['retry-after'] === '900',
    'RETRY_AFTER_INVALID'
  );
  assert(
    limited.headers['cache-control'] === 'no-store',
    'CACHE_CONTROL_INVALID'
  );

  console.log('HTTP 429: PASS');
  console.log('Retry-After: PASS');
  console.log('Cache-Control: PASS');

  const invalid = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      email: 'test@example.invalid',
      fullName: 'T',
      password: 'short'
    }
  });

  assert(invalid.statusCode === 400, 'VALIDATION_STATUS_INVALID');
  assert(
    invalid.headers['cache-control'] === 'no-store',
    'VALIDATION_CACHE_CONTROL_INVALID'
  );

  console.log('HTTP 400: PASS');
  console.log('Validation no-store: PASS');

  assert(
    calls.some(call => call.sql.includes('pg_advisory_xact_lock')),
    'REGISTRATION_LOCK_NOT_CALLED'
  );

  console.log('Database advisory lock: PASS');
  console.log('ISOLATED REGISTRATION HTTP TESTS PASSED');
} catch (error) {
  console.error('ISOLATED REGISTRATION HTTP TESTS FAILED');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await app.close();
}