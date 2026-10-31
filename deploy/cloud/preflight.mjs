// Read-only deployment preflight. Never prints or reads secret values.
// Run from any working directory: node deploy/cloud/preflight.mjs
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const errors = [];
const warnings = [];
const envPath = join(root, 'production.env');

function parseEnv(input) {
  const result = Object.create(null);
  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
    if (!match) {
      errors.push('Invalid environment assignment (line content redacted).');
      continue;
    }
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (Object.hasOwn(result, match[1])) errors.push('Duplicate variable: ' + match[1]);
    result[match[1]] = value;
  }
  return result;
}

if (!existsSync(envPath)) {
  errors.push('production.env missing (do not commit this file).');
}
const env = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
if (env.NODE_ENV !== 'production') errors.push('NODE_ENV must equal production.');
for (const key of ['POSTGRES_DB', 'POSTGRES_USER']) {
  if (!env[key]) errors.push(key + ' is required.');
}
const hosts = [
  'SEGALOKA_API_HOST', 'SEGALOKA_CONTROL_CENTER_HOST',
  'SEGALOKA_TRAVEL_HOST', 'SEGALOKA_VENDOR_HOST',
  'SEGALOKA_AFFILIATE_HOST', 'SEGALOKA_AGEN_HOST',
  'SEGALOKA_MITRA_HOST', 'SEGALOKA_TRAVELER_HOST'
];
const seen = new Map();
for (const key of hosts) {
  const value = env[key];
  if (!value || !/^(?=.{1,253}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(value)) {
    errors.push(key + ' must be a valid hostname.');
    continue;
  }
  if (seen.has(value)) errors.push(key + ' duplicates ' + seen.get(value));
  seen.set(value, key);
}
for (const role of ['CONTROL_CENTER', 'TRAVEL', 'VENDOR', 'AFFILIATE', 'AGEN', 'MITRA', 'TRAVELER']) {
  const originKey = 'SEGALOKA_' + role + '_PUBLIC_ORIGIN';
  const hostKey = 'SEGALOKA_' + role + '_HOST';
  try {
    const url = new URL(env[originKey] || '');
    if (url.protocol !== 'https:' || url.hostname !== env[hostKey] ||
        url.pathname !== '/' || url.search || url.hash || url.port || url.username || url.password) {
      errors.push(originKey + ' must be HTTPS origin matching ' + hostKey);
    }
  } catch {
    errors.push(originKey + ' must be a valid HTTPS origin.');
  }
}
for (const key of ['PUBLIC_ORIGIN', 'PUBLIC_CERTIFICATE_BASE_URL']) {
  try {
    const url = new URL(env[key] || '');
    if (url.protocol !== 'https:' || url.hostname !== env.SEGALOKA_API_HOST) {
      errors.push(key + ' must use HTTPS and match SEGALOKA_API_HOST.');
    }
  } catch { errors.push(key + ' must be a valid HTTPS URL.'); }
}
const secrets = [
  'db_password', 'ingress_identity_secret', 'auth_ip_hash_secret',
  'auth_otp_hash_secret', 'certificate_encryption_key',
  'oauth_config_encryption_key', 'totp_encryption_key',
  'password_reset_otp_secret', 'dashboard_handoff_secret',
  'resend_api_key', 'resend_webhook_signing_secret',
  'control_center_session_key', 'travel_session_key',
  'vendor_session_key', 'affiliate_session_key',
  'agen_session_key', 'mitra_session_key', 'traveler_session_key'
];
for (const name of secrets) {
  if (!existsSync(join(root, 'secrets', name))) errors.push('Missing secret file: ' + name);
}
for (const name of ['fullchain.pem', 'privkey.pem']) {
  if (!existsSync(join(root, 'tls', name))) errors.push('Missing TLS file: ' + name);
}
if (env.SEGALOKA_CONTROL_CENTER_HOST === 'admin.segaloka.com') {
  warnings.push('admin.segaloka.com is already attached to a Vercel project; verify one canonical routing target before DNS changes.');
} else if (env.SEGALOKA_CONTROL_CENTER_HOST) {
  warnings.push('Control Center hostname differs from existing Vercel admin.segaloka.com; decide canonical domain before publishing.');
}
for (const message of warnings) console.warn('WARN:', message);
for (const message of errors) console.error('FAIL:', message);
if (errors.length) {
  console.error('Preflight failed: ' + errors.length + ' issue(s). No changes made.');
  process.exitCode = 1;
} else {
  console.log('Preflight passed (file presence and non-secret configuration only).');
  console.log('This does NOT verify credentials, certificate validity, cloud readiness, or runtime health.');
}
