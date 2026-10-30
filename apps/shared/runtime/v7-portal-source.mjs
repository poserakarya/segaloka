import { readFile } from 'node:fs/promises';

import { buildV7ActionGuardScript } from './v7-action-policy.mjs';
import { resolveAccountPreferences } from './account-preferences.mjs';
import { FONT_STYLESHEET_LINK } from './shared-fonts.mjs';

// Patch atas sumber V7 asli (travel-existing.html). Setiap patch wajib
// menemukan anchor dengan jumlah yang tepat; bila tidak cocok, render gagal
// dengan error ber-prefix dan tidak ada HTML parsial yang dikirim.

export function createV7Patcher(errorPrefix) {
  const fail = label => {
    throw new Error(`${errorPrefix}_V7_SOURCE_ANCHOR_INVALID:${label}`);
  };

  function replaceExpectedCount(source, search, replacement, expected, label) {
    let count = 0;
    let offset = 0;

    while ((offset = source.indexOf(search, offset)) >= 0) {
      count++;
      offset += search.length;
    }

    if (count !== expected) fail(label);

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
      fail(label);
    }

    return source.slice(0, startIndex) + source.slice(endIndex);
  }

  function assembleDocument(source, headInjection) {
    const styleEnd = source.indexOf('</style>');
    if (styleEnd < 0 || source.indexOf('</style>', styleEnd + 8) >= 0) {
      fail('style');
    }

    const styleEndOffset = styleEnd + '</style>'.length;
    return [
      '<!doctype html><html lang="id"><head>',
      source.slice(0, styleEndOffset),
      headInjection,
      '<base href="/bff/ui/">',
      '</head><body>',
      source.slice(styleEndOffset),
      '</body></html>'
    ].join('');
  }

  return {
    replaceExpectedCount,
    replaceExactlyOnce,
    removeBetweenOnce,
    assembleDocument
  };
}

export function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

// Gaya yang sudah dipakai Dashboard Travel untuk menyembunyikan pemilih
// workspace dan tautan Control Center. Tidak ada gaya visual baru.
export const V7_PORTAL_RESTRICTION_STYLES = [
  '<style>',
  '.wsbtn{display:none!important}',
  '.side-foot>a[href="#/overview"]{display:none!important}',
  '.pent{cursor:default}',
  '</style>'
].join('');

// Patch yang sama untuk semua portal: matikan data mock/demo, daftarkan role
// portal, buang simulator akun dan tautan admin, serta tampilkan identitas
// akun dari sesi server.
export function applyCommonV7Patches(html, patcher, options) {
  const { role, roleLabel, contextVar, tenantVar } = options;
  let result = html;

  result = patcher.replaceExactlyOnce(
    result,
    'const MOCK = true;',
    'const MOCK = false;',
    'mock-flag'
  );

  result = patcher.replaceExactlyOnce(
    result,
    'const DEMO = /[?&]demo\\b/.test(location.search);',
    'const DEMO = false;',
    'demo-flag'
  );

  result = patcher.replaceExactlyOnce(
    result,
    'const ROLES = {',
    `const ROLES = {\n  ${role}: { label: '${roleLabel}', perms: [] },`,
    `${role}-role`
  );

  result = patcher.removeBetweenOnce(
    result,
    '  <div class="mh">${t(\'ux_sim\')}</div>',
    '  <div class="sep"></div><div class="mh">${t(\'language\')} · ${t(\'theme\')}',
    'account-simulator'
  );

  result = patcher.replaceExactlyOnce(
    result,
    '<span class="avatar">SA</span><div><b>Admin Pusat</b><div class="muted" style="font-size:12px">admin@segaloka.example</div>',
    `<span class="avatar">\${esc((${contextVar}.user.name || ${contextVar}.user.email || ${tenantVar}.name).slice(0, 2).toUpperCase())}</span><div><b>\${esc(${contextVar}.user.name || ${contextVar}.user.email || ${tenantVar}.name)}</b><div class="muted" style="font-size:12px">\${esc(${contextVar}.user.email || '')}</div>`,
    'account-identity'
  );

  result = patcher.removeBetweenOnce(
    result,
    '<div class="sep"></div><button class="mi" data-act="nav" data-r="/compliance/audit">',
    '<button class="mi" data-act="signout">',
    'account-admin-link'
  );

  result = patcher.replaceExactlyOnce(
    result,
    GOOGLE_FONT_LINKS,
    FONT_STYLESHEET_LINK,
    'self-hosted-fonts'
  );

  result = patcher.removeBetweenOnce(
    result,
    SIMULATION_BANNER_START,
    '  b.innerHTML = h;',
    'permission-simulation-banner'
  );

  return applyFormatPatches(result, patcher);
}

