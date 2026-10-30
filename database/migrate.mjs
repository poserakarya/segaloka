#!/usr/bin/env node
// Runner migrasi PostgreSQL Segaloka.
//
//   node database/migrate.mjs status
//   node database/migrate.mjs apply    --confirm-database <DB_NAME>
//   node database/migrate.mjs baseline --through <versi> --confirm-database <DB_NAME>
//
// - Urutan: database/migrations/*.sql (tanpa *.rollback.sql dan *.draft.sql),
//   lalu database/postgres/migrations/*.sql; masing-masing urut nama.
// - Versi = nama berkas tanpa .sql, dicatat di public.schema_migrations
//   (tabel yang sama dengan migrasi 0030). Versi tercatat tidak dijalankan lagi.
// - Berkas yang memuat DROP TABLE/SCHEMA/DATABASE/COLUMN, TRUNCATE, atau
//   DELETE FROM ditolak: runner ini tidak pernah menghapus data.
// - Satu proses pada satu waktu (pg_advisory_lock). Berkas tanpa BEGIN
//   sendiri dibungkus transaksi; kegagalan menghentikan proses tanpa mencatat.
// - "baseline" menandai versi yang sudah diterapkan manual (tanpa
//   menjalankannya) untuk database yang sudah ada sebelum runner ini.
//
// Koneksi: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (atau
// DB_PASSWORD_FILE), DB_SSL=true|false.
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const LOCK_KEY = 'segaloka_schema_migrations';
const DESTRUCTIVE = /\b(drop\s+(table|schema|database|column)|truncate|delete\s+from)\b/i;
const OWN_TRANSACTION = /^\s*BEGIN\s*;/im;

export function migrationFiles(base = root) {
  const dirs = [join(base, 'database/migrations'), join(base, 'database/postgres/migrations')];
  return dirs.flatMap(dir => readdirSync(dir)
    .filter(name => name.endsWith('.sql') && !name.endsWith('.rollback.sql') && !name.endsWith('.draft.sql'))
    .sort()
    .map(name => ({ version: name.slice(0, -4), path: join(dir, name) })));
}

// Komentar SQL dibuang sebelum pemeriksaan destruktif.
export function isDestructive(sql) {
  const code = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  return DESTRUCTIVE.test(code);
}

function parseArgs(argv) {
  const [command = 'status', ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--confirm-database') options.confirmDatabase = rest[++i];
    else if (rest[i] === '--through') options.through = rest[++i];
    else throw new Error(`ARGUMEN_TIDAK_DIKENAL:${rest[i]}`);
  }
  return { command, options };
}

function dbConfig(env) {
  const password = env.DB_PASSWORD ?? (env.DB_PASSWORD_FILE ? readFileSync(env.DB_PASSWORD_FILE, 'utf8').trim() : undefined);
  for (const key of ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER']) {
    if (!env[key]) throw new Error(`KONFIGURASI_DB_KURANG:${key}`);
  }
  return {
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    database: env.DB_NAME,
    user: env.DB_USER,
    password,
    ssl: env.DB_SSL === 'true',
    application_name: 'segaloka-migrate'
  };
}

export async function run(argv, { env = process.env, log = console.log, base = root } = {}) {
  const { command, options } = parseArgs(argv);
  if (!['status', 'apply', 'baseline'].includes(command)) throw new Error(`PERINTAH_TIDAK_DIKENAL:${command}`);
  const config = dbConfig(env);
  if (command !== 'status' && options.confirmDatabase !== config.database) {
    throw new Error('KONFIRMASI_DATABASE_DIPERLUKAN: tambahkan --confirm-database <DB_NAME> yang sama dengan DB_NAME');
  }

  const files = migrationFiles(base);
  const { Client } = createRequire(join(root, 'services/api/package.json'))('pg');
  const client = new Client(config);
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [LOCK_KEY]);
    // Tabel dibuat oleh migrasi 0001; pada database kosong belum ada.
    const ensureTable = () => client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version varchar(100) PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const tableExists = (await client.query("SELECT to_regclass('public.schema_migrations') AS t")).rows[0].t !== null;
    const applied = new Set(tableExists
      ? (await client.query('SELECT version FROM public.schema_migrations')).rows.map(r => r.version)
      : []);
    const pending = files.filter(file => !applied.has(file.version));

    if (command === 'status') {
      log(`database ${config.database}: ${files.length - pending.length} tercatat, ${pending.length} tertunda`);
      for (const file of pending) log(`  tertunda: ${file.version}`);
      return { applied: [...applied], pending: pending.map(f => f.version) };
    }

    if (command === 'baseline') {
      const index = files.findIndex(file => file.version === options.through);
      if (index < 0) throw new Error('VERSI_BASELINE_TIDAK_DITEMUKAN');
      const marked = [];
      await ensureTable();
      for (const file of files.slice(0, index + 1)) {
        if (applied.has(file.version)) continue;
        await client.query('INSERT INTO public.schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING', [file.version]);
        marked.push(file.version);
      }
      log(`baseline: ${marked.length} versi ditandai tanpa dijalankan`);
      return { marked };
    }

    const sources = pending.map(file => ({ ...file, sql: readFileSync(file.path, 'utf8') }));
    const destructive = sources.filter(file => isDestructive(file.sql));
    if (destructive.length) {
      throw new Error(`MIGRASI_DESTRUKTIF_DITOLAK: ${destructive.map(f => f.version).join(', ')}`);
    }
    const done = [];
    for (const file of sources) {
      const ownTransaction = OWN_TRANSACTION.test(file.sql);
      try {
        if (ownTransaction) {
          await client.query(file.sql);
        } else {
          await client.query('BEGIN');
          await client.query(file.sql);
          await client.query('COMMIT');
        }
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`MIGRASI_GAGAL:${file.version}: ${error.message}`);
      }
      await ensureTable();
      await client.query('INSERT INTO public.schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING', [file.version]);
      done.push(file.version);
      log(`  diterapkan: ${file.version}`);
    }
    log(`apply: ${done.length} migrasi diterapkan`);
    return { applied: done };
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtext($1))', [LOCK_KEY]).catch(() => {});
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  run(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
