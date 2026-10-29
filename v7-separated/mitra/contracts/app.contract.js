(() => {
  'use strict';

  const contract = Object.freeze({
    app: 'mitra',
    product: 'Segaloka',
    runtime: 'independent',
    legacyRoute: '/p/mitra',

    productionReady: false,

    boundaries: Object.freeze({
      controlCenter: false,
      roleSimulation: false,
      tenantSimulation: false,
      canonicalDataDuplication: false,
      directReferenceRuntimeExecution: false
    })
  });

  window.SegalokaMitraContracts =
    window.SegalokaMitraContracts || {};

  window.SegalokaMitraContracts.app = contract;
})();