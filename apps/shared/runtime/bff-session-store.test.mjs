// Session store BFF bersama terhadap PostgreSQL *_test sementara (runner
// migrasi asli). Fokus: rotasi token dengan pg_advisory_xact_lock aman untuk
// pooler mode transaksi, concurrency, rollback, dan pelepasan koneksi.
//
//   SEGALOKA_E2E_DB_HOST/PORT/NAME/USER (database *_test di localhost)
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { createSessionStore, decryptSession, encryptSession, hashSession } from './bff-session-store.mjs';
import { run as migrate } from '../../../database/migrate.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const db = {
  host: process.env.SEGALOKA_E2E_DB_HOST,
  port: process.env.SEGALOKA_E2E_DB_PORT,
  name: process.env.SEGALOKA_E2E_DB_NAME,
  user: process.env.SEGALOKA_E2E_DB_USER
};
const configured = ['127.0.0.1', 'localhost'].includes(db.host) && /_test$/.test(db.name || '') && db.port && db.user;
const KEY = randomBytes(32).toString('base64');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

test('encryption and hashing helpers (no database)', () => {
  const sealed = encryptSession({ accessToken: 'a' }, KEY);
  assert.deepEqual(decryptSession(sealed, KEY), { accessToken: 'a' });
  assert.throws(() => decryptSession(sealed, randomBytes(32).toString('base64')));
  assert.equal(hashSession('x'), null);
  assert.match(hashSession('a'.repeat(64)), /^[0-9a-f]{64}$/);
  assert.throws(() => createSessionStore({ query() {} }, 'pendek'), /INVALID_SESSION_ENCRYPTION_SECRET/);
  assert.throws(() => createSessionStore({ query() {} }, KEY, { refreshLockTimeoutMs: 0 }), /INVALID_REFRESH_LOCK_TIMEOUT/);
});

