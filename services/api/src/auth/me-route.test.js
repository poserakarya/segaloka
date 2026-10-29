import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerMeRoute } from './me-route.js';

const TOKEN = 'a'.repeat(64);
const USER_ID = '11111111-1111-4111-8111-111111111111';

function createPool(rows, authenticated = true) {
  return {
    async query(sql) {
      if (sql.includes('FROM public.auth_access_tokens')) {
        return {
          rows: authenticated
            ? [{ session_id: 'session-1', user_id: USER_ID }]
            : []
        };
      }

      return { rows };
    }
  };
}

async function createApp(pool) {
  const app = Fastify();
  await registerMeRoute(app, pool);
  return app;
}

test('GET /auth/me tanpa token ditolak', async () => {
  const app = await createApp(createPool([]));

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me'
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().code, 'AUTH_REQUIRED');
  } finally {
    await app.close();
  }
});

test('GET /auth/me mengembalikan identitas dan role', async () => {
  const app = await createApp(createPool([
    {
      id: USER_ID,
      email: 'test@example.com',
      full_name: 'Pengguna Test',
      status: 'active',
      organization_id: null,
      role: 'traveler'
    }
  ]));

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        authorization: `Bearer ${TOKEN}`
      }
    });

    assert.equal(response.statusCode, 200);

    const body = response.json();

    assert.equal(body.authenticated, true);
    assert.equal(body.user.id, USER_ID);
    assert.equal(body.memberships[0].role, 'traveler');
    assert.equal(
      response.headers['cache-control'],
      'no-store'
    );
  } finally {
    await app.close();
  }
});

test('GET /auth/me mendukung beberapa membership', async () => {
  const rows = ['affiliate', 'agen'].map(role => ({
    id: USER_ID,
    email: 'test@example.com',
    full_name: 'Pengguna Test',
    status: 'active',
    organization_id: null,
    role
  }));

  const app = await createApp(createPool(rows));

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        authorization: `Bearer ${TOKEN}`
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().memberships.length, 2);
  } finally {
    await app.close();
  }
});

test('GET /auth/me tanpa membership tetap valid', async () => {
  const app = await createApp(createPool([
    {
      id: USER_ID,
      email: 'test@example.com',
      full_name: 'Pengguna Test',
      status: 'active',
      organization_id: null,
      role: null
    }
  ]));

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        authorization: `Bearer ${TOKEN}`
      }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().memberships, []);
  } finally {
    await app.close();
  }
});

test('GET /auth/me menolak token tidak dikenal', async () => {
  const app = await createApp(createPool([], false));

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        authorization: `Bearer ${TOKEN}`
      }
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().code, 'INVALID_SESSION');
  } finally {
    await app.close();
  }
});