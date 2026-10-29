import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

export const EMAIL_VERIFICATION_TTL_MINUTES = 15;

export function hashEmailToken(token) {
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) {
    throw new TypeError('Format token tidak valid.');
  }

  return createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}

export function createEmailVerificationToken() {
  const token = randomBytes(32).toString('hex');

  return {
    token,
    tokenHash: hashEmailToken(token),
    expiresAt: new Date(
      Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60_000
    )
  };
}

export function verifyEmailTokenHash(token, expectedHash) {
  if (
    typeof expectedHash !== 'string' ||
    !/^[0-9a-f]{64}$/.test(expectedHash)
  ) {
    return false;
  }

  try {
    const actual = Buffer.from(hashEmailToken(token), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');

    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}