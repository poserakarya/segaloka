/*
  SEGALOKA TRAVEL V7 — SHARED SERVICE CONTRACT

  These engines remain canonical/shared and MUST NOT be forked:

  - gateway.js
  - notify.js
  - sync.js

  Travel consumes them from the shared platform runtime.

  This file intentionally contains no implementation.
*/
window.SEGALOKA_TRAVEL_SHARED_SERVICES = Object.freeze({
  gateway: 'shared',
  notifications: 'shared',
  realtimeSync: 'shared'
});