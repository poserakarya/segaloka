// Kebijakan aksi data-act untuk sumber V7 asli yang disajikan per portal.
// Klasifikasi diturunkan dari 234 nama data-act unik di
// apps/travel-dashboard/original-v7/travel-existing.html.
// Hanya NAVIGATION_ACTIONS dan MODAL_ACTIONS yang boleh berjalan; aksi lain
// (termasuk nama yang tidak dikenal) ditolak tanpa menampilkan keberhasilan.

export const V7_ACTION_BLOCKED_MESSAGE =
  'Belum tersambung ke server; perubahan tidak disimpan';

// Mengubah tampilan, rute, filter, atau clipboard saja.
export const NAVIGATION_ACTIONS = Object.freeze([
  'ap-back', 'attr-model', 'close', 'cmd-go', 'cmd-scope', 'collapse',
  'copy', 'csv-copy', 'ctx-toggle', 'drawer', 'lang', 'mf-apply',
  'mf-reset', 'nav', 'ncat', 'notif-go', 'omni-back', 'omni-copy',
  'omni-tab', 'rec-pick', 'search', 'tbl-clear', 'tbl-colt', 'tbl-f',
  'tbl-pg', 'tbl-reset', 'tbl-sel', 'tbl-selall', 'tbl-sort', 'tg-group',
  'tg-mod', 'theme', 'toast-x', 'u-cat', 'wz-go', 'wz-set', 'wz-toggle'
]);

// Membuka modal, drawer, atau popover tanpa mengubah data bisnis.
export const MODAL_ACTIONS = Object.freeze([
  'acct', 'add-branch', 'add-travel', 'ag-new', 'al-new', 'audit-diff',
  'doc-prev', 'lead-new', 'lt-issue', 'lt-leave', 'lt-pass', 'ma-reg',
  'more-filter', 'notif', 'pg-edit', 'preview-data', 'reg-cfg', 'reg-set',
  'reg-trpct', 'res-edit', 'res-new', 'res-open', 'row-menu', 'rv-new',
  'rv-reply', 'sd-cfg', 'sd-trfee', 'tbl-cols', 'tm-new', 'to-new',
  'tp-edit', 'tp-new', 'vp-new', 'wd-req', 'wd-view', 'wizard'
]);

// Mengubah data di memori browser saja (tidak pernah tersimpan di server).
export const MEMORY_ONLY_ACTIONS = Object.freeze([
  'add-branch-ok', 'add-travel-save', 'ag-save', 'ag-toggle', 'ai-ask',
  'al-save', 'al-toggle', 'ap-decide', 'ap-note', 'attr-save', 'bk-cancel',
  'brand-save', 'bulk', 'camp-set', 'confirm-ok', 'dict-save', 'doc-verify',
  'export', 'it-add', 'it-del', 'lead-mv', 'lead-save', 'lic-set',
  'lt-leave-go', 'lt-reject', 'ma-reg-go', 'mani-all', 'mani-ready',
  'mani-set', 'ncfg-save', 'notif-read', 'notif-read2', 'ob-save',
  'pent-pick', 'pent-set', 'pg-save', 'pinfo-save', 'pkg-set', 'reg-cfg-go',
  'reg-set-go', 'reg-trpct-go', 'res-act', 'res-act-go', 'res-save', 'role',
  'role-cell', 'role-reset', 'role-save', 'room-add', 'room-confirm',
  'room-out', 'rv-mod', 'rv-reply-go', 'rv-save', 'sd-accept',
  'sd-adm-withdraw', 'sd-cancel', 'sd-cfg-go', 'sd-offer', 'sd-offer-go',
  'sd-revoke', 'sd-submit', 'sd-terms-accept', 'sd-trfee-go', 'sd-withdraw',
  'sdd-save', 'secpol-save', 'sens-change', 'sens-submit', 'signin',
  'signout', 'tb-next', 'td-submit', 'td-visa', 'tl-upload', 'tm-save',
  'tm-toggle', 'to-save', 'tp-edit-go', 'tp-save', 'tp-set', 'travel-status',
  'ts-branch', 'ts-trial', 'u-book', 'u-cancel', 'up-reject', 'up-verify',
  'ux', 'vd-submit', 'vd-up', 'vendor-status', 'vo-set', 'vp-save', 'vp-set',
  'wz-draft', 'wz-submit'
]);

