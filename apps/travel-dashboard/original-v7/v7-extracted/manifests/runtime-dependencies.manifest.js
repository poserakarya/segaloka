/*
 * SEGALOKA — TRAVEL V7 RUNTIME DEPENDENCY MANIFEST
 * Phase 2N.12
 *
 * NON-EXECUTABLE ARCHITECTURE MANIFEST.
 *
 * Source of truth:
 * Existing V7 Control Center Travel implementation.
 *
 * This file MUST NOT create:
 * - alternate booking truth
 * - alternate payment truth
 * - alternate withdrawal truth
 * - alternate SegaDeals truth
 * - alternate authentication/session truth
 * - alternate tenant truth
 */

const TRAVEL_V7_DEPENDENCY_MANIFEST = Object.freeze({
  role: 'travel',

  ownedPresentation: Object.freeze([
    'owned/01-portals-primary-travel.js',
    'owned/02-portals-travel-vendor-services.js'
  ]),

  orchestrationContributors: Object.freeze([
    'orchestration/10-flows.source.js',
    'orchestration/20-reviews.source.js',
    'orchestration/30-regfee.source.js',
    'orchestration/40-segadeals.source.js',
    'orchestration/50-sdterms.source.js'
  ]),

  sharedEngines: Object.freeze({
    paymentGateway: 'gateway.js',
    notifications: 'notify.js',
    realtimeSync: 'sync.js'
  }),

  canonicalCollections: Object.freeze([
    'TRAVELS',
    'PACKAGES',
    'BOOKINGS',
    'PAYMENTS',
    'MITRA',
    'AGEN',
    'WITHDRAWALS',
    'VPRODUCTS',
    'VORDERS',
    'SD_REQ',
    'SD_OFF',
    'REVIEWS',
    'REFUNDS',
    'UPLOADS',
    'LETTERS',
    'SD_LEDGER'
  ]),

  requiredRuntimeCapabilities: Object.freeze([
    'ROUTES',
    'route',
    'reroute',
    'me',
    'pAudit',
    'pNotif',
    'partyNotify',
    'formVals',
    'modal',
    'confirmAction',
    'rerender',
    'toast',
    'saveUpload',
    'uid',
    'nowTs',
    'money',
    'fD',
    'esc',
    'L3',
    't',
    'ic',
    'tbl',
    'pHead',
    'phead',
    'pnl',
    'stateBlock',
    'bookingById',
    'pkgById',
    'travelById'
  ]),

  invariants: Object.freeze([
    'existing-v7-ui-is-source-of-truth',
    'no-redesign',
    'no-feature-deletion',
    'no-canonical-data-duplication',
    'shared-engines-remain-shared',
    'tenant-scope-required-before-data-exposure',
    'permission-boundary-required-before-production-runtime'
  ])
});
