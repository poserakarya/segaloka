import { createHandoffConsumer } from './handoff-consumer.mjs';

export function createBffHandoffAdapter({
  consumeTicket,
  verifySession,
  verifyDashboardAccess,
  sessions
}) {
  if (
    typeof consumeTicket !== 'function' ||
    typeof verifySession !== 'function' ||
    typeof verifyDashboardAccess !== 'function' ||
    typeof sessions?.create !== 'function'
  ) {
    throw new Error('INVALID_BFF_HANDOFF_DEPENDENCIES');
  }

  const complete = createHandoffConsumer({
    consumeTicket,
    verifySession,
    verifyDashboardAccess,
    createSession: (id, userId, payload) =>
      sessions.create(id, userId, payload)
  });

  return {
    complete
  };
}