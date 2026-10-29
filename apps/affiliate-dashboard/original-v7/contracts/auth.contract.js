(() => {
  'use strict';

  const contract = Object.freeze({
    requiredRole: 'affiliate',

    requiredContext: Object.freeze([
      'authenticatedUser',
      'membership',
      'affiliateTenant',
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

  window.SegalokaAffiliateContracts =
    window.SegalokaAffiliateContracts || {};

  window.SegalokaAffiliateContracts.auth = contract;
})();