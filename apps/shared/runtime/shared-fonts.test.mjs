import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { serveSharedFont, sharedFontFiles } from './shared-fonts.mjs';

function response() {
  return {
    status: 0,
    headers: {},
    body: null,
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(body) { this.body = body; }
  };
}

test('ships the self-hosted font files with their OFL licenses', () => {
  const files = sharedFontFiles().sort();
  assert.deepEqual(files, [
    'OFL-IBMPlexSansArabic.txt',
    'OFL-PlusJakartaSans.txt',
    'fonts.css',
    'ibm-plex-sans-arabic-arabic-400-normal.woff2',
    'ibm-plex-sans-arabic-arabic-500-normal.woff2',
    'ibm-plex-sans-arabic-arabic-600-normal.woff2',
    'ibm-plex-sans-arabic-arabic-700-normal.woff2',
    'plus-jakarta-sans-latin-ext-wght-italic.woff2',
    'plus-jakarta-sans-latin-ext-wght-normal.woff2',
    'plus-jakarta-sans-latin-wght-italic.woff2',
    'plus-jakarta-sans-latin-wght-normal.woff2'
  ]);

  const dir = new URL('../assets/fonts/', import.meta.url);
  for (const name of files.filter(f => f.endsWith('.txt'))) {
    assert.match(readFileSync(new URL(name, dir), 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/);
  }

  // Hash pada SOURCE.md harus cocok dengan berkas yang dikirim.
  const source = readFileSync(new URL('SOURCE.md', dir), 'utf8');
  for (const name of files.filter(f => f.endsWith('.woff2'))) {
    const body = readFileSync(new URL(name, dir));
    assert.equal(body.subarray(0, 4).toString('latin1'), 'wOF2', name);
    const hash = createHash('sha256').update(body).digest('hex');
    assert.ok(source.includes(`${hash}  ${name}`), name);
  }

  const css = readFileSync(new URL('fonts.css', dir), 'utf8');
  assert.match(css, /font-family: 'Plus Jakarta Sans'/);
  assert.match(css, /font-family: 'IBM Plex Sans Arabic'/);
  assert.ok(!css.includes('http'));
});

test('serves only listed files under /bff/fonts/', () => {
  const ok = response();
  assert.equal(serveSharedFont({ method: 'GET' }, ok, '/bff/fonts/fonts.css'), true);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers['Content-Type'], 'text/css; charset=utf-8');

  const font = response();
  serveSharedFont({ method: 'GET' }, font, '/bff/fonts/plus-jakarta-sans-latin-wght-normal.woff2');
  assert.equal(font.headers['Content-Type'], 'font/woff2');

  for (const path of ['/bff/fonts/../server/.env', '/bff/fonts/%2e%2e/x', '/bff/fonts/SOURCE.md', '/bff/fonts/']) {
    const res = response();
    assert.equal(serveSharedFont({ method: 'GET' }, res, path), true);
    assert.equal(res.status, 404, path);
  }

  assert.equal(serveSharedFont({ method: 'POST' }, response(), '/bff/fonts/fonts.css'), false);
  assert.equal(serveSharedFont({ method: 'GET' }, response(), '/bff/ui'), false);
});
