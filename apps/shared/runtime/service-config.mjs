// Pembaca konfigurasi proses (BFF/entry). Urutan sumber per nama:
//   1. variabel environment NAMA
//   2. NAMA_FILE: path berkas secret (Docker secrets / secret manager yang
//      di-mount sebagai berkas); isi berkas di-trim
//   3. berkas .env lama (fallback untuk lingkungan lokal yang sudah ada)
// Nilai secret tidak pernah dicetak.
import { existsSync, readFileSync } from 'node:fs';

export function parseEnvFile(text) {
  const values = {};
  for (const line of String(text).split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

export function createConfigReader({ env = process.env } = {}) {
  const files = new Map();

  function fileValues(path) {
    if (!files.has(path)) {
      files.set(path, existsSync(path) ? parseEnvFile(readFileSync(path, 'utf8')) : null);
    }
    return files.get(path);
  }

  return function read(name, fallbackFile) {
    if (typeof env[name] === 'string' && env[name] !== '') return env[name];
    const secretFile = env[`${name}_FILE`];
    if (typeof secretFile === 'string' && secretFile !== '') {
      return readFileSync(secretFile, 'utf8').trim();
    }
    if (!fallbackFile) return undefined;
    const values = fileValues(fallbackFile);
    if (!values) throw new Error(`CONFIG_NOT_FOUND:${name}`);
    return values[name];
  };
}

export const DB_CONFIG_KEYS = Object.freeze(['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_SSL']);

export function readDbConfig(read, fallbackFile) {
  return Object.fromEntries(DB_CONFIG_KEYS.map(key => [key, read(key, fallbackFile)]));
}

export function readIngressSecret(read, fallbackFile) {
  const secret = read('INGRESS_IDENTITY_SECRET', fallbackFile);
  if (typeof secret !== 'string') throw new Error('INGRESS_SECRET_NOT_FOUND');
  if (secret.length < 32) throw new Error('INVALID_INGRESS_SECRET');
  return secret;
}