test('session store: transaction-scoped refresh lock', {
  skip: configured ? false : 'database tes (_test, localhost) belum dikonfigurasi',
  timeout: 120000
}, async t => {
  const { Client, Pool } = createRequire(`${root}services/api/package.json`)('pg');
  const name = `seg_session_${randomBytes(3).toString('hex')}_test`;
  const admin = new Client({ host: db.host, port: Number(db.port), database: db.name, user: db.user, password: 'x' });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  const dbEnv = { DB_HOST: db.host, DB_PORT: String(db.port), DB_NAME: name, DB_USER: db.user, DB_PASSWORD: 'x', DB_SSL: 'false' };
  const pool = new Pool({ host: db.host, port: Number(db.port), database: name, user: db.user, password: 'x', max: 4 });
  // Sama dengan BFF: error koneksi (mis. backend diputus) tidak boleh crash.
  const poolErrors = [];
  pool.on('error', error => poolErrors.push(error.message));
  try {
    await migrate(['apply', '--confirm-database', name], { env: dbEnv, log: () => {} });
    const [{ id: userId }] = (await pool.query(
      `INSERT INTO public.users (email, full_name, status) VALUES ($1, 'Uji Sesi', 'active') RETURNING id`,
      [`sesi-${randomBytes(3).toString('hex')}@example.invalid`]
    )).rows;
    const store = createSessionStore(pool, KEY, { refreshLockTimeoutMs: 300 });
    const advisoryLocks = async () => Number((await pool.query(
      `SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND objid = 19017`
    )).rows[0].count);
    const newSession = async () => {
      const id = randomBytes(32).toString('hex');
      await store.create(id, userId, { accessToken: 'akses-0', refreshToken: 'segar-0' });
      return id;
    };

    await t.test('create/get/revoke', async () => {
      const id = await newSession();
      assert.deepEqual(await store.get(id), { accessToken: 'akses-0', refreshToken: 'segar-0' });
      await store.revoke(id);
      assert.equal(await store.get(id), null);
      assert.equal(await store.refresh(id, async () => assert.fail('sesi dicabut')), null);
    });

    await t.test('refresh paralel: rotasi hanya sekali, keduanya membaca token terbaru', async () => {
      const id = await newSession();
      let apiCalls = 0;
      // Pola BFF: bila token sudah dirotasi permintaan lain, pakai yang ada.
      const rotate = async current => {
        if (current.accessToken !== 'akses-0') return current;
        apiCalls++;
        await sleep(150);
        return { ...current, accessToken: 'akses-1', refreshToken: 'segar-1' };
      };
      const results = await Promise.all([store.refresh(id, rotate), store.refresh(id, rotate), store.refresh(id, rotate)]);
      assert.equal(apiCalls, 1);
      for (const result of results) assert.equal(result.accessToken, 'akses-1');
      assert.equal((await store.get(id)).refreshToken, 'segar-1');
      assert.equal(await advisoryLocks(), 0, 'kunci lepas setelah COMMIT');
    });

    await t.test('rotate gagal: ROLLBACK, token lama tetap, kunci dan koneksi dilepas', async () => {
      const id = await newSession();
      await assert.rejects(store.refresh(id, async () => {
        await sleep(20);
        throw new Error('REFRESH_SERVICE_UNAVAILABLE');
      }), /REFRESH_SERVICE_UNAVAILABLE/);
      assert.equal((await store.get(id)).accessToken, 'akses-0');
      assert.equal(await advisoryLocks(), 0);
      assert.equal(pool.idleCount + pool.waitingCount <= pool.totalCount, true);
      assert.equal(pool.waitingCount, 0);
      // Permintaan berikutnya langsung mendapat kunci.
      const next = await store.refresh(id, async current => ({ ...current, accessToken: 'akses-2' }));
      assert.equal(next.accessToken, 'akses-2');
    });

    await t.test('rotate mengembalikan null: sesi tidak berubah', async () => {
      const id = await newSession();
      assert.equal(await store.refresh(id, async () => null), null);
      assert.equal((await store.get(id)).accessToken, 'akses-0');
    });

    await t.test('kunci terikat transaksi, bukan sesi koneksi (aman untuk pooler)', async () => {
      const id = await newSession();
      // Koneksi tunggal dipakai ulang (seperti pooler): setelah refresh selesai,
      // backend yang sama tidak memegang kunci apa pun.
      const single = new Pool({ host: db.host, port: Number(db.port), database: name, user: db.user, password: 'x', max: 1 });
      single.on('error', () => {});
      try {
        const singleStore = createSessionStore(single, KEY, { refreshLockTimeoutMs: 300 });
        await singleStore.refresh(id, async current => ({ ...current, accessToken: 'akses-3' }));
        const held = await single.query(
          `SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid()`
        );
        assert.equal(held.rows[0].n, 0);
        const inTransaction = await single.query(`SELECT now() = statement_timestamp() AS idle`);
        assert.equal(inTransaction.rows[0].idle, true, 'tidak ada transaksi yang tertinggal terbuka');
      } finally {
        await single.end();
      }
    });

    await t.test('lock_timeout: refresh gagal cepat bila kunci tertahan, lalu pulih', async () => {
      const id = await newSession();
      const holder = await pool.connect();
      try {
        await holder.query('BEGIN');
        await holder.query('SELECT pg_advisory_xact_lock(hashtext($1), 19017)', [hashSession(id)]);
        const started = Date.now();
        await assert.rejects(store.refresh(id, async current => current), error => error.code === '55P03');
        assert.ok(Date.now() - started < 5000);
      } finally {
        await holder.query('ROLLBACK');
        holder.release();
      }
      const after = await store.refresh(id, async current => ({ ...current, accessToken: 'akses-4' }));
      assert.equal(after.accessToken, 'akses-4');
      assert.equal(await advisoryLocks(), 0);
    });

    await t.test('koneksi rusak di tengah transaksi tidak dikembalikan ke pool', async () => {
      const id = await newSession();
      await assert.rejects(store.refresh(id, async () => {
        // Putuskan backend milik transaksi ini dari koneksi lain.
        await pool.query(
          `SELECT pg_terminate_backend(pid) FROM pg_locks WHERE locktype = 'advisory' AND objid = 19017 AND granted`
        );
        await sleep(50);
        return { accessToken: 'tidak-tersimpan' };
      }));
      assert.equal((await store.get(id)).accessToken, 'akses-0');
      assert.equal(await advisoryLocks(), 0);
      await sleep(50);
      assert.ok(poolErrors.every(message => /terminat/i.test(message)), poolErrors.join(', '));
      // Pool tetap sehat untuk permintaan berikutnya.
      assert.equal((await store.refresh(id, async current => ({ ...current, accessToken: 'akses-5' }))).accessToken, 'akses-5');
    });
  } finally {
    await pool.end();
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.end();
  }
});
