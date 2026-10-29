import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'node:crypto';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 3,
  connectionTimeoutMillis: 5000
});

const id = randomUUID();
const email = `concurrency-${id}@example.invalid`;

let setup;
let first;
let second;

try {
  setup = await pool.connect();

  await setup.query('BEGIN');

  await setup.query(
    `INSERT INTO public.users (id, email, full_name, status)
     VALUES ($1, $2, $3, 'active')`,
    [id, email, 'Concurrency Test']
  );

  await setup.query('COMMIT');
  setup.release();
  setup = null;

  first = await pool.connect();
  second = await pool.connect();

  await first.query('BEGIN');
  await second.query('BEGIN');

  await first.query(
    'SELECT id FROM public.users WHERE id = $1 FOR UPDATE',
    [id]
  );

  await second.query("SET LOCAL lock_timeout = '300ms'");

  let blocked = false;

  try {
    await second.query(
      'SELECT id FROM public.users WHERE id = $1 FOR UPDATE',
      [id]
    );
  } catch (error) {
    blocked = error.code === '55P03';
  }

  console.log(
    'Concurrent request blocked:',
    blocked ? 'PASS' : 'FAIL'
  );

  await first.query('ROLLBACK');
  await second.query('ROLLBACK');

  if (!blocked) {
    process.exitCode = 1;
  }
} finally {
  for (const client of [first, second, setup]) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {}

      client.release();
    }
  }

  await pool.query(
    'DELETE FROM public.users WHERE id = $1',
    [id]
  );

  await pool.end();
}

if (!process.exitCode) {
  console.log('TEST DATA CLEANED: PASS');
  console.log('TAHAP 14.11D SELESAI');
}