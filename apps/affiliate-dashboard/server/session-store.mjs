import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function hashSession(id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) {
    return null;
  }
  return createHash('sha256').update(id).digest('hex');
}

function encryptionKey(secret) {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('INVALID_SESSION_ENCRYPTION_SECRET');
  }
  const key = Buffer.from(secret, 'base64');
  if (key.length !== 32 || key.toString('base64') !== secret) {
    throw new Error('INVALID_SESSION_ENCRYPTION_KEY');
  }
  return key;
}

export function encryptSession(data, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url')
  ].join('.');
}

export function decryptSession(value, secret) {
  const parts = String(value).split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('INVALID_SESSION_CIPHERTEXT');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(secret),
    Buffer.from(parts[1], 'base64url')
  );

  decipher.setAuthTag(Buffer.from(parts[2], 'base64url'));

  return JSON.parse(Buffer.concat([
    decipher.update(Buffer.from(parts[3], 'base64url')),
    decipher.final()
  ]).toString('utf8'));
}

export function createSessionStore(pool, secret) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('INVALID_SESSION_DATABASE');
  }

  encryptionKey(secret);

  return {
    async create(id, userId, session) {
      const hash = hashSession(id);
      if (!hash) throw new Error('INVALID_SESSION_ID');

      const encrypted = encryptSession(session, secret);
      const expiresAt = new Date(Date.now() + MAX_AGE_MS);

      await pool.query(
        `INSERT INTO public.bff_sessions
         (session_hash, user_id, encrypted_tokens, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [hash, userId, encrypted, expiresAt]
      );
    },

    async get(id) {
      const hash = hashSession(id);
      if (!hash) return null;

      const result = await pool.query(
        `SELECT encrypted_tokens
         FROM public.bff_sessions
         WHERE session_hash = $1
           AND revoked_at IS NULL
           AND expires_at > now()`,
        [hash]
      );

      if (!result.rows.length) return null;

      return decryptSession(result.rows[0].encrypted_tokens, secret);
    },

    async refresh(id, rotate) {
      const hash = hashSession(id);
      if (!hash) return null;

      const client = await pool.connect();
      let locked = false;

      try {
        await client.query(
          'SELECT pg_advisory_lock(hashtext($1), 19017)',
          [hash]
        );
        locked = true;

        const result = await client.query(
          `SELECT encrypted_tokens
           FROM public.bff_sessions
           WHERE session_hash = $1
             AND revoked_at IS NULL
             AND expires_at > now()`,
          [hash]
        );

        if (!result.rows.length) return null;

        const current = decryptSession(
          result.rows[0].encrypted_tokens,
          secret
        );

        const next = await rotate(current);

        if (!next) return null;

        await client.query(
          `UPDATE public.bff_sessions
           SET encrypted_tokens = $2,
               last_used_at = now()
           WHERE session_hash = $1
             AND revoked_at IS NULL
             AND expires_at > now()`,
          [hash, encryptSession(next, secret)]
        );

        return next;
      } finally {
        if (locked) {
          try {
            await client.query(
              'SELECT pg_advisory_unlock(hashtext($1), 19017)',
              [hash]
            );
          } finally {
            client.release();
          }
        } else {
          client.release();
        }
      }
    },
    async revoke(id) {
      const hash = hashSession(id);
      if (!hash) return;

      await pool.query(
        `UPDATE public.bff_sessions
         SET revoked_at = now()
         WHERE session_hash = $1
           AND revoked_at IS NULL`,
        [hash]
      );
    }
  };
}
