import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerGoogleConfigRoutes } from './google-config-route.js';

const TOKEN = 'a'.repeat(64);

function fakePool({ admin = false } = {}) {
  const queries = [];

  const query = async (sql) => {
    queries.push(sql);

    if (sql.includes('FROM public.auth_access_tokens')) {
      return {
        rowCount: 1,
        rows: [{
          session_id: 'session-1',
          user_id: 'user-1'
        }]
      };
    }

    if (sql.includes('FROM public.memberships')) {
      return {
        rowCount: admin ? 1 : 0,
        rows: admin ? [{ '?column?': 1 }] : []
      };
    }

    if (sql.includes('FROM public.oauth_provider_configs')) {
      return {
        rowCount: 1,
        rows: [{
          provider: 'google',
          enabled: false,
          client_id: null,
          client_secret_encrypted: null,
          redirect_uri: null,
          scopes: ['openid', 'email', 'profile'],
          has_secret: false
        }]
      };
    }

    return { rowCount: 0, rows: [] };
  };

  return {
    queries,
    query,
    connect: async () => ({
      query,
      release() {}
    })
  };
}

async function setup(options) {
  const app = Fastify({ logger: false });
  const pool = fakePool(options);

  await registerGoogleConfigRoutes(app, pool);
  await app.ready();

  return { app, pool };
}

test('rejects missing authentication', async () => {
  const { app } = await setup({ admin: true });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/admin/integrations/google'
    });

    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('rejects non-super-admin users', async () => {
  const { app } = await setup({ admin: false });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/admin/integrations/google',
      headers: {
        authorization: `Bearer ${TOKEN}`
      }
    });

    assert.equal(response.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('rejects unapproved redirect URI', async () => {
  const { app } = await setup({ admin: true });

  try {
    const response = await app.inject({
      method: 'PUT',
      url: '/admin/integrations/google',
      headers: {
        authorization: `Bearer ${TOKEN}`
      },
      payload: {
        enabled: true,
        redirectUri: 'https://example.com/callback'
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(
      response.json().code,
      'INVALID_REDIRECT_URI'
    );
  } finally {
    await app.close();
  }
});

test('rejects incomplete configuration', async () => {
  const { app } = await setup({ admin: true });

  try {
    const response = await app.inject({
      method: 'PUT',
      url: '/admin/integrations/google',
      headers: {
        authorization: `Bearer ${TOKEN}`
      },
      payload: {
        enabled: true
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(
      response.json().code,
      'GOOGLE_CONFIG_INCOMPLETE'
    );
  } finally {
    await app.close();
  }
});

test('GET does not expose encrypted secret', async () => {
  const { app } = await setup({ admin: true });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/admin/integrations/google',
      headers: {
        authorization: `Bearer ${TOKEN}`
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.body.includes('client_secret_encrypted'),
      false
    );
  } finally {
    await app.close();
  }
});
function transactionalPool({ failAudit = false } = {}) {
  const queries = [];

  const row = {
    provider: 'google',
    enabled: false,
    client_id: null,
    client_secret_encrypted: null,
    redirect_uri: null,
    scopes: ['openid', 'email', 'profile'],
    has_secret: false,
    configured_at: null,
    updated_at: null
  };

  const query = async (sql, params = []) => {
    const statement = sql.trim();
    queries.push({ statement, params });

    if (statement.includes('FROM public.auth_access_tokens')) {
      return {
        rowCount: 1,
        rows: [{
          user_id: 'user-1',
          session_id: 'session-1'
        }]
      };
    }

    if (statement.includes('FROM public.memberships')) {
      return { rowCount: 1, rows: [{ allowed: 1 }] };
    }

    if (statement.includes('FOR UPDATE')) {
      return { rowCount: 1, rows: [{ ...row }] };
    }

    if (statement.startsWith('UPDATE public.oauth_provider_configs')) {
      row.enabled = params[0];
      row.client_id = params[1];
      row.client_secret_encrypted = params[2];
      row.redirect_uri = params[3];
      row.has_secret = Boolean(params[2]);

      return { rowCount: 1, rows: [{ ...row }] };
    }

    if (statement.startsWith('INSERT INTO public.audit_logs')) {
      if (failAudit) {
        throw new Error('Simulated audit write failure');
      }
      return { rowCount: 1, rows: [] };
    }

    return { rowCount: 0, rows: [] };
  };

  return {
    queries,
    query,
    connect: async () => ({
      query,
      release() {}
    })
  };
}

async function setupTransaction(options) {
  const app = Fastify({ logger: false });
  const pool = transactionalPool(options);

  await registerGoogleConfigRoutes(app, pool);
  await app.ready();

  return { app, pool };
}

test('configuration update commits with audit', async () => {
  const { app, pool } = await setupTransaction();

  try {
    const response = await app.inject({
      method: 'PUT',
      url: '/admin/integrations/google',
      headers: {
        authorization: `Bearer ${TOKEN}`
      },
      payload: {
        enabled: false
      }
    });

    assert.equal(response.statusCode, 200);

    const statements = pool.queries.map(q => q.statement);

    const begin = statements.indexOf('BEGIN');
    const update = statements.findIndex(
      q => q.startsWith('UPDATE public.oauth_provider_configs')
    );
    const audit = statements.findIndex(
      q => q.startsWith('INSERT INTO public.audit_logs')
    );
    const commit = statements.indexOf('COMMIT');

    assert.ok(begin >= 0);
    assert.ok(update > begin);
    assert.ok(audit > update);
    assert.ok(commit > audit);

    assert.equal(
      statements.includes('ROLLBACK'),
      false
    );

    assert.equal(
      response.body.includes('client_secret_encrypted'),
      false
    );
  } finally {
    await app.close();
  }
});

test('audit failure causes transaction rollback', async () => {
  const { app, pool } = await setupTransaction({
    failAudit: true
  });

  try {
    const response = await app.inject({
      method: 'PUT',
      url: '/admin/integrations/google',
      headers: {
        authorization: `Bearer ${TOKEN}`
      },
      payload: {
        enabled: false
      }
    });

    assert.equal(response.statusCode, 503);
    assert.equal(
      response.json().code,
      'GOOGLE_CONFIG_UPDATE_FAILED'
    );

    const statements = pool.queries.map(q => q.statement);

    assert.ok(statements.includes('BEGIN'));
    assert.ok(statements.includes('ROLLBACK'));
    assert.equal(statements.includes('COMMIT'), false);
  } finally {
    await app.close();
  }
});
