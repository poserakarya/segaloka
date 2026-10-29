(() => {
  'use strict';

  const contract = Object.freeze({
    requiredRole: 'travel',

    requiredContext: Object.freeze([
      'authenticatedUser',
      'membership',
      'travelTenant',
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

  window.SegalokaTravelContracts =
    window.SegalokaTravelContracts || {};

  window.SegalokaTravelContracts.auth = contract;
})();