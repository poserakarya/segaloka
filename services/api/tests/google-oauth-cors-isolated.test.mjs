// Kontrak CORS API memakai kebijakan yang sama dengan server.js
// (src/security/cors-policy.js) dan route exchange Google OAuth asli.
// Exchange adalah endpoint server-ke-server: tidak ada origin (diizinkan
// maupun asing) yang mendapat izin CORS ber-credential, dan request dari
// browser tidak pernah menerima token.
import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import cors from '@fastify/cors';

import { corsDelegator } from '../src/security/cors-policy.js';
import { registerGoogleOAuthExchangeRoute } from '../src/auth/google-oauth-exchange-route.js';

const BODY = JSON.stringify({ code: 'c'.repeat(64) });

async function createApp() {
  const app = Fastify();
  await app.register(cors, { delegator: corsDelegator });
  app.addHook('onRequest', async request => {
    request.verifiedClientIp = '127.0.0.1';
  });
  await registerGoogleOAuthExchangeRoute(app, {}, {
    consume: async () => { throw new Error('EXCHANGE_MUST_NOT_BE_CONSUMED_FROM_BROWSER'); }
  });
  app.get('/ordinary', async () => ({ ok: true }));
  await app.ready();
  return app;
}

const exchange = origin => ({
  method: 'POST',
  url: '/auth/google/exchange',
  headers: { origin, 'content-type': 'application/json', cookie: `segaloka_google_binding=${'d'.repeat(64)}` },
  payload: BODY
});

test('allowed origin: exchange is not credentialed and returns no token to the browser', async () => {
  const app = await createApp();
  try {
    const response = await app.inject(exchange('https://segaloka.com'));
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'GOOGLE_EXCHANGE_SERVER_ONLY');
    assert.equal(response.headers['access-control-allow-credentials'], undefined);
    assert.ok(!/accessToken|refreshToken/.test(response.body));
  } finally {
    await app.close();
  }
});

test('foreign origin receives neither CORS origin nor credentials', async () => {
  const app = await createApp();
  try {
    const response = await app.inject(exchange('https://untrusted.example'));
    assert.equal(response.statusCode, 403);
    assert.equal(response.headers['access-control-allow-origin'], undefined);
    assert.equal(response.headers['access-control-allow-credentials'], undefined);
  } finally {
    await app.close();
  }
});

test('exchange preflight never permits credentials, for any origin', async () => {
  const app = await createApp();
  try {
    for (const origin of ['https://segaloka.com', 'https://untrusted.example']) {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/auth/google/exchange',
        headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' }
      });
      assert.equal(response.headers['access-control-allow-credentials'], undefined, origin);
      if (origin === 'https://untrusted.example') {
        assert.equal(response.headers['access-control-allow-origin'], undefined);
      }
    }
  } finally {
    await app.close();
  }
});

test('ordinary endpoint: allowed origin is echoed without credentials, foreign origin is not', async () => {
  const app = await createApp();
  try {
    const allowed = await app.inject({ method: 'GET', url: '/ordinary', headers: { origin: 'https://segaloka.com' } });
    assert.equal(allowed.headers['access-control-allow-origin'], 'https://segaloka.com');
    assert.equal(allowed.headers['access-control-allow-credentials'], undefined);
    const foreign = await app.inject({ method: 'GET', url: '/ordinary', headers: { origin: 'https://untrusted.example' } });
    assert.equal(foreign.headers['access-control-allow-origin'], undefined);
  } finally {
    await app.close();
  }
});
