(() => {
  'use strict';

  const contract = Object.freeze({
    sharedServices: Object.freeze([
      'paymentGateway',
      'paymentLifecycle',
      'refund',
      'settlement',
      'notification',
      'realtimeSync',
      'registrationFee',
      'reviews',
      'terms',
      'segaDeals'
    ]),

    rules: Object.freeze({
      travelMayConsume: true,
      travelMayDuplicate: false,
      crossRoleRoutingPreserved: true,
      canonicalLifecyclePreserved: true
    }),

    status: 'contract-only'
  });

  window.SegalokaVendorContracts =
    window.SegalokaVendorContracts || {};

  window.SegalokaVendorContracts.services = contract;
})();