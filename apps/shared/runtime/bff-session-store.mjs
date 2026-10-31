// Penyimpanan sesi BFF bersama (tabel public.bff_sessions): token API
// dienkripsi AES-256-GCM dengan kunci per dashboard; id sesi hanya disimpan
// sebagai hash SHA-256.
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const REFRESH_LOCK_TIMEOUT_MS = 15000;

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

export function createSessionStore(pool, secret, { refreshLockTimeoutMs = REFRESH_LOCK_TIMEOUT_MS } = {}) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('INVALID_SESSION_DATABASE');
  }

  encryptionKey(secret);
  if (!Number.isInteger(refreshLockTimeoutMs) || refreshLockTimeoutMs < 1) {
    throw new Error('INVALID_REFRESH_LOCK_TIMEOUT');
  }

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

    // Rotasi token dengan kunci per sesi yang terikat transaksi
    // (pg_advisory_xact_lock): kunci lepas otomatis saat COMMIT/ROLLBACK,
    // sehingga aman di belakang pooler mode transaksi (PgBouncer, Neon,
    // Supabase) dan tidak pernah tertinggal saat error atau koneksi putus.
    // Permintaan paralel untuk sesi yang sama menunggu, lalu membaca token
    // hasil rotasi pertama (rotate menerima nilai terbaru).
    async refresh(id, rotate) {
      const hash = hashSession(id);
      if (!hash) return null;

      const client = await pool.connect();
      let open = false;
      let broken = false;
      // Koneksi yang diputus server saat dipakai memancarkan 'error'; tanpa
      // listener proses akan crash. Tandai rusak agar tidak dipakai ulang.
      const onClientError = () => { broken = true; };
      client.on('error', onClientError);

      try {
        await client.query('BEGIN');
        open = true;
        await client.query(`SET LOCAL lock_timeout = '${refreshLockTimeoutMs}ms'`);
        await client.query(
          'SELECT pg_advisory_xact_lock(hashtext($1), 19017)',
          [hash]
        );

        const result = await client.query(
          `SELECT encrypted_tokens
           FROM public.bff_sessions
           WHERE session_hash = $1
             AND revoked_at IS NULL
             AND expires_at > now()`,
          [hash]
        );

        if (!result.rows.length) {
          await client.query('COMMIT');
          open = false;
          return null;
        }

        const current = decryptSession(
          result.rows[0].encrypted_tokens,
          secret
        );

        const next = await rotate(current);

        if (next) {
          await client.query(
            `UPDATE public.bff_sessions
             SET encrypted_tokens = $2,
                 last_used_at = now()
             WHERE session_hash = $1
               AND revoked_at IS NULL
               AND expires_at > now()`,
            [hash, encryptSession(next, secret)]
          );
        }

        await client.query('COMMIT');
        open = false;
        return next || null;
      } catch (error) {
        if (open) {
          try {
            await client.query('ROLLBACK');
          } catch {
            // Koneksi rusak: jangan dikembalikan ke pool.
            broken = true;
          }
        }
        throw error;
      } finally {
        // Koneksi rusak dihancurkan; listener tetap terpasang karena event
        // 'error' susulan dari socket yang diputus bisa datang belakangan.
        if (!broken) client.removeListener('error', onClientError);
        client.release(broken || undefined);
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
