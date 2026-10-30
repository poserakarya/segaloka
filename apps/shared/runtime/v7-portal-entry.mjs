import http from 'node:http';
import { existsSync } from 'node:fs';

import { resolveAccountPreferences } from './account-preferences.mjs';
import { renderV7LoginPage, v7StyleBlock, V7_LOGIN_HTML_HEADERS } from './v7-login-page.mjs';
import { V7_ORIGINAL_SOURCE_URL, V7_PORTALS } from './v7-portal-source.mjs';

// Entry server portal: satu origin per dashboard.
//   GET /, /login  -> halaman login V7 portal ini
//   /bff/*         -> diteruskan ke BFF portal (127.0.0.1:<bffPort>)
//   GET /health    -> status
// Request non-GET wajib memakai Origin entry ini (atau origin publik yang
// dikonfigurasi lewat SEGALOKA_PUBLIC_ORIGIN, mis. URL staging). Origin
// diteruskan ke BFF sebagai http://127.0.0.1:<port>, satu-satunya origin
// yang diterima BFF portal.

export function localEntryOrigin(port) {
  return `http://127.0.0.1:${port}`;
}

// Alamat bind entry server. Default loopback; di container yang berada di
// belakang reverse proxy dapat diset 0.0.0.0 lewat SEGALOKA_ENTRY_HOST.
// BFF tetap hanya mendengarkan 127.0.0.1.
export function entryBindHost(env = process.env) {
  const host = env.SEGALOKA_ENTRY_HOST || '127.0.0.1';
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) && host !== '::') {
    throw new Error('INVALID_SEGALOKA_ENTRY_HOST');
  }
  return host;
}

export function allowedPublicOrigins(port, env = process.env) {
  const configured = (env.SEGALOKA_PUBLIC_ORIGIN || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => {
      try {
        return new URL(value).origin;
      } catch {
        throw new Error('INVALID_SEGALOKA_PUBLIC_ORIGIN');
      }
    });

  return new Set([localEntryOrigin(port), ...configured]);
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}

// Proxy /bff/* ke BFF lokal dengan pemeriksaan Origin: Origin publik yang
// diizinkan dipetakan ke origin lokal (forwardedOrigin) sebelum diteruskan.
// Dipakai entry portal dan server frontend Travel production.
export function createBffProxy({ bffPort, origins, forwardedOrigin }) {
  return function proxyBff(req, res) {
    const origin = req.headers.origin;

    if (
      !['GET', 'HEAD'].includes(req.method) &&
      (typeof origin !== 'string' || !origins.has(origin))
    ) {
      return sendJson(res, 403, { code: 'ORIGIN_NOT_ALLOWED' });
    }

    if (origin !== undefined && !origins.has(origin)) {
      return sendJson(res, 403, { code: 'ORIGIN_NOT_ALLOWED' });
    }

    const headers = { ...req.headers, host: `127.0.0.1:${bffPort}` };
    if (origin !== undefined) headers.origin = forwardedOrigin;
    delete headers.connection;
    delete headers['proxy-connection'];

    const upstream = http.request({
      hostname: '127.0.0.1',
      port: bffPort,
      method: req.method,
      path: req.url,
      headers
    }, upstreamResponse => {
      const responseHeaders = { ...upstreamResponse.headers };
      delete responseHeaders.connection;
      res.writeHead(upstreamResponse.statusCode ?? 502, responseHeaders);
      upstreamResponse.pipe(res);
    });

    // Koneksi SSE boleh lama; hanya tahap koneksi awal yang dibatasi.
    upstream.setTimeout(10000, () => {
      if (!res.headersSent) upstream.destroy(new Error('BFF_TIMEOUT'));
    });
    upstream.on('error', () => {
      if (!res.headersSent) sendJson(res, 502, { code: 'BFF_UNAVAILABLE' });
      else res.destroy();
    });
    res.on('close', () => upstream.destroy());
    req.pipe(upstream);
  };
}

export function createPortalEntryServer({ role, port, bffPort, env = process.env }) {
  if (!V7_PORTALS[role]) throw new Error('INVALID_V7_PORTAL_ROLE');
  if (!existsSync(V7_ORIGINAL_SOURCE_URL)) {
    throw new Error('V7_ORIGINAL_SOURCE_NOT_FOUND');
  }

  const styleBlock = v7StyleBlock();
  const origins = allowedPublicOrigins(port, env);
  const forwardedOrigin = localEntryOrigin(port);

  const proxyBff = createBffProxy({ bffPort, origins, forwardedOrigin });

  return http.createServer((req, res) => {
    let path;
    try {
      path = new URL(req.url, forwardedOrigin).pathname;
    } catch {
      return sendJson(res, 400, { code: 'INVALID_REQUEST' });
    }

    if (path === '/bff' || path.startsWith('/bff/')) {
      return proxyBff(req, res);
    }

    if (req.method === 'GET' && path === '/health') {
      return sendJson(res, 200, {
        service: `segaloka-${role}`,
        status: 'running',
        source: 'original-v7',
        login: 'v7-login',
        dashboardAccess: 'protected'
      });
    }

    if (req.method === 'GET' && (path === '/' || path === '/login' || path === '/index.html')) {
      const html = renderV7LoginPage({
        role,
        styleBlock,
        preferences: resolveAccountPreferences({
          acceptLanguage: req.headers['accept-language']
        })
      });
      res.writeHead(200, V7_LOGIN_HTML_HEADERS);
      return res.end(html);
    }

    return sendJson(res, 404, { code: 'NOT_FOUND' });
  });
}
