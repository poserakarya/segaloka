import { createHash, createHmac } from 'node:crypto';

function lockKey(value) {
  const hash = createHash('sha256')
    .update(value)
    .digest();

  return hash.readBigInt64BE(0).toString();
}

export async function withLoginLock(
  pool,
  { email, ip, ipHashSecret },
  operation
) {
  if (
    typeof operation !== 'function' ||
    typeof email !== 'string' ||
    typeof ip !== 'string' ||
    ip.length === 0 ||
    typeof ipHashSecret !== 'string' ||
    !/^[0-9a-f]{64}$/.test(ipHashSecret)
  ) {
    throw new Error('LOGIN_LOCK_CONFIGURATION_INVALID');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const ipHash = createHmac('sha256', ipHashSecret)
    .update(ip)
    .digest('hex');

  const keys = [
    lockKey(`segaloka:login:email:${normalizedEmail}`),
    lockKey(`segaloka:login:ip:${ipHash}`)
  ];

  // Urutan konsisten untuk menghindari deadlock.
  const orderedKeys = [...new Set(keys)].sort(
    (a, b) => {
      const left = BigInt(a);
      const right = BigInt(b);
      return left < right ? -1 : left > right ? 1 : 0;
    }
  );

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    for (const key of orderedKeys) {
      await client.query(
        'SELECT pg_advisory_xact_lock($1::bigint)',
        [key]
      );
    }

    const result = await operation({
      query: (sql, params) => client.query(sql, params)
    });

    await client.query('COMMIT');
    transactionStarted = false;

    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch {}
    }

    throw error;
  } finally {
    client.release();
  }
}