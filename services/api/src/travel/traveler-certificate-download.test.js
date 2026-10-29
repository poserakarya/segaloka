import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';

import {
  registerTravelerCertificateDownloadRoutes
} from './traveler-certificate-download-routes.js';

test('endpoint PDF terdaftar', async () => {
  const app = Fastify({ logger: false });

  try {
    await registerTravelerCertificateDownloadRoutes(app, {
      query: async () => ({ rows: [] })
    });

    await app.ready();

    assert.ok(
      app.hasRoute({
        method: 'GET',
        url: '/traveler/certificates/:id/pdf'
      })
    );
  } finally {
    await app.close();
  }
});

test('PDF tanpa sesi ditolak', async () => {
  const app = Fastify({ logger: false });

  try {
    await registerTravelerCertificateDownloadRoutes(app, {
      query: async () => ({ rows: [] })
    });

    const response = await app.inject({
      method: 'GET',
      url:
        '/traveler/certificates/' +
        '11111111-1111-4111-8111-111111111111/pdf'
    });

    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('ID sertifikat tidak valid ditolak', async () => {
  const app = Fastify({ logger: false });

  try {
    await registerTravelerCertificateDownloadRoutes(app, {
      query: async () => ({
        rows: [{
          session_id: 'test-session',
          user_id: 'test-user'
        }]
      })
    });

    const response = await app.inject({
      method: 'GET',
      url: '/traveler/certificates/invalid/pdf',
      headers: {
        authorization: 'Bearer ' + 'a'.repeat(64)
      }
    });

    test('PDF mensyaratkan role Traveler eksplisit', async () => {
      const app = Fastify({ logger: false });
      const calls = [];

      try {
        await registerTravelerCertificateDownloadRoutes(app, {
          query: async sql => {
            calls.push(sql);
            if (sql.includes('FROM public.auth_access_tokens')) {
              return {
                rows: [{
                  session_id: 'test-session',
                  user_id: '11111111-1111-4111-8111-111111111111'
                }]
              };
            }
            return { rows: [] };
          }
        });

        const response = await app.inject({
          method: 'GET',
          url:
            '/traveler/certificates/' +
            '11111111-1111-4111-8111-111111111111/pdf',
          headers: {
            authorization: 'Bearer ' + 'a'.repeat(64)
          }
        });

        assert.equal(response.statusCode, 403);
        assert.equal(
          calls.some(sql =>
            sql.includes('FROM public.traveler_travel_certificates tc')
          ),
          false
        );
      } finally {
        await app.close();
      }
    });

    assert.equal(response.statusCode, 400);
  } finally {
    await app.close();
  }
});