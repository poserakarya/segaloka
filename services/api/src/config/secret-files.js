// Secret dari berkas (Docker secrets / secret manager yang di-mount sebagai
// berkas): untuk setiap NAMA di daftar ini, bila NAMA belum diset dan
// NAMA_FILE diset, isi berkas (di-trim) dipakai sebagai NAMA. Harus diimpor
// paling awal di server.js, sebelum modul lain membaca process.env.
import { readFileSync } from 'node:fs';

export const SECRET_ENV_NAMES = Object.freeze([
  'DB_PASSWORD',
  'INGRESS_IDENTITY_SECRET',
  'AUTH_IP_HASH_SECRET',
  'AUTH_OTP_HASH_SECRET',
  'CERTIFICATE_ENCRYPTION_KEY',
  'OAUTH_CONFIG_ENCRYPTION_KEY',
  'SEGALOKA_TOTP_ENCRYPTION_KEY',
  'PASSWORD_RESET_OTP_SECRET',
  'DASHBOARD_HANDOFF_SECRET',
  'RESEND_API_KEY',
  'RESEND_WEBHOOK_SIGNING_SECRET'
]);

export function loadSecretFiles(env = process.env, names = SECRET_ENV_NAMES) {
  const loaded = [];
  for (const name of names) {
    const file = env[`${name}_FILE`];
    if ((env[name] === undefined || env[name] === '') && typeof file === 'string' && file !== '') {
      env[name] = readFileSync(file, 'utf8').trim();
      loaded.push(name);
    }
  }
  return loaded;
}

loadSecretFiles();
