(() => {
  'use strict';

  const contract = Object.freeze({
    requiredRole: 'traveler',

    requiredContext: Object.freeze([
      'authenticatedUser',
      'membership',
      'travelerTenant',
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

  window.SegalokaTravelerContracts =
    window.SegalokaTravelerContracts || {};

  window.SegalokaTravelerContracts.auth = contract;
})();