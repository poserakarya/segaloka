import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerSyncRoutes } from './sync-routes.js';

const USER = '11111111-1111-4111-8111-111111111111';
const ORG = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'a'.repeat(64);

function createPool(options = {}) {
  let delivered = false;

  return {
    async query(sql) {
      if (sql.includes('FROM public.auth_access_tokens')) {
        return {
          rows: options.authenticated === false
            ? []
            : [{
                user_id: USER,
                session_id: 'session-test'
              }]
        };
      }

      if (sql.includes('AS organization_active')) {
        return {
          rows: [{
            organization_active: options.organizationActive !== false,
            travel_member: options.authorized !== false,
            super_admin: false
          }]
        };
      }

      if (sql.includes('COALESCE(MAX(id), 0)')) {
        return { rows: [{ cursor: '0' }] };
      }

      if (
        sql.includes('AND id > $2::bigint') &&
        sql.includes('travel.departure.%')
      ) {
        if (delivered || options.event === false) {
          return { rows: [] };
        }

        delivered = true;
        return {
          rows: [{
            id: '1',
            event_type: 'travel.departure.created',
            entity_type: 'travel_departure',
            entity_id: '33333333-3333-4333-8333-333333333333',
            payload: { organizationId: ORG },
            created_at: '2026-10-14T00:00:00.000Z'
          }]
        };
      }

      throw new Error(`UNEXPECTED_SQL: ${sql.slice(0, 100)}`);
    }
  };
}

async function createApp(options) {
  const app = Fastify({ logger: false });
  await registerSyncRoutes(app, createPool(options));
  return app;
}

test('sync events require a valid session', async () => {
  const app = await createApp({ authenticated: false });

  try {
    const response = await app.inject({
      method: 'GET',
      url: `/sync/events?organizationId=${ORG}`
    });

    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('sync events reject invalid cursors and unauthorized tenants', async () => {
  const app = await createApp({ authorized: false });

  try {
    const invalidCursor = await app.inject({
      method: 'GET',
      url: `/sync/events?organizationId=${ORG}&after=1e3`,
      headers: { authorization: `Bearer ${TOKEN}` }
    });
    assert.equal(invalidCursor.statusCode, 400);

    const denied = await app.inject({
      method: 'GET',
      url: `/sync/events?organizationId=${ORG}`,
      headers: { authorization: `Bearer ${TOKEN}` }
    });
    assert.equal(denied.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('authorized Travel subscribers receive tenant-scoped departure changes', async () => {
  const app = await createApp({});
  const address = await app.listen({
    host: '127.0.0.1',
    port: 0
  });
  const abort = new AbortController();

  try {
    const response = await fetch(
      `${address}/sync/events?organizationId=${ORG}`,
      {
        headers: { authorization: `Bearer ${TOKEN}` },
        signal: abort.signal
      }
    );

    assert.equal(response.status, 200);
    assert.match(
      response.headers.get('content-type'),
      /text\/event-stream/
    );

    const reader = response.body.getReader();
    let output = '';

    while (!output.includes('event: change')) {
      const chunk = await reader.read();
      if (chunk.done) break;
      output += new TextDecoder().decode(chunk.value);
    }

    assert.match(output, /event: ready/);
    assert.match(output, /event: change/);
    assert.match(output, /travel\.departure\.created/);
    assert.match(output, new RegExp(ORG));
  } finally {
    abort.abort();
    await app.close();
  }
});
