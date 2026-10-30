import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

// Login Dashboard Travel. Setelah sesi valid, dashboard V7 asli disajikan
// oleh BFF di /bff/dashboard; aplikasi ini tidak memiliki tampilan dashboard
// sendiri.

type Language = 'id' | 'en' | 'ar';
type VerificationMethod = 'authenticator' | 'email' | 'whatsapp';

const LANGUAGES: Language[] = ['id', 'en', 'ar'];

const TEXT = {
  checking: ['Memeriksa sesi Segaloka...', 'Checking your Segaloka session...', 'جارٍ التحقق من جلسة سيجالوكا...'],
  opening: ['Membuka Dashboard Travel...', 'Opening the Travel Dashboard...', 'جارٍ فتح لوحة السفر...'],
  platform: ['Travel Management Platform', 'Travel Management Platform', 'منصة إدارة السفر'],
  dashboardEyebrow: ['TRAVEL DASHBOARD', 'TRAVEL DASHBOARD', 'لوحة السفر'],
  heroTitle: ['Kelola perjalanan dalam satu sistem.', 'Manage your travel operations in one system.', 'أدر رحلاتك في نظام واحد.'],
  heroBody: [
    'Operasional travel, booking, peserta, keberangkatan, dan sertifikat perjalanan dalam satu dashboard terintegrasi.',
    'Travel operations, bookings, participants, departures, and travel certificates in one integrated dashboard.',
    'عمليات السفر والحجوزات والمشاركون والرحلات وشهادات السفر في لوحة واحدة متكاملة.'
  ],
  access: ['AKSES TRAVEL', 'TRAVEL ACCESS', 'دخول السفر'],
  title: ['Masuk ke Dashboard', 'Sign in to the Dashboard', 'الدخول إلى اللوحة'],
  subtitle: ['Gunakan akun Travel Segaloka yang sudah terdaftar.', 'Use your registered Segaloka Travel account.', 'استخدم حساب سيجالوكا للسفر المسجل.'],
  email: ['Alamat Email', 'Email address', 'البريد الإلكتروني'],
  emailPlaceholder: ['nama@travel.com', 'name@travel.com', 'name@travel.com'],
  password: ['Kata Sandi', 'Password', 'كلمة المرور'],
  passwordPlaceholder: ['Masukkan kata sandi', 'Enter your password', 'أدخل كلمة المرور'],
  processing: ['Memproses...', 'Processing...', 'جارٍ المعالجة...'],
  submit: ['Masuk ke Dashboard', 'Sign in to the Dashboard', 'الدخول إلى اللوحة'],
  twoStep: ['Verifikasi dua langkah diperlukan untuk melanjutkan login.', 'Two-step verification is required to continue.', 'التحقق بخطوتين مطلوب للمتابعة.'],
  chooseMethod: ['Pilih Metode Verifikasi', 'Choose a verification method', 'اختر طريقة التحقق'],
  choosePlaceholder: ['Pilih metode', 'Choose a method', 'اختر طريقة'],
  authenticator: ['Google Authenticator', 'Google Authenticator', 'Google Authenticator'],
  emailOtp: ['Kode OTP Email', 'Email OTP code', 'رمز عبر البريد'],
  whatsappOtp: ['Kode OTP WhatsApp', 'WhatsApp OTP code', 'رمز عبر واتساب'],
  hintAuthenticator: ['Masukkan kode dari aplikasi autentikator.', 'Enter the code from your authenticator app.', 'أدخل الرمز من تطبيق المصادقة.'],
  hintEmail: ['Masukkan kode OTP yang dikirim ke email.', 'Enter the OTP code sent to your email.', 'أدخل الرمز المرسل إلى بريدك.'],
  hintWhatsapp: ['Masukkan kode OTP yang dikirim ke WhatsApp.', 'Enter the OTP code sent to WhatsApp.', 'أدخل الرمز المرسل عبر واتساب.'],
  code: ['Kode Verifikasi', 'Verification code', 'رمز التحقق'],
  codePlaceholder: ['6 digit kode', '6-digit code', 'رمز من 6 أرقام'],
  verifying: ['Memverifikasi...', 'Verifying...', 'جارٍ التحقق...'],
  verify: ['Verifikasi dan Masuk', 'Verify and sign in', 'تحقق وادخل'],
  back: ['Kembali ke Login', 'Back to sign in', 'العودة لتسجيل الدخول'],
  note: ['Akses hanya untuk pengguna dengan izin Dashboard Travel.', 'Access is limited to users with Travel Dashboard permission.', 'الدخول مقصور على المستخدمين المصرح لهم بلوحة السفر.'],
  language: ['Bahasa', 'Language', 'اللغة'],
  enterCode: ['Masukkan kode verifikasi enam digit.', 'Enter the six-digit verification code.', 'أدخل رمز التحقق المكون من ستة أرقام.'],
  errFailed: ['Login gagal. Coba lagi.', 'Sign-in failed. Try again.', 'فشل تسجيل الدخول. حاول مجدداً.'],
  errCredentials: ['Email atau kata sandi tidak valid.', 'Invalid email or password.', 'البريد أو كلمة المرور غير صحيحة.'],
  errDenied: ['Akun tidak memiliki akses Dashboard Travel.', 'This account has no Travel Dashboard access.', 'لا يملك هذا الحساب صلاحية لوحة السفر.'],
  errCode: ['Kode atau sesi verifikasi tidak valid.', 'Invalid code or verification session.', 'الرمز أو جلسة التحقق غير صالحة.'],
  errExpired: ['Sesi verifikasi berakhir. Silakan masuk lagi.', 'The verification session expired. Please sign in again.', 'انتهت جلسة التحقق. يرجى الدخول مجدداً.'],
  errOtpUnavailable: ['Pengiriman kode belum tersedia. Login dibatalkan.', 'Code delivery is unavailable. Sign-in was cancelled.', 'إرسال الرمز غير متاح. تم إلغاء الدخول.'],
  errNoMethod: ['Metode verifikasi tidak tersedia.', 'No verification method is available.', 'لا توجد طريقة تحقق متاحة.'],
  errRateLimited: ['Terlalu banyak percobaan. Coba lagi nanti.', 'Too many attempts. Try again later.', 'محاولات كثيرة. حاول لاحقاً.'],
  errNetwork: ['Server tidak dapat dihubungi.', 'The server cannot be reached.', 'تعذر الاتصال بالخادم.']
} as const;

