// Uji supervisor container dashboards (deploy/cloud/dashboards-supervisor.mjs):
// aturan environment per dashboard, lalu ketujuh dashboard dijalankan dalam
// mode production dengan secret dari berkas (tanpa .env) di atas API Fastify
// asli + PostgreSQL _test. Tidak membuat akun: login memakai kredensial yang
// tidak ada untuk membuktikan jalur entry -> BFF -> API (ingress bertanda).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DASHBOARDS, childEnvironments } from '../deploy/cloud/dashboards-supervisor.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const db = {
  host: process.env.SEGALOKA_E2E_DB_HOST,
  port: process.env.SEGALOKA_E2E_DB_PORT,
  name: process.env.SEGALOKA_E2E_DB_NAME,
  user: process.env.SEGALOKA_E2E_DB_USER
};
const configured = ['127.0.0.1', 'localhost'].includes(db.host) && /_test$/.test(db.name || '') && db.port && db.user;
const nodeMajor = Number(process.versions.node.split('.')[0]);

function fullEnv(overrides = {}) {
  const env = { NODE_ENV: 'production' };
  for (const { key } of DASHBOARDS) {
    env[`SEGALOKA_${key}_PUBLIC_ORIGIN`] = `https://${key.toLowerCase()}.preview.example`;
    env[`SEGALOKA_${key}_BFF_SESSION_ENCRYPTION_KEY_FILE`] = `/run/secrets/${key.toLowerCase()}`;
  }
  return { ...env, ...overrides };
}

test('supervisor requires production, https origins, and a session key per dashboard', () => {
  assert.throws(() => childEnvironments({ ...fullEnv(), NODE_ENV: 'test' }), /NODE_ENV_PRODUCTION_REQUIRED/);
  assert.throws(() => childEnvironments(fullEnv({ SEGALOKA_VENDOR_PUBLIC_ORIGIN: 'http://vendor.example' })), /VENDOR_PUBLIC_ORIGIN_HTTPS_REQUIRED/);
  const missing = fullEnv();
  delete missing.SEGALOKA_AGEN_BFF_SESSION_ENCRYPTION_KEY_FILE;
  assert.throws(() => childEnvironments(missing), /AGEN_BFF_SESSION_ENCRYPTION_KEY_REQUIRED/);
});

test('supervisor isolates per-dashboard keys/origins and strips test/demo switches', () => {
  const children = childEnvironments(fullEnv({
    BFF_SESSION_ENCRYPTION_KEY: 'bersama-tidak-boleh-dipakai',
    SEGALOKA_PUBLIC_ORIGIN: 'https://salah.example',
    SEGALOKA_TEST_DATABASE: 'true',
    SEGALOKA_CONTROL_TEST: '1',
    SEGALOKA_ENABLE_TEST_DATA_SEED: 'true',
    SEGALOKA_LOCAL_DIAGNOSTICS: '1',
    API_ORIGIN: 'http://api:4192'
  }));
  assert.equal(children.length, 7);
  const seen = new Set();
  for (const { dashboard, bff, entry } of children) {
    const name = dashboard.key.toLowerCase();
    assert.equal(bff.BFF_SESSION_ENCRYPTION_KEY_FILE, `/run/secrets/${name}`);
    assert.equal(bff.BFF_SESSION_ENCRYPTION_KEY, undefined);
    assert.equal(entry.SEGALOKA_PUBLIC_ORIGIN, `https://${name}.preview.example`);
    assert.equal(entry.BFF_SESSION_ENCRYPTION_KEY_FILE, undefined, 'entry tidak menerima kunci sesi');
    for (const env of [bff, entry]) {
      for (const flag of ['SEGALOKA_TEST_DATABASE', 'SEGALOKA_CONTROL_TEST', 'SEGALOKA_ENABLE_TEST_DATA_SEED', 'SEGALOKA_LOCAL_DIAGNOSTICS']) {
        assert.equal(env[flag], undefined, `${name}: ${flag}`);
      }
      assert.equal(Object.keys(env).filter(k => /^SEGALOKA_[A-Z_]+_BFF_SESSION_ENCRYPTION_KEY/.test(k)).length, 0);
      assert.equal(env.API_ORIGIN, 'http://api:4192');
    }
    seen.add(dashboard.port);
  }
  assert.equal(seen.size, 7);
});

