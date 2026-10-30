// Preferensi tampilan dashboard: bahasa, locale (format tanggal/angka),
// mata uang, dan zona waktu.
//
// Urutan sumber per nilai:
//   1. account      — preferensi akun dari API (`user.preferences`)
//   2. organization — pengaturan organisasi dari API (`dashboard.preferences`)
//   3. locale       — header Accept-Language browser (hanya bahasa/locale)
//   4. default      — bahasa 'id'; mata uang platform 'IDR' (nilai transaksi
//                     Segaloka disimpan dalam IDR, misalnya
//                     subscription_plans.currency DEFAULT 'IDR')
//
// Saat ini API belum menyediakan preferensi akun maupun organisasi, sehingga
// nilainya berasal dari locale/default. Tidak ada data preferensi yang dibuat.

export const SUPPORTED_LANGUAGES = Object.freeze(['id', 'en', 'ar']);

export const DEFAULT_LOCALES = Object.freeze({
  id: 'id-ID',
  en: 'en-US',
  ar: 'ar-u-ca-gregory-nu-latn'
});

export const PLATFORM_CURRENCY = 'IDR';

function validLanguage(value) {
  if (typeof value !== 'string') return null;
  const language = value.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.includes(language) ? language : null;
}

function validLocale(value) {
  if (typeof value !== 'string' || value.length > 64) return null;
  try {
    const [locale] = Intl.getCanonicalLocales(value);
    return locale || null;
  } catch {
    return null;
  }
}

function validCurrency(value) {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) return null;
  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: value });
    return value;
  } catch {
    return null;
  }
}

function validTimeZone(value) {
  if (typeof value !== 'string' || value.length > 64) return null;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return value;
  } catch {
    return null;
  }
}

// Bahasa pertama yang didukung dari header Accept-Language (urut q-value).
export function languageFromAcceptLanguage(header) {
  if (typeof header !== 'string' || header.length > 512) return null;

  const ranked = header.split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map(p => p.trim()).find(p => p.startsWith('q='));
      const weight = q ? Number(q.slice(2)) : 1;
      return { tag, weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter(item => item.tag && item.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);

  for (const item of ranked) {
    const language = validLanguage(item.tag);
    if (language) return language;
  }

  return null;
}

function pick(candidates) {
  for (const [source, value] of candidates) {
    if (value) return { value, source };
  }
  return { value: null, source: null };
}

export function resolveAccountPreferences({ account, organization, acceptLanguage } = {}) {
  const accountPrefs = account && typeof account === 'object' ? account : {};
  const orgPrefs = organization && typeof organization === 'object' ? organization : {};

  const language = pick([
    ['account', validLanguage(accountPrefs.language)],
    ['organization', validLanguage(orgPrefs.language)],
    ['locale', languageFromAcceptLanguage(acceptLanguage)],
    ['default', 'id']
  ]);

  // Locale khusus (mis. en-GB) hanya dari akun/organisasi; selain itu memakai
  // locale bawaan V7 untuk bahasa yang aktif.
  const locale = pick([
    ['account', validLocale(accountPrefs.locale)],
    ['organization', validLocale(orgPrefs.locale)]
  ]);

  const currency = pick([
    ['account', validCurrency(accountPrefs.currency)],
    ['organization', validCurrency(orgPrefs.currency)],
    ['default', PLATFORM_CURRENCY]
  ]);

  const timeZone = pick([
    ['account', validTimeZone(accountPrefs.timeZone)],
    ['organization', validTimeZone(orgPrefs.timeZone)]
  ]);

  return {
    language: language.value,
    locale: locale.value,
    currency: currency.value,
    timeZone: timeZone.value,
    source: {
      language: language.source,
      locale: locale.source || 'default',
      currency: currency.source,
      timeZone: timeZone.source || 'browser'
    }
  };
}
