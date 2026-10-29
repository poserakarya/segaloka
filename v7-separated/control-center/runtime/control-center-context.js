const AGEN = [];
/*
 * SEGALOKA Control Center
 * Compatibility context during dashboard separation.
 *
 * Control Center is permanently ADMIN.
 * This file MUST NOT provide workspace switching.
 */

(function () {
  'use strict';

  window.SEGALOKA_APP_CONTEXT = Object.freeze({
    app: 'control-center',
    workspace: 'admin',
    role: 'admin'
  });

  /*
   * Compatibility only.
   * Legacy shared services may still ask which workspace is active.
   * In Control Center the answer is always admin.
   */
  window.controlCenterWorkspace = function () {
    return 'admin';
  };
})();
/*
 * Ignore role UI registration in Control Center while still evaluating
 * shared helper/business modules.
 */
function __ccSkipRoleRoute(registerFn, path) {
  return undefined;
}

function __ccSkipDynamicRoleRoute(registerFn, path) {
  return undefined;
}