type TextKey = keyof typeof TEXT;

const ERROR_KEYS: Record<string, TextKey> = {
  INVALID_CREDENTIALS: 'errCredentials',
  TRAVEL_ACCESS_REQUIRED: 'errDenied',
  INVALID_OR_EXPIRED_AUTHENTICATOR: 'errCode',
  OTP_INVALID: 'errCode',
  INVALID_OR_EXPIRED_PRE_AUTH: 'errExpired',
  OTP_DELIVERY_UNAVAILABLE: 'errOtpUnavailable',
  OTP_CHANNEL_UNAVAILABLE: 'errOtpUnavailable',
  TWO_FACTOR_METHOD_UNAVAILABLE: 'errNoMethod',
  RATE_LIMITED: 'errRateLimited',
  OTP_RATE_LIMITED: 'errRateLimited'
};

class RequestError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function initialLanguage(): Language {
  try {
    const stored = JSON.parse(localStorage.getItem('sg.lang') || 'null');
    if (LANGUAGES.includes(stored)) return stored;
  } catch {
    // Pilihan bahasa tersimpan tidak tersedia.
  }

  for (const tag of navigator.languages || [navigator.language]) {
    const language = String(tag).toLowerCase().split('-')[0] as Language;
    if (LANGUAGES.includes(language)) return language;
  }

  return 'id';
}

async function request(
  path: string,
  options: RequestInit = {}
) {
  let response: Response;

  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: {
        ...(options.body
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...options.headers
      }
    });
  } catch {
    throw new RequestError('NETWORK_ERROR');
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new RequestError(result.code || 'REQUEST_FAILED');
  }

  return result;
}

