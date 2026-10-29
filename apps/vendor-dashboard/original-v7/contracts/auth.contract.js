(() => {
  'use strict';

  const contract = Object.freeze({
    requiredRole: 'vendor',

    requiredContext: Object.freeze([
      'authenticatedUser',
      'membership',
      'vendorTenant',
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

  window.SegalokaVendorContracts =
    window.SegalokaVendorContracts || {};

  window.SegalokaVendorContracts.auth = contract;
})();