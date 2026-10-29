(() => {
  'use strict';

  const contract = Object.freeze({
    requiredRole: 'mitra',

    requiredContext: Object.freeze([
      'authenticatedUser',
      'membership',
      'mitraTenant',
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

  window.SegalokaMitraContracts =
    window.SegalokaMitraContracts || {};

  window.SegalokaMitraContracts.auth = contract;
})();