test('seven dashboards run in production mode from secret files (no .env), real API + test PostgreSQL', {
  skip: nodeMajor < 24 ? 'butuh Node >= 24' : configured ? false : 'database tes (_test, localhost) belum dikonfigurasi',
  timeout: 240000
}, async () => {
  const envFiles = [
    'services/api/.env',
    ...['vendor-dashboard', 'affiliate-dashboard', 'agen-dashboard', 'mitra-dashboard', 'traveler-portal', 'travel-dashboard'].map(a => `apps/${a}/server/.env`)
  ].map(p => join(root, p));
  assert.deepEqual(envFiles.filter(existsSync), [], 'berkas .env sudah ada; uji dihentikan');

  const work = mkdtempSync(join(tmpdir(), 'dashboards-prod-'));
  const children = [];
  try {
    const secrets = join(work, 'secrets');
    spawnSync('mkdir', [secrets]);
    const secretFile = (name, value) => {
      const path = join(secrets, name);
      writeFileSync(path, value + '\n', { mode: 0o600 });
      return path;
    };
    const ingress = randomBytes(32).toString('hex');
    const env = {
      ...process.env,
      ...fullEnv(),
      API_ORIGIN: 'http://127.0.0.1:4995',
      SEGALOKA_ENTRY_HOST: '127.0.0.1',
      DB_HOST: db.host, DB_PORT: db.port, DB_NAME: db.name, DB_USER: db.user, DB_SSL: 'false',
      DB_PASSWORD_FILE: secretFile('db_password', 'trust-auth-unused'),
      INGRESS_IDENTITY_SECRET_FILE: secretFile('ingress', ingress),
      TRAVEL_DIST_DIR: join(work, 'dist')
    };
    for (const { key } of DASHBOARDS) {
      env[`SEGALOKA_${key}_BFF_SESSION_ENCRYPTION_KEY_FILE`] = secretFile(`${key.toLowerCase()}_session`, randomBytes(32).toString('base64'));
    }

    // Build halaman login Travel dari source yang sama (vite build).
    const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', env.TRAVEL_DIST_DIR, '--emptyOutDir', '--logLevel', 'error'], {
      cwd: join(root, 'apps/travel-dashboard'), encoding: 'utf8'
    });
    assert.equal(build.status, 0, build.stderr);

    const api = spawn(process.execPath, ['src/server.js'], {
      cwd: join(root, 'services/api'),
      env: {
        ...process.env, NODE_ENV: 'production', API_HOST: '127.0.0.1', API_PORT: '4995',
        DB_HOST: db.host, DB_PORT: db.port, DB_NAME: db.name, DB_USER: db.user, DB_SSL: 'false',
        DB_PASSWORD_FILE: env.DB_PASSWORD_FILE,
        INGRESS_IDENTITY_SECRET_FILE: env.INGRESS_IDENTITY_SECRET_FILE,
        AUTH_IP_HASH_SECRET_FILE: secretFile('auth_ip', randomBytes(32).toString('hex')),
        SEGALOKA_PRIVATE_STORAGE_ROOT: join(work, 'storage')
      },
      stdio: ['ignore', 'ignore', 'pipe']
    });
    children.push(api);
    const supervisor = spawn(process.execPath, ['deploy/cloud/dashboards-supervisor.mjs'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    children.push(supervisor);
    let logs = '';
    supervisor.stdout.on('data', c => { logs += c; });
    supervisor.stderr.on('data', c => { logs += c; });

    const waitHealth = async url => {
      for (let i = 0; i < 300; i++) {
        if (supervisor.exitCode !== null) throw new Error('supervisor berhenti: ' + logs.slice(-1500));
        try { if ((await fetch(url)).ok) return; } catch {}
        await new Promise(r => setTimeout(r, 100));
      }
      throw new Error(`tidak siap: ${url}\n${logs.slice(-1500)}`);
    };
    await waitHealth('http://127.0.0.1:4995/health');
    for (const { port } of DASHBOARDS) await waitHealth(`http://127.0.0.1:${port}/health`);
    assert.deepEqual(envFiles.filter(existsSync), [], 'tidak ada .env yang dibuat');

    for (const { key, port } of DASHBOARDS) {
      const origin = `https://${key.toLowerCase()}.preview.example`;
      const loginPath = '/bff/login';
      // Tanpa sesi: akses dashboard ditolak.
      const access = await fetch(`http://127.0.0.1:${port}/bff/dashboard/access`);
      assert.equal(access.status, 401, `${key} access`);
      // Origin asing ditolak oleh entry.
      const foreign = await fetch(`http://127.0.0.1:${port}${loginPath}`, {
        method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'tidak-ada@example.invalid', password: 'kata-sandi-salah-123' })
      });
      assert.equal(foreign.status, 403, `${key} foreign origin`);
      // Origin publik: diteruskan ke BFF lalu API (ingress bertanda dari secret file).
      const login = await fetch(`http://127.0.0.1:${port}${loginPath}`, {
        method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `tidak-ada-${key.toLowerCase()}@example.invalid`, password: 'kata-sandi-salah-123' })
      });
      // 401 = kredensial ditolak API; 429 RATE_LIMITED = pembatas login API
      // (per IP, tersimpan di PostgreSQL). Keduanya hanya bisa datang dari API
      // lewat request ingress bertanda tangan.
      const body = await login.json().catch(() => ({}));
      assert.ok(login.status === 401 || (login.status === 429 && body.code === 'RATE_LIMITED'),
        `${key} login: ${login.status} ${JSON.stringify(body)}`);
      assert.equal(login.headers.get('set-cookie'), null, `${key}: tidak ada cookie sesi`);
    }

    // Halaman login Travel dari build production.
    const travelIndex = await (await fetch('http://127.0.0.1:4200/')).text();
    assert.match(travelIndex, /id="root"/);
    assert.doesNotMatch(travelIndex, /\/src\/main\.tsx/);
  } finally {
    for (const child of children.reverse()) child.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 500));
    rmSync(work, { recursive: true, force: true });
  }
});
