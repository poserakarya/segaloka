// Uji login Control Center yang aktif: entry server.mjs (gerbang sesi untuk
// /, /dashboard, dan bundle) dan halaman frontend/control-center-login.html di
// Chromium, di depan BFF tiruan khusus tes. Menggantikan uji lama terhadap
// public/index.html yang tidak lagi disajikan sejak Fase A (/ -> /login).
// Alur 2FA (TOTP/OTP) diuji di control-center-login-totp.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { startControlCenter } from './test-support/control-center-harness.mjs';

let chromium = null;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  chromium = null;
}

test('tanpa sesi, login ditampilkan dan akses dashboard tidak diteruskan', async () => {
  const cc = await startControlCenter();
  try {
    for (const path of ['/', '/dashboard', '/index.html']) {
      const response = await cc.fetch(path, { redirect: 'manual' });
      assert.equal(response.status, 302, path);
      assert.equal(response.headers.get('location'), '/login', path);
    }
    const login = await cc.fetch('/login');
    assert.equal(login.status, 200);
    assert.match(await login.text(), /id="email"[\s\S]*id="password"/);
    assert.equal((await cc.fetch('/control-center.bundle.js')).status, 401);
  } finally {
    await cc.stop();
  }
});

test('role selain super_admin tidak diarahkan ke dashboard V7', async () => {
  const cc = await startControlCenter();
  try {
    const dashboard = await cc.fetch('/dashboard', { session: 'travel', redirect: 'manual' });
    assert.equal(dashboard.status, 302);
    assert.equal(dashboard.headers.get('location'), '/login');
    assert.equal((await cc.fetch('/control-center.bundle.js', { session: 'travel' })).status, 401);
    const admin = await cc.fetch('/', { session: 'admin', redirect: 'manual' });
    assert.equal(admin.headers.get('location'), '/dashboard');
  } finally {
    await cc.stop();
  }
});

async function loginInBrowser(cc, email) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ locale: 'id-ID' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(cc.origin + '/login');
  await page.fill('#email', email);
  await page.fill('#password', 'kata-sandi-uji');
  await page.click('#submit');
  return { browser, page, errors };
}

test('login super_admin memeriksa akses lalu redirect ke /dashboard', {
  skip: chromium ? false : 'playwright tidak tersedia',
  timeout: 60000
}, async () => {
  const cc = await startControlCenter({
    loginResult: body => body.email === 'admin@example.test'
      ? { status: 200, body: { authenticated: true }, session: 'admin' }
      : { status: 401, body: { code: 'INVALID_CREDENTIALS' } }
  });
  const { browser, page, errors } = await loginInBrowser(cc, 'admin@example.test');
  try {
    await page.waitForURL(/\/dashboard#\/travel$/, { timeout: 30000 });
    const bffCalls = cc.requests.filter(r => r.path.startsWith('/bff/login') || r.path === '/bff/logout');
    assert.deepEqual(bffCalls.map(r => r.path), ['/bff/login']);
    assert.deepEqual(bffCalls[0].body, { email: 'admin@example.test', password: 'kata-sandi-uji' });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await cc.stop();
  }
});

test('login role lain yang ditolak BFF tetap berada di halaman login', {
  skip: chromium ? false : 'playwright tidak tersedia',
  timeout: 60000
}, async () => {
  const cc = await startControlCenter({
    loginResult: body => body.email === 'travel@example.test'
      ? { status: 200, body: { authenticated: true }, session: 'travel' }
      : { status: 403, body: { code: 'SUPER_ADMIN_ACCESS_REQUIRED', message: 'Akun tidak memiliki akses Control Center.' } }
  });
  try {
    // Ditolak BFF: pesan ditampilkan, password dikosongkan.
    let run = await loginInBrowser(cc, 'vendor@example.test');
    await run.page.waitForSelector('#error:not([hidden])');
    assert.equal(await run.page.textContent('#error'), 'Akun tidak memiliki akses Control Center.');
    assert.equal(await run.page.inputValue('#password'), '');
    assert.equal(new URL(run.page.url()).pathname, '/login');
    await run.browser.close();

    // Login berhasil tetapi bukan super_admin: sesi diakhiri, tetap di /login.
    run = await loginInBrowser(cc, 'travel@example.test');
    await run.page.waitForSelector('#error:not([hidden])');
    assert.equal(new URL(run.page.url()).pathname, '/login');
    assert.ok(cc.requests.some(r => r.path === '/bff/logout' && r.method === 'POST'), 'logout dipanggil');
    assert.deepEqual(run.errors, []);
    await run.browser.close();
  } finally {
    await cc.stop();
  }
});

test('server hanya menyajikan UI Control Center untuk role pusat yang eksplisit', async () => {
  const serverSource = await readFile(
    new URL('./server.mjs', import.meta.url),
    'utf8'
  );
  const bffSource = await readFile(
    new URL('./bff.mjs', import.meta.url),
    'utf8'
  );

  assert.match(serverSource, /data\.authenticated === true/);
  assert.match(serverSource, /data\.workspaceSwitching === false/);
  assert.match(serverSource, /item\.dashboard === 'control-center'/);
  assert.match(serverSource, /item\.role === 'super_admin'/);
  assert.match(serverSource, /item\.organizationId === null/);
  assert.match(serverSource, /join\(FRONTEND_DIR, 'control-center\.html'\)/);
  assert.match(
    bffSource,
    /function sessionCookie\(value, clear = false, path = '\/'\)/
  );
  assert.match(
    bffSource,
    /HttpOnly; SameSite=Strict; Path=\$\{path\}/
  );
  assert.match(bffSource, /sessionCookie\('', true, '\/bff'\)/);
  assert.match(
    bffSource,
    /sessionCookie\(\s*cookies\(req\)\.segaloka_control_center_session\s*\)/
  );
  assert.match(serverSource, /cookie: req\.headers\.cookie \|\| ''/);
  assert.match(serverSource, /const responseHeaders = \{ \.\.\.upstreamResponse\.headers \}/);
});
