(() => {
  'use strict';

  const contract = Object.freeze({
    ownership: 'canonical-shared',

    duplicateBusinessData: false,

    entities: Object.freeze([
      'travels',
      'packages',
      'bookings',
      'payments',
      'departures',
      'mitra',
      'agen',
      'vendors',
      'vendorOrders',
      'withdrawals',
      'refunds',
      'settlements',
      'registrationFees',
      'operationalDocuments'
    ]),

    identityRules: Object.freeze({
      preserveCanonicalIds: true,
      preserveBookingId: true,
      preservePaymentId: true,
      preserveTravelId: true
    }),

    status: 'contract-only'
  });

  window.SegalokaVendorContracts =
    window.SegalokaVendorContracts || {};

  window.SegalokaVendorContracts.data = contract;
})();