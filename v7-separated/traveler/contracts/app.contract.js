(() => {
  'use strict';

  const contract = Object.freeze({
    app: 'traveler',
    product: 'Segaloka',
    runtime: 'independent',
    legacyRoute: '/p/traveler',

    productionReady: false,

    boundaries: Object.freeze({
      controlCenter: false,
      roleSimulation: false,
      tenantSimulation: false,
      canonicalDataDuplication: false,
      directReferenceRuntimeExecution: false
    })
  });

  window.SegalokaTravelerContracts =
    window.SegalokaTravelerContracts || {};

  window.SegalokaTravelerContracts.app = contract;
})();