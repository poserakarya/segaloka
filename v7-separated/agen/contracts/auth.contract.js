(() => {
  'use strict';

  const contract = Object.freeze({
    requiredRole: 'agen',

    requiredContext: Object.freeze([
      'authenticatedUser',
      'membership',
      'agenTenant',
      'permissionSet'
    ]),

    authorization: Object.freeze({
      hostnameIsAuthorization: false,
      localStorageRoleIsAuthorization: false,
      clientRoleSwitchingAllowed: false,
      serverValidationRequired: true,
      rlsRequired: true
    }),

    status: 'contract-only'
  });

  window.SegalokaAgenContracts =
    window.SegalokaAgenContracts || {};

  window.SegalokaAgenContracts.auth = contract;
})();