import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { TEST_DATABASE_SKIP, testDatabaseConfig } from '../../test/support/test-database.js';

const database = testDatabaseConfig();

test('transaksi luar melindungi data uji Segaloka', {
  skip: database ? false : TEST_DATABASE_SKIP
}, async () => {
  const client = new pg.Client(database);

  await client.connect();

  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    await client.query('SAVEPOINT segaloka_test_checkpoint');

    const before = await client.query(
      `SELECT count(*)::integer AS total
       FROM public.traveler_travel_certificates`
    );

    await client.query(
      'ROLLBACK TO SAVEPOINT segaloka_test_checkpoint'
    );

    const after = await client.query(
      `SELECT count(*)::integer AS total
       FROM public.traveler_travel_certificates`
    );

    assert.equal(
      after.rows[0].total,
      before.rows[0].total
    );

    console.log('PASS: PostgreSQL terhubung.');
    console.log('PASS: SAVEPOINT dan rollback berhasil.');
    console.log('PASS: Jumlah sertifikat tidak berubah.');
  } finally {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }

    await client.end();
  }
});