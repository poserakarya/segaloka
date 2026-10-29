(() => {
  'use strict';

  const contract = Object.freeze({
    app: 'agen',
    product: 'Segaloka',
    runtime: 'independent',
    legacyRoute: '/p/agen',

    productionReady: false,

    boundaries: Object.freeze({
      controlCenter: false,
      roleSimulation: false,
      tenantSimulation: false,
      canonicalDataDuplication: false,
      directReferenceRuntimeExecution: false
    })
  });

  window.SegalokaAgenContracts =
    window.SegalokaAgenContracts || {};

  window.SegalokaAgenContracts.app = contract;
})();