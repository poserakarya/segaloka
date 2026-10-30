import { readdirSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';

// Font Segaloka yang di-host sendiri (apps/shared/assets/fonts, SIL OFL 1.1).
// Disajikan publik di /bff/fonts/* oleh setiap BFF agar halaman login dan
// dashboard memakai font yang sama tanpa request ke Google Fonts.

export const FONT_ROUTE_PREFIX = '/bff/fonts/';
export const FONT_STYLESHEET_HREF = '/bff/fonts/fonts.css';
export const FONT_STYLESHEET_LINK =
  `<link rel="stylesheet" href="${FONT_STYLESHEET_HREF}">`;

const FONT_DIR = new URL('../assets/fonts/', import.meta.url);
const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

// Daftar berkas dibaca sekali saat start; hanya nama persis yang dilayani.
const FILES = new Map(
  readdirSync(FONT_DIR)
    .filter(name => Object.hasOwn(TYPES, extname(name)))
    .map(name => [name, {
      type: TYPES[extname(name)],
      body: readFileSync(new URL(name, FONT_DIR))
    }])
);

export function sharedFontFiles() {
  return [...FILES.keys()];
}

export function serveSharedFont(req, res, path) {
  if (
    (req.method !== 'GET' && req.method !== 'HEAD') ||
    !path.startsWith(FONT_ROUTE_PREFIX)
  ) {
    return false;
  }

  const file = FILES.get(path.slice(FONT_ROUTE_PREFIX.length));

  if (!file) {
    res.writeHead(404, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({ code: 'FONT_NOT_FOUND' }));
    return true;
  }

  res.writeHead(200, {
    'Content-Type': file.type,
    'Content-Length': file.body.length,
    'Cache-Control': 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin'
  });
  res.end(req.method === 'HEAD' ? undefined : file.body);
  return true;
}
