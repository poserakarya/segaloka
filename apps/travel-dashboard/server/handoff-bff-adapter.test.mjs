import test from 'node:test';
import assert from 'node:assert/strict';
import { createBffHandoffAdapter } from './handoff-bff-adapter.mjs';

const hex = value => value.repeat(64);

test('adapter creates PostgreSQL-backed session through injected store', async () => {
  const saved = [];

  const adapter = createBffHandoffAdapter({
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
    }),
    sessions: {
      create: async (...args) => saved.push(args)
    }
  });

  const result = await adapter.complete({
    ticket: hex('c'),
    binding: hex('d')
  });

  assert.equal(result.status, 200);
  assert.equal(saved.length, 1);
  assert.equal(saved[0][1], 'user-a');
  assert.match(saved[0][0], /^[0-9a-f]{64}$/);
});

test('invalid dependencies fail closed', () => {
  assert.throws(
    () => createBffHandoffAdapter({
      consumeTicket: null,
      verifySession: null,
      sessions: {}
    }),
    /INVALID_BFF_HANDOFF_DEPENDENCIES/
  );
});