// Tiga tag font Google di sumber V7 diganti stylesheet font lokal.
export const GOOGLE_FONT_LINKS = [
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap">'
].join('\n');

// Banner "Mode simulasi permission … Kembali ke Super Admin" di renderBanners.
export const SIMULATION_BANNER_START =
  "  if (S.role !== 'super_admin') h += `<div class=\"banner info\" role=\"status\">";

// Bahasa awal, locale, mata uang, dan zona waktu dari
// window.__SEGALOKA_FORMAT__ (lihat account-preferences.mjs). Bahasa
// akun/organisasi menang; selain itu pilihan bahasa terakhir di browser ini,
// lalu Accept-Language.
export const FORMAT_PATCHES = Object.freeze([
  [
    'initial-language',
    "const S = { lang: store.get('lang', 'id'),",
    "const S = { lang: (() => { const f = window.__SEGALOKA_FORMAT__ || {}; const source = f.source && f.source.language; if ((source === 'account' || source === 'organization') && ['id', 'en', 'ar'].includes(f.language)) return f.language; const stored = store.get('lang', null); return ['id', 'en', 'ar'].includes(stored) ? stored : (['id', 'en', 'ar'].includes(f.language) ? f.language : 'id'); })(),"
  ],
  [
    'format-locale',
    "const LOC = () => ({ id: 'id-ID', en: 'en-US', ar: 'ar-u-ca-gregory-nu-latn' })[S.lang];",
    "const LOC = () => { const f = window.__SEGALOKA_FORMAT__ || {}; if (f.locale && String(f.locale).split('-')[0].toLowerCase() === S.lang) return f.locale; return ({ id: 'id-ID', en: 'en-US', ar: 'ar-u-ca-gregory-nu-latn' })[S.lang]; };\nconst segalokaCurrency = () => { const f = window.__SEGALOKA_FORMAT__ || {}; return /^[A-Z]{3}$/.test(f.currency || '') ? f.currency : 'IDR'; };\nconst segalokaDateOptions = o => { const f = window.__SEGALOKA_FORMAT__ || {}; return f.timeZone ? Object.assign({}, o, { timeZone: f.timeZone }) : o; };"
  ],
  [
    'format-money',
    "const money = (v, full) => (v == null || !isFinite(v)) ? '—' : 'Rp ' + (full ? fN(Math.round(v)) : fN(v, { notation: 'compact', maximumFractionDigits: v >= 1e9 ? 2 : 1 }));",
    "const money = (v, full) => (v == null || !isFinite(v)) ? '—' : segalokaCurrency() === 'IDR' ? 'Rp ' + (full ? fN(Math.round(v)) : fN(v, { notation: 'compact', maximumFractionDigits: v >= 1e9 ? 2 : 1 })) : new Intl.NumberFormat(LOC(), full ? { style: 'currency', currency: segalokaCurrency(), maximumFractionDigits: 0 } : { style: 'currency', currency: segalokaCurrency(), notation: 'compact', maximumFractionDigits: v >= 1e9 ? 2 : 1 }).format(full ? Math.round(v) : v);"
  ],
  [
    'format-date',
    "const fD = (ts, o) => new Intl.DateTimeFormat(LOC(), o || { day: 'numeric', month: 'short', year: 'numeric' }).format(ts);",
    "const fD = (ts, o) => new Intl.DateTimeFormat(LOC(), segalokaDateOptions(o || { day: 'numeric', month: 'short', year: 'numeric' })).format(ts);"
  ],
  [
    'format-datetime',
    "const fDT = ts => new Intl.DateTimeFormat(LOC(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(ts);",
    "const fDT = ts => new Intl.DateTimeFormat(LOC(), segalokaDateOptions({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })).format(ts);"
  ]
]);

