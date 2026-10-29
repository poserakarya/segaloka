// Uji kebijakan aksi Control Center V7 (control-center.bundle.js) di Chromium:
// 20 aksi cc-* tetap membaca API, aksi bisnis non-persisten ditolak dengan
// pesan jujur, dan signout memakai /bff/logout.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import {
  buildV7ActionGuardScript,
  V7_ACTION_BLOCKED_MESSAGE
} from '../shared/runtime/v7-action-policy.mjs';

let chromium = null;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  chromium = null;
}

const html = await readFile(new URL('./frontend/control-center.html', import.meta.url), 'utf8');
const bundle = await readFile(new URL('./frontend/control-center.bundle.js', import.meta.url), 'utf8');
const ccActions = [...new Set([...bundle.matchAll(/data-act="(cc-[a-z0-9-]+)"/g)].map(m => m[1]))].sort();

test('bundle embeds the shared action guard with all 20 cc-* API actions allowed', () => {
  assert.equal(ccActions.length, 20);
  assert.ok(bundle.includes('/* SEGALOKA_CC_ACTION_POLICY_V1'));
  assert.ok(bundle.includes(buildV7ActionGuardScript({ overrides: [...ccActions, 'signout'] })));
});

test('Control Center V7 keeps cc-* API reads and blocks non-persistent actions', {
  skip: chromium ? false : 'playwright tidak tersedia',
  timeout: 120000
}, async () => {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push(`${req.method} ${req.url.split('?')[0]}`);
    if (req.url === '/dashboard' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    if (req.url === '/control-center.bundle.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      return res.end(bundle);
    }
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 'SERVICE_UNAVAILABLE' }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
    await page.goto(`${origin}/dashboard#/overview`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__SEGALOKA_V7_ACTION_POLICY__);

    // Aksi cc-* tetap memanggil BFF.
    requests.length = 0;
    await page.evaluate(() => A['cc-summary-refresh']());
    await page.waitForTimeout(300);
    assert.ok(requests.includes('GET /bff/control-center/summary'), requests.join(','));

    requests.length = 0;
    await page.evaluate(() => { location.hash = '#/travel'; });
    await page.waitForTimeout(300);
    await page.evaluate(() => A['cc-travel-refresh']());
    await page.waitForTimeout(300);
    assert.ok(requests.includes('GET /bff/control-center/travels'), requests.join(','));

    // Aksi bisnis non-persisten ditolak tanpa sukses palsu.
    for (const action of ['confirm-ok', 'pay-go', 'sync-now', 'travel-status', 'wd-go']) {
      await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
      await page.evaluate(name => A[name]({ dataset: {} }), action);
      const text = await page.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.innerText).join(' '));
      assert.ok(text.includes(V7_ACTION_BLOCKED_MESSAGE), `${action}: ${text}`);
      assert.ok(!/berhasil|tersimpan|Sinkron selesai/i.test(text), `${action}: ${text}`);
    }

    // Klik pada data-act terblokir dicegat sebelum handler V7.
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.dataset.act = 'role';
      button.dataset.v = 'finance_ops';
      button.id = 'policy-probe';
      button.textContent = 'probe';
      button.style.cssText = 'position:fixed;top:0;left:0;z-index:99999';
      document.body.appendChild(button);
    });
    const roleBefore = await page.evaluate(() => S.role);
    await page.click('#policy-probe');
    assert.equal(await page.evaluate(() => S.role), roleBefore);

    // Navigasi tetap berjalan.
    await page.evaluate(() => A.nav({ dataset: { r: '/compliance/audit' } }));
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => location.hash), '#/compliance/audit');

    requests.length = 0;
    await page.evaluate(() => A.signout());
    await page.waitForTimeout(300);
    assert.ok(requests.includes('POST /bff/logout'), requests.join(','));

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});
