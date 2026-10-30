// Konfigurasi PostgreSQL untuk tes integrasi. Hanya database terisolasi
// bernama *_test di localhost yang diizinkan; selain itu tes dilewati
// (bukan dihubungkan ke database lain, termasuk production).
//
// Sumber (urut): SEGALOKA_E2E_DB_HOST/PORT/NAME/USER/PASSWORD, lalu DB_*.
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export function testDatabaseConfig(env = process.env) {
  const pick = key => env[`SEGALOKA_E2E_DB_${key}`] || env[`DB_${key}`];
  const host = pick('HOST');
  const port = Number(pick('PORT'));
  const database = pick('NAME');
  const user = pick('USER');
  if (!LOCAL_HOSTS.has(host) || !/_test$/.test(database || '') || !Number.isInteger(port) || !user) {
    return null;
  }
  return {
    host,
    port,
    database,
    user,
    password: pick('PASSWORD') || 'trust-auth-unused',
    ssl: false
  };
}

export const TEST_DATABASE_SKIP =
  'database tes (*_test di localhost) belum dikonfigurasi lewat SEGALOKA_E2E_DB_* atau DB_*';