export function applyFormatPatches(source, patcher) {
  let result = source;
  for (const [label, search, replacement] of FORMAT_PATCHES) {
    result = patcher.replaceExactlyOnce(result, search, replacement, label);
  }
  return result;
}

export function formatScriptBody(preferences) {
  return `window.__SEGALOKA_FORMAT__=${safeJson(preferences || resolveAccountPreferences())};`;
}

// Mengunci state simulasi V7 (role dan ux) dan menghapus handler
// pengganti role/tenant. Dipanggil setelah S.role diset ke role portal.
export function simulationLockScript(role) {
  return `Object.defineProperty(S, 'role', { value: ${JSON.stringify(role)}, writable: false, configurable: false });
Object.defineProperty(S, 'ux', { value: 'normal', writable: false, configurable: false });
delete A.role;
delete A.ux;
delete A['pent-set'];
A['pent-pick'] = () => {};`;
}

export const UNKNOWN_STATUS_PATCH = Object.freeze({
  search: "function st(key) { const s = STATUS[key] || ['neu', 'circle', key, key, key]; return `<span class=\"st ${s[0]}\">${ic(s[1])}${esc(L3(s.slice(2)))}</span>`; }",
  replacement: "function st(key) { if (key == null) return `<span class=\"st neu\">${ic('minus')}${esc(L3(['Belum tersedia', 'Unavailable', 'غير متاح']))}</span>`; const s = STATUS[key] || ['neu', 'circle', key, key, key]; return `<span class=\"st ${s[0]}\">${ic(s[1])}${esc(L3(s.slice(2)))}</span>`; }"
});

export const TENANT_LABEL_PATCH = Object.freeze({
  search: "L3(['Masuk sebagai · ganti', 'Signed in as · switch', 'تبديل'])",
  replacement: "L3(['Organisasi aktif', 'Active organization', 'المؤسسة النشطة'])"
});

export const CLEAR_DEMO_DATA =
  'if (!DEMO) { ENTITY_ARRAYS().forEach(a => { a.length = 0; }); clearFakeStats(); }';

export const ORIGINAL_V7_BOOT =
  'applyTheme(); applyLang(); renderShell(); render();\n' +
  'setInterval(realtime, 16000);\n' +
  'sbConnect();';

// Portal non-Travel yang disajikan dari sumber V7 asli yang sama.
export const V7_PORTALS = Object.freeze({
  vendor: Object.freeze({
    label: 'Vendor',
    account: ['Akun Vendor', 'Vendor account', 'حساب المورد'],
    tenantKind: 'organization'
  }),
  affiliate: Object.freeze({
    label: 'Affiliate',
    account: ['Akun Affiliate', 'Affiliate account', 'حساب المسوّق'],
    tenantKind: 'user'
  }),
  agen: Object.freeze({
    label: 'Agen',
    account: ['Akun Agen', 'Agent account', 'حساب الوكيل'],
    tenantKind: 'user'
  }),
  mitra: Object.freeze({
    label: 'Mitra',
    account: ['Akun Mitra', 'Partner account', 'حساب الشريك'],
    tenantKind: 'user'
  }),
  traveler: Object.freeze({
    label: 'Traveler',
    account: ['Akun Traveler', 'Traveler account', 'حساب المسافر'],
    tenantKind: 'user'
  })
});

export function validateV7PortalContext(context) {
  const portal = context && V7_PORTALS[context.role];

  if (
    !portal ||
    !context.tenant ||
    typeof context.tenant.id !== 'string' ||
    context.tenant.id.length === 0 ||
    typeof context.tenant.name !== 'string' ||
    context.tenant.status !== 'active' ||
    context.tenant.kind !== portal.tenantKind ||
    !context.user ||
    typeof context.user.id !== 'string' ||
    context.user.id.length === 0 ||
    (portal.tenantKind === 'user' && context.tenant.id !== context.user.id)
  ) {
    throw new Error('INVALID_V7_PORTAL_CONTEXT');
  }

  return portal;
}

