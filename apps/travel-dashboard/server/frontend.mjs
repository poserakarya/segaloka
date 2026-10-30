// Server frontend Travel untuk production: menyajikan hasil `vite build`
// (halaman login Travel) dan meneruskan /bff/* ke BFF Travel lokal dengan
// pemeriksaan Origin yang sama seperti entry portal. Dashboard V7 sendiri
// tetap disajikan BFF di /bff/dashboard. Pengganti server dev Vite; UI tidak
// berubah.
//
//   TRAVEL_FRONTEND_PORT   default 4200
//   TRAVEL_BFF_PORT        default 4201
//   TRAVEL_DIST_DIR        default apps/travel-dashboard/dist
//   SEGALOKA_PUBLIC_ORIGIN origin publik yang diizinkan (koma)
//   SEGALOKA_ENTRY_HOST    alamat bind (default 127.0.0.1)
import http from 'node:http';
import { createReadStream, existsSync, realpathSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  allowedPublicOrigins,
  createBffProxy,
  entryBindHost,
  localEntryOrigin
} from '../../shared/runtime/v7-portal-entry.mjs';

const port = Number(process.env.TRAVEL_FRONTEND_PORT || 4200);
const bffPort = Number(process.env.TRAVEL_BFF_PORT || 4201);
for (const value of [port, bffPort]) {
  if (!Number.isInteger(value) || value < 1024 || value > 65535) throw new Error('INVALID_TRAVEL_PORT');
}
const distDir = resolve(process.env.TRAVEL_DIST_DIR ||
  fileURLToPath(new URL('../dist/', import.meta.url)));
if (!existsSync(resolve(distDir, 'index.html'))) throw new Error('TRAVEL_DIST_NOT_BUILT');
const distRoot = realpathSync(distDir);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2'
};
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; connect-src 'self'; font-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};

const proxyBff = createBffProxy({
  bffPort,
  origins: allowedPublicOrigins(port),
  forwardedOrigin: localEntryOrigin(port)
});

function sendFile(res, file, cacheControl) {
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    'Cache-Control': cacheControl
  });
  createReadStream(file).pipe(res);
}

export const server = http.createServer((req, res) => {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, localEntryOrigin(port)).pathname);
  } catch {
    res.writeHead(400, SECURITY_HEADERS);
    return res.end();
  }

  if (path === '/bff' || path.startsWith('/bff/')) return proxyBff(req, res);

  if (req.method === 'GET' && path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ service: 'segaloka-travel-frontend', status: 'running' }));
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { ...SECURITY_HEADERS, Allow: 'GET, HEAD' });
    return res.end();
  }

  if (path.startsWith('/assets/')) {
    const file = resolve(distRoot, '.' + path);
    if (!file.startsWith(distRoot + sep) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, SECURITY_HEADERS);
      return res.end();
    }
    return sendFile(res, file, 'public, max-age=31536000, immutable');
  }

  // Semua rute lain memakai halaman login Travel (SPA).
  return sendFile(res, resolve(distRoot, 'index.html'), 'no-store');
});

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(port, entryBindHost(), () => {
    console.log(`Segaloka travel frontend: http://${entryBindHost()}:${port}`);
  });
}
