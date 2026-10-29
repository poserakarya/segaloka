import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandoffConsumer } from './handoff-consumer.mjs';

const hex = c => c.repeat(64);

function setup(overrides = {}) {
  let created = 0;

  const consumer = createHandoffConsumer({
    consumeTicket: async () => ({
      status: 200,
      data: {
        authenticated: true,
        dashboard: 'travel',
        user: { id: 'user-a' },
        session: {
          accessToken: hex('a'),
          refreshToken: hex('b')
        }
      }
    }),
    verifySession: async () => ({
      status: 200,
      data: {
        authenticated: true,
        user: { id: 'user-a' },
        memberships: [
          { role: 'TRAVEL_OWNER', organizationId: 'org-a' }
        ]
      }
    }),
    verifyDashboardAccess: async () => ({
      status: 200,
      data: {
        dashboards: [{ dashboard: 'travel', role: 'travel', organizationId: 'org-a' }]
      }
    }),    createSession: async () => { created++; },
    ...overrides
  });

  return { consumer, getCreated: () => created };
}

test('valid ticket creates session', async () => {
  const { consumer, getCreated } = setup();

  const result = await consumer({
    ticket: hex('c'),
    binding: hex('d')
  });

  assert.equal(result.status, 200);
  assert.match(result.sessionId, /^[0-9a-f]{64}$/);
  assert.equal(getCreated(), 1);
});

test('invalid ticket rejected', async () => {
  const { consumer, getCreated } = setup();

  const result = await consumer({
    ticket: 'invalid',
    binding: hex('d')
  });

  assert.equal(result.status, 400);
  assert.equal(getCreated(), 0);
});

test('expired ticket rejected', async () => {
  const { consumer, getCreated } = setup({
    consumeTicket: async () => ({ status: 401 })
  });

  const result = await consumer({
    ticket: hex('c'),
    binding: hex('d')
  });

  assert.equal(result.status, 401);
  assert.equal(getCreated(), 0);
});

test('non-travel user rejected', async () => {
  const { consumer, getCreated } = setup({
    verifySession: async () => ({
      status: 200,
      data: {
        authenticated: true,
        user: { id: 'user-a' },
        memberships: []
      }
    })
  });

  const result = await consumer({
    ticket: hex('c'),
    binding: hex('d')
  });

  assert.equal(result.status, 403);
  assert.equal(getCreated(), 0);
});

test('user mismatch rejected', async () => {
  const { consumer, getCreated } = setup({
    verifySession: async () => ({
      status: 200,
      data: {
        authenticated: true,
        user: { id: 'user-b' },
        memberships: [
          { role: 'TRAVEL_OWNER', organizationId: 'org-a' }
        ]
      }
    })
  });

  const result = await consumer({
    ticket: hex('c'),
    binding: hex('d')
  });

  assert.equal(result.status, 403);
  assert.equal(getCreated(), 0);
});
test('existing travel role is accepted', async () => {
  let saved = 0;

  const consumer = createHandoffConsumer({
    consumeTicket: async () => ({
      status: 200,
      data: {
        authenticated: true,
        dashboard: 'travel',
        user: { id: 'user-a' },
        session: {
          accessToken: hex('a'),
          refreshToken: hex('b')
        }
      }
    }),
    verifySession: async () => ({
      status: 200,
      data: {
        authenticated: true,
        user: { id: 'user-a' },
        memberships: [
          { role: 'travel', organizationId: 'org-a' }
        ]
      }
    }),
    verifyDashboardAccess: async () => ({
      status: 200,
      data: {
        dashboards: [{ dashboard: 'travel', role: 'travel', organizationId: 'org-a' }]
      }
    }),
    createSession: async () => { saved++; }
  });

  const result = await consumer({
    ticket: hex('c'),
    binding: hex('d')
  });

  assert.equal(result.status, 200);
  assert.equal(saved, 1);
});

