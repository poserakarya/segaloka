import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { createHash } from 'node:crypto';

import { registerDashboardAccessRoute } from './dashboard-access-route.js';

const token = 'a'.repeat(64);
const tokenHash = createHash('sha256').update(token).digest('hex');
const userId = '11111111-1111-4111-8111-111111111111';
const organizationA = '22222222-2222-4222-8222-222222222222';

function createPool(memberships) {
  return {
    async query(sql, params) {
      if (sql.includes('FROM public.auth_access_tokens')) {
        assert.equal(params[0], tokenHash);

        return {
          rows: [{
            session_id: '33333333-3333-4333-8333-333333333333',
            user_id: userId
          }]
        };
      }

      if (sql.includes('FROM public.memberships')) {
        assert.equal(params[0], userId);
        return { rows: memberships };
      }

      throw new Error('UNEXPECTED_SQL');
    }
  };
}

async function requestAccess(memberships, authorization) {
  const app = Fastify({ logger: false });

  try {
    await registerDashboardAccessRoute(app, createPool(memberships));

    return await app.inject({
      method: 'GET',
      url: '/dashboard/access',
      headers: authorization
        ? { authorization }
        : {}
    });
  } finally {
    await app.close();
  }
}

test('request without session returns 401', async () => {
  const response = await requestAccess([], null);

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().code, 'AUTH_REQUIRED');
});

test('traveler cannot access control center', async () => {
  const response = await requestAccess(
    [{ role: 'traveler', organization_id: null }],
    `Bearer ${token}`
  );

  assert.equal(response.statusCode, 200);

  const body = response.json();

  assert.equal(body.workspaceSwitching, false);
  assert.deepEqual(
    body.dashboards.map(item => item.dashboard),
    ['traveler']
  );
});

test('super admin receives control center', async () => {
  const response = await requestAccess(
    [{ role: 'super_admin', organization_id: null }],
    `Bearer ${token}`
  );

  assert.equal(response.statusCode, 200);

  assert.deepEqual(
    response.json().dashboards.map(item => item.dashboard),
    ['control-center']
  );
});

test('pending travel organization is accessible', async () => {
  const response = await requestAccess(
    [{
      role: 'travel',
      organization_id: organizationA,
      organization_name: 'Travel Pending',
      organization_type: 'travel',
      organization_status: 'pending'
    }],
    `Bearer ${token}`
  );

  assert.equal(response.statusCode, 200);

  assert.deepEqual(response.json().dashboards, [{
    dashboard: 'travel',
    role: 'travel',
    organizationId: organizationA,
    organizationName: 'Travel Pending'
  }]);
});
test('pending vendor organization is excluded', async () => {
  const response = await requestAccess(
    [{
      role: 'vendor',
      organization_id: organizationA,
      organization_name: 'Vendor Pending',
      organization_type: 'vendor',
      organization_status: 'pending'
    }],
    `Bearer ${token}`
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().dashboards, []);
});
test('active travel organization is accessible', async () => {
  const response = await requestAccess(
    [{
      role: 'travel',
      organization_id: organizationA,
      organization_name: 'Travel Test',
      organization_type: 'travel',
      organization_status: 'active'
    }],
    `Bearer ${token}`
  );

  assert.equal(response.statusCode, 200);

  assert.deepEqual(response.json().dashboards, [{
    dashboard: 'travel',
    role: 'travel',
    organizationId: organizationA,
    organizationName: 'Travel Test'
  }]);
});

test('suspended travel organization is excluded', async () => {
  const response = await requestAccess(
    [{
      role: 'travel',
      organization_id: organizationA,
      organization_type: 'travel',
      organization_status: 'suspended'
    }],
    `Bearer ${token}`
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().dashboards, []);
});

test('vendor membership cannot impersonate travel', async () => {
  const response = await requestAccess(
    [{
      role: 'vendor',
      organization_id: organizationA,
      organization_type: 'travel',
      organization_status: 'active'
    }],
    `Bearer ${token}`
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().dashboards, []);
});

test('global dashboard requires global membership', async () => {
  for (const role of ['traveler', 'affiliate', 'mitra', 'agen']) {
    const response = await requestAccess(
      [{
        role,
        organization_id: organizationA
      }],
      `Bearer ${token}`
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(
      response.json().dashboards,
      [],
      `${role} must reject organization-scoped membership`
    );
  }
});

test('global dashboards accept global memberships', async () => {
  for (const role of ['traveler', 'affiliate', 'mitra', 'agen']) {
    const response = await requestAccess(
      [{
        role,
        organization_id: null
      }],
      `Bearer ${token}`
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(
      response.json().dashboards.map(item => item.dashboard),
      [role]
    );
  }
});

test('global dashboard accepts mixed memberships only when global role exists', async () => {
  const response = await requestAccess(
    [
      { role: 'affiliate', organization_id: organizationA },
      { role: 'affiliate', organization_id: null }
    ],
    `Bearer ${token}`
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(
    response.json().dashboards.map(item => item.dashboard),
    ['affiliate']
  );
});

test('organization-scoped super admin cannot access control center', async () => {
  const response = await requestAccess(
    [{ role: 'super_admin', organization_id: organizationA }],
    `Bearer ${token}`
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().dashboards, []);
});
