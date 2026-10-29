/*
 * SEGALOKA — TRAVEL V7 HELPER OWNERSHIP
 * Phase 2N.12
 *
 * NON-EXECUTABLE.
 *
 * Travel must consume these capabilities from the existing/shared
 * runtime boundary. They must not be independently reimplemented
 * merely to make the extracted renderer run.
 */

const TRAVEL_V7_HELPER_OWNERSHIP = Object.freeze({
  routing: Object.freeze([
    'ROUTES',
    'route',
    'reroute'
  ]),

  principalAndContext: Object.freeze([
    'me'
  ]),

  auditAndNotifications: Object.freeze([
    'pAudit',
    'pNotif',
    'partyNotify'
  ]),

  interaction: Object.freeze([
    'formVals',
    'modal',
    'confirmAction',
    'rerender',
    'toast',
    'saveUpload'
  ]),

  identityAndTime: Object.freeze([
    'uid',
    'nowTs'
  ]),

  formatting: Object.freeze([
    'money',
    'fD',
    'esc',
    'L3',
    't'
  ]),

  ui: Object.freeze([
    'ic',
    'tbl',
    'pHead',
    'phead',
    'pnl',
    'stateBlock'
  ]),

  selectors: Object.freeze([
    'bookingById',
    'pkgById',
    'travelById'
  ]),

  rule:
    'consume-shared-runtime-capability-do-not-create-parallel-business-runtime'
});
