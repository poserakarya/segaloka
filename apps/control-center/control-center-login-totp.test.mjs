// Uji halaman login Control Center di Chromium dengan BFF tiruan:
// pilihan Google Authenticator (TOTP) dan alur OTP email yang sudah ada.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

let chromium = null;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  chromium = null;
}

const loginHtml = await readFile(
  new URL('./frontend/control-center-login.html', import.meta.url),
  'utf8'
);
const TICKET = 'c'.repeat(64);
const CHALLENGE = '44444444-4444-4444-8444-444444444444';

function startServer(state) {
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null;
    state.requests.push({ path: req.url, body });
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(loginHtml);
    }
    if (req.url === '/bff/login') {
      return send(200, {
        authenticated: false,
        code: 'OTP_CHANNEL_REQUIRED',
        preAuthTicket: TICKET,
        availableMethods: state.methods,
        expiresIn: 300
      });
    }
    if (req.url === '/bff/login/verify-authenticator') {
      return body.code === '135790'
        ? send(200, { authenticated: true })
        : send(401, { authenticated: false, code: 'INVALID_OR_EXPIRED_AUTHENTICATOR', message: 'Kode atau sesi verifikasi tidak valid.' });
    }
    if (req.url === '/bff/login/select-channel') {
      return send(200, { authenticated: false, code: 'OTP_REQUIRED', challengeId: CHALLENGE, channel: body.channel, expiresIn: 300 });
    }
    if (req.url === '/bff/login/verify-otp') {
      return send(200, { authenticated: true });
    }
    if (req.url === '/bff/dashboard/access') {
      return send(200, {
        authenticated: true,
        workspaceSwitching: false,
        dashboards: [{ dashboard: 'control-center', role: 'super_admin', organizationId: null }]
      });
    }
    if (req.url.startsWith('/dashboard')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end('<p id="dash">dashboard</p>');
    }
    return send(404, {});
  });

  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function loginUntilMethods(page, origin) {
  await page.goto(origin + '/');
  await page.fill('#email', 'admin@example.invalid');
  await page.fill('#password', 'rahasia-uji');
  await page.click('#submit');
  await page.waitForSelector('#otp-channel-section:not([hidden])');
}

test('Control Center login offers TOTP alongside the existing OTP flow', {
  skip: chromium ? false : 'playwright tidak tersedia',
  timeout: 120000
}, async () => {
  const state = { requests: [], methods: ['authenticator', 'email', 'whatsapp'] };
  const server = await startServer(state);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ locale: 'id-ID' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await loginUntilMethods(page, origin);
    assert.deepEqual(
      await page.$$eval('#otp-channel option', options => options.map(o => [o.value, o.textContent])),
      [['authenticator', 'Google Authenticator'], ['email', 'Email'], ['whatsapp', 'WhatsApp']]
    );
    assert.equal(await page.textContent('#send-otp'), 'Lanjutkan');

    // TOTP: tidak ada request pengiriman OTP.
    await page.click('#send-otp');
    await page.waitForSelector('#otp-code-section:not([hidden])');
    assert.ok(!state.requests.some(r => r.path === '/bff/login/select-channel'));

    await page.fill('#otp-code', '000000');
    await page.click('#verify-otp');
    await page.waitForSelector('#error:not([hidden])');
    assert.equal(await page.textContent('#error'), 'Kode atau sesi verifikasi tidak valid.');
    assert.equal(new URL(page.url()).pathname, '/');

    await page.fill('#otp-code', '135790');
    await page.click('#verify-otp');
    await page.waitForURL(/\/dashboard#\/travel$/);
    const totpCalls = state.requests.filter(r => r.path === '/bff/login/verify-authenticator');
    assert.deepEqual(totpCalls.map(r => r.body), [
      { preAuthTicket: TICKET, code: '000000' },
      { preAuthTicket: TICKET, code: '135790' }
    ]);

    // Alur OTP email lama tetap berjalan.
    state.requests.length = 0;
    await loginUntilMethods(page, origin);
    await page.selectOption('#otp-channel', 'email');
    assert.equal(await page.textContent('#send-otp'), 'Kirim Kode Verifikasi');
    await page.click('#send-otp');
    await page.waitForSelector('#otp-code-section:not([hidden])');
    await page.fill('#otp-code', '112233');
    await page.click('#verify-otp');
    await page.waitForURL(/\/dashboard#\/travel$/);
    assert.deepEqual(
      state.requests.filter(r => r.path.startsWith('/bff/login/')).map(r => r.path),
      ['/bff/login/select-channel', '/bff/login/verify-otp']
    );

    // Akun tanpa authenticator: opsi TOTP tidak ditampilkan.
    state.methods = ['email'];
    await loginUntilMethods(page, origin);
    assert.deepEqual(await page.$$eval('#otp-channel option', o => o.map(x => x.value)), ['email']);

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});

test('login supports ID/EN/AR with RTL and self-hosted fonts', {
  skip: chromium ? false : 'playwright tidak tersedia',
  timeout: 60000
}, async () => {
  const state = { requests: [], methods: ['authenticator'] };
  const server = await startServer(state);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ locale: 'ar' });
    await page.goto(origin + '/');
    assert.equal(await page.evaluate(() => document.documentElement.dir), 'rtl');
    assert.equal(await page.textContent('h1'), 'الدخول إلى مركز التحكم');
    await page.click('[data-lang="en"]');
    assert.equal(await page.evaluate(() => document.documentElement.dir), 'ltr');
    assert.equal(await page.textContent('h1'), 'Sign in to Control Center');
    await page.click('[data-lang="id"]');
    assert.equal(await page.textContent('h1'), 'Masuk Control Center');
    assert.ok(loginHtml.includes('<link rel="stylesheet" href="/bff/fonts/fonts.css">'));
    assert.ok(!loginHtml.includes('Arial'));
  } finally {
    await browser.close();
    server.close();
  }
});

test('login markup and styles are pinned (Fase A: language switch and fonts)', async () => {
  const { createHash } = await import('node:crypto');
  const withoutScript = loginHtml.replace(/<script>[\s\S]*<\/script>/, '<script></script>');

  // SHA-256 markup + CSS login setelah Fase A (skrip inline dikosongkan).
  assert.equal(
    createHash('sha256').update(withoutScript).digest('hex'),
    '9393a3a5da17d3f7f02038fb0d701326f6b2c6b78ba94d70b83eb75fc873b12d'
  );
});
