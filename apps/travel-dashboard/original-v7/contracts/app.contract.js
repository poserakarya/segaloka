(() => {
  'use strict';

  const contract = Object.freeze({
    app: 'travel',
    product: 'Segaloka',
    runtime: 'independent',
    legacyRoute: '/p/travel',

    productionReady: false,

    boundaries: Object.freeze({
      controlCenter: false,
      roleSimulation: false,
      tenantSimulation: false,
      canonicalDataDuplication: false,
      directReferenceRuntimeExecution: false
    })
  });

  window.SegalokaTravelContracts =
    window.SegalokaTravelContracts || {};

  window.SegalokaTravelContracts.app = contract;
})();