test('role from another workspace is rejected', async () => {
  let saved = 0;

  const consumer = createHandoffConsumer({
    consumeTicket: async () => ({
      status: 200,
      data: {
        authenticated: true,
        dashboard: 'travel',
        user: { id: 'user-a' },
        session: {
          accessToken: hex('a'),
          refreshToken: hex('b')
        }
      }
    }),
    verifySession: async () => ({
      status: 200,
      data: {
        authenticated: true,
        user: { id: 'user-a' },
        memberships: [
          { role: 'vendor', organizationId: 'org-a' }
        ]
      }
    }),
    verifyDashboardAccess: async () => ({
      status: 200,
      data: {
        dashboards: [{ dashboard: 'travel', role: 'travel', organizationId: 'org-a' }]
      }
    }),
    createSession: async () => { saved++; }
  });

  const result = await consumer({
    ticket: hex('c'),
    binding: hex('d')
  });

  assert.equal(result.status, 403);
  assert.equal(saved, 0);
});
test('dashboard access unavailable fails closed', async () => {
  const { consumer, getCreated } = setup({
    verifyDashboardAccess: async () => ({
      status: 503,
      data: {}
    })
  });

  const result = await consumer({
    ticket: hex('c'),
    binding: hex('d')
  });

  assert.equal(result.status, 503);
  assert.equal(getCreated(), 0);
});

test('non-travel dashboard access is denied', async () => {
  const { consumer, getCreated } = setup({
    verifyDashboardAccess: async () => ({
      status: 200,
      data: {
        dashboards: [{ dashboard: 'vendor' }]
      }
    })
  });

  const result = await consumer({
    ticket: hex('c'),
    binding: hex('d')
  });

  assert.equal(result.status, 403);
  assert.equal(getCreated(), 0);
});
test('dashboard name alone cannot authorize Travel session', async () => {
  let saved = 0;

  const consumer = createHandoffConsumer({
    consumeTicket: async () => ({
      status: 200,
      data: {
        authenticated: true,
        dashboard: 'travel',
        user: { id: 'user-a' },
        session: {
          accessToken: hex('a'),
          refreshToken: hex('b')
        }
      }
    }),
    verifySession: async () => ({
      status: 200,
      data: {
        authenticated: true,
        user: { id: 'user-a' },
        memberships: [
          { role: 'travel', organizationId: 'org-a' }
        ]
      }
    }),
    verifyDashboardAccess: async () => ({
      status: 200,
      data: {
        dashboards: [
          { dashboard: 'travel' }
        ]
      }
    }),
    createSession: async () => { saved++; }
  });

  const result = await consumer({
    ticket: hex('c'),
    binding: hex('d')
  });

  assert.equal(result.status, 403);
  assert.equal(saved, 0);
});

test('wrong dashboard role cannot authorize Travel session', async () => {
  let saved = 0;

  const consumer = createHandoffConsumer({
    consumeTicket: async () => ({
      status: 200,
      data: {
        authenticated: true,
        dashboard: 'travel',
        user: { id: 'user-a' },
        session: {
          accessToken: hex('a'),
          refreshToken: hex('b')
        }
      }
    }),
    verifySession: async () => ({
      status: 200,
      data: {
        authenticated: true,
        user: { id: 'user-a' },
        memberships: [
          { role: 'travel', organizationId: 'org-a' }
        ]
      }
    }),
    verifyDashboardAccess: async () => ({
      status: 200,
      data: {
        dashboards: [
          {
            dashboard: 'travel',
            role: 'vendor',
            organizationId: 'org-a'
          }
        ]
      }
    }),
    createSession: async () => { saved++; }
  });

  const result = await consumer({
    ticket: hex('c'),
    binding: hex('d')
  });

  assert.equal(result.status, 403);
  assert.equal(saved, 0);
});
test('Travel organization mismatch is denied', async () => {
  let saved = 0;

  const consumer = createHandoffConsumer({
    consumeTicket: async () => ({
      status: 200,
      data: {
        authenticated: true,
        dashboard: 'travel',
        user: { id: 'user-a' },
        session: {
          accessToken: hex('a'),
          refreshToken: hex('b')
        }
      }
    }),
    verifySession: async () => ({
      status: 200,
      data: {
        authenticated: true,
        user: { id: 'user-a' },
        memberships: [
          { role: 'travel', organizationId: 'org-a' }
        ]
      }
    }),
    verifyDashboardAccess: async () => ({
      status: 200,
      data: {
        dashboards: [
          {
            dashboard: 'travel',
            role: 'travel',
            organizationId: 'org-b'
          }
        ]
      }
    }),
    createSession: async () => { saved++; }
  });

  const result = await consumer({
    ticket: hex('c'),
    binding: hex('d')
  });

  assert.equal(result.status, 403);
  assert.equal(saved, 0);
});

test('missing dashboard access verifier is rejected at initialization', () => {
  assert.throws(
    () => createHandoffConsumer({
      consumeTicket: async () => ({}),
      verifySession: async () => ({}),
      createSession: async () => {}
    }),
    /INVALID_HANDOFF_DEPENDENCIES/
  );
});