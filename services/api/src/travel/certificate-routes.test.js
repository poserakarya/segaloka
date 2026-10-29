import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerTravelerCertificateRoutes } from './certificate-routes.js';

function makePool() {
  return {
    async query(sql, params) {
      if (sql.includes('auth_access_tokens')) {
        return { rows: [] };
      }

      if (sql.includes('FROM public.documents doc')) {
        return { rows: [] };
      }

      return { rows: [] };
    },
    async connect() {
      return {
        query: async () => ({ rows: [] }),
        release() {}
      };
    }
  };
}

async function makeApp() {
  const app = Fastify();
  await registerTravelerCertificateRoutes(app, makePool());
  await app.ready();
  return app;
}

test('penerbitan sertifikat tanpa sesi ditolak', async () => {
  const app = await makeApp();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/travel/participants/11111111-1111-4111-8111-111111111111/certificate'
    });

    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('verifikasi menolak format token tidak valid', async () => {
  const app = await makeApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/certificates/verify/invalid-token'
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().valid, false);
  } finally {
    await app.close();
  }
});

test('verifikasi menolak sertifikat tidak ditemukan', async () => {
  const app = await makeApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/certificates/verify/' + 'a'.repeat(64)
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().valid, false);
  } finally {
    await app.close();
  }
});