// Supervisor container "dashboards": menjalankan ketujuh Dashboard V7 yang
// sudah ada, masing-masing entry server + BFF-nya sendiri (URL, sesi, dan
// cookie tetap terpisah). Entry mendengarkan SEGALOKA_ENTRY_HOST (0.0.0.0 di
// container, di belakang nginx); BFF hanya 127.0.0.1.
//
// Konfigurasi per dashboard (environment / secret manager):
//   SEGALOKA_<KEY>_PUBLIC_ORIGIN                 https://<host publik>
//   SEGALOKA_<KEY>_BFF_SESSION_ENCRYPTION_KEY    (atau ..._FILE)
// dengan <KEY> = CONTROL_CENTER, TRAVEL, VENDOR, AFFILIATE, AGEN, MITRA,
// TRAVELER. Konfigurasi bersama (API_ORIGIN, DB_*, INGRESS_IDENTITY_SECRET,
// masing-masing juga bisa ..._FILE) diteruskan ke semua BFF.
//
// Bila satu proses berhenti, semua dihentikan dan container keluar dengan
// kode gagal sehingga orchestrator me-restart-nya.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

export const DASHBOARDS = Object.freeze([
  { key: 'CONTROL_CENTER', bff: ['apps/control-center/bff.mjs', { SEGALOKA_BFF_PORT: '4203' }],
    entry: ['apps/control-center/server.mjs', { SEGALOKA_CONTROL_CENTER_PORT: '4202', SEGALOKA_CONTROL_CENTER_BFF_PORT: '4203' }], port: 4202 },
  { key: 'TRAVEL', bff: ['apps/travel-dashboard/server/bff.mjs', { BFF_PORT: '4201', FRONTEND_ORIGIN: 'http://127.0.0.1:4200' }],
    entry: ['apps/travel-dashboard/server/frontend.mjs', { TRAVEL_FRONTEND_PORT: '4200', TRAVEL_BFF_PORT: '4201' }], port: 4200 },
  { key: 'VENDOR', bff: ['apps/vendor-dashboard/server/bff.mjs', {}], entry: ['apps/vendor-dashboard/server-v7.mjs', {}], port: 4204 },
  { key: 'AFFILIATE', bff: ['apps/affiliate-dashboard/server/bff.mjs', {}], entry: ['apps/affiliate-dashboard/server.mjs', {}], port: 4212 },
  { key: 'AGEN', bff: ['apps/agen-dashboard/server/bff.mjs', {}], entry: ['apps/agen-dashboard/server.mjs', {}], port: 4216 },
  { key: 'MITRA', bff: ['apps/mitra-dashboard/server/bff.mjs', {}], entry: ['apps/mitra-dashboard/server.mjs', {}], port: 4214 },
  { key: 'TRAVELER', bff: ['apps/traveler-portal/server/bff.mjs', {}], entry: ['apps/traveler-portal/server.mjs', {}], port: 4210 }
]);

// Variabel yang tidak boleh bocor antar-dashboard atau mengaktifkan mode uji.
const STRIPPED = [
  'BFF_SESSION_ENCRYPTION_KEY', 'BFF_SESSION_ENCRYPTION_KEY_FILE', 'SEGALOKA_PUBLIC_ORIGIN',
  'SEGALOKA_TEST_DATABASE', 'SEGALOKA_CONTROL_TEST', 'SEGALOKA_LOCAL_DIAGNOSTICS', 'SEGALOKA_ENABLE_TEST_DATA_SEED'
];

export function childEnvironments(env = process.env) {
  if (env.NODE_ENV !== 'production') throw new Error('NODE_ENV_PRODUCTION_REQUIRED');
  const base = { ...env };
  for (const name of STRIPPED) delete base[name];
  for (const dashboard of DASHBOARDS) for (const name of Object.keys(base)) {
    if (name.startsWith(`SEGALOKA_${dashboard.key}_`)) delete base[name];
  }

  return DASHBOARDS.map(dashboard => {
    const publicOrigin = env[`SEGALOKA_${dashboard.key}_PUBLIC_ORIGIN`];
    if (!publicOrigin || new URL(publicOrigin).protocol !== 'https:') {
      throw new Error(`SEGALOKA_${dashboard.key}_PUBLIC_ORIGIN_HTTPS_REQUIRED`);
    }
    const sessionKey = env[`SEGALOKA_${dashboard.key}_BFF_SESSION_ENCRYPTION_KEY`];
    const sessionKeyFile = env[`SEGALOKA_${dashboard.key}_BFF_SESSION_ENCRYPTION_KEY_FILE`];
    if (!sessionKey && !sessionKeyFile) {
      throw new Error(`SEGALOKA_${dashboard.key}_BFF_SESSION_ENCRYPTION_KEY_REQUIRED`);
    }
    const session = sessionKey
      ? { BFF_SESSION_ENCRYPTION_KEY: sessionKey }
      : { BFF_SESSION_ENCRYPTION_KEY_FILE: sessionKeyFile };
    return {
      dashboard,
      bff: { ...base, ...dashboard.bff[1], ...session },
      entry: { ...base, ...dashboard.entry[1], SEGALOKA_PUBLIC_ORIGIN: new URL(publicOrigin).origin }
    };
  });
}

function main() {
  const children = [];
  let stopping = false;
  const stop = code => {
    if (stopping) return;
    stopping = true;
    for (const child of children) child.kill('SIGTERM');
    setTimeout(() => process.exit(code), 5000).unref();
  };

  for (const { dashboard, bff, entry } of childEnvironments()) {
    for (const [label, script, env] of [['bff', dashboard.bff[0], bff], ['entry', dashboard.entry[0], entry]]) {
      const child = spawn(process.execPath, [script], { cwd: root, env, stdio: ['ignore', 'inherit', 'inherit'] });
      child.on('exit', (code, signal) => {
        console.error(`[dashboards] ${dashboard.key.toLowerCase()} ${label} berhenti (code=${code}, signal=${signal})`);
        stop(1);
      });
      children.push(child);
    }
  }
  process.on('SIGTERM', () => stop(0));
  process.on('SIGINT', () => stop(0));
  console.log(`[dashboards] ${children.length} proses berjalan untuk ${DASHBOARDS.length} dashboard`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
