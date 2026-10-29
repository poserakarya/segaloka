/*
 * SEGALOKA — TRAVEL V7 CANONICAL DATA BOUNDARY
 * Phase 2N.12
 *
 * NON-EXECUTABLE CONTRACT.
 */

const TRAVEL_V7_CANONICAL_DATA_BOUNDARY = Object.freeze({
  collections: Object.freeze([
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

  rules: Object.freeze([
    'canonical-records-remain-shared',
    'travel-reads-only-authorized-tenant-scope',
    'travel-writes-through-canonical-domain-path',
    'booking-id-remains-canonical',
    'payment-id-remains-canonical',
    'withdrawal-id-remains-canonical',
    'segadeals-records-remain-canonical',
    'no-shadow-dataset',
    'no-role-local-business-truth',
    'production-access-requires-session-membership-permission-and-rls'
  ])
});
