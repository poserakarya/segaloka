(() => {
  'use strict';

  const items = Object.freeze([
    Object.freeze({
      key: 'home',
      label: 'Beranda',
      legacyPath: '/p/travel'
    }),
    Object.freeze({
      key: 'packages',
      label: 'Paket',
      legacyPath: '/p/travel/packages'
    }),
    Object.freeze({
      key: 'bookings',
      label: 'Booking',
      legacyPath: '/p/travel/bookings'
    }),
    Object.freeze({
      key: 'departures',
      label: 'Keberangkatan',
      legacyPath: '/p/travel/departures'
    }),
    Object.freeze({
      key: 'network',
      label: 'Mitra & Agen',
      legacyPath: '/p/travel/mitra'
    }),
    Object.freeze({
      key: 'vendors',
      label: 'Layanan Vendor',
      legacyPath: '/p/travel/vendors'
    }),
    Object.freeze({
      key: 'finance',
      label: 'Keuangan',
      legacyPath: '/p/travel/finance'
    }),
    Object.freeze({
      key: 'legal',
      label: 'Legalitas',
      legacyPath: '/p/travel/legal'
    }),
    Object.freeze({
      key: 'subscription',
      label: 'Subscription',
      legacyPath: '/p/travel/subscription'
    })
  ]);

  const contract = Object.freeze({
    source: 'V7 Travel PNAV',
    redesignAllowed: false,
    legacyRemovalAllowed: false,
    items
  });

  window.SegalokaTravelContracts =
    window.SegalokaTravelContracts || {};

  window.SegalokaTravelContracts.navigation = contract;
})();