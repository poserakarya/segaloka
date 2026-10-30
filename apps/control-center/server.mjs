import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { resolveAccountPreferences } from '../shared/runtime/account-preferences.mjs';
import { allowedPublicOrigins } from '../shared/runtime/v7-portal-entry.mjs';
import { FONT_STYLESHEET_LINK } from '../shared/runtime/shared-fonts.mjs';
import {
  applyFormatPatches,
  createV7Patcher,
  formatScriptBody,
  GOOGLE_FONT_LINKS,
  simulationLockScript
} from '../shared/runtime/v7-portal-source.mjs';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), 'frontend');
const BUNDLE_SCRIPT_TAG = '<script src="/control-center.bundle.js"></script>';
const HTML_CSP = "connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

// Bundle V7 Control Center: format mengikuti preferensi dan state simulasi
// (role/ux) dikunci ke super_admin. Patch gagal aman bila anchor berubah.
// Tanggal booking dari API (ISO) diformat dengan fD V7, yang memakai locale
// dan zona waktu dari preferensi akun (window.__SEGALOKA_FORMAT__).
const CC_BOOKING_DATE_PATCH = [
  "esc(String(b.createdAt || '—'))",
  "esc(Number.isFinite(Date.parse(b.createdAt)) ? fD(Date.parse(b.createdAt), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')"
];

function patchControlCenterBundle(source) {
  const patcher = createV7Patcher('CONTROL_CENTER');
  const formatted = applyFormatPatches(source, patcher);
  const patched = patcher.replaceExactlyOnce(formatted, ...CC_BOOKING_DATE_PATCH, 'cc-booking-date');
  return patched + '\n/* SEGALOKA_CC_SIMULATION_LOCK_V1 */\n' +
    simulationLockScript('super_admin') + '\n' + CONTROL_CENTER_REALTIME_SCRIPT;
}

// Realtime Control Center: event /bff/sync/events memicu pemuat API yang
// sudah ada (ccLoadBookings, cc-summary-refresh) untuk halaman yang aktif.
const CONTROL_CENTER_REALTIME_SCRIPT = `
/* SEGALOKA_CC_REALTIME_V1 */
(() => {
  const ccSync = window.__SEGALOKA_CC_SYNC__ = { connected: false, lastEventId: null, reloads: 0 };
  let events = null;
  let timer = null;
  // Halaman dengan endpoint API dimuat ulang memakai aksi refresh yang sudah
  // ada (mempertahankan pencarian, filter, dan paginasi yang aktif).
  // Vendor belum memiliki event outbox sehingga tidak termasuk.
  const reloadActivePage = () => {
    const path = (location.hash.replace(/^#/, '') || '').split('?')[0];
    const detail = path.match(/^\\/travel\\/([0-9a-f-]{36})(?:\\/([a-z-]+))?$/i);
    let reload = null;
    if (path === '/booking') {
      const q = document.getElementById('cc-booking-q');
      const s = document.getElementById('cc-booking-status');
      reload = () => ccLoadBookings(q ? q.value : '', s ? s.value : '');
    } else if (path === '/overview') reload = A['cc-summary-refresh'];
    else if (path === '/compliance/audit') reload = A['cc-audit-refresh'];
    else if (path === '/travel') reload = A['cc-travel-refresh'];
    else if (path === '/travel/branches') reload = A['cc-branches-refresh'];
    else if (detail) {
      reload = () => {
        ccLoadTravelDetail(detail[1]);
        if (detail[2] === 'branches') ccLoadTravelBranches(detail[1]);
      };
    }
    if (!reload) return;
    ccSync.reloads += 1;
    ccSync.lastReloadPath = path;
    reload();
  };
  const open = () => {
    events = new EventSource(ccSync.lastEventId ? '/bff/sync/events?after=' + encodeURIComponent(ccSync.lastEventId) : '/bff/sync/events');
    events.addEventListener('ready', event => {
      ccSync.connected = true;
      if (/^\\d+$/.test(event.lastEventId) && !ccSync.lastEventId) ccSync.lastEventId = event.lastEventId;
    });
    events.addEventListener('change', event => {
      if (!/^\\d+$/.test(event.lastEventId)) return;
      if (ccSync.lastEventId && BigInt(event.lastEventId) <= BigInt(ccSync.lastEventId)) return;
      ccSync.lastEventId = event.lastEventId;
      reloadActivePage();
    });
    const recover = () => {
      ccSync.connected = false;
      if (events) events.close();
      events = null;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const response = await fetch('/bff/dashboard/access', { credentials: 'same-origin', cache: 'no-store' });
          if (response.status === 401 || response.status === 403) {
            window.location.replace('/login');
            return;
          }
        } catch (_) {}
        reloadActivePage();
        open();
      }, 3000);
    };
    events.addEventListener('auth.expired', recover);
    events.addEventListener('sync.error', recover);
    events.addEventListener('error', () => {
      if (!events || events.readyState === EventSource.CLOSED) recover();
      else ccSync.connected = false;
    });
  };
  open();
})();
`;

