function replaceExpectedCount(source, search, replacement, expected, label) {
  let count = 0;
  let offset = 0;

  while ((offset = source.indexOf(search, offset)) >= 0) {
    count++;
    offset += search.length;
  }

  if (count !== expected) {
    throw new Error(`TRAVEL_V7_SOURCE_ANCHOR_INVALID:${label}`);
  }

  return source.replaceAll(search, replacement);
}

function replaceExactlyOnce(source, search, replacement, label) {
  return replaceExpectedCount(source, search, replacement, 1, label);
}

function removeBetweenOnce(source, start, end, label) {
  const startIndex = source.indexOf(start);
  const endIndex = startIndex < 0
    ? -1
    : source.indexOf(end, startIndex + start.length);

  if (
    startIndex < 0 ||
    endIndex < 0 ||
    source.indexOf(start, startIndex + start.length) >= 0 ||
    source.indexOf(end, endIndex + end.length) >= 0
  ) {
    throw new Error(`TRAVEL_V7_SOURCE_ANCHOR_INVALID:${label}`);
  }

  return source.slice(0, startIndex) + source.slice(endIndex);
}

function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function renderTravelV7Source(source, context) {
  if (
    !context ||
    context.role !== 'travel' ||
    !context.organization ||
    typeof context.organization.id !== 'string' ||
    typeof context.organization.name !== 'string' ||
    context.organization.status !== 'active' ||
    !context.user ||
    typeof context.user.id !== 'string'
  ) {
    throw new Error('INVALID_TRAVEL_V7_CONTEXT');
  }

  const serializedContext = safeJson(context);
  const contextScript =
    `<script>window.__SEGALOKA_TRAVEL_CONTEXT__=${serializedContext};</script>`;
  const styles = [
    '<style>',
    '.wsbtn{display:none!important}',
    '.side-foot>a[href="#/overview"]{display:none!important}',
    '.pent{cursor:default}',
    '</style>'
  ].join('');

  const styleEnd = source.indexOf('</style>');
  if (styleEnd < 0 || source.indexOf('</style>', styleEnd + 8) >= 0) {
    throw new Error('TRAVEL_V7_SOURCE_ANCHOR_INVALID:style');
  }

  const styleEndOffset = styleEnd + '</style>'.length;
  let html = [
    '<!doctype html><html lang="id"><head>',
    source.slice(0, styleEndOffset),
    contextScript,
    styles,
    '<base href="/bff/ui/">',
    '</head><body>',
    source.slice(styleEndOffset),
    '</body></html>'
  ].join('');

  html = replaceExactlyOnce(
    html,
    'const MOCK = true;',
    'const MOCK = false;',
    'mock-flag'
  );

  html = replaceExactlyOnce(
    html,
    'const DEMO = /[?&]demo\\b/.test(location.search);',
    'const DEMO = false;',
    'demo-flag'
  );

  html = replaceExactlyOnce(
    html,
    'const ROLES = {',
    "const ROLES = {\n  travel: { label: 'Travel', perms: [] },",
    'travel-role'
  );

  html = removeBetweenOnce(
    html,
    '  <div class="mh">${t(\'ux_sim\')}</div>',
    '  <div class="sep"></div><div class="mh">${t(\'language\')} · ${t(\'theme\')}',
    'account-simulator'
  );

  html = replaceExactlyOnce(
    html,
    '<span class="avatar">SA</span><div><b>Admin Pusat</b><div class="muted" style="font-size:12px">admin@segaloka.example</div>',
    '<span class="avatar">${esc((travelRuntimeContext.user.name || travelRuntimeContext.user.email || travelOrganization.name).slice(0, 2).toUpperCase())}</span><div><b>${esc(travelRuntimeContext.user.name || travelRuntimeContext.user.email || travelOrganization.name)}</b><div class="muted" style="font-size:12px">${esc(travelRuntimeContext.user.email || \'\')}</div>',
    'account-identity'
  );

  html = removeBetweenOnce(
    html,
    '<div class="sep"></div><button class="mi" data-act="nav" data-r="/compliance/audit">',
    '<button class="mi" data-act="signout">',
    'account-admin-link'
  );

  const clearDemoData =
    'if (!DEMO) { ENTITY_ARRAYS().forEach(a => { a.length = 0; }); clearFakeStats(); }';
  const initializeTravelContext = `${clearDemoData}
const travelRuntimeContext = window.__SEGALOKA_TRAVEL_CONTEXT__;
if (!travelRuntimeContext || travelRuntimeContext.role !== 'travel') {
  throw new Error('TRAVEL_SESSION_CONTEXT_REQUIRED');
}
const travelOrganization = travelRuntimeContext.organization;
TRAVELS.push({
  id: travelOrganization.id,
  name: travelOrganization.name,
  city: '',
  prov: '',
  lic: [],
  legal: null,
  op: travelOrganization.status,
  payMode: null,
  sub: { plan: null, state: null, renew: null, addonBranch: null, price: {} },
  branch: { used: null, quota: null },
  services: [],
  contact: {
    name: travelRuntimeContext.user.name || travelRuntimeContext.user.email || '',
    role: '',
    phone: '',
    email: travelRuntimeContext.user.email || ''
  },
  color: colorFor(travelOrganization.name)
});
PENT.travel = travelOrganization.id;
S.role = 'travel';`;

  html = replaceExactlyOnce(
    html,
    clearDemoData,
    initializeTravelContext,
    'tenant-context'
  );

  html = replaceExactlyOnce(
    html,
    "function st(key) { const s = STATUS[key] || ['neu', 'circle', key, key, key]; return `<span class=\"st ${s[0]}\">${ic(s[1])}${esc(L3(s.slice(2)))}</span>`; }",
    "function st(key) { if (key == null) return `<span class=\"st neu\">${ic('minus')}${esc(L3(['Belum tersedia', 'Unavailable', 'غير متاح']))}</span>`; const s = STATUS[key] || ['neu', 'circle', key, key, key]; return `<span class=\"st ${s[0]}\">${ic(s[1])}${esc(L3(s.slice(2)))}</span>`; }",
    'unknown-status'
  );

  html = replaceExactlyOnce(
    html,
    "...(tr.sub.state !== 'active' ? [[stTone(tr.sub.state), 'refresh', 'Subscription · ' + L3(STATUS[tr.sub.state].slice(2)), L3(['Website & listing bergantung subscription aktif', 'Website & listings depend on an active subscription', 'يعتمد على الاشتراك']), '/p/travel/subscription']] : [])",
    "...(tr.sub.state && tr.sub.state !== 'active' ? [[stTone(tr.sub.state), 'refresh', 'Subscription · ' + L3(STATUS[tr.sub.state].slice(2)), L3(['Website & listing bergantung subscription aktif', 'Website & listings depend on an active subscription', 'يعتمد على الاشتراك']), '/p/travel/subscription']] : [])",
    'unknown-subscription-todo'
  );

  html = html.replaceAll(
    '${tr.payMode}',
    '${esc(tr.payMode || "—")}'
  );

  html = replaceExpectedCount(
    html,
    '${d.pax.length} pax · ${rel(d.dep)}',
    '${d.manifestLoaded ? d.pax.length + " pax" : "—"} · ${rel(d.dep)}',
    2,
    'unknown-manifest-count'
  );

  html = replaceExactlyOnce(
    html,
    "L3(['Masuk sebagai · ganti', 'Signed in as · switch', 'تبديل'])",
    "L3(['Organisasi aktif', 'Active organization', 'المؤسسة النشطة'])",
    'tenant-label'
  );

  html = replaceExactlyOnce(
    html,
    "A['sync-retry'] = () => { closeOverlays(); sbConnect(); };",
    "A['sync-retry'] = () => { closeOverlays(); loadSegalokaTravelData(); };",
    'api-retry-action'
  );

  const boot =
    'applyTheme(); applyLang(); renderShell(); render();\n' +
    'setInterval(realtime, 16000);\n' +
    'sbConnect();';
  const secureBoot = `S.route = '/p/travel/departures';
if (!/^#\\/p\\/travel(?:\\/|$)/.test(location.hash)) {
  location.hash = '#/p/travel/departures';
}
window.addEventListener('hashchange', () => {
  if (!/^#\\/p\\/travel(?:\\/|$)/.test(location.hash)) {
    location.replace('#/p/travel/departures');
  }
}, true);

const travelApiState = { connected: false, databaseReady: false, message: null };
window.__SEGALOKA_TRAVEL_API_STATE__ = travelApiState;
const originalPaintSync = paintSync;
paintSync = function () {
  originalPaintSync();
  const pill = document.getElementById('sync-pill');
  if (!pill) return;
  const labels = travelApiState.databaseReady
    ? ['API Segaloka · Terhubung', 'Segaloka API · Connected', 'API سيجالوكا · متصل']
    : travelApiState.connected
      ? ['API terhubung · database belum siap', 'API connected · database not ready', 'API متصل · قاعدة البيانات غير جاهزة']
      : ['API Segaloka · Tidak terhubung', 'Segaloka API · Disconnected', 'API سيجالوكا · غير متصل'];
  pill.className = 'envpill sync-' + (travelApiState.databaseReady ? 'ok' : 'bad');
  pill.querySelector('.envtext').textContent = L3(labels);
};
A['sync-info'] = el => popAt(el, \`<div class="menu" style="max-width:340px;padding:12px"><b>API Segaloka</b><p class="muted" style="font-size:12.5px;margin:6px 0 10px">\${esc(travelApiState.databaseReady ? L3(['API dan database siap. Halaman ini hanya membaca data yang tersedia untuk organisasi Anda.', 'API and database are ready. This page only reads data available to your organization.', 'الخادم وقاعدة البيانات جاهزان.']) : L3(['Koneksi API atau kesiapan database belum terverifikasi.', 'API connection or database readiness has not been verified.', 'لم يتم التحقق من الاتصال.']))}</p><dl class="dl" style="font-size:12px"><dt>\${t('status')}</dt><dd>\${esc(travelApiState.databaseReady ? 'ready' : travelApiState.connected ? 'database_not_ready' : 'disconnected')}</dd></dl><button class="btn sm" style="margin-top:10px" data-act="travel-api-retry">\${ic('refresh', 'sm')}\${t('retry')}</button></div>\`);
A['travel-api-retry'] = () => loadSegalokaTravelData();
A['sync-now'] = () => loadSegalokaTravelData();
A['sync-retry'] = () => loadSegalokaTravelData();
A.signout = async () => {
  closeOverlays();
  try {
    const response = await fetch('/bff/logout', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('LOGOUT_FAILED');
    window.location.replace('/');
  } catch (error) {
    console.error('[Travel V7] Logout gagal.', error);
    toast('bad', L3(['Logout gagal', 'Logout failed', 'فشل تسجيل الخروج']), L3(['Koneksi ke server tidak tersedia.', 'The server connection is unavailable.', 'الخادم غير متاح.']));
  }
};
const allowedTravelActions = new Set([
  'acct', 'collapse', 'drawer', 'lang', 'notif', 'search', 'signout',
  'sync-info', 'theme', 'travel-api-retry'
]);
document.addEventListener('click', event => {
  const target = event.target.closest('[data-act]');
  if (target && !allowedTravelActions.has(target.dataset.act)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
document.addEventListener('submit', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
const travelAccountObserver = new MutationObserver(() => {
  const button = document.querySelector('.acctbtn');
  if (!button) return;
  const name = button.querySelector('.who b');
  const role = button.querySelector('.who span');
  const avatar = button.querySelector('.avatar');
  const accountName = travelRuntimeContext.user.name ||
    travelRuntimeContext.user.email || travelOrganization.name;
  if (name) name.textContent = accountName;
  if (role) role.textContent = L3(['Akun Travel', 'Travel account', 'حساب السفر']);
  if (avatar) avatar.textContent = accountName.slice(0, 2).toUpperCase();
});
travelAccountObserver.observe(document.getElementById('root'), {
  childList: true,
  subtree: true
});

async function loadSegalokaTravelData() {
  try {
    const statusResponse = await fetch('/bff/status', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    const status = statusResponse.ok ? await statusResponse.json() : null;
    travelApiState.connected = status?.api?.connected === true;
    travelApiState.databaseReady = status?.database?.ready === true;
    travelApiState.message = null;

    const response = await fetch(
      '/bff/departures?organizationId=' +
        encodeURIComponent(travelOrganization.id),
      { credentials: 'same-origin', cache: 'no-store' }
    );
    if (response.status === 401 || response.status === 403) {
      window.location.replace('/');
      return;
    }
    if (!response.ok) throw new Error('DEPARTURE_READ_FAILED');

    const data = await response.json();
    if (!Array.isArray(data.departures)) {
      throw new Error('INVALID_DEPARTURE_RESPONSE');
    }
    DEPS.length = 0;
    data.departures.forEach(departure => {
      DEPS.push({
        id: departure.id,
        travel: departure.travel_organization_id,
        name: departure.title + ' · ' + departure.destination,
        dep: Date.parse(departure.departure_date + 'T00:00:00.000Z'),
        pax: [],
        manifestLoaded: false,
        state: departure.status,
        rooms: [],
        roomState: null
      });
    });
    travelApiState.message = null;
    rerender();
  } catch (error) {
    travelApiState.message = error.message || 'API_REQUEST_FAILED';
    console.error('[Travel V7] Data API gagal dimuat.', error);
  } finally {
    paintSync();
  }
}

applyTheme(); applyLang(); renderShell(); render();
loadSegalokaTravelData();
const travelSync = new EventSource(
  '/bff/sync/events?organizationId=' +
  encodeURIComponent(travelOrganization.id)
);
let lastTravelSyncId = 0n;
travelSync.addEventListener('ready', event => {
  if (/^\\d+$/.test(event.lastEventId)) {
    lastTravelSyncId = BigInt(event.lastEventId);
  }
});
travelSync.addEventListener('change', event => {
  if (!/^\\d+$/.test(event.lastEventId)) return;
  const eventId = BigInt(event.lastEventId);
  if (eventId <= lastTravelSyncId) return;
  lastTravelSyncId = eventId;
  loadSegalokaTravelData();
});
travelSync.addEventListener('open', () => {
  loadSegalokaTravelData();
});
travelSync.addEventListener('auth.expired', () => {
  travelSync.close();
  window.location.replace('/');
});
window.SegalokaTravelRuntime = Object.freeze({
  source: 'original-v7',
  role: 'travel',
  readOnly: true,
  tenantId: travelOrganization.id
});`;

  html = replaceExactlyOnce(html, boot, secureBoot, 'secure-boot');
  return html;
}
