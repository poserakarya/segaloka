const MAX_AGE_MS = 30000;
const NONCE_PATTERN = /^[a-f0-9]{32}$/;

export async function reserveIngressNonce(pool, identity) {
  if (
    !pool ||
    typeof pool.query !== 'function' ||
    !identity ||
    typeof identity.nonce !== 'string' ||
    !NONCE_PATTERN.test(identity.nonce) ||
    typeof identity.ip !== 'string' ||
    !Number.isSafeInteger(identity.timestamp)
  ) {
    throw new Error('INVALID_NONCE_RESERVATION');
  }

  const signatureTime = new Date(identity.timestamp);

  if (!Number.isFinite(signatureTime.getTime())) {
    throw new Error('INVALID_NONCE_TIMESTAMP');
  }

  const expiresAt = new Date(identity.timestamp + MAX_AGE_MS);

  const result = await pool.query(
    `INSERT INTO public.ingress_nonces
       (nonce, client_ip, signature_time, expires_at)
     VALUES ($1, $2::inet, $3::timestamptz, $4::timestamptz)
     ON CONFLICT (nonce) DO NOTHING
     RETURNING nonce`,
    [
      identity.nonce,
      identity.ip,
      signatureTime.toISOString(),
      expiresAt.toISOString()
    ]
  );

  return result.rowCount === 1;
}