function patchControlCenterHtml(source, preferences) {
  const patcher = createV7Patcher('CONTROL_CENTER');
  let html = patcher.replaceExactlyOnce(
    source, GOOGLE_FONT_LINKS, FONT_STYLESHEET_LINK, 'self-hosted-fonts'
  );
  html = patcher.replaceExactlyOnce(
    html,
    BUNDLE_SCRIPT_TAG,
    `<script>${formatScriptBody(preferences)}</script>${BUNDLE_SCRIPT_TAG}`,
    'format-context'
  );
  return html;
}

// Preferensi akun (/bff/me) bila tersedia; selain itu Accept-Language.
function readAccountPreferences(req) {
  return new Promise(resolve => {
    const done = account => resolve(resolveAccountPreferences({
      account,
      acceptLanguage: req.headers['accept-language']
    }));
    const check = http.request({
      hostname: '127.0.0.1',
      port: Number(process.env.SEGALOKA_CONTROL_CENTER_BFF_PORT || 4203),
      method: 'GET',
      path: '/bff/me',
      headers: { cookie: req.headers.cookie || '', accept: 'application/json' },
      timeout: 5000
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          done(response.statusCode === 200 ? data?.user?.preferences : undefined);
        } catch {
          done(undefined);
        }
      });
    });
    check.on('timeout', () => check.destroy());
    check.on('error', () => done(undefined));
    check.end();
  });
}
const LOGIN_FILE = join(FRONTEND_DIR, 'control-center-login.html');

async function hasControlCenterAccess(req) {
  return new Promise(resolve => {
    const check = http.request({
      hostname: '127.0.0.1',
      port: Number(process.env.SEGALOKA_CONTROL_CENTER_BFF_PORT || 4203),
      method: 'GET',
      path: '/bff/dashboard/access',
      headers: {
        cookie: req.headers.cookie || '',
        accept: 'application/json'
      },
      timeout: 5000
    }, response => {
      const chunks = [];

      response.on('data', chunk => chunks.push(chunk));

      response.on('end', () => {
        console.log('[CC ACCESS CHECK]', {
          upstreamStatus: response.statusCode,
          browserCookiePresent: Boolean(req.headers.cookie),
          cookieNamePresent: (req.headers.cookie || '')
            .split(';')
            .some(part => part.trim().startsWith('segaloka_control_center_session='))
        });

        if (response.statusCode !== 200) {
          resolve(false);
          return;
        }

        try {
          const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          resolve(
            data !== null &&
            typeof data === 'object' &&
            !Array.isArray(data) &&
            data.authenticated === true &&
            data.workspaceSwitching === false &&
            Array.isArray(data.dashboards) &&
            data.dashboards.some(item =>
              item !== null &&
              typeof item === 'object' &&
              item.dashboard === 'control-center' &&
              item.role === 'super_admin' &&
              item.organizationId === null
            )
          );
        } catch {
          resolve(false);
        }
      });
    });

    check.on('timeout', () => check.destroy());
    check.on('error', () => resolve(false));
    check.end();
  });
}
import http from 'node:http';

function proxyBff(req, res) {
  const origin = req.headers.origin;
  // Origin lokal entry ini, plus origin publik (mis. URL staging) dari
  // SEGALOKA_PUBLIC_ORIGIN.
  const allowedOrigins = allowedPublicOrigins(PORT);

  if (origin !== undefined && !allowedOrigins.has(origin)) {
    res.writeHead(403, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({ code: 'ORIGIN_FORBIDDEN' }));
    return;
  }

  const headers = { ...req.headers };
  const bffPort = Number(process.env.SEGALOKA_CONTROL_CENTER_BFF_PORT || 4203);
  headers.host = `127.0.0.1:${bffPort}`;

  if (origin !== undefined) {
    headers.origin = `http://127.0.0.1:${bffPort}`;
  }

  delete headers.connection;
  delete headers['proxy-connection'];

  const upstream = http.request({
    hostname: '127.0.0.1',
    port: bffPort,
    method: req.method,
    path: req.url,
    headers,
    timeout: 10000
  }, upstreamResponse => {
    const responseHeaders = { ...upstreamResponse.headers };

    delete responseHeaders.connection;
    delete responseHeaders['transfer-encoding'];

    res.writeHead(
      upstreamResponse.statusCode ?? 502,
      responseHeaders
    );

    upstreamResponse.pipe(res);
  });

  upstream.on('timeout', () => {
    upstream.destroy(new Error('BFF_TIMEOUT'));
  });

  upstream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({ code: 'BFF_UNAVAILABLE' }));
    } else {
      res.destroy();
    }
  });

  req.pipe(upstream);
}

