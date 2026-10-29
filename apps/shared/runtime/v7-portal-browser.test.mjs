// Uji render nyata di Chromium untuk lima portal V7. Dilewati bila
// Playwright tidak terpasang di mesin pengujian.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import {
  renderV7PortalSource,
  V7_PORTAL_HTML_HEADERS,
  V7_PORTALS
} from './v7-portal-source.mjs';
import { V7_ACTION_BLOCKED_MESSAGE } from './v7-action-policy.mjs';

let chromium = null;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  chromium = null;
}

const source = await readFile(
  new URL('../../travel-dashboard/original-v7/travel-existing.html', import.meta.url),
  'utf8'
);
const USER = '11111111-1111-4111-8111-111111111111';
const ORG = '22222222-2222-4222-8222-222222222222';

test('five V7 portals render in Chromium without script errors or external requests', {
  skip: chromium ? false : 'playwright tidak tersedia',
  timeout: 240000
}, async () => {
  let html = '';
  let role = '';
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/bff/ui')) {
      res.writeHead(200, V7_PORTAL_HTML_HEADERS);
      return res.end(html);
    }
    if (req.url === '/bff/dashboard/access') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        authenticated: true,
        workspaceSwitching: false,
        dashboards: [{
          dashboard: role,
          role,
          organizationId: role === 'vendor' ? ORG : null
        }]
      }));
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();

  try {
    for (role of Object.keys(V7_PORTALS)) {
      const tenant = role === 'vendor'
        ? { id: ORG, name: 'Organisasi Uji', status: 'active', kind: 'organization' }
        : { id: USER, name: 'Akun Uji', status: 'active', kind: 'user' };
      html = renderV7PortalSource(source, {
        role,
        tenant,
        user: { id: USER, name: 'Akun Uji', email: 'uji@example.invalid' }
      });

      const page = await browser.newPage();
      const pageErrors = [];
      const externalRequests = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.origin !== origin) externalRequests.push(url.hostname);
      });
      // Font Google tidak dimuat dalam pengujian offline.
      await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());

      await page.goto(`${origin}/bff/ui`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.SegalokaPortalRuntime);
      await page.waitForTimeout(300);

      const routes = await page.evaluate(r => PNAV[r].map(item => `#/p/${r}${item[2]}`), role);
      for (const hash of routes) {
        await page.evaluate(h => { location.hash = h; }, hash);
        await page.waitForTimeout(150);
        assert.equal(await page.evaluate(() => location.hash), hash, `${role} ${hash}`);
      }

      await page.evaluate(() => { location.hash = '#/travel'; });
      await page.waitForTimeout(150);
      assert.match(await page.evaluate(() => location.hash), new RegExp(`^#/p/${role}`));

      await page.evaluate(() => A['confirm-ok']({ dataset: {} }));
      const toastText = await page.evaluate(() =>
        [...document.querySelectorAll('.toast')].map(item => item.innerText).join(' ')
      );
      assert.ok(toastText.includes(V7_ACTION_BLOCKED_MESSAGE), role);

      assert.equal(
        await page.evaluate(async () => {
          try { await sql('select 1'); return 'reached'; } catch (error) { return error.message; }
        }),
        'LEGACY_GATEWAY_DISABLED'
      );
      assert.equal(
        await page.evaluate(async () => {
          try { await fetch('https://example.invalid/legacy'); return 'reached'; } catch { return 'blocked'; }
        }),
        'blocked'
      );

      const runtime = await page.evaluate(() => window.SegalokaPortalRuntime);
      assert.deepEqual(runtime, {
        source: 'original-v7',
        role,
        readOnly: true,
        tenantId: tenant.id
      });
      assert.ok(await page.evaluate(() => !!document.getElementById('work')));
      assert.deepEqual(pageErrors, [], role);
      assert.deepEqual(
        externalRequests.filter(host => !/fonts\.(googleapis|gstatic)\.com$/.test(host)),
        [],
        role
      );
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});
