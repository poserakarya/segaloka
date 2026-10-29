import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { withLoginLock } from './login-lock.js';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 3,
  connectionTimeoutMillis: 5000
});

const secret = process.env.AUTH_IP_HASH_SECRET;
const id = randomUUID();

if (!/^[0-9a-f]{64}$/.test(secret || '')) {
  throw new Error('AUTH_IP_HASH_SECRET_INVALID');
}

function assert(name, passed) {
  console.log(`${name}: ${passed ? 'PASS' : 'FAIL'}`);

  if (!passed) {
    throw new Error(`TEST_FAILED: ${name}`);
  }
}

async function expectContention(first, second) {
  let releaseFirst;
  let signalEntered;

  const entered = new Promise(resolve => {
    signalEntered = resolve;
  });

  const gate = new Promise(resolve => {
    releaseFirst = resolve;
  });

  const holder = withLoginLock(
    pool,
    first,
    async () => {
      signalEntered();
      await gate;
      return 'FIRST_COMPLETED';
    }
  );

  try {
    await entered;

    let secondExecuted = false;

    const contender = withLoginLock(
      pool,
      second,
      async () => {
        secondExecuted = true;
        return 'SECOND_COMPLETED';
      }
    );

    let settled = false;

    contender.then(
      () => { settled = true; },
      () => { settled = true; }
    );

    // Beri waktu PostgreSQL memproses permintaan kedua.
    await new Promise(resolve => setTimeout(resolve, 300));

    const blockedWhileHeld =
      !settled && !secondExecuted;

    releaseFirst();

    const results = await Promise.all([
      holder,
      contender
    ]);

    return {
      blockedWhileHeld,
      completedAfterRelease:
        results[0] === 'FIRST_COMPLETED' &&
        results[1] === 'SECOND_COMPLETED' &&
        secondExecuted
    };
  } finally {
    releaseFirst?.();
    await holder.catch(() => {});
  }
}

try {
  const email = `lock-${id}@example.invalid`;
  const ip = `ip-${id}`;

  const sameEmail = await expectContention(
    { email, ip, ipHashSecret: secret },
    {
      email,
      ip: `other-ip-${id}`,
      ipHashSecret: secret
    }
  );

  assert(
    'Same email blocked concurrently',
    sameEmail.blockedWhileHeld
  );

  assert(
    'Email lock released after commit',
    sameEmail.completedAfterRelease
  );

  const sameIp = await expectContention(
    {
      email: `first-${id}@example.invalid`,
      ip,
      ipHashSecret: secret
    },
    {
      email: `second-${id}@example.invalid`,
      ip,
      ipHashSecret: secret
    }
  );

  assert(
    'Same IP blocked concurrently',
    sameIp.blockedWhileHeld
  );

  assert(
    'IP lock released after commit',
    sameIp.completedAfterRelease
  );

  console.log('ALL LOGIN LOCK TESTS PASSED');
} finally {
  await pool.end();
}