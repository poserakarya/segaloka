/*
 * SEGALOKA — TRAVEL V7 SHARED SERVICE BOUNDARY
 * Phase 2N.12
 *
 * NON-EXECUTABLE CONTRACT.
 */

const TRAVEL_V7_SHARED_SERVICE_BOUNDARY = Object.freeze({
  paymentGateway: Object.freeze({
    owner: 'shared',
    source: 'gateway.js',
    forkAllowed: false
  }),

  notifications: Object.freeze({
    owner: 'shared',
    source: 'notify.js',
    forkAllowed: false
  }),

  realtimeSync: Object.freeze({
    owner: 'shared',
    source: 'sync.js',
    forkAllowed: false
  }),

  constraints: Object.freeze([
    'travel-must-consume-shared-payment-events',
    'travel-must-consume-shared-notification-events',
    'travel-must-consume-shared-realtime-events',
    'no-second-gateway-engine',
    'no-second-notification-engine',
    'no-second-sync-engine'
  ])
});
