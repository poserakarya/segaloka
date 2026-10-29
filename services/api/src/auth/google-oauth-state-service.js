import {
  createCipheriv,
  createDecipheriv,
  randomBytes
} from 'node:crypto';

import {
  createGoogleOAuthParameters,
  sha256Hex
} from './google-oauth-parameters.js';

const STATE_TTL_MINUTES = 10;
const AAD = Buffer.from(
  'segaloka:google-oauth:pkce:v1',
  'utf8'
);

function encryptionKey() {
  const value = process.env.OAUTH_CONFIG_ENCRYPTION_KEY;

  if (!/^[0-9a-f]{64}$/i.test(value ?? '')) {
    throw new Error('OAUTH_ENCRYPTION_KEY_INVALID');
  }

  return Buffer.from(value, 'hex');
}

function encryptVerifier(verifier) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    'aes-256-gcm',
    encryptionKey(),
    iv
  );

  cipher.setAAD(AAD);

  const ciphertext = Buffer.concat([
    cipher.update(verifier, 'utf8'),
    cipher.final()
  ]);

  return [
    'v1',
    iv.toString('hex'),
    cipher.getAuthTag().toString('hex'),
    ciphertext.toString('hex')
  ].join(':');
}

export function decryptGooglePKCEVerifier(value) {
  const parts = String(value ?? '').split(':');

  if (
    parts.length !== 4 ||
    parts[0] !== 'v1'
  ) {
    throw new Error('INVALID_PKCE_CIPHERTEXT');
  }

  const [, ivHex, tagHex, dataHex] = parts;

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivHex, 'hex')
  );

  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final()
  ]).toString('utf8');
}

export async function createGoogleOAuthState(
  pool,
  redirectUri
) {
  if (
    !pool ||
    typeof pool.query !== 'function'
  ) {
    throw new Error('OAUTH_POOL_REQUIRED');
  }

  if (
    typeof redirectUri !== 'string' ||
    redirectUri !==
      'https://api.segaloka.com/auth/google/callback'
  ) {
    throw new Error('INVALID_OAUTH_REDIRECT_URI');
  }

  const params = createGoogleOAuthParameters();

  await pool.query(
    `INSERT INTO public.oauth_states (
       provider,
       state_hash,
       nonce_hash,
       code_verifier_encrypted,
       redirect_uri,
       expires_at
     )
     VALUES (
       'google',
       $1,
       $2,
       $3,
       $4,
       now() + interval '10 minutes'
     )`,
    [
      params.stateHash,
      params.nonceHash,
      encryptVerifier(params.codeVerifier),
      redirectUri
    ]
  );

  return {
    state: params.state,
    nonce: params.nonce,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: 'S256',
    expiresInSeconds: STATE_TTL_MINUTES * 60
  };
}

export async function consumeGoogleOAuthState(
  pool,
  state
) {
  if (
    typeof state !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(state)
  ) {
    return null;
  }

  const result = await pool.query(
    `UPDATE public.oauth_states
     SET consumed_at = now()
     WHERE provider = 'google'
       AND state_hash = $1
       AND consumed_at IS NULL
       AND expires_at > now()
       AND nonce_hash IS NOT NULL
     RETURNING
       nonce_hash,
       code_verifier_encrypted,
       redirect_uri`,
    [sha256Hex(state)]
  );

  if (result.rowCount !== 1) {
    return null;
  }

  const row = result.rows[0];

  return {
    nonceHash: row.nonce_hash,
    codeVerifier: decryptGooglePKCEVerifier(
      row.code_verifier_encrypted
    ),
    redirectUri: row.redirect_uri
  };
}