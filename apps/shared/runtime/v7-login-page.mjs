import { readFileSync } from 'node:fs';

import { V7_PORTALS, V7_ORIGINAL_SOURCE_URL, safeJson } from './v7-portal-source.mjs';
import { FONT_STYLESHEET_LINK } from './shared-fonts.mjs';

// Halaman login portal dengan bahasa visual V7: blok <style> diambil dari
// sumber V7 asli (token warna, tema terang/gelap, .panel, .field, .btn,
// .seg, .brandmark). Autentikasi memakai kontrak BFF (bff-login-contract):
// password, lalu tepat satu metode 2FA yang ditawarkan API, lalu kode.

const TEXT = {
  title: ['Masuk', 'Sign in', 'تسجيل الدخول'],
  subtitle: [
    'Gunakan akun Segaloka Anda. Sesi dan akses diperiksa oleh server.',
    'Use your Segaloka account. Session and access are verified by the server.',
    'استخدم حساب سيجالوكا. يتحقق الخادم من الجلسة والصلاحيات.'
  ],
  email: ['Email', 'Email', 'البريد الإلكتروني'],
  password: ['Kata sandi', 'Password', 'كلمة المرور'],
  submit: ['Masuk', 'Sign in', 'دخول'],
  method: ['Metode verifikasi', 'Verification method', 'طريقة التحقق'],
  methodHint: [
    'Akun ini memakai verifikasi dua langkah. Pilih satu metode.',
    'This account uses two-step verification. Choose one method.',
    'يستخدم هذا الحساب التحقق بخطوتين. اختر طريقة واحدة.'
  ],
  authenticator: ['Google Authenticator', 'Google Authenticator', 'Google Authenticator'],
  emailOtp: ['Kode via email', 'Code via email', 'رمز عبر البريد'],
  whatsappOtp: ['Kode via WhatsApp', 'Code via WhatsApp', 'رمز عبر واتساب'],
  continue: ['Lanjutkan', 'Continue', 'متابعة'],
  sendCode: ['Kirim kode', 'Send code', 'إرسال الرمز'],
  code: ['Kode verifikasi 6 digit', '6-digit verification code', 'رمز التحقق من 6 أرقام'],
  codeHintTotp: [
    'Masukkan kode dari aplikasi authenticator.',
    'Enter the code from your authenticator app.',
    'أدخل الرمز من تطبيق المصادقة.'
  ],
  codeHintOtp: [
    'Kode telah dikirim. Masukkan dalam beberapa menit.',
    'The code has been sent. Enter it within a few minutes.',
    'تم إرسال الرمز. أدخله خلال دقائق.'
  ],
  verify: ['Verifikasi dan masuk', 'Verify and sign in', 'تحقق وادخل'],
  back: ['Kembali', 'Back', 'رجوع'],
  invalidCode: ['Masukkan kode 6 digit.', 'Enter the 6-digit code.', 'أدخل رمزاً من 6 أرقام.'],
  failed: ['Login gagal. Coba lagi.', 'Sign-in failed. Try again.', 'فشل تسجيل الدخول. حاول مجدداً.'],
  network: [
    'Server tidak dapat dihubungi.',
    'The server cannot be reached.',
    'تعذر الاتصال بالخادم.'
  ],
  denied: [
    'Akun ini tidak memiliki akses ke portal ini.',
    'This account has no access to this portal.',
    'لا يملك هذا الحساب صلاحية الوصول إلى هذه البوابة.'
  ],
  expired: [
    'Sesi verifikasi berakhir. Silakan masuk lagi.',
    'The verification session expired. Please sign in again.',
    'انتهت جلسة التحقق. يرجى تسجيل الدخول مجدداً.'
  ],
  otpUnavailable: [
    'Pengiriman kode belum tersedia. Login dibatalkan.',
    'Code delivery is unavailable. Sign-in was cancelled.',
    'إرسال الرمز غير متاح. تم إلغاء الدخول.'
  ],
  noMethod: [
    'Metode verifikasi belum tersedia untuk akun ini.',
    'No verification method is available for this account.',
    'لا توجد طريقة تحقق متاحة لهذا الحساب.'
  ],
  language: ['Bahasa', 'Language', 'اللغة']
};

