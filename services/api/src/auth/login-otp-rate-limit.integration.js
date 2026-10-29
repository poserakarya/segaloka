import 'dotenv/config';
import pg from 'pg';
import assert from 'node:assert/strict';

import {
  reserveLoginOtpAttempt,
  finishLoginOtpAttempt
} from './login-otp-rate-limit.js';

if (
  process.env.DB_HOST !== '127.0.0.1' ||
  Number(process.env.DB_PORT) !== 5434
) {
  throw new Error('STOP: DOCKER_5434_REQUIRED');
}

const secret = 'cd'.repeat(32);

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 1,
  connectionTimeoutMillis: 5000
});

let client;

try {
  client = await pool.connect();
  await client.query('BEGIN');

  // Seluruh pengujian berada dalam satu transaksi luar.
  // Gunakan tabel existing; seluruh data test di-rollback.

  let savepoint = 0;

  const testPool = {
    query(sql, params) {
      return client.query(sql, params);
    },
    async connect() {
      return {
        async query(sql, params) {
          const command = sql.trim().toUpperCase();

          if (command === 'BEGIN') {
            savepoint++;
            return client.query(
              `SAVEPOINT otp_rate_${savepoint}`
            );
          }

          if (command === 'COMMIT') {
            const result = await client.query(
              `RELEASE SAVEPOINT otp_rate_${savepoint}`
            );
            savepoint--;
            return result;
          }

          if (command === 'ROLLBACK') {
            await client.query(
              `ROLLBACK TO SAVEPOINT otp_rate_${savepoint}`
            );

            const result = await client.query(
              `RELEASE SAVEPOINT otp_rate_${savepoint}`
            );

            savepoint--;
            return result;
          }

          return client.query(sql, params);
        },
        release() {}
      };
    }
  };

  const ip = '192.0.2.10';
  const reservations = [];

  for (let i = 0; i < 20; i++) {
    const result = await reserveLoginOtpAttempt(testPool, {
      ip,
      ipHashSecret: secret
    });

    assert.equal(result.allowed, true);
    reservations.push(result.attemptId);
  }

  console.log('PASS: 20 reservasi diterima');

  const blocked = await reserveLoginOtpAttempt(testPool, {
    ip,
    ipHashSecret: secret
  });

  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 900);

  console.log('PASS: Reservasi ke-21 ditolak');

  const otherIp = await reserveLoginOtpAttempt(testPool, {
    ip: '192.0.2.11',
    ipHashSecret: secret
  });

  assert.equal(otherIp.allowed, true);
  console.log('PASS: IP berbeda tetap diizinkan');

  await finishLoginOtpAttempt(testPool, {
    attemptId: reservations[0],
    authenticated: false
  });

  await finishLoginOtpAttempt(testPool, {
    attemptId: reservations[1],
    authenticated: true
  });

  const statuses = await client.query(
    `SELECT outcome
     FROM public.auth_login_otp_attempts
     WHERE id = ANY($1::bigint[])
     ORDER BY id`,
    [[reservations[0], reservations[1]]]
  );

  assert.deepEqual(
    statuses.rows.map(row => row.outcome),
    ['failure', 'success']
  );

  console.log('PASS: Status failure dan success tersimpan');
  console.log('ALL OTP RATE LIMIT TESTS PASSED');
} finally {
  if (client) {
    try {
      await client.query('ROLLBACK');
      console.log('TEST DATA ROLLED BACK');
    } finally {
      client.release();
    }
  }

  await pool.end();
}