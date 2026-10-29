(() => {
  'use strict';

  const contract = Object.freeze({
    app: 'affiliate',
    product: 'Segaloka',
    runtime: 'independent',
    legacyRoute: '/p/affiliate',

    productionReady: false,

    boundaries: Object.freeze({
      controlCenter: false,
      roleSimulation: false,
      tenantSimulation: false,
      canonicalDataDuplication: false,
      directReferenceRuntimeExecution: false
    })
  });

  window.SegalokaAffiliateContracts =
    window.SegalokaAffiliateContracts || {};

  window.SegalokaAffiliateContracts.app = contract;
})();