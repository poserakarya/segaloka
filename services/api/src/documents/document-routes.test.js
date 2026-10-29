import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerDocumentRoutes } from './document-routes.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'a'.repeat(64);

function createPool({ authenticated = true, member = true } = {}) {
  return {
    async query(sql) {
      if (sql.includes('FROM public.auth_access_tokens')) {
        return {
          rows: authenticated
            ? [{ user_id: USER_ID, session_id: 'session-1' }]
            : []
        };
      }

      if (sql.includes('FROM public.memberships')) {
        return { rows: member ? [{ '?column?': 1 }] : [] };
      }

      if (sql.includes('FROM public.document_types')) {
        return {
          rows: [{
            id: 'type-1',
            code: 'MANIFEST',
            name: 'Manifest Keberangkatan',
            category: 'departure'
          }]
        };
      }

      if (sql.includes('FROM public.document_templates')) {
        return {
          rows: [{
            id: 'template-1',
            name: 'Manifest Default',
            version: 1,
            status: 'published'
          }]
        };
      }

      throw new Error('UNEXPECTED_QUERY');
    }
  };
}

async function createApp(options) {
  const app = Fastify();
  await registerDocumentRoutes(app, createPool(options));
  return app;
}

test('Jenis dokumen menolak pengguna tanpa token', async () => {
  const app = await createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/documents/types'
    });

    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('Jenis dokumen tersedia untuk sesi valid', async () => {
  const app = await createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/documents/types',
      headers: {
        authorization: `Bearer ${TOKEN}`
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().items[0].code, 'MANIFEST');
  } finally {
    await app.close();
  }
});

test('Template menolak organizationId tidak valid', async () => {
  const app = await createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/documents/templates?organizationId=invalid',
      headers: {
        authorization: `Bearer ${TOKEN}`
      }
    });

    assert.equal(response.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('Template menolak pengguna di luar organisasi', async () => {
  const app = await createApp({ member: false });

  try {
    const response = await app.inject({
      method: 'GET',
      url: `/documents/templates?organizationId=${ORG_ID}`,
      headers: {
        authorization: `Bearer ${TOKEN}`
      }
    });

    assert.equal(response.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('Template tersedia untuk anggota organisasi aktif', async () => {
  const app = await createApp({ member: true });

  try {
    const response = await app.inject({
      method: 'GET',
      url: `/documents/templates?organizationId=${ORG_ID}`,
      headers: {
        authorization: `Bearer ${TOKEN}`
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().items[0].name, 'Manifest Default');
  } finally {
    await app.close();
  }
});

test('Template menolak sesi tidak dikenal', async () => {
  const app = await createApp({ authenticated: false });

  try {
    const response = await app.inject({
      method: 'GET',
      url: `/documents/templates?organizationId=${ORG_ID}`,
      headers: {
        authorization: `Bearer ${TOKEN}`
      }
    });

    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});