function portalSecureBoot(role, portal) {
  const roleJson = JSON.stringify(role);
  const homeRoute = `/p/${role}`;
  const routePattern = `^#\\/p\\/${role}(?:\\/|$)`;
  const actionGuard = buildV7ActionGuardScript({
    overrides: ['signout', 'sync-info', 'portal-api-retry', 'pent-pick']
  });

  return `S.route = '${homeRoute}';
if (!/${routePattern}/.test(location.hash)) {
  location.hash = '#${homeRoute}';
}
window.addEventListener('hashchange', () => {
  if (!/${routePattern}/.test(location.hash)) {
    location.replace('#${homeRoute}');
  }
}, true);

const portalLegacyGatewayDisabled = async () => {
  throw new Error('LEGACY_GATEWAY_DISABLED');
};
const portalLegacyNoop = async () => {};
sql = portalLegacyGatewayDisabled;
sbConnect = portalLegacyGatewayDisabled;
sbLoad = portalLegacyGatewayDisabled;
saveUpload = portalLegacyGatewayDisabled;
fileURL = portalLegacyGatewayDisabled;
gwCheckout = async () => null;
sbFlush = portalLegacyNoop;
sbPoll = portalLegacyNoop;
sbProbe = portalLegacyNoop;
rtInit = portalLegacyNoop;
realtime = () => {};
SB.on = false;
SB.mcp = null;

const portalApiState = { connected: false };
window.__SEGALOKA_PORTAL_API_STATE__ = portalApiState;
const originalPaintSync = paintSync;
paintSync = function () {
  originalPaintSync();
  const pill = document.getElementById('sync-pill');
  if (!pill) return;
  const labels = portalApiState.connected
    ? ['API Segaloka · Terhubung', 'Segaloka API · Connected', 'API سيجالوكا · متصل']
    : ['API Segaloka · Tidak terhubung', 'Segaloka API · Disconnected', 'API سيجالوكا · غير متصل'];
  pill.className = 'envpill sync-' + (portalApiState.connected ? 'ok' : 'bad');
  pill.querySelector('.envtext').textContent = L3(labels);
};
A['sync-info'] = el => popAt(el, \`<div class="menu" style="max-width:340px;padding:12px"><b>API Segaloka</b><p class="muted" style="font-size:12.5px;margin:6px 0 10px">\${esc(portalApiState.connected ? L3(['Sesi terverifikasi oleh server. Perubahan data belum tersambung ke server.', 'Session verified by the server. Data changes are not connected to the server yet.', 'تم التحقق من الجلسة.']) : L3(['Koneksi API belum terverifikasi.', 'API connection has not been verified.', 'لم يتم التحقق من الاتصال.']))}</p><dl class="dl" style="font-size:12px"><dt>\${t('status')}</dt><dd>\${esc(portalApiState.connected ? 'session_verified' : 'disconnected')}</dd></dl><button class="btn sm" style="margin-top:10px" data-act="portal-api-retry">\${ic('refresh', 'sm')}\${t('retry')}</button></div>\`);
A['portal-api-retry'] = () => { closeOverlays(); checkSegalokaPortalSession(); };
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
    console.error('[Portal V7] Logout gagal.', error);
    toast('bad', L3(['Logout gagal', 'Logout failed', 'فشل تسجيل الخروج']), L3(['Koneksi ke server tidak tersedia.', 'The server connection is unavailable.', 'الخادم غير متاح.']));
  }
};
${simulationLockScript(role)}
${actionGuard}
const portalAccountObserver = new MutationObserver(() => {
  const button = document.querySelector('.acctbtn');
  if (!button) return;
  const name = button.querySelector('.who b');
  const roleLabel = button.querySelector('.who span');
  const avatar = button.querySelector('.avatar');
  const accountName = portalRuntimeContext.user.name ||
    portalRuntimeContext.user.email || portalTenant.name;
  const accountRole = L3(${JSON.stringify(portal.account)});
  const initials = accountName.slice(0, 2).toUpperCase();
  // Tulis hanya bila berbeda agar observer tidak memicu dirinya sendiri.
  if (name && name.textContent !== accountName) name.textContent = accountName;
  if (roleLabel && roleLabel.textContent !== accountRole) roleLabel.textContent = accountRole;
  if (avatar && avatar.textContent !== initials) avatar.textContent = initials;
});
portalAccountObserver.observe(document.getElementById('root'), {
  childList: true,
  subtree: true
});

async function checkSegalokaPortalSession() {
  try {
    const response = await fetch('/bff/dashboard/access', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (response.status === 401 || response.status === 403) {
      window.location.replace('/');
      return;
    }
    const access = response.ok ? await response.json() : null;
    portalApiState.connected = access?.authenticated === true &&
      Array.isArray(access.dashboards) &&
      access.dashboards.some(item => item.role === ${roleJson});
  } catch (error) {
    portalApiState.connected = false;
    console.error('[Portal V7] Status sesi gagal dimuat.', error);
  } finally {
    paintSync();
  }
}

applyTheme(); applyLang(); renderShell(); render();
checkSegalokaPortalSession();
window.SegalokaPortalRuntime = Object.freeze({
  source: 'original-v7',
  role: ${roleJson},
  readOnly: true,
  tenantId: portalTenant.id
});`;
}