// Memakai konektor Supabase lama (sql, storage, sinkronisasi).
export const SUPABASE_GATEWAY_ACTIONS = Object.freeze([
  'file-dl', 'file-view', 'lt-issue-go', 'lt-pass-go', 'sb-purge',
  'sync-info', 'sync-now', 'sync-retry', 'u-passport', 'up-doc'
]);

// Pembayaran, refund, withdrawal, dan omnichannel yang belum terintegrasi.
export const PAYMENT_OMNICHANNEL_ACTIONS = Object.freeze([
  'bk-refund', 'ch-save', 'cv-ai', 'cv-assign', 'cv-assign-pick',
  'cv-attach', 'cv-mode', 'cv-resolve', 'cv-send', 'cv-tag', 'cv-tag-pick',
  'cv-tpl', 'cv-tpl-pick', 'gw-save', 'gw-sec', 'lead-convert', 'omni-cfg',
  'omni-gen', 'omni-ping', 'omni-sec', 'omni-sec-del', 'omni-test',
  'pay-confirm', 'pay-go', 'pay-match', 'pay-open', 'pay-refund',
  'paycfg-save', 'prov-toggle', 'rec-auto', 'rec-match', 'reg-pay',
  'rf-approve', 'rf-approve-go', 'rf-paid', 'rf-paid-go', 'rf-reject',
  'run-recon', 'sd-dep-no', 'sd-dep-ok', 'sd-topup', 'sd-topup-go',
  'tb-remind', 'ts-pay', 'u-pay', 'u-send', 'up-pay', 'wd-approve',
  'wd-cancel', 'wd-do', 'wd-edit', 'wd-go', 'wd-pay-go', 'wd-resubmit'
]);

const categories = [
  ['navigation', NAVIGATION_ACTIONS],
  ['modal', MODAL_ACTIONS],
  ['memory-only', MEMORY_ONLY_ACTIONS],
  ['supabase-gateway', SUPABASE_GATEWAY_ACTIONS],
  ['payment-omnichannel', PAYMENT_OMNICHANNEL_ACTIONS]
];

const categoryByAction = new Map();

for (const [category, actions] of categories) {
  for (const action of actions) {
    if (categoryByAction.has(action)) {
      throw new Error(`V7_ACTION_POLICY_DUPLICATE:${action}`);
    }
    categoryByAction.set(action, category);
  }
}

export function classifyV7Action(action) {
  return categoryByAction.get(action) || 'unknown';
}

export function isV7ActionAllowed(action) {
  const category = classifyV7Action(action);
  return category === 'navigation' || category === 'modal';
}

export function v7ActionPolicySummary() {
  return Object.fromEntries(
    categories.map(([category, actions]) => [category, actions.length])
  );
}

// Skrip inline yang dijalankan setelah registry A milik V7 terbentuk.
// `overrides` adalah aksi yang sudah diganti oleh runtime portal (misalnya
// signout ke /bff/logout) sehingga tidak dibungkus sebagai aksi terblokir.
export function buildV7ActionGuardScript(options = {}) {
  const overrides = Array.isArray(options.overrides) ? options.overrides : [];
  const allowed = [...NAVIGATION_ACTIONS, ...MODAL_ACTIONS, ...overrides];
  const summary = v7ActionPolicySummary();

  return `(() => {
  const allowedActions = new Set(${JSON.stringify(allowed)});
  const blockedMessage = ${JSON.stringify(V7_ACTION_BLOCKED_MESSAGE)};
  const notifyBlocked = () => {
    toast('warn', blockedMessage, '');
  };
  for (const name of Object.keys(A)) {
    if (!allowedActions.has(name)) {
      A[name] = () => notifyBlocked();
    }
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-act]');
    if (!target || allowedActions.has(target.dataset.act)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    notifyBlocked();
  }, true);
  document.addEventListener('submit', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  window.__SEGALOKA_V7_ACTION_POLICY__ = Object.freeze(${JSON.stringify(summary)});
})();`;
}
