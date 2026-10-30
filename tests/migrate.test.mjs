// Uji runner migrasi (database/migrate.mjs) pada PostgreSQL tes lokal.
// Membuat database sementara *_test, lalu menghapusnya di akhir.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

import { isDestructive, migrationFiles, run } from '../database/migrate.mjs';

const db = {
  host: process.env.SEGALOKA_E2E_DB_HOST,
  port: process.env.SEGALOKA_E2E_DB_PORT,
  name: process.env.SEGALOKA_E2E_DB_NAME,
  user: process.env.SEGALOKA_E2E_DB_USER
};
const configured = ['127.0.0.1', 'localhost'].includes(db.host) && /_test$/.test(db.name || '') && db.port && db.user;
const { Client } = createRequire(new URL('../services/api/package.json', import.meta.url))('pg');

async function admin(sql) {
  const client = new Client({ host: db.host, port: Number(db.port), database: db.name, user: db.user, password: 'x' });
  await client.connect();
  try { return await client.query(sql); } finally { await client.end(); }
}

test('destructive statements are detected, comments ignored', () => {
  assert.equal(isDestructive('DROP TABLE public.users;'), true);
  assert.equal(isDestructive('truncate public.x'), true);
  assert.equal(isDestructive('DELETE FROM public.x WHERE true;'), true);
  assert.equal(isDestructive('ALTER TABLE x DROP COLUMN y;'), true);
  assert.equal(isDestructive('-- DROP TABLE x\nCREATE TABLE IF NOT EXISTS y (id int);'), false);
  assert.equal(isDestructive('CREATE TABLE a (b uuid REFERENCES c(id) ON DELETE CASCADE); DROP TRIGGER IF EXISTS t ON a;'), false);
  assert.equal(isDestructive('CREATE TRIGGER t BEFORE TRUNCATE ON a FOR EACH STATEMENT EXECUTE FUNCTION f();'), false);
  assert.equal(isDestructive('TRUNCATE TABLE public.a;'), true);
  assert.equal(isDestructive('BEGIN; TRUNCATE public.a; COMMIT;'), true);
});

test('existing repository migrations contain no destructive statements', async () => {
  const { readFileSync } = await import('node:fs');
  const files = migrationFiles();
  assert.ok(files.length >= 40);
  assert.ok(files.every(file => !/\.(rollback|draft)$/.test(file.version)));
  assert.deepEqual(files.filter(file => isDestructive(readFileSync(file.path, 'utf8'))).map(f => f.version), []);
});

test('migration runner: status, confirmation, apply, idempotent re-run, baseline, destructive refusal', {
  skip: configured ? false : 'database tes (_test, localhost) belum dikonfigurasi',
  timeout: 120000
}, async () => {
  const names = [`seg_migrate_a_${randomBytes(3).toString('hex')}_test`, `seg_migrate_b_${randomBytes(3).toString('hex')}_test`];
  for (const name of names) await admin(`CREATE DATABASE ${name}`);
  const envFor = name => ({ DB_HOST: db.host, DB_PORT: db.port, DB_NAME: name, DB_USER: db.user, DB_PASSWORD: 'x', DB_SSL: 'false' });
  const log = () => {};
  const total = migrationFiles().length;
  try {
    const [a, b] = names;
    const before = await run(['status'], { env: envFor(a), log });
    assert.equal(before.pending.length, total);

    await assert.rejects(run(['apply'], { env: envFor(a), log }), /KONFIRMASI_DATABASE_DIPERLUKAN/);
    await assert.rejects(run(['apply', '--confirm-database', 'salah_test'], { env: envFor(a), log }), /KONFIRMASI_DATABASE_DIPERLUKAN/);

    const applied = await run(['apply', '--confirm-database', a], { env: envFor(a), log });
    assert.equal(applied.applied.length, total);
    const again = await run(['apply', '--confirm-database', a], { env: envFor(a), log });
    assert.deepEqual(again.applied, []);
    assert.deepEqual((await run(['status'], { env: envFor(a), log })).pending, []);

    // Baseline: menandai tanpa menjalankan (tabel users tidak dibuat).
    const files = migrationFiles();
    const marked = await run(['baseline', '--through', files[2].version, '--confirm-database', b], { env: envFor(b), log });
    assert.deepEqual(marked.marked, files.slice(0, 3).map(f => f.version));
    const client = new Client({ host: db.host, port: Number(db.port), database: b, user: db.user, password: 'x' });
    await client.connect();
    try {
      assert.equal((await client.query("SELECT to_regclass('public.users') AS t")).rows[0].t, null);
    } finally {
      await client.end();
    }

    // Migrasi destruktif ditolak sebelum apa pun dijalankan.
    const base = mkdtempSync(join(tmpdir(), 'migrate-base-'));
    try {
      mkdirSync(join(base, 'database/migrations'), { recursive: true });
      mkdirSync(join(base, 'database/postgres/migrations'), { recursive: true });
      writeFileSync(join(base, 'database/migrations/9001_aman.sql'), 'CREATE TABLE IF NOT EXISTS public.migrate_probe (id int);');
      writeFileSync(join(base, 'database/migrations/9002_hapus.sql'), 'DROP TABLE public.migrate_probe;');
      await assert.rejects(run(['apply', '--confirm-database', b], { env: envFor(b), log, base }), /MIGRASI_DESTRUKTIF_DITOLAK: 9002_hapus/);
      const probe = new Client({ host: db.host, port: Number(db.port), database: b, user: db.user, password: 'x' });
      await probe.connect();
      try {
        assert.equal((await probe.query("SELECT to_regclass('public.migrate_probe') AS t")).rows[0].t, null);
      } finally {
        await probe.end();
      }
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  } finally {
    for (const name of names) await admin(`DROP DATABASE IF EXISTS ${name}`);
  }
});
