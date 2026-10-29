(() => {
  'use strict';

  const contract = Object.freeze({
    app: 'vendor',
    product: 'Segaloka',
    runtime: 'independent',
    legacyRoute: '/p/vendor',

    productionReady: false,

    boundaries: Object.freeze({
      controlCenter: false,
      roleSimulation: false,
      tenantSimulation: false,
      canonicalDataDuplication: false,
      directReferenceRuntimeExecution: false
    })
  });

  window.SegalokaVendorContracts =
    window.SegalokaVendorContracts || {};

  window.SegalokaVendorContracts.app = contract;
})();