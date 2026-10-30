import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../preflight.mjs', import.meta.url));
const roles = ['CONTROL_CENTER', 'TRAVEL', 'VENDOR', 'AFFILIATE', 'AGEN', 'MITRA', 'TRAVELER'];
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

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'segaloka-cloud-preflight-'));
  copyFileSync(source, join(dir, 'preflight.mjs'));
  mkdirSync(join(dir, 'secrets'));
  mkdirSync(join(dir, 'tls'));
  for (const name of secrets) writeFileSync(join(dir, 'secrets', name), '');
  for (const name of ['fullchain.pem', 'privkey.pem']) writeFileSync(join(dir, 'tls', name), '');
  const env = {
    NODE_ENV: 'production',
    POSTGRES_DB: 'segaloka_production',
    POSTGRES_USER: 'segaloka_production_app',
    SEGALOKA_API_HOST: 'api.segaloka.com',
    PUBLIC_ORIGIN: 'https://api.segaloka.com',
    PUBLIC_CERTIFICATE_BASE_URL: 'https://api.segaloka.com'
  };
  for (const role of roles) {
    const host = role === 'CONTROL_CENTER'
      ? 'admin.segaloka.com'
      : role.toLowerCase() + '.dashboard.segaloka.com';
    env['SEGALOKA_' + role + '_HOST'] = host;
    env['SEGALOKA_' + role + '_PUBLIC_ORIGIN'] = 'https://' + host;
  }
  const run = (overrides = {}) => {
    const values = { ...env, ...overrides };
    writeFileSync(join(dir, 'production.env'), Object.entries(values).map(([k, v]) => k + '=' + v).join('\n') + '\n');
    return spawnSync(process.execPath, [join(dir, 'preflight.mjs')], {
      cwd: dir, encoding: 'utf8', timeout: 10000
    });
  };
  return { dir, run };
}

test('valid configuration passes without exposing secret contents', t => {
  const f = fixture();
  t.after(() => rmSync(f.dir, { recursive: true, force: true }));
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Preflight passed/);
  assert.match(result.stderr, /already attached to a Vercel project/);
});

test('rejects an HTTP dashboard origin', t => {
  const f = fixture();
  t.after(() => rmSync(f.dir, { recursive: true, force: true }));
  const result = f.run({ SEGALOKA_TRAVEL_PUBLIC_ORIGIN: 'http://travel.dashboard.segaloka.com' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SEGALOKA_TRAVEL_PUBLIC_ORIGIN must be HTTPS/);
});

test('rejects duplicate dashboard hosts', t => {
  const f = fixture();
  t.after(() => rmSync(f.dir, { recursive: true, force: true }));
  const result = f.run({ SEGALOKA_VENDOR_HOST: 'travel.dashboard.segaloka.com' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SEGALOKA_VENDOR_HOST duplicates SEGALOKA_TRAVEL_HOST/);
});

test('rejects missing database name', t => {
  const f = fixture();
  t.after(() => rmSync(f.dir, { recursive: true, force: true }));
  const result = f.run({ POSTGRES_DB: '' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /POSTGRES_DB is required/);
});

test('rejects a missing secret file', t => {
  const f = fixture();
  t.after(() => rmSync(f.dir, { recursive: true, force: true }));
  rmSync(join(f.dir, 'secrets', 'db_password'));
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing secret file: db_password/);
});

test('rejects a missing TLS certificate', t => {
  const f = fixture();
  t.after(() => rmSync(f.dir, { recursive: true, force: true }));
  rmSync(join(f.dir, 'tls', 'fullchain.pem'));
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing TLS file: fullchain.pem/);
});

test('rejects non-production environment', t => {
  const f = fixture();
  t.after(() => rmSync(f.dir, { recursive: true, force: true }));
  const result = f.run({ NODE_ENV: 'development' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /NODE_ENV must equal production/);
});
