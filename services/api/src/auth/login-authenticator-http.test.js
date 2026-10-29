import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';

import {
  registerLoginAuthenticatorVerifyRoute
} from './login-authenticator-verify-route.js';

const path = '/auth/login/verify-authenticator';

test('TOTP HTTP rejects invalid request body', async () => {
  const app = Fastify({ logger: false });

  const pool = {
    async connect() {
      throw new Error('DATABASE_MUST_NOT_BE_ACCESSED');
    }
  };

  try {
    await registerLoginAuthenticatorVerifyRoute(app, pool);
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: path,
      payload: {
        preAuthTicket: 'invalid',
        code: '123456'
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.headers['cache-control'], undefined);
  } finally {
    await app.close();
  }
});

test('TOTP HTTP returns 503 when reservation fails', async () => {
  const app = Fastify({ logger: false });

  const pool = {
    async connect() {
      throw new Error('DATABASE_CONNECTION_UNAVAILABLE');
    }
  };

  try {
    await registerLoginAuthenticatorVerifyRoute(app, pool);
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: path,
      payload: {
        preAuthTicket: 'a'.repeat(64),
        code: '123456'
      }
    });

    assert.equal(response.statusCode, 503);

    const body = response.json();

    assert.equal(body.authenticated, false);
    assert.equal(body.code, 'VERIFICATION_UNAVAILABLE');
    assert.equal(response.headers['cache-control'], 'no-store');
  } finally {
    await app.close();
  }
});
test('TOTP HTTP returns 503 when second connection fails', async () => {
  const app = Fastify({ logger: false });

  const originalSecret = process.env.AUTH_IP_HASH_SECRET;

  process.env.AUTH_IP_HASH_SECRET = 'ab'.repeat(32);

  let connectionCount = 0;
  let reservationCommitted = false;

  const pool = {
    async connect() {
      connectionCount++;

      if (connectionCount === 2) {
        throw new Error('SECOND_CONNECTION_UNAVAILABLE');
      }

      return {
        async query(sql) {
          if (
            sql.includes('INSERT INTO public.auth_login_otp_attempts') &&
            sql.includes("'reserved'")
          ) {
            return {
              rows: [{ id: 999001 }],
              rowCount: 1
            };
          }

          if (sql.includes('count(*)')) {
            return {
              rows: [{ total: 0 }],
              rowCount: 1
            };
          }

          if (sql === 'COMMIT') {
            reservationCommitted = true;
          }

          return {
            rows: [],
            rowCount: 0
          };
        },
        release() {}
      };
    }
  };

  try {
    await registerLoginAuthenticatorVerifyRoute(app, pool);
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: path,
      payload: {
        preAuthTicket: 'a'.repeat(64),
        code: '123456'
      }
    });

    assert.equal(connectionCount, 2);
    assert.equal(reservationCommitted, true);
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().authenticated, false);
    assert.equal(
      response.json().code,
      'VERIFICATION_UNAVAILABLE'
    );
    assert.equal(
      response.headers['cache-control'],
      'no-store'
    );
  } finally {
    if (originalSecret === undefined) {
      delete process.env.AUTH_IP_HASH_SECRET;
    } else {
      process.env.AUTH_IP_HASH_SECRET = originalSecret;
    }

    await app.close();
  }
});