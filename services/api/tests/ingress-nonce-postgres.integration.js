import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

import {
  reserveIngressNonce
} from '../src/security/ingress-nonce-store.js';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true',
  max: 1,
  connectionTimeoutMillis: 5000
});

let client;
let transactionStarted = false;
let failed = false;

try {
  client = await pool.connect();

  await client.query('BEGIN');
  transactionStarted = true;

  const identity = {
    ip: '192.0.2.10',
    nonce: randomBytes(16).toString('hex'),
    timestamp: Date.now()
  };

  const first = await reserveIngressNonce(client, identity);
  const second = await reserveIngressNonce(client, identity);

  if (first !== true) {
    throw new Error('FIRST_NONCE_NOT_ACCEPTED');
  }

  if (second !== false) {
    throw new Error('REPLAY_NOT_REJECTED');
  }

  console.log('PASS: First nonce accepted by PostgreSQL');
  console.log('PASS: Replayed nonce rejected by PostgreSQL');

  const result = await client.query(
    'SELECT COUNT(*)::int AS count FROM public.ingress_nonces WHERE nonce = $1',
    [identity.nonce]
  );

  if (result.rows[0].count !== 1) {
    throw new Error('NONCE_STORAGE_INCONSISTENT');
  }

  console.log('PASS: Exactly one nonce stored inside transaction');
} catch (error) {
  failed = true;
  console.error('FAIL:', error instanceof Error ? error.message : 'UNKNOWN');
} finally {
  if (client) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
        console.log('PASS: Test transaction rolled back');
      } catch {
        failed = true;
        console.error('FAIL: ROLLBACK_FAILED');
      }
    }

    client.release();
  }

  await pool.end();
}

if (failed) {
  process.exitCode = 1;
}