const PORTAL_LABELS = {
  vendor: ['Portal Vendor', 'Vendor Portal', 'بوابة المورد'],
  affiliate: ['Portal Affiliate', 'Affiliate Portal', 'بوابة المسوّق'],
  agen: ['Portal Agen', 'Agent Portal', 'بوابة الوكيل'],
  mitra: ['Portal Mitra Travel', 'Travel Partner Portal', 'بوابة الشريك'],
  traveler: ['Aplikasi Pengguna', 'Traveler App', 'تطبيق المسافر']
};

// CSS tambahan hanya untuk tata letak halaman login; semua warna, radius,
// dan tipografi memakai token V7. Input email/password diberi gaya yang
// sama dengan .field input[type=text] milik V7.
const LOGIN_LAYOUT_CSS = `<style>
.sg-login{min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:16px;background:var(--bg)}
.sg-login .panel{width:100%;max-width:400px;padding:24px}
.sg-login-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;flex-wrap:wrap}
.sg-login-brand{display:flex;align-items:center;gap:10px;min-width:0}
.sg-login-brand b{font-family:var(--font-display);display:block}
.sg-login h1{font-family:var(--font-display);font-size:20px;margin:0 0 6px}
.sg-login p.muted{margin:0 0 16px;font-size:13px;line-height:1.5}
.sg-login .field input[type=email],.sg-login .field input[type=password],.sg-login .field input[inputmode=numeric]{border:1px solid var(--line-strong);border-radius:8px;padding:8px 10px;background:var(--surface);min-height:36px;width:100%;box-sizing:border-box}
.sg-login .field input:focus{outline:0;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.sg-login .btn.primary{width:100%;justify-content:center;height:40px}
.sg-login .sg-methods{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.sg-login .sg-methods label{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:8px;padding:10px 12px;cursor:pointer;font-size:13px}
.sg-login .sg-methods input{accent-color:var(--accent)}
.sg-login .sg-error{color:var(--bad);font-size:12.5px;margin:0 0 12px}
.sg-login .sg-back{margin-top:8px;width:100%;justify-content:center}
[hidden]{display:none!important}
</style>`;

let cachedStyle = null;

// Blok <style> pertama dari sumber V7 asli (berisi token dan komponen V7).
export function v7StyleBlock(sourceUrl = V7_ORIGINAL_SOURCE_URL) {
  if (cachedStyle && sourceUrl === V7_ORIGINAL_SOURCE_URL) return cachedStyle;

  const source = readFileSync(sourceUrl, 'utf8');
  const start = source.indexOf('<style>');
  const end = source.indexOf('</style>');

  if (start < 0 || end < start || source.indexOf('</style>', end + 8) >= 0) {
    throw new Error('V7_LOGIN_STYLE_ANCHOR_INVALID');
  }

  const style = source.slice(start, end + '</style>'.length);
  if (sourceUrl === V7_ORIGINAL_SOURCE_URL) cachedStyle = style;
  return style;
}