function App() {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<TextKey | ''>('');

  const [verification, setVerification] = useState<{
    preAuthTicket: string;
    availableMethods: VerificationMethod[];
    challengeId?: string;
  } | null>(null);

  const [method, setMethod] =
    useState<VerificationMethod | ''>('');

  const [otpCode, setOtpCode] = useState('');

  const t = (key: TextKey) => TEXT[key][LANGUAGES.indexOf(language)];

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    request('/bff/me')
      .then(() => openDashboard())
      .catch(() => setLoading(false));
  }, []);

  function openDashboard() {
    setRedirecting(true);
    window.location.replace('/bff/dashboard');
  }

  function changeLanguage(next: Language) {
    setLanguage(next);
    try {
      localStorage.setItem('sg.lang', JSON.stringify(next));
    } catch {
      // Penyimpanan browser tidak tersedia; pilihan berlaku untuk halaman ini.
    }
  }

  function showError(cause: unknown) {
    const code = cause instanceof RequestError ? cause.code : '';
    setError(
      code === 'NETWORK_ERROR'
        ? 'errNetwork'
        : ERROR_KEYS[code] || 'errFailed'
    );
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();

    setSubmitting(true);
    setError('');

    try {
      const result = await request('/bff/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      if (result.authenticated === true) {
        openDashboard();
        return;
      }

      if (
        result.authenticated === false &&
        result.code === 'OTP_CHANNEL_REQUIRED' &&
        typeof result.preAuthTicket === 'string' &&
        /^[0-9a-f]{64}$/.test(result.preAuthTicket) &&
        Array.isArray(result.availableMethods)
      ) {
        const allowed: VerificationMethod[] = [
          'authenticator',
          'email',
          'whatsapp'
        ];

        const availableMethods = allowed.filter(
          item => result.availableMethods.includes(item)
        );

        if (availableMethods.length === 0) {
          throw new RequestError('TWO_FACTOR_METHOD_UNAVAILABLE');
        }

        setVerification({
          preAuthTicket: result.preAuthTicket,
          availableMethods
        });
        setPassword('');
        setMethod('');
        setOtpCode('');
        return;
      }
      throw new RequestError('INVALID_LOGIN_RESPONSE');
    } catch (cause) {
      showError(cause);
    } finally {
      setSubmitting(false);
    }
  }

  async function selectVerificationMethod(
    selected: VerificationMethod
  ) {
    if (!verification || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      if (selected === 'authenticator') {
        setMethod(selected);
        setOtpCode('');
        return;
      }

      const result = await request(
        '/bff/login/select-channel',
        {
          method: 'POST',
          body: JSON.stringify({
            preAuthTicket: verification.preAuthTicket,
            channel: selected,
            language: language.toUpperCase()
          })
        }
      );

      if (
        result.authenticated !== false ||
        result.code !== 'OTP_REQUIRED' ||
        typeof result.challengeId !== 'string' ||
        result.channel !== selected
      ) {
        throw new RequestError('INVALID_OTP_RESPONSE');
      }

      setVerification({
        ...verification,
        challengeId: result.challengeId
      });

      setMethod(selected);
      setOtpCode('');
    } catch (cause) {
      // Tiket pre-auth sudah dipakai API; pengguna harus login ulang.
      cancelVerification();
      showError(cause);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyLogin(event: React.FormEvent) {
    event.preventDefault();

    if (
      !verification ||
      !method ||
      !/^[0-9]{6}$/.test(otpCode)
    ) {
      setError('enterCode');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const authenticator = method === 'authenticator';

      if (!authenticator && !verification.challengeId) {
        throw new RequestError('INVALID_OR_EXPIRED_PRE_AUTH');
      }

      const result = await request(
        authenticator
          ? '/bff/login/verify-authenticator'
          : '/bff/login/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify(
            authenticator
              ? {
                  preAuthTicket: verification.preAuthTicket,
                  code: otpCode
                }
              : {
                  challengeId: verification.challengeId,
                  code: otpCode
                }
          )
        }
      );

      if (result.authenticated !== true) {
        throw new RequestError('VERIFICATION_FAILED');
      }

      openDashboard();
    } catch (cause) {
      setOtpCode('');
      showError(cause);
    } finally {
      setSubmitting(false);
    }
  }

  function cancelVerification() {
    setVerification(null);
    setMethod('');
    setOtpCode('');
    setPassword('');
    setError('');
  }

  if (loading || redirecting) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>{redirecting ? t('opening') : t('checking')}</p>
      </div>
    );
  }

  return (
    <div className="login-layout">
      <section className="login-brand">
        <div className="brand-logo">S</div>
        <div>
          <h1>Segaloka</h1>
          <p>{t('platform')}</p>
        </div>

        <div className="brand-message">
          <span className="eyebrow">{t('dashboardEyebrow')}</span>
          <h2>{t('heroTitle')}</h2>
          <p>{t('heroBody')}</p>
        </div>

        <div className="brand-footer">
          © Segaloka
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-card-top">
            <div className="mobile-brand">Segaloka</div>

            <div
              className="lang-switch"
              role="group"
              aria-label={t('language')}
            >
              {LANGUAGES.map(item => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={item === language}
                  onClick={() => changeLanguage(item)}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <span className="eyebrow">
            {t('access')}
          </span>

          <h2>{t('title')}</h2>

          <p className="muted">
            {t('subtitle')}
          </p>

          {!verification ? (
            <form onSubmit={login}>
              <label htmlFor="email">
                {t('email')}
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                autoComplete="username"
                dir="ltr"
                required
              />

              <label htmlFor="password">
                {t('password')}
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                autoComplete="current-password"
                required
              />

              {error && (
                <div className="error-message" role="alert">
                  {t(error)}
                </div>
              )}

              <button
                className="primary-button"
                type="submit"
                disabled={submitting}
              >
                {submitting ? t('processing') : t('submit')}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyLogin}>
              <p className="muted">
                {t('twoStep')}
              </p>

              {!method ? (
                <>
                  <label htmlFor="verification-method">
                    {t('chooseMethod')}
                  </label>

                  <select
                    id="verification-method"
                    defaultValue=""
                    disabled={submitting}
                    onChange={event => {
                      const selected =
                        event.target.value as VerificationMethod;

                      if (
                        verification.availableMethods.includes(
                          selected
                        )
                      ) {
                        void selectVerificationMethod(selected);
                      }
                    }}
                    required
                  >
                    <option value="" disabled>
                      {t('choosePlaceholder')}
                    </option>

                    {verification.availableMethods.map(
                      available => (
                        <option
                          key={available}
                          value={available}
                        >
                          {available === 'authenticator'
                            ? t('authenticator')
                            : available === 'email'
                              ? t('emailOtp')
                              : t('whatsappOtp')}
                        </option>
                      )
                    )}
                  </select>
                </>
              ) : (
                <>
                  <p className="muted">
                    {method === 'authenticator'
                      ? t('hintAuthenticator')
                      : method === 'email'
                        ? t('hintEmail')
                        : t('hintWhatsapp')}
                  </p>

                  <label htmlFor="otp-code">
                    {t('code')}
                  </label>

                  <input
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    dir="ltr"
                    value={otpCode}
                    onChange={event => {
                      setOtpCode(
                        event.target.value
                          .replace(/[^0-9]/g, '')
                          .slice(0, 6)
                      );
                    }}
                    placeholder={t('codePlaceholder')}
                    required
                  />
                </>
              )}

              {error && (
                <div className="error-message" role="alert">
                  {t(error)}
                </div>
              )}

              {method && (
                <button
                  className="primary-button"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? t('verifying') : t('verify')}
                </button>
              )}

              <button
                type="button"
                disabled={submitting}
                onClick={cancelVerification}
              >
                {t('back')}
              </button>
            </form>
          )}

          <p className="login-note">
            {t('note')}
          </p>
        </div>
      </section>
    </div>
  );
}

createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
