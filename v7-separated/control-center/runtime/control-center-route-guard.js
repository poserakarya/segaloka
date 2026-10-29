/*
 * SEGALOKA Control Center
 * Role-route isolation.
 *
 * Control Center must never register /p/* pages.
 * Shared business modules may still contain helpers and notification
 * destinations for role applications.
 */
(function () {
  'use strict';

  window.__SEGALOKA_CONTROL_CENTER__ = true;

  window.__ccIsRoleRoute = function (path) {
    return typeof path === 'string' &&
      (path === '/p' || path.indexOf('/p/') === 0);
  };
})();