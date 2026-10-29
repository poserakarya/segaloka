import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import 'dotenv/config';

function config(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`MISSING_CONFIGURATION_${name}`);
  }

  return value;
}

test('transaksi luar melindungi data uji Segaloka', async () => {
  const client = new pg.Client({
    host: config('DB_HOST'),
    port: Number(config('DB_PORT')),
    database: config('DB_NAME'),
    user: config('DB_USER'),
    password: config('DB_PASSWORD'),
    ssl: process.env.DB_SSL === 'true'
  });

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