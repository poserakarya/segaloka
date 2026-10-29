import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerDocumentRoutes } from './document-routes.js';

const USER = '11111111-1111-4111-8111-111111111111';
const ORG = '22222222-2222-4222-8222-222222222222';
const TYPE = '33333333-3333-4333-8333-333333333333';
const TEMPLATE = '44444444-4444-4444-8444-444444444444';
const DOCUMENT = '55555555-5555-4555-8555-555555555555';
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
        if (options.failCommit) throw new Error('COMMIT_FAILED');
        return { rows: [] };
      }

      if (sql.includes('FROM public.memberships')) {
        return {
          rows: options.member === false ? [] : [{ allowed: 1 }]
        };
      }

      if (sql.includes('FROM public.document_types')) {
        return {
          rows: options.validType === false ? [] : [{ valid: 1 }]
        };
      }

      if (sql.includes('FROM public.document_templates')) {
        return {
          rows: options.validTemplate === false ? [] : [{ valid: 1 }]
        };
      }

      if (sql.includes('INSERT INTO public.documents')) {
        if (options.failInsert) throw new Error('INSERT_FAILED');

        return {
          rows: [{
            id: DOCUMENT,
            document_number: params[3],
            status: 'draft',
            created_at: '2026-10-09T00:00:00Z'
          }]
        };
      }

      if (sql.includes('INSERT INTO public.document_events')) {
        if (options.failAudit) throw new Error('AUDIT_FAILED');
        return { rows: [] };
      }

      throw new Error('UNEXPECTED_SQL');
    },
    release() {
      released = true;
    }
  };

  const pool = {
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
  };

  return {
    pool,
    calls,
    get released() {
      return released;
    }
  };
}

async function run(options, body) {
  const state = setup(options);
  const app = Fastify();
  await registerDocumentRoutes(app, state.pool);

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/documents',
      headers: {
        authorization: `Bearer ${TOKEN}`
      },
      payload: body
    });

    return { response, state };
  } finally {
    await app.close();
  }
}

const validBody = {
  organizationId: ORG,
  documentTypeId: TYPE,
  data: {
    title: 'Manifest Keberangkatan'
  }
};

test('Draft tersimpan bersama audit dalam transaksi', async () => {
  const { response, state } = await run({}, validBody);

  assert.equal(response.statusCode, 201);
  assert.equal(response.json().document.status, 'draft');
  assert.match(
    response.json().document.document_number,
    /^SEG-[0-9A-F]{32}$/
  );
  assert.match(
    response.json().verificationToken,
    /^[0-9a-f]{64}$/
  );

  assert.ok(state.calls.some(c => c.sql === 'BEGIN'));
  assert.ok(state.calls.some(c => c.sql === 'COMMIT'));
  assert.ok(state.calls.some(c =>
    c.sql.includes('INSERT INTO public.document_events')
  ));
  assert.equal(state.released, true);
});

test('Pengguna di luar organisasi ditolak', async () => {
  const { response, state } = await run(
    { member: false },
    validBody
  );

  assert.equal(response.statusCode, 403);
  assert.ok(state.calls.some(c => c.sql === 'ROLLBACK'));
  assert.ok(!state.calls.some(c => c.sql === 'COMMIT'));
});

test('Jenis dokumen tidak valid ditolak', async () => {
  const { response } = await run(
    { validType: false },
    validBody
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().code, 'INVALID_DOCUMENT_TYPE');
});

test('Template organisasi tidak sesuai ditolak', async () => {
  const { response } = await run(
    { validTemplate: false },
    { ...validBody, templateId: TEMPLATE }
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().code, 'INVALID_DOCUMENT_TEMPLATE');
});

test('Kegagalan audit membatalkan transaksi', async () => {
  const { response, state } = await run(
    { failAudit: true },
    validBody
  );

  assert.equal(response.statusCode, 500);
  assert.ok(state.calls.some(c => c.sql === 'ROLLBACK'));
  assert.ok(!state.calls.some(c => c.sql === 'COMMIT'));
  assert.equal(state.released, true);
});

test('Kegagalan insert membatalkan transaksi', async () => {
  const { response, state } = await run(
    { failInsert: true },
    validBody
  );

  assert.equal(response.statusCode, 500);
  assert.ok(state.calls.some(c => c.sql === 'ROLLBACK'));
  assert.equal(state.released, true);
});

test('Input organisasi tidak valid ditolak', async () => {
  const { response, state } = await run(
    {},
    { ...validBody, organizationId: 'invalid' }
  );

  assert.equal(response.statusCode, 400);
  assert.equal(state.calls.length, 0);
});

test('Sesi tidak valid ditolak', async () => {
  const { response, state } = await run(
    { authenticated: false },
    validBody
  );

  assert.equal(response.statusCode, 401);
  assert.equal(state.calls.length, 0);
});