function portalTenantContext(role) {
  const roleJson = JSON.stringify(role);

  return `const portalEntityTemplate = WS[${roleJson}].list()[0] || null;
${CLEAR_DEMO_DATA}
const portalRuntimeContext = window.__SEGALOKA_PORTAL_CONTEXT__;
if (!portalRuntimeContext || portalRuntimeContext.role !== ${roleJson}) {
  throw new Error('PORTAL_SESSION_CONTEXT_REQUIRED');
}
const portalTenant = portalRuntimeContext.tenant;
function portalNeutralValue(value) {
  if (Array.isArray(value)) return [];
  if (value && typeof value === 'object') {
    const result = {};
    for (const key of Object.keys(value)) result[key] = portalNeutralValue(value[key]);
    return result;
  }
  if (typeof value === 'string') return '';
  if (typeof value === 'boolean') return false;
  return null;
}
const portalEntity = portalNeutralValue(portalEntityTemplate || {});
portalEntity.id = portalTenant.id;
portalEntity.name = portalTenant.name;
portalEntity.status = 'active';
if ('op' in portalEntity) portalEntity.op = 'active';
if ('color' in portalEntity) portalEntity.color = colorFor(portalTenant.name);
WS[${roleJson}].list().push(portalEntity);
PENT[${roleJson}] = portalTenant.id;
S.role = ${roleJson};`;
}

// Render sumber V7 asli untuk satu portal (vendor, affiliate, agen, mitra,
// traveler). Travel memakai apps/travel-dashboard/server/v7-source.mjs.
export function renderV7PortalSource(source, context) {
  const portal = validateV7PortalContext(context);
  const role = context.role;
  const patcher = createV7Patcher(role.toUpperCase());
  const contextScript =
    `<script>window.__SEGALOKA_PORTAL_CONTEXT__=${safeJson({
      role,
      tenant: context.tenant,
      user: context.user
    })};${formatScriptBody(context.preferences)}</script>`;

  let html = patcher.assembleDocument(
    source,
    contextScript + V7_PORTAL_RESTRICTION_STYLES
  );

  html = applyCommonV7Patches(html, patcher, {
    role,
    roleLabel: portal.label,
    contextVar: 'portalRuntimeContext',
    tenantVar: 'portalTenant'
  });

  html = patcher.replaceExactlyOnce(
    html,
    CLEAR_DEMO_DATA,
    portalTenantContext(role),
    'tenant-context'
  );

  html = patcher.replaceExactlyOnce(
    html,
    UNKNOWN_STATUS_PATCH.search,
    UNKNOWN_STATUS_PATCH.replacement,
    'unknown-status'
  );

  html = patcher.replaceExactlyOnce(
    html,
    TENANT_LABEL_PATCH.search,
    TENANT_LABEL_PATCH.replacement,
    'tenant-label'
  );

  html = patcher.replaceExactlyOnce(
    html,
    ORIGINAL_V7_BOOT,
    portalSecureBoot(role, portal),
    'secure-boot'
  );

  return html;
}

