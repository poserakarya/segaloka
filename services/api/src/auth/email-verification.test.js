import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import {
  issueEmailVerification,
  consumeEmailVerification
} from './email-verification-service.js';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 3
});

const userId = randomUUID();
const email = `verification-test-${userId}@example.invalid`;

let passed = 0;
let failed = 0;

function check(name, condition) {
  console.log(`${name}: ${condition ? 'PASS' : 'FAIL'}`);
  if (condition) passed++;
  else failed++;
}

try {
  await pool.query('BEGIN');

  // Menggunakan koneksi khusus untuk pengujian.
  // Transaksi luar tidak boleh dibagikan melalui pool.query().
  await pool.query('ROLLBACK');

  console.log('Database connection: PASS');

  // Pengujian integrasi berikutnya akan menggunakan
  // koneksi terisolasi agar data uji tidak tertinggal.
  check(
    'Service functions available',
    typeof issueEmailVerification === 'function' &&
    typeof consumeEmailVerification === 'function'
  );

  console.log('Integration test requires isolated database setup.');
} finally {
  await pool.end();
}

if (failed > 0) process.exitCode = 1;