import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerDocumentRoutes } from './document-routes.js';

const USER = '11111111-1111-4111-8111-111111111111';
const ORG = '22222222-2222-4222-8222-222222222222';
const DOC = '55555555-5555-4555-8555-555555555555';
const TOKEN = 'a'.repeat(64);

function setup(options = {}) {
  const calls = [];
  let released = false;

  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });

      if (sql.includes('information_schema.columns')) {
        return { rows: [{ available: false }] };
      }

      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql === 'COMMIT') {
        if (options.failCommit) {
          throw new Error('COMMIT_FAILED');
        }
        return { rows: [] };
      }

      if (sql.includes('FROM public.documents d')) {
        return {
          rows: options.notFound ? [] : [{
            id: DOC,
            organization_id: ORG,
            status: options.status ?? 'draft',
            data: { title: 'Manifest Keberangkatan' },
            document_number: 'SEG-TEST'
          }]
        };
      }

      if (sql.includes('FROM public.memberships')) {
        return {
          rows: options.member === false ? [] : [{ allowed: 1 }]
        };
      }

      if (sql.includes('INSERT INTO public.document_revisions')) {
        if (options.failRevision) {
          throw new Error('REVISION_FAILED');
        }

        return {
          rows: [{
            id: '66666666-6666-4666-8666-666666666666',
            revision_number: 1
          }]
        };
      }

      if (sql.includes('UPDATE public.documents')) {
        return {
          rows: [{
            id: DOC,
            document_number: 'SEG-TEST',
            status: 'issued',
            issued_at: '2026-10-09T01:00:00Z'
          }]
        };
      }

      if (sql.includes('INSERT INTO public.document_events')) {
        if (options.failAudit) {
          throw new Error('AUDIT_FAILED');
        }
        return { rows: [] };
      }

      throw new Error('UNEXPECTED_SQL');
    },

    release() {
      released = true;
    }
  };

  return {
    pool: {
      async query(sql) {
        if (sql.includes('FROM public.auth_access_tokens')) {
          return {
            rows: options.authenticated === false
              ? []
              : [{ user_id: USER, session_id: 'session-1' }]
          };
        }

        throw new Error('UNEXPECTED_POOL_QUERY');
      },

      async connect() {
        return client;
      }
    },

    calls,

    get released() {
      return released;
    }
  };
}

async function run(options = {}, id = DOC) {
  const state = setup(options);
  const app = Fastify();

  await registerDocumentRoutes(app, state.pool);

  try {
    const response = await app.inject({
      method: 'POST',
      url: `/documents/${id}/issue`,
      headers: {
        authorization: `Bearer ${TOKEN}`
      }
    });

    return { response, state };
  } finally {
    await app.close();
  }
}

test('Draft dapat diterbitkan dengan snapshot dan audit', async () => {
  const { response, state } = await run();

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().document.status, 'issued');
  assert.equal(response.json().revision.revision_number, 1);

  assert.ok(state.calls.some(c =>
    c.sql.includes('INSERT INTO public.document_revisions')
  ));

  assert.ok(state.calls.some(c =>
    c.sql.includes('INSERT INTO public.document_events')
  ));

  assert.ok(state.calls.some(c => c.sql === 'COMMIT'));
  assert.equal(state.released, true);
});

test('Dokumen yang tidak ditemukan ditolak', async () => {
  const { response, state } = await run({ notFound: true });

  assert.equal(response.statusCode, 404);
  assert.ok(state.calls.some(c => c.sql === 'ROLLBACK'));
});

test('Pengguna organisasi lain ditolak', async () => {
  const { response, state } = await run({ member: false });

  assert.equal(response.statusCode, 403);
  assert.ok(!state.calls.some(c => c.sql === 'COMMIT'));
});

test('Dokumen yang sudah issued tidak diterbitkan ulang', async () => {
  const { response, state } = await run({ status: 'issued' });

  assert.equal(response.statusCode, 409);

  assert.ok(!state.calls.some(c =>
    c.sql.includes('INSERT INTO public.document_revisions')
  ));
});

test('Kegagalan snapshot membatalkan transaksi', async () => {
  const { response, state } = await run({ failRevision: true });

  assert.equal(response.statusCode, 500);
  assert.ok(state.calls.some(c => c.sql === 'ROLLBACK'));
  assert.ok(!state.calls.some(c => c.sql === 'COMMIT'));
  assert.equal(state.released, true);
});

test('Kegagalan audit membatalkan penerbitan', async () => {
  const { response, state } = await run({ failAudit: true });

  assert.equal(response.statusCode, 500);
  assert.ok(state.calls.some(c => c.sql === 'ROLLBACK'));
  assert.ok(!state.calls.some(c => c.sql === 'COMMIT'));
});

test('ID dokumen tidak valid ditolak', async () => {
  const { response, state } = await run({}, 'invalid');

  assert.equal(response.statusCode, 400);
  assert.equal(state.calls.length, 0);
});

test('Sesi tidak valid ditolak', async () => {
  const { response, state } = await run({
    authenticated: false
  });

  assert.equal(response.statusCode, 401);
  assert.equal(state.calls.length, 0);
});