// Header untuk respons HTML portal. connect-src 'self' mencegah sumber V7
// lama mengirim request ke gateway Supabase atau host lain.
export const V7_PORTAL_HTML_HEADERS = Object.freeze({
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
});

export const V7_ORIGINAL_SOURCE_URL = new URL(
  '../../travel-dashboard/original-v7/travel-existing.html',
  import.meta.url
);

// Menyajikan GET /bff/ui untuk portal. Akses diperiksa lewat
// /bff/dashboard/access milik BFF yang sama (termasuk refresh token), lalu
// sumber V7 asli dirender untuk role dan tenant dari sesi server.
// Mengembalikan false bila path bukan /bff/ui sehingga BFF dapat lanjut.
export async function serveV7PortalUi(req, res, options) {
  const {
    path,
    role,
    port,
    json,
    getSession,
    sourceUrl = V7_ORIGINAL_SOURCE_URL,
    fetchImpl = fetch
  } = options;

  if (
    req.method !== 'GET' ||
    !(path === '/bff/ui' || path.startsWith('/bff/ui/'))
  ) {
    return false;
  }

  const portal = V7_PORTALS[role];
  if (!portal) throw new Error('INVALID_V7_PORTAL_ROLE');

  const session = await getSession(req);

  if (!session) {
    json(res, 401, { authenticated: false, code: 'AUTH_REQUIRED' });
    return true;
  }

  const accessResponse = await fetchImpl(
    `http://127.0.0.1:${port}/bff/dashboard/access`,
    {
      headers: { cookie: req.headers.cookie || '' },
      signal: AbortSignal.timeout(10000)
    }
  );

  if (accessResponse.status !== 200) {
    json(
      res,
      [401, 403].includes(accessResponse.status) ? accessResponse.status : 503,
      { code: 'DASHBOARD_ACCESS_DENIED' }
    );
    return true;
  }

  const access = await accessResponse.json();
  const dashboards = Array.isArray(access?.dashboards)
    ? access.dashboards.filter(item =>
        item?.dashboard === role &&
        item?.role === role &&
        (portal.tenantKind === 'organization'
          ? typeof item.organizationId === 'string' && item.organizationId.length > 0
          : item.organizationId === null)
      )
    : [];

  if (access?.authenticated !== true || dashboards.length === 0) {
    json(res, 403, { code: 'DASHBOARD_ACCESS_DENIED' });
    return true;
  }

  if (dashboards.length !== 1) {
    json(res, 409, { code: 'ORGANIZATION_SELECTION_REQUIRED' });
    return true;
  }

  // Sumber V7 asli adalah satu dokumen mandiri; tidak ada aset relatif.
  if (path !== '/bff/ui') {
    json(res, 404, { code: 'ASSET_NOT_FOUND' });
    return true;
  }

  const user = session.user || {};
  const userName = user.fullName || user.name || user.email || '';
  const tenant = portal.tenantKind === 'organization'
    ? {
        id: dashboards[0].organizationId,
        name: dashboards[0].organizationName || '',
        status: 'active',
        kind: 'organization'
      }
    : { id: user.id, name: userName, status: 'active', kind: 'user' };

  const html = renderV7PortalSource(await readFile(sourceUrl, 'utf8'), {
    role,
    tenant,
    user: { id: user.id, name: userName, email: user.email || '' },
    preferences: resolveAccountPreferences({
      account: user.preferences,
      organization: dashboards[0].preferences,
      acceptLanguage: req.headers['accept-language']
    })
  });

  res.writeHead(200, V7_PORTAL_HTML_HEADERS);
  res.end(html);
  return true;
}
