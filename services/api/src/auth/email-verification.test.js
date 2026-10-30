import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {
  issueEmailVerification,
  consumeEmailVerification
} from './email-verification-service.js';
import { TEST_DATABASE_SKIP, testDatabaseConfig } from '../../test/support/test-database.js';

const database = testDatabaseConfig();

test('email verification service is available against the isolated test database', {
  skip: database ? false : TEST_DATABASE_SKIP
}, async () => {
  const pool = new pg.Pool({ ...database, max: 3 });
  try {
    // Transaksi luar tidak dibagikan lewat pool.query(); koneksi hanya
    // diverifikasi tanpa meninggalkan data uji.
    await pool.query('BEGIN');
    await pool.query('ROLLBACK');
    assert.equal(typeof issueEmailVerification, 'function');
    assert.equal(typeof consumeEmailVerification, 'function');
  } finally {
    await pool.end();
  }
});
