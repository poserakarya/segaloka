// Validasi environment portal saat startup (mode Vercel). Gagal tertutup:
// function tidak melayani request bila konfigurasi tidak aman. Pesan error
// hanya memuat nama variabel, tidak pernah nilainya.
import { marketplaceOrigin } from './bff-marketplace-handoff.mjs';

const LOOPBACK = /^(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?|0\.0\.0\.0)$/i;

function httpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !LOOPBACK.test(url.hostname) &&
      !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash;
  } catch {
    return false;
  }
}

function base64Key(value) {
  if (typeof value !== 'string') return false;
  const key = Buffer.from(value, 'base64');
  return key.length === 32 && key.toString('base64') === value;
}

// Production (NODE_ENV=production, termasuk Preview Vercel): semua origin
// https non-loopback, database dengan TLS, kunci sesi 32 byte.
export function validatePortalRuntimeEnv(env = process.env) {
  const problems = [];
  const production = env.NODE_ENV === 'production';
  const require = (name, ok) => {
    if (!ok) problems.push(name);
  };

  require('INGRESS_IDENTITY_SECRET', typeof env.INGRESS_IDENTITY_SECRET === 'string' && env.INGRESS_IDENTITY_SECRET.length >= 32);
  require('BFF_SESSION_ENCRYPTION_KEY', base64Key(env.BFF_SESSION_ENCRYPTION_KEY));
  for (const name of ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) {
    require(name, typeof env[name] === 'string' && env[name].length > 0);
  }
  require('DB_PORT', !env.DB_PORT || /^\d{2,5}$/.test(env.DB_PORT));
  require('SEGALOKA_PUBLIC_ORIGIN', typeof env.SEGALOKA_PUBLIC_ORIGIN === 'string' && env.SEGALOKA_PUBLIC_ORIGIN.length > 0);
  try {
    marketplaceOrigin(env);
  } catch {
    problems.push('SEGALOKA_MARKETPLACE_ORIGIN');
  }

  if (production) {
    require('API_ORIGIN', httpsOrigin(env.API_ORIGIN));
    require('SEGALOKA_PUBLIC_ORIGIN', String(env.SEGALOKA_PUBLIC_ORIGIN || '').split(',').map(item => item.trim()).filter(Boolean).every(httpsOrigin));
    require('DB_HOST', !LOOPBACK.test(env.DB_HOST || ''));
    require('DB_SSL', env.DB_SSL === 'true');
  } else {
    require('API_ORIGIN', typeof env.API_ORIGIN === 'string' && env.API_ORIGIN.length > 0);
  }

  const missing = [...new Set(problems)];
  if (missing.length) {
    const error = new Error(`PORTAL_RUNTIME_ENV_INVALID: ${missing.join(', ')}`);
    error.variables = missing;
    throw error;
  }
}
