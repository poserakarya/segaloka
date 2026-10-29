import 'dotenv/config';
import Fastify from 'fastify';
import { registerRegistrationRoute } from './registration-route.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const app = Fastify({ logger: false });

let registerCalls = 0;
let limitCalls = 0;

const fakeRegister = async () => {
  registerCalls++;
  return { registered: true };
};

const fakeLimit = async (_pool, _input, operation) => {
  limitCalls++;
  return {
    allowed: true,
    result: await operation()
  };
};

const validInput = {
  email: 'strict-fields@example.invalid',
  fullName: 'Segaloka Security Test',
  password: 'SecurePassword123!'
};

try {
  await registerRegistrationRoute(app, {}, {
    register: fakeRegister,
    limit: fakeLimit
  });

  await app.ready();

  const forbiddenFields = [
    { role: 'super_admin' },
    { organizationId: '00000000-0000-0000-0000-000000000001' },
    { status: 'active' },
    { emailVerified: true },
    { email_verified_at: '2026-10-09T00:00:00Z' },
    { permissions: ['all'] },
    { isAdmin: true },
    { membership: 'super_admin' }
  ];

  for (const extra of forbiddenFields) {
    const field = Object.keys(extra)[0];

    const beforeRegister = registerCalls;
    const beforeLimit = limitCalls;

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        ...validInput,
        ...extra
      }
    });

    assert(
      response.statusCode === 400,
      `STATUS_INVALID_${field}`
    );

    const body = response.json();

    assert(
      body.code === 'REGISTRATION_EXTRA_FIELDS',
      `CODE_INVALID_${field}`
    );

    assert(
      response.headers['cache-control'] === 'no-store',
      `CACHE_CONTROL_MISSING_${field}`
    );

    assert(
      registerCalls === beforeRegister,
      `REGISTRATION_EXECUTED_${field}`
    );

    assert(
      limitCalls === beforeLimit,
      `RATE_LIMIT_EXECUTED_${field}`
    );

    console.log(`Forbidden field ${field}: PASS`);
  }

  const validResponse = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: validInput
  });

  assert(validResponse.statusCode === 202, 'VALID_STATUS_FAILED');
  assert(registerCalls === 1, 'VALID_REGISTER_NOT_EXECUTED');
  assert(limitCalls === 1, 'VALID_LIMIT_NOT_EXECUTED');

  console.log('Valid registration HTTP 202: PASS');
  console.log('Only allowed fields accepted: PASS');
  console.log('No real database operations: PASS');
  console.log('No real email delivery: PASS');
  console.log('ALL STRICT REGISTRATION FIELD TESTS PASSED');
} catch (error) {
  console.error('STRICT REGISTRATION FIELD TEST FAILED');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await app.close();
}