// Gerbang akses lingkungan pratinjau (bukan production).
//
// Satu port publik per dashboard. Setiap request wajib HTTP Basic Auth
// (kredensial dari env, dibandingkan constant-time). Setelah lolos, request
// diteruskan ke entry server lokal dengan Host/Origin/Referer lokal sehingga
// pemeriksaan origin dan CSRF di entry/BFF tetap berlaku: Origin publik yang
// tidak cocok ditolak di sini. Mendukung SSE (streaming) dan WebSocket
// (HMR Vite). Header Authorization milik gerbang tidak diteruskan.
//
//   PREVIEW_GATE_USER, PREVIEW_GATE_PASSWORD   kredensial gerbang (wajib)
//   PREVIEW_GATE_ROUTES   "8101=4902,8102=4900,..." (port publik = port lokal)
import http from 'node:http';
import net from 'node:net';
import { createHash, timingSafeEqual } from 'node:crypto';

const user = process.env.PREVIEW_GATE_USER || '';
const password = process.env.PREVIEW_GATE_PASSWORD || '';
if (user.length < 4 || password.length < 16) {
  throw new Error('PREVIEW_GATE_CREDENTIALS_REQUIRED');
}
const routes = (process.env.PREVIEW_GATE_ROUTES || '')
  .split(',')
  .filter(Boolean)
  .map(pair => pair.split('=').map(Number));
if (!routes.length || routes.some(([a, b]) => !Number.isInteger(a) || !Number.isInteger(b))) {
  throw new Error('PREVIEW_GATE_ROUTES_INVALID');
}

const digest = value => createHash('sha256').update(value).digest();
const expected = digest(`${user}:${password}`);
const failures = new Map();
const LOCK_LIMIT = 20;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

function clientKey(req) {
  // Entri terakhir ditambahkan oleh proxy platform; entri awal bisa dipalsukan klien.
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').at(-1).trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function authorized(req) {
  const key = clientKey(req);
  const entry = failures.get(key);
  if (entry && entry.count >= LOCK_LIMIT && Date.now() - entry.first < LOCK_WINDOW_MS) return 'locked';
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Basic ([A-Za-z0-9+/=]+)$/);
  const ok = match ? timingSafeEqual(digest(Buffer.from(match[1], 'base64').toString('utf8')), expected) : false;
  if (ok) {
    failures.delete(key);
    return 'ok';
  }
  if (header) {
    const current = entry && Date.now() - entry.first < LOCK_WINDOW_MS ? entry : { count: 0, first: Date.now() };
    current.count += 1;
    failures.set(key, current);
  }
  return 'denied';
}

function publicOrigin(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `https://${host}`;
}

function forwardHeaders(req, localOrigin) {
  const headers = { ...req.headers, host: localOrigin.slice('http://'.length) };
  delete headers.authorization;
  delete headers['x-forwarded-for'];
  delete headers['x-forwarded-host'];
  delete headers['x-forwarded-proto'];
  if (headers.origin !== undefined) headers.origin = localOrigin;
  if (typeof headers.referer === 'string' && headers.referer.startsWith(publicOrigin(req) + '/')) {
    headers.referer = localOrigin + headers.referer.slice(publicOrigin(req).length);
  }
  return headers;
}

function originAllowed(req) {
  return req.headers.origin === undefined || req.headers.origin === publicOrigin(req);
}

function deny(res, status, body, extra = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    ...extra
  });
  res.end(body);
}

for (const [publicPort, localPort] of routes) {
  const localOrigin = `http://127.0.0.1:${localPort}`;

  const server = http.createServer((req, res) => {
    const state = authorized(req);
    if (state === 'locked') return deny(res, 429, 'Terlalu banyak percobaan. Coba lagi nanti.');
    if (state !== 'ok') {
      return deny(res, 401, 'Akses pratinjau Segaloka memerlukan kredensial.', {
        'WWW-Authenticate': 'Basic realm="Segaloka Preview", charset="UTF-8"'
      });
    }
    if (!originAllowed(req)) return deny(res, 403, 'Origin tidak diizinkan.');

    const upstream = http.request({
      hostname: '127.0.0.1',
      port: localPort,
      method: req.method,
      path: req.url,
      headers: forwardHeaders(req, localOrigin)
    }, upstreamResponse => {
      const headers = { ...upstreamResponse.headers, 'x-robots-tag': 'noindex, nofollow' };
      if (typeof headers.location === 'string' && headers.location.startsWith(localOrigin)) {
        headers.location = publicOrigin(req) + headers.location.slice(localOrigin.length);
      }
      res.writeHead(upstreamResponse.statusCode ?? 502, headers);
      res.flushHeaders?.();
      upstreamResponse.pipe(res);
    });
    upstream.on('error', () => {
      if (!res.headersSent) deny(res, 502, 'Layanan pratinjau belum siap.');
      else res.destroy();
    });
    res.on('close', () => upstream.destroy());
    req.pipe(upstream);
  });

  // WebSocket (HMR Vite) dengan autentikasi dan pemeriksaan origin yang sama.
  server.on('upgrade', (req, socket, head) => {
    if (authorized(req) !== 'ok' || !originAllowed(req)) {
      socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      return;
    }
    const target = net.connect(localPort, '127.0.0.1', () => {
      const headers = forwardHeaders(req, localOrigin);
      const lines = [`${req.method} ${req.url} HTTP/1.1`];
      for (const [name, value] of Object.entries(headers)) {
        for (const item of Array.isArray(value) ? value : [value]) lines.push(`${name}: ${item}`);
      }
      target.write(lines.join('\r\n') + '\r\n\r\n');
      if (head?.length) target.write(head);
      socket.pipe(target).pipe(socket);
    });
    target.on('error', () => socket.destroy());
    socket.on('error', () => target.destroy());
  });

  server.listen(publicPort, '0.0.0.0', () => {
    console.log(`[preview-gate] :${publicPort} -> ${localOrigin}`);
  });
}
