(() => {
  'use strict';

  const APP = Object.freeze({
    name: 'Segaloka Travel',
    role: 'travel',
    phase: '2E',
    mode: 'bootstrap'
  });

  const REQUIRED_RUNTIME = Object.freeze([
    'styles.css',
    'i18n.js',
    'core.js',
    'data.js',
    'datamode.js',
    'flows.js',
    'gateway.js',
    'notify.js',
    'portals.js',
    'regfee.js',
    'reviews.js',
    'sdterms.js',
    'segadeals.js',
    'sync.js'
  ]);

  const status = document.getElementById('travel-runtime-status');

  if (!status) {
    throw new Error(
      'Segaloka Travel bootstrap: status element tidak ditemukan.'
    );
  }

  /*
   * Phase 2E deliberately does NOT execute the copied V7 runtime.
   *
   * The files under ./runtime are parity/reference snapshots.
   * They will be reduced and classified in the next extraction
   * stage before any production Travel runtime is activated.
   */

  status.textContent =
    'Bootstrap Travel aktif. Runtime V7 masih reference-only; ' +
    'auth, tenant, permission, RLS, dan data bisnis belum diaktifkan ' +
    'pada entry point terpisah ini.';

  document.documentElement.dataset.segalokaRole = APP.role;
  document.documentElement.dataset.segalokaPhase = APP.phase;

  window.SegalokaTravelBootstrap = Object.freeze({
    app: APP,
    referenceRuntime: REQUIRED_RUNTIME,
    productionReady: false
  });
})();