import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';

import { registerGoogleOAuthExchangeRoute } from './google-oauth-exchange-route.js';

const CODE = 'c'.repeat(64);
const BINDING = 'd'.repeat(64);
const ACCESS = 'a'.repeat(64);
const REFRESH = 'b'.repeat(64);

// Payload terdekripsi seperti yang disimpan createGoogleOAuthExchange.
const STORED = {
  authenticated: true,
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'pengguna@example.invalid',
    fullName: 'Nama Pribadi',
    memberships: [{ role: 'traveler', organizationId: null }]
  },
  session: {
    sessionId: '22222222-2222-4222-8222-222222222222',
    accessToken: ACCESS,
    refreshToken: REFRESH,
    tokenType: 'Bearer',
    expiresIn: 900,
    accessTokenExpiresAt: '2026-10-30T12:15:00.000Z'
  }
};

async function appWith({ verified = true, consume }) {
  const app = Fastify();
  app.addHook('onRequest', async request => {
    request.verifiedClientIp = verified ? '127.0.0.1' : undefined;
  });
  const calls = [];
  await registerGoogleOAuthExchangeRoute(app, {}, {
    consume: async (pool, input) => {
      calls.push(input);
      return consume ? consume(input) : STORED;
    }
  });
  await app.ready();
  return { app, calls };
}

const request = (headers = {}) => ({
  method: 'POST',
  url: '/auth/google/exchange',
  headers: { 'content-type': 'application/json', cookie: `segaloka_google_binding=${BINDING}`, ...headers },
  payload: JSON.stringify({ code: CODE })
});

test('server-to-server exchange returns only the minimum session fields', async () => {
  const { app, calls } = await appWith({});
  try {
    const response = await app.inject(request());
    assert.equal(response.statusCode, 200);
    assert.deepEqual(calls, [{ code: CODE, browserBinding: BINDING }]);
    assert.deepEqual(response.json(), {
      authenticated: true,
      user: { id: STORED.user.id },
      session: {
        accessToken: ACCESS,
        refreshToken: REFRESH,
        tokenType: 'Bearer',
        expiresIn: 900,
        accessTokenExpiresAt: '2026-10-30T12:15:00.000Z'
      }
    });
    for (const secret of ['sessionId', STORED.session.sessionId, 'pengguna@example.invalid', 'Nama Pribadi', 'memberships']) {
      assert.ok(!response.body.includes(secret), `respons memuat ${secret}`);
    }
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers.pragma, 'no-cache');
    assert.match(response.headers['set-cookie'], /^segaloka_google_binding=; .*Max-Age=0; .*HttpOnly; Secure/);
  } finally {
    await app.close();
  }
});

test('browser-originated requests never receive tokens and do not consume the code', async () => {
  const { app, calls } = await appWith({});
  try {
    for (const origin of ['https://segaloka.com', 'https://untrusted.example', 'null']) {
      const response = await app.inject(request({ origin }));
      assert.equal(response.statusCode, 403, origin);
      assert.equal(response.json().code, 'GOOGLE_EXCHANGE_SERVER_ONLY');
      assert.ok(!response.body.includes(ACCESS) && !response.body.includes(REFRESH));
    }
    assert.equal(calls.length, 0);
  } finally {
    await app.close();
  }
});

test('requests without verified ingress identity are rejected before consuming the code', async () => {
  const { app, calls } = await appWith({ verified: false });
  try {
    const response = await app.inject(request());
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'GOOGLE_EXCHANGE_INGRESS_REQUIRED');
    assert.equal(calls.length, 0);
  } finally {
    await app.close();
  }
});

test('missing binding cookie and invalid codes are rejected without tokens', async () => {
  const { app } = await appWith({ consume: () => null });
  try {
    const noBinding = await app.inject(request({ cookie: '' }));
    assert.equal(noBinding.statusCode, 401);
    assert.equal(noBinding.json().code, 'GOOGLE_EXCHANGE_BINDING_MISSING');

    const invalid = await app.inject(request());
    assert.equal(invalid.statusCode, 401);
    assert.equal(invalid.json().code, 'INVALID_OR_EXPIRED_GOOGLE_EXCHANGE');
    assert.equal(invalid.headers['set-cookie'], undefined);
  } finally {
    await app.close();
  }
});
