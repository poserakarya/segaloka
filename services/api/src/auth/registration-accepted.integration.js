import 'dotenv/config';
import Fastify from 'fastify';
import { registerRegistrationRoute } from './registration-route.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makePool(mode) {
  let attemptId = 0;

  const client = {
    async query(sql) {
      if (
        sql === 'BEGIN' ||
        sql === 'COMMIT' ||
        sql === 'ROLLBACK'
      ) {
        return { rows: [], rowCount: 0 };
      }

      if (sql.includes('pg_advisory_xact_lock')) {
        return { rows: [{}], rowCount: 1 };
      }

      if (sql.includes('count(*) FILTER')) {
        return {
          rows: [{
            email_attempts: 0,
            ip_attempts: 0
          }]
        };
      }

      if (
        sql.includes('INSERT INTO public.auth_registration_attempts') &&
        sql.includes('RETURNING id')
      ) {
        attemptId += 1;
        return {
          rows: [{ id: attemptId }],
          rowCount: 1
        };
      }

      if (sql.includes('INSERT INTO public.users')) {
        if (mode === 'duplicate') {
          const error = new Error('DUPLICATE');
          error.code = '23505';
          throw error;
        }

        return {
          rows: [{ id: '00000000-0000-4000-8000-000000000001' }],
          rowCount: 1
        };
      }

      if (sql.includes('INSERT INTO public.user_credentials')) {
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes('INSERT INTO public.memberships')) {
        return {
          rows: [{ id: '00000000-0000-4000-8000-000000000002' }],
          rowCount: 1
        };
      }

      if (sql.includes('INSERT INTO public.email_verifications')) {
        return { rows: [], rowCount: 1 };
      }

      throw new Error('UNEXPECTED_SQL');
    },
    release() {}
  };

  return {
    async connect() {
      return client;
    },
    async query(sql) {
      if (
        sql.includes('UPDATE public.auth_registration_attempts')
      ) {
        return { rows: [], rowCount: 1 };
      }

      throw new Error('UNEXPECTED_POOL_SQL');
    }
  };
}

async function testMode(mode) {
  const app = Fastify({ logger: false });

  try {
    await registerRegistrationRoute(app, makePool(mode));
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'registration-test@example.invalid',
        fullName: 'Segaloka Test',
        password: 'PasswordPengujian123!'
      }
    });

    return {
      statusCode: response.statusCode,
      body: response.body,
      cacheControl: response.headers['cache-control']
    };
  } finally {
    await app.close();
  }
}

try {
  const duplicate = await testMode('duplicate');

  assert(
    duplicate.statusCode === 202,
    'DUPLICATE_STATUS_NOT_202'
  );

  assert(
    duplicate.cacheControl === 'no-store',
    'DUPLICATE_CACHE_CONTROL_INVALID'
  );

  console.log('Duplicate HTTP 202: PASS');

  const accepted = await testMode('new');

  assert(
    accepted.statusCode === 202,
    'NEW_REGISTRATION_STATUS_NOT_202'
  );

  assert(
    accepted.cacheControl === 'no-store',
    'NEW_REGISTRATION_CACHE_CONTROL_INVALID'
  );

  assert(
    accepted.body === duplicate.body,
    'EMAIL_ENUMERATION_RESPONSE_MISMATCH'
  );

  console.log('New registration HTTP 202: PASS');
  console.log('Identical public response: PASS');
  console.log('REGISTRATION ANTI-ENUMERATION TESTS PASSED');
} catch (error) {
  console.error('REGISTRATION ANTI-ENUMERATION TESTS FAILED');
  console.error(error.message);
  process.exitCode = 1;
}