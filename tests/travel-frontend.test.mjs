// Uji server frontend Travel production (apps/travel-dashboard/server/frontend.mjs)
// dengan direktori dist sementara dan BFF tiruan lokal (hanya untuk tes ini).
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverPath = fileURLToPath(new URL('../apps/travel-dashboard/server/frontend.mjs', import.meta.url));
const FRONTEND = 4896;
const BFF = 4897;
const PUBLIC = 'https://travel.preview.example';

test('travel production frontend: Marketplace redirect, static assets, BFF proxy with origin mapping', { timeout: 30000 }, async () => {
  const dist = mkdtempSync(join(tmpdir(), 'travel-dist-'));
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'index.html'), '<!doctype html><div id="root"></div><script type="module" src="/assets/app.js"></script>');
  writeFileSync(join(dist, 'assets', 'app.js'), 'console.log(1)');

  const seen = [];
  const bff = http.createServer((req, res) => {
    seen.push({ method: req.method, url: req.url, origin: req.headers.origin, host: req.headers.host });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
  });
  await new Promise(resolve => bff.listen(BFF, '127.0.0.1', resolve));
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, TRAVEL_FRONTEND_PORT: String(FRONTEND), TRAVEL_BFF_PORT: String(BFF), TRAVEL_DIST_DIR: dist, SEGALOKA_PUBLIC_ORIGIN: PUBLIC },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    await new Promise((resolve, reject) => {
      child.stdout.on('data', chunk => { if (String(chunk).includes('travel frontend')) resolve(); });
      child.once('exit', code => reject(new Error(`frontend exited ${code}`)));
    });
    const url = path => `http://127.0.0.1:${FRONTEND}${path}`;

    // Tidak ada form login Travel: halaman mana pun -> handoff Marketplace.
    for (const path of ['/', '/login/apa-saja']) {
      const index = await fetch(url(path), { redirect: 'manual' });
      assert.equal(index.status, 302, path);
      assert.equal(index.headers.get('location'), '/bff/auth/handoff/start');
      assert.equal(index.headers.get('cache-control'), 'no-store');
      assert.match(index.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    }

    const asset = await fetch(url('/assets/app.js'));
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('cache-control'), /immutable/);
    assert.equal((await fetch(url('/assets/tidak-ada.js'))).status, 404);
    // Parser URL menormalkan ../ (juga %2e%2e) sebelum routing: tidak ada
    // berkas di luar dist yang bisa dibaca.
    for (const path of ['/assets/%2e%2e/%2e%2e/package.json', '/assets/../server/bff.mjs', '/assets/..%2f..%2fpackage.json']) {
      const response = await fetch(url(path), { redirect: 'manual' });
      const body = await response.text();
      assert.ok(!body.includes('"name"') && !body.includes('import '), path);
    }

    const post = await fetch(url('/bff/login'), { method: 'POST', headers: { Origin: PUBLIC, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(post.status, 200);
    assert.deepEqual(seen.at(-1), { method: 'POST', url: '/bff/login', origin: `http://127.0.0.1:${FRONTEND}`, host: `127.0.0.1:${BFF}` });

    const foreign = await fetch(url('/bff/login'), { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(foreign.status, 403);
    const noOrigin = await fetch(url('/bff/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(noOrigin.status, 403);
    assert.equal(seen.length, 1, 'request ditolak tidak boleh sampai ke BFF');

    // Callback handoff dari Marketplace diteruskan dengan Origin aslinya
    // (diperiksa BFF); path lain dengan Origin Marketplace tetap ditolak.
    const callback = await fetch(url('/bff/auth/handoff/callback'), {
      method: 'POST', headers: { Origin: 'https://www.segaloka.com', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'ticket=x'
    });
    assert.equal(callback.status, 200);
    assert.deepEqual(seen.at(-1), { method: 'POST', url: '/bff/auth/handoff/callback', origin: 'https://www.segaloka.com', host: `127.0.0.1:${BFF}` });
    const marketplaceElsewhere = await fetch(url('/bff/logout'), { method: 'POST', headers: { Origin: 'https://www.segaloka.com' }, body: '{}' });
    assert.equal(marketplaceElsewhere.status, 403);
    assert.equal(seen.length, 2);

    assert.equal((await fetch(url('/'), { method: 'POST' })).status, 405);
  } finally {
    child.kill();
    bff.close();
    rmSync(dist, { recursive: true, force: true });
  }
});

test('travel production frontend refuses to start without a build', async () => {
  const empty = mkdtempSync(join(tmpdir(), 'travel-empty-'));
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, TRAVEL_FRONTEND_PORT: '4898', TRAVEL_DIST_DIR: empty },
    stdio: ['ignore', 'ignore', 'pipe']
  });
  const code = await new Promise(resolve => child.once('exit', resolve));
  rmSync(empty, { recursive: true, force: true });
  assert.notEqual(code, 0);
});
