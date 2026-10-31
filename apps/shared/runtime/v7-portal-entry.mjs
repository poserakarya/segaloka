import http from 'node:http';
import { existsSync } from 'node:fs';

import { V7_ORIGINAL_SOURCE_URL, V7_PORTALS } from './v7-portal-source.mjs';
import { HANDOFF_CALLBACK_PATH, HANDOFF_START_PATH, marketplaceOrigin } from './bff-marketplace-handoff.mjs';
import { CLIENT_IP_HEADER, createClientIpResolver } from './client-ip.mjs';

// Entry portal: satu origin per dashboard. Dua mode dengan route yang sama:
//   container  createPortalEntryServer: /bff/* diteruskan ke BFF portal di
//              127.0.0.1:<bffPort> (proses terpisah).
//   Vercel     createPortalRequestHandler: /bff/* diproses handler BFF di
//              proses yang sama, tanpa hop 127.0.0.1.
//   GET /, /login, /index.html -> handoff login Marketplace (tanpa form login)
//   GET /health                -> status
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

export function allowedPublicOrigins(port, env = process.env, { includeLocal = true } = {}) {
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

  return new Set([...(includeLocal ? [localEntryOrigin(port)] : []), ...configured]);
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}

// Gerbang Origin untuk /bff/*: callback handoff hanya dari Marketplace;
// request non-GET wajib memakai Origin yang diizinkan; GET dengan Origin
// asing ditolak. Mengembalikan 'handoff', 'allowed', atau 'denied'.
export function bffOriginDecision(req, { origins, handoffOrigin, base }) {
  const origin = req.headers.origin;
  if (handoffOrigin !== null && req.method === 'POST' && origin === handoffOrigin &&
      new URL(req.url, base).pathname === HANDOFF_CALLBACK_PATH) {
    return 'handoff';
  }
  if (!['GET', 'HEAD'].includes(req.method) && (typeof origin !== 'string' || !origins.has(origin))) return 'denied';
  if (origin !== undefined && !origins.has(origin)) return 'denied';
  return 'allowed';
}

// Proxy /bff/* ke BFF lokal dengan pemeriksaan Origin: Origin publik yang
// diizinkan dipetakan ke origin lokal (forwardedOrigin) sebelum diteruskan.
// Dipakai entry portal dan server frontend Travel production.
// IP klien diteruskan ke BFF lewat x-real-ip yang selalu ditimpa di sini
// (peer TCP, atau X-Real-IP dari SEGALOKA_TRUSTED_PROXY_IPS); nilai dari
// klien tidak pernah lolos.
export function createBffProxy({ bffPort, origins, forwardedOrigin, handoffOrigin = null, env = process.env }) {
  const clientIp = createClientIpResolver({ mode: 'proxy', env });
  return function proxyBff(req, res) {
    const decision = bffOriginDecision(req, { origins, handoffOrigin, base: forwardedOrigin });
    if (decision === 'denied') return sendJson(res, 403, { code: 'ORIGIN_NOT_ALLOWED' });

    const headers = { ...req.headers, host: `127.0.0.1:${bffPort}` };
    // Callback handoff: Origin Marketplace diteruskan apa adanya dan
    // diverifikasi ulang oleh BFF.
    if (decision === 'allowed' && req.headers.origin !== undefined) headers.origin = forwardedOrigin;
    delete headers[CLIENT_IP_HEADER];
    const ip = clientIp(req);
    if (ip) headers[CLIENT_IP_HEADER] = ip;
    return forward(req, res, headers);
  };

  function forward(req, res, headers) {
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
  }
}

// Route entry selain /bff/*. Mengembalikan true bila sudah ditangani.
function servePortalRoute(req, res, path, role) {
  if (req.method === 'GET' && path === '/health') {
    sendJson(res, 200, {
      service: `segaloka-${role}`,
      status: 'running',
      source: 'original-v7',
      login: 'marketplace',
      dashboardAccess: 'protected'
    });
    return true;
  }

  if (req.method === 'GET' && (path === '/' || path === '/login' || path === '/index.html')) {
    // Dashboard non-admin tidak memiliki formulir login. BFF memulai
    // handoff login Marketplace (atau langsung ke dashboard bila sesi sah).
    res.writeHead(302, {
      Location: HANDOFF_START_PATH,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end();
    return true;
  }

  sendJson(res, 404, { code: 'NOT_FOUND' });
  return true;
}

function portalPath(req, base) {
  try {
    return new URL(req.url, base).pathname;
  } catch {
    return null;
  }
}

export function createPortalEntryServer({ role, port, bffPort, env = process.env }) {
  if (!V7_PORTALS[role]) throw new Error('INVALID_V7_PORTAL_ROLE');
  if (!existsSync(V7_ORIGINAL_SOURCE_URL)) {
    throw new Error('V7_ORIGINAL_SOURCE_NOT_FOUND');
  }

  const origins = allowedPublicOrigins(port, env);
  const forwardedOrigin = localEntryOrigin(port);

  const proxyBff = createBffProxy({ bffPort, origins, forwardedOrigin, handoffOrigin: marketplaceOrigin(env), env });

  return http.createServer((req, res) => {
    const path = portalPath(req, forwardedOrigin);
    if (path === null) return sendJson(res, 400, { code: 'INVALID_REQUEST' });
    if (path === '/bff' || path.startsWith('/bff/')) return proxyBff(req, res);
    return servePortalRoute(req, res, path, role);
  });
}

// Mode Vercel (satu function per dashboard): handler BFF dipanggil langsung
// dengan IP klien dari header edge Vercel. Origin yang diizinkan hanya
// SEGALOKA_PUBLIC_ORIGIN (tanpa origin loopback).
export function createPortalRequestHandler({ role, handleBff, env = process.env, clientIpMode = 'vercel' }) {
  if (!V7_PORTALS[role]) throw new Error('INVALID_V7_PORTAL_ROLE');
  if (typeof handleBff !== 'function') throw new Error('INVALID_BFF_HANDLER');
  if (!existsSync(V7_ORIGINAL_SOURCE_URL)) throw new Error('V7_ORIGINAL_SOURCE_NOT_FOUND');

  const origins = allowedPublicOrigins(0, env, { includeLocal: false });
  if (origins.size === 0) throw new Error('SEGALOKA_PUBLIC_ORIGIN_REQUIRED');
  const base = [...origins][0];
  const handoffOrigin = marketplaceOrigin(env);
  const clientIp = createClientIpResolver({ mode: clientIpMode, env });

  return async function portalRequestHandler(req, res) {
    const path = portalPath(req, base);
    if (path === null) return sendJson(res, 400, { code: 'INVALID_REQUEST' });
    if (!(path === '/bff' || path.startsWith('/bff/'))) return servePortalRoute(req, res, path, role);
    if (bffOriginDecision(req, { origins, handoffOrigin, base }) === 'denied') {
      return sendJson(res, 403, { code: 'ORIGIN_NOT_ALLOWED' });
    }
    const ip = clientIp(req);
    if (!ip) return sendJson(res, 503, { code: 'CLIENT_IP_UNAVAILABLE' });
    return handleBff(req, res, { clientIp: ip });
  };
}