const HOST = '127.0.0.1';
const requestedPort = Number(process.env.SEGALOKA_CONTROL_CENTER_PORT || 4202);
if (!Number.isInteger(requestedPort) || requestedPort < 1024 || requestedPort > 65535) {
  throw new Error('Invalid SEGALOKA_CONTROL_CENTER_PORT');
}
const PORT = requestedPort;

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, `http://${HOST}:${PORT}`).pathname;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET' && path === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      application: 'control-center'
    }));
    return;
  }

  if (path === '/bff' || path.startsWith('/bff/')) {
    proxyBff(req, res);
    return;
  }

  if (req.method === 'GET' && path === '/runtime') {
    const remoteAddress = req.socket.remoteAddress;
    if (remoteAddress !== '127.0.0.1' &&
        remoteAddress !== '::1' &&
        remoteAddress !== '::ffff:127.0.0.1') {
      res.writeHead(403);
      res.end(JSON.stringify({ code: 'FORBIDDEN' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify({
      application: 'control-center',
      requiredRole: 'super_admin',
      workspaceSwitching: false,
      frontendIntegrated: false,
      apiIntegrated: false
    }));
    return;
  }

  if (req.method === 'GET' && path === '/login') {
    try {
      const html = await readFile(LOGIN_FILE);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer'
      });
      res.end(html);
    } catch {
      res.writeHead(500);
      res.end(JSON.stringify({ code: 'LOGIN_UNAVAILABLE' }));
    }
    return;
  }

  // SEGALOKA_CC_BUNDLE_ROUTE_V1
  if (req.method === 'GET' && path === '/control-center.bundle.js') {
    const allowed = await hasControlCenterAccess(req);

    if (!allowed) {
      res.writeHead(401, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({
        code: 'CONTROL_CENTER_ACCESS_REQUIRED'
      }));
      return;
    }

    try {
      const script = patchControlCenterBundle(await readFile(
        join(FRONTEND_DIR, 'control-center.bundle.js'),
        'utf8'
      ));

      res.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });

      res.end(script);
    } catch {
      res.writeHead(500);
      res.end(JSON.stringify({
        code: 'CONTROL_CENTER_BUNDLE_UNAVAILABLE'
      }));
    }

    return;
  }
  // SEGALOKA_CC_FRONTEND_ROUTE_V1
  if (req.method === 'GET' && (path === '/' || path === '/index.html' || path === '/dashboard')) {
    const allowed = await hasControlCenterAccess(req);

    // Entry Control Center: tanpa sesi ke halaman login, dengan sesi ke
    // dashboard. Tidak ada halaman gerbang terpisah.
    if (!allowed || path !== '/dashboard') {
      res.writeHead(302, {
        Location: allowed ? '/dashboard' : '/login',
        'Cache-Control': 'no-store'
      });
      res.end();
      return;
    }

    try {
      const html = patchControlCenterHtml(
        await readFile(join(FRONTEND_DIR, 'control-center.html'), 'utf8'),
        await readAccountPreferences(req)
      );

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': HTML_CSP
      });

      res.end(html);
    } catch {
      res.writeHead(500);
      res.end(JSON.stringify({ code: 'FRONTEND_UNAVAILABLE' }));
    }

    return;
  }

  if (path === '/p' || path.startsWith('/p/')) {
    res.writeHead(404);
    res.end(JSON.stringify({ code: 'ROLE_ROUTE_FORBIDDEN' }));
    return;
  }
  res.writeHead(404);
  res.end(JSON.stringify({ code: 'NOT_FOUND' }));
});

server.listen(PORT, HOST, () => {
  console.log(`Control Center runtime listening on ${HOST}:${PORT}`);
});
