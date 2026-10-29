import {
  createPublicKey,
  verify,
  timingSafeEqual
} from 'node:crypto';

import { sha256Hex } from './google-oauth-parameters.js';

const GOOGLE_JWKS =
  'https://www.googleapis.com/oauth2/v3/certs';

const ISSUERS = new Set([
  'https://accounts.google.com',
  'accounts.google.com'
]);

function parsePart(part) {
  if (
    typeof part !== 'string' ||
    part.length === 0 ||
    part.length > 12000 ||
    !/^[A-Za-z0-9_-]+$/.test(part)
  ) {
    throw new Error('INVALID_GOOGLE_JWT_PART');
  }

  const parsed = JSON.parse(
    Buffer.from(part, 'base64url').toString('utf8')
  );

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed)
  ) {
    throw new Error('INVALID_GOOGLE_JWT_OBJECT');
  }

  return parsed;
}

function safeHashEqual(first, second) {
  if (
    typeof first !== 'string' ||
    typeof second !== 'string' ||
    !/^[0-9a-f]{64}$/.test(first) ||
    !/^[0-9a-f]{64}$/.test(second)
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(first, 'hex'),
    Buffer.from(second, 'hex')
  );
}

export async function verifyGoogleIdToken(
  idToken,
  {
    clientId,
    nonceHash,
    fetchImpl = fetch
  }
) {
  if (
    typeof idToken !== 'string' ||
    idToken.length > 16384 ||
    typeof clientId !== 'string' ||
    !clientId.endsWith('.apps.googleusercontent.com')
  ) {
    throw new Error('INVALID_GOOGLE_ID_TOKEN_INPUT');
  }

  const parts = idToken.split('.');

  if (parts.length !== 3) {
    throw new Error('INVALID_GOOGLE_JWT_FORMAT');
  }

  const header = parsePart(parts[0]);
  const payload = parsePart(parts[1]);

  if (
    header.alg !== 'RS256' ||
    typeof header.kid !== 'string' ||
    !header.kid
  ) {
    throw new Error('INVALID_GOOGLE_JWT_HEADER');
  }

  const response = await fetchImpl(GOOGLE_JWKS, {
    method: 'GET',
    redirect: 'error',
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    throw new Error('GOOGLE_JWKS_UNAVAILABLE');
  }

  const contentLength = response.headers?.get?.(
    'content-length'
  );

  if (
    contentLength !== null &&
    contentLength !== undefined &&
    Number(contentLength) > 65536
  ) {
    throw new Error('GOOGLE_JWKS_TOO_LARGE');
  }

  const maxBytes = 65536;
  let jwks;

  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        total += value.byteLength;

        if (total > maxBytes) {
          await reader.cancel();
          throw new Error('GOOGLE_JWKS_TOO_LARGE');
        }

        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }

    jwks = JSON.parse(
      Buffer.concat(chunks).toString('utf8')
    );
  } else {
    // Compatibility path for existing test mocks.
    // Production fetch responses provide a readable body.
    if (fetchImpl === fetch) {
      throw new Error('GOOGLE_JWKS_BODY_REQUIRED');
    }

    jwks = await response.json();
  }

  if (
    !jwks ||
    !Array.isArray(jwks.keys) ||
    jwks.keys.length > 20
  ) {
    throw new Error('INVALID_GOOGLE_JWKS');
  }

  const key = jwks.keys.find(
    candidate =>
      candidate.kid === header.kid &&
      candidate.kty === 'RSA' &&
      candidate.use === 'sig' &&
      candidate.alg === 'RS256'
  );

  if (!key) {
    throw new Error('GOOGLE_SIGNING_KEY_NOT_FOUND');
  }

  const publicKey = createPublicKey({
    key,
    format: 'jwk'
  });

  const validSignature = verify(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    publicKey,
    Buffer.from(parts[2], 'base64url')
  );

  if (!validSignature) {
    throw new Error('INVALID_GOOGLE_JWT_SIGNATURE');
  }

  const now = Math.floor(Date.now() / 1000);

  if (
    !ISSUERS.has(payload.iss) ||
    payload.aud !== clientId ||
    !Number.isInteger(payload.exp) ||
    payload.exp <= now ||
    !Number.isInteger(payload.iat) ||
    payload.iat > now + 60 ||
    payload.iat < now - 86400 ||
    payload.exp <= payload.iat ||
    payload.exp > now + 86400 ||
    typeof payload.sub !== 'string' ||
    !payload.sub ||
    payload.email_verified !== true ||
    typeof payload.email !== 'string' ||
    !payload.email ||
    typeof payload.nonce !== 'string' ||
    !safeHashEqual(
      sha256Hex(payload.nonce),
      nonceHash
    )
  ) {
    throw new Error('INVALID_GOOGLE_ID_TOKEN_CLAIMS');
  }

  return {
    provider: 'google',
    subject: payload.sub,
    email: payload.email,
    emailVerified: true,
    name: typeof payload.name === 'string'
      ? payload.name
      : null,
    picture: typeof payload.picture === 'string'
      ? payload.picture
      : null
  };
}