export function renderV7LoginPage({ role, preferences, styleBlock = v7StyleBlock() }) {
  if (!V7_PORTALS[role]) throw new Error('INVALID_V7_LOGIN_ROLE');

  const config = {
    role,
    portal: PORTAL_LABELS[role],
    text: TEXT,
    language: preferences?.language || 'id',
    languageSource: preferences?.source?.language || 'default'
  };

  return `<!doctype html><html lang="id"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Segaloka</title>
${FONT_STYLESHEET_LINK}
${styleBlock}
${LOGIN_LAYOUT_CSS}
</head><body>
<main class="sg-login">
  <section class="panel" aria-labelledby="sg-title">
    <div class="sg-login-top">
      <div class="sg-login-brand">
        <span class="brandmark" aria-hidden="true">S</span>
        <span><b>SEGALOKA</b><span class="muted" id="sg-portal" style="font-size:12px"></span></span>
      </div>
      <div class="seg" role="group" id="sg-lang">
        <button type="button" data-lang="id">ID</button>
        <button type="button" data-lang="en">EN</button>
        <button type="button" data-lang="ar">AR</button>
      </div>
    </div>
    <h1 id="sg-title" data-t="title"></h1>
    <p class="muted" data-t="subtitle"></p>
    <p class="sg-error" id="sg-error" role="alert" hidden></p>

    <form id="sg-password-form" novalidate>
      <div class="field"><label for="sg-email" data-t="email"></label>
        <input id="sg-email" type="email" autocomplete="username" required></div>
      <div class="field"><label for="sg-password" data-t="password"></label>
        <input id="sg-password" type="password" autocomplete="current-password" required></div>
      <button class="btn primary" id="sg-submit" type="submit" data-t="submit"></button>
    </form>

    <form id="sg-method-form" novalidate hidden>
      <p class="hint" data-t="methodHint" style="margin:0 0 10px"></p>
      <fieldset class="sg-methods" id="sg-methods" style="border:0;padding:0;margin:0 0 12px">
        <legend data-t="method" style="font-size:12px;font-weight:600;color:var(--ink-2);padding:0;margin-bottom:6px"></legend>
      </fieldset>
      <button class="btn primary" id="sg-method-submit" type="submit"></button>
      <button class="btn ghost sg-back" type="button" data-back data-t="back"></button>
    </form>

    <form id="sg-code-form" novalidate hidden>
      <div class="field"><label for="sg-code" data-t="code"></label>
        <input id="sg-code" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" dir="ltr">
        <span class="hint" id="sg-code-hint"></span></div>
      <button class="btn primary" id="sg-verify" type="submit" data-t="verify"></button>
      <button class="btn ghost sg-back" type="button" data-back data-t="back"></button>
    </form>
  </section>
</main>
<script>
(() => {
  const config = ${safeJson(config)};
  const T = config.text;
  const languages = ['id', 'en', 'ar'];
  const $ = id => document.getElementById(id);
  const index = () => languages.indexOf(state.lang);
  const tr = key => T[key][index()];

  const stored = (() => {
    try { return JSON.parse(localStorage.getItem('sg.lang')); } catch { return null; }
  })();
  const state = {
    lang: (config.languageSource === 'account' || config.languageSource === 'organization')
      ? config.language
      : (languages.includes(stored) ? stored : config.language),
    ticket: null,
    methods: [],
    method: null,
    challengeId: null,
    busy: false
  };

  function applyLanguage() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    document.title = config.portal[index()] + ' · SEGALOKA';
    $('sg-portal').textContent = config.portal[index()];
    for (const el of document.querySelectorAll('[data-t]')) el.textContent = tr(el.dataset.t);
    for (const el of document.querySelectorAll('[data-lang]')) {
      el.setAttribute('aria-pressed', String(el.dataset.lang === state.lang));
    }
    $('sg-lang').setAttribute('aria-label', tr('language'));
    renderMethods();
    $('sg-method-submit').textContent = state.method === 'authenticator' ? tr('continue') : tr('sendCode');
    $('sg-code-hint').textContent = state.method === 'authenticator' ? tr('codeHintTotp') : tr('codeHintOtp');
  }

  function showError(key) {
    $('sg-error').textContent = tr(key);
    $('sg-error').hidden = false;
  }

  function step(name) {
    $('sg-error').hidden = true;
    $('sg-password-form').hidden = name !== 'password';
    $('sg-method-form').hidden = name !== 'method';
    $('sg-code-form').hidden = name !== 'code';
    const focus = { password: 'sg-email', method: null, code: 'sg-code' }[name];
    if (focus) $(focus).focus();
  }

  function renderMethods() {
    const box = $('sg-methods');
    for (const item of box.querySelectorAll('label.sg-method')) item.remove();
    const labels = { authenticator: 'authenticator', email: 'emailOtp', whatsapp: 'whatsappOtp' };
    for (const method of state.methods) {
      const label = document.createElement('label');
      label.className = 'sg-method';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'sg-method';
      input.value = method;
      input.checked = method === state.method;
      input.addEventListener('change', () => { state.method = method; applyLanguage(); });
      label.append(input, document.createTextNode(tr(labels[method])));
      box.appendChild(label);
    }
  }

  async function post(path, body) {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  }

  function errorKey(result) {
    const code = result.data && result.data.code;
    if (result.status === 403 && /ACCESS_REQUIRED|ROLE_REQUIRED|ACCESS_DENIED/.test(code || '')) return 'denied';
    if (code === 'INVALID_OR_EXPIRED_PRE_AUTH') return 'expired';
    if (code === 'OTP_DELIVERY_UNAVAILABLE' || code === 'OTP_CHANNEL_UNAVAILABLE') return 'otpUnavailable';
    if (code === 'TWO_FACTOR_METHOD_UNAVAILABLE' || code === 'VERIFICATION_METHOD_NOT_ALLOWED') return 'noMethod';
    return 'failed';
  }

  async function enterDashboard() {
    const response = await fetch('/bff/dashboard/access', { credentials: 'same-origin', cache: 'no-store' });
    const access = await response.json().catch(() => ({}));
    const allowed = response.ok && access.authenticated === true &&
      Array.isArray(access.dashboards) &&
      access.dashboards.some(item => item.dashboard === config.role && item.role === config.role);
    if (allowed) window.location.replace('/bff/ui');
    return allowed;
  }

  async function guard(task) {
    if (state.busy) return;
    state.busy = true;
    for (const button of document.querySelectorAll('button')) button.disabled = true;
    try {
      await task();
    } catch (error) {
      showError('network');
    } finally {
      state.busy = false;
      for (const button of document.querySelectorAll('button')) button.disabled = false;
    }
  }

  function restart(key) {
    state.ticket = null;
    state.methods = [];
    state.method = null;
    state.challengeId = null;
    $('sg-password').value = '';
    $('sg-code').value = '';
    step('password');
    if (key) showError(key);
  }

  async function finish(result) {
    if (result.status === 200 && result.data.authenticated === true) {
      if (!await enterDashboard()) restart('denied');
      return;
    }
    if (result.data && result.data.code === 'INVALID_OR_EXPIRED_AUTHENTICATOR') {
      $('sg-code').value = '';
      showError('failed');
      return;
    }
    restart(errorKey(result));
  }

  $('sg-password-form').addEventListener('submit', event => {
    event.preventDefault();
    guard(async () => {
      const result = await post('/bff/login', {
        email: $('sg-email').value.trim(),
        password: $('sg-password').value
      });
      $('sg-password').value = '';
      if (result.status === 200 && result.data.code === 'OTP_CHANNEL_REQUIRED') {
        state.ticket = result.data.preAuthTicket;
        state.methods = (result.data.availableMethods || [])
          .filter(m => ['authenticator', 'email', 'whatsapp'].includes(m));
        if (!state.methods.length) return restart('noMethod');
        state.method = state.methods[0];
        applyLanguage();
        step('method');
        return;
      }
      if (result.status === 200 && result.data.authenticated === true) return finish(result);
      showError(errorKey(result));
    });
  });

  $('sg-method-form').addEventListener('submit', event => {
    event.preventDefault();
    guard(async () => {
      if (state.method === 'authenticator') {
        applyLanguage();
        step('code');
        return;
      }
      const result = await post('/bff/login/select-channel', {
        preAuthTicket: state.ticket,
        channel: state.method,
        language: state.lang.toUpperCase()
      });
      if (result.status !== 200 || result.data.code !== 'OTP_REQUIRED') return restart(errorKey(result));
      state.challengeId = result.data.challengeId;
      state.ticket = null;
      applyLanguage();
      step('code');
    });
  });

  $('sg-code-form').addEventListener('submit', event => {
    event.preventDefault();
    const code = $('sg-code').value.trim();
    if (!/^[0-9]{6}$/.test(code)) return showError('invalidCode');
    guard(async () => {
      const result = state.method === 'authenticator'
        ? await post('/bff/login/verify-authenticator', { preAuthTicket: state.ticket, code })
        : await post('/bff/login/verify-otp', { challengeId: state.challengeId, code });
      await finish(result);
    });
  });

  for (const button of document.querySelectorAll('[data-back]')) {
    button.addEventListener('click', () => restart(null));
  }

  for (const button of document.querySelectorAll('[data-lang]')) {
    button.addEventListener('click', () => {
      state.lang = button.dataset.lang;
      try { localStorage.setItem('sg.lang', JSON.stringify(state.lang)); } catch {}
      applyLanguage();
    });
  }

  try {
    const theme = JSON.parse(localStorage.getItem('sg.theme'));
    if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
  } catch {}

  applyLanguage();
  step('password');
  enterDashboard().catch(() => {});
})();
</script>
</body></html>`;
}

export const V7_LOGIN_HTML_HEADERS = Object.freeze({
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
});
