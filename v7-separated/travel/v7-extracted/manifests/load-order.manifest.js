/*
 * SEGALOKA — TRAVEL V7 LOAD ORDER MANIFEST
 * Phase 2N.12
 *
 * NON-EXECUTABLE.
 *
 * Ordering is required because existing V7 uses route replacement
 * and route-wrapper composition.
 */

const TRAVEL_V7_LOAD_ORDER = Object.freeze([
  Object.freeze({
    order: 0,
    id: 'travel-shell',
    purpose: 'Existing V7 Travel shell, layout, navigation and theme'
  }),

  Object.freeze({
    order: 1,
    id: 'shared-ui-runtime',
    purpose: 'Existing helper/runtime capabilities required by Travel renderers'
  }),

  Object.freeze({
    order: 2,
    id: 'canonical-data-adapter',
    purpose: 'Tenant-scoped access to canonical Segaloka records'
  }),

  Object.freeze({
    order: 3,
    id: 'shared-service-adapters',
    purpose: 'References to gateway, notifications and realtime sync'
  }),

  Object.freeze({
    order: 4,
    id: 'travel-portals-base',
    sources: Object.freeze([
      'owned/01-portals-primary-travel.js',
      'owned/02-portals-travel-vendor-services.js'
    ])
  }),

  Object.freeze({
    order: 5,
    id: 'flows',
    source: 'orchestration/10-flows.source.js',
    purpose: 'Replace package, booking and finance routes'
  }),

  Object.freeze({
    order: 6,
    id: 'reviews',
    source: 'orchestration/20-reviews.source.js',
    purpose: 'Travel reviews route and booking-detail enrichment'
  }),

  Object.freeze({
    order: 7,
    id: 'regfee',
    source: 'orchestration/30-regfee.source.js',
    purpose: 'Travel Mitra registration-fee enrichment'
  }),

  Object.freeze({
    order: 8,
    id: 'segadeals',
    source: 'orchestration/40-segadeals.source.js',
    purpose: 'Travel SegaDeals base route'
  }),

  Object.freeze({
    order: 9,
    id: 'sdterms',
    source: 'orchestration/50-sdterms.source.js',
    purpose: 'SegaDeals and booking-detail final enrichment'
  }),

  Object.freeze({
    order: 10,
    id: 'travel-actions',
    purpose: 'Bind existing V7 Travel action handlers'
  }),

  Object.freeze({
    order: 11,
    id: 'travel-boot',
    purpose: 'Render and route only after all dependencies are registered'
  })
]);

const TRAVEL_V7_ROUTE_CHAINS = Object.freeze({
  '/p/travel':
    'portals BASE',

  '/p/travel/packages':
    'portals BASE -> flows REROUTE',

  '/p/travel/bookings':
    'portals BASE -> flows REROUTE',

  '/p/travel/bookings/:id':
    'portals BASE -> flows REROUTE -> reviews WRAPPER -> sdterms WRAPPER',

  '/p/travel/departures':
    'portals BASE',

  '/p/travel/mitra':
    'portals BASE -> regfee WRAPPER',

  '/p/travel/vendors':
    'portals Travel Vendor Services BASE',

  '/p/travel/reviews':
    'reviews BASE',

  '/p/travel/finance':
    'portals BASE -> flows REROUTE',

  '/p/travel/legal':
    'portals BASE',

  '/p/travel/subscription':
    'portals BASE',

  '/p/travel/segadeals':
    'segadeals BASE -> sdterms WRAPPER'
});
