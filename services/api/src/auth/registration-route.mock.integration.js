import Fastify from 'fastify';
import { registerRegistrationRoute } from './registration-route.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const payload = {
  email: 'registration-test@example.invalid',
  fullName: 'Segaloka Test',
  password: 'PasswordPengujian123!'
};

async function testScenario(mode) {
  const app = Fastify({ logger: false });

  let registrationCalls = 0;
  let limitCalls = 0;

  const register = async () => {
    registrationCalls++;

    if (mode === 'duplicate') {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }

    if (mode === 'failure') {
      throw new Error('SIMULATED_FAILURE');
    }

    return {
      registered: true,
      emailVerificationRequired: true,
      emailDelivery: 'accepted'
    };
  };

  const limit = async (_pool, options, operation) => {
    limitCalls++;

    assert(
      options.email === payload.email,
      'LIMIT_EMAIL_MISMATCH'
    );

    if (mode === 'blocked') {
      return {
        allowed: false,
        retryAfterSeconds: 900
      };
    }

    return {
      allowed: true,
      result: await operation()
    };
  };

  try {
    await registerRegistrationRoute(
      app,
      {},
      { register, limit }
    );

    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload
    });

    return {
      statusCode: response.statusCode,
      body: response.body,
      headers: response.headers,
      registrationCalls,
      limitCalls
    };
  } finally {
    await app.close();
  }
}

try {
  const success = await testScenario('success');

  assert(success.statusCode === 202, 'SUCCESS_NOT_202');
  assert(success.registrationCalls === 1, 'SUCCESS_CALL_COUNT');
  assert(success.limitCalls === 1, 'SUCCESS_LIMIT_NOT_CALLED');
  assert(
    success.headers['cache-control'] === 'no-store',
    'SUCCESS_CACHE_INVALID'
  );

  console.log('New registration HTTP 202: PASS');

  const duplicate = await testScenario('duplicate');

  assert(duplicate.statusCode === 202, 'DUPLICATE_NOT_202');
  assert(duplicate.registrationCalls === 1, 'DUPLICATE_CALL_COUNT');
  assert(
    duplicate.body === success.body,
    'EMAIL_ENUMERATION_RESPONSE_MISMATCH'
  );

  console.log('Duplicate email HTTP 202: PASS');
  console.log('Identical public response: PASS');

  const blocked = await testScenario('blocked');

  assert(blocked.statusCode === 429, 'BLOCKED_NOT_429');
  assert(blocked.registrationCalls === 0, 'BLOCKED_REGISTER_CALLED');
  assert(
    blocked.headers['retry-after'] === '900',
    'BLOCKED_RETRY_AFTER_INVALID'
  );
  assert(
    blocked.headers['cache-control'] === 'no-store',
    'BLOCKED_CACHE_INVALID'
  );

  console.log('Blocked HTTP 429: PASS');
  console.log('Blocked request does not register: PASS');

  const failure = await testScenario('failure');

  assert(failure.statusCode === 500, 'FAILURE_NOT_500');
  assert(
    failure.headers['cache-control'] === 'no-store',
    'FAILURE_CACHE_INVALID'
  );

  console.log('Unexpected error HTTP 500: PASS');

  console.log('No real database operations: PASS');
  console.log('No real email delivery: PASS');
  console.log('ALL REGISTRATION MOCK HTTP TESTS PASSED');
} catch (error) {
  console.error('REGISTRATION MOCK HTTP TESTS FAILED');
  console.error(error.message);
  process.exitCode = 1;
}