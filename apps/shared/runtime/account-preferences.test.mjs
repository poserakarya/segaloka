import test from 'node:test';
import assert from 'node:assert/strict';

import {
  languageFromAcceptLanguage,
  PLATFORM_CURRENCY,
  resolveAccountPreferences
} from './account-preferences.mjs';

test('without account or organization preferences, uses Accept-Language then defaults', () => {
  assert.deepEqual(resolveAccountPreferences({ acceptLanguage: 'ar-SA,ar;q=0.9,en;q=0.8' }), {
    language: 'ar',
    locale: null,
    currency: 'IDR',
    timeZone: null,
    source: { language: 'locale', locale: 'default', currency: 'default', timeZone: 'browser' }
  });
  assert.equal(resolveAccountPreferences().language, 'id');
  assert.equal(resolveAccountPreferences().source.language, 'default');
  assert.equal(PLATFORM_CURRENCY, 'IDR');
});

test('account preferences win over organization and locale', () => {
  const result = resolveAccountPreferences({
    account: { language: 'en', locale: 'en-GB', currency: 'USD', timeZone: 'Asia/Jakarta' },
    organization: { language: 'ar', locale: 'ar-SA', currency: 'SAR', timeZone: 'Asia/Riyadh' },
    acceptLanguage: 'id'
  });

  assert.deepEqual(result, {
    language: 'en',
    locale: 'en-GB',
    currency: 'USD',
    timeZone: 'Asia/Jakarta',
    source: { language: 'account', locale: 'account', currency: 'account', timeZone: 'account' }
  });
});

test('organization preferences are the fallback when the account has none', () => {
  const result = resolveAccountPreferences({
    account: {},
    organization: { language: 'ar', currency: 'SAR', timeZone: 'Asia/Riyadh' },
    acceptLanguage: 'en'
  });

  assert.equal(result.language, 'ar');
  assert.equal(result.source.language, 'organization');
  assert.equal(result.currency, 'SAR');
  assert.equal(result.timeZone, 'Asia/Riyadh');
});

test('invalid values are ignored instead of trusted', () => {
  const result = resolveAccountPreferences({
    account: { language: 'fr', locale: 'not a locale!!', currency: 'usd', timeZone: 'Mars/Base' },
    acceptLanguage: 'fr-FR, en;q=0.5'
  });

  assert.equal(result.language, 'en');
  assert.equal(result.locale, null);
  assert.equal(result.currency, 'IDR');
  assert.equal(result.timeZone, null);
});

test('Accept-Language parsing honours q-values and ignores q=0', () => {
  assert.equal(languageFromAcceptLanguage('en;q=0.4, ar;q=0.9'), 'ar');
  assert.equal(languageFromAcceptLanguage('ar;q=0, id'), 'id');
  assert.equal(languageFromAcceptLanguage('de, fr'), null);
  assert.equal(languageFromAcceptLanguage(undefined), null);
});
