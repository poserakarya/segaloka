import {
  randomInt,
  createHmac,
  timingSafeEqual
} from 'node:crypto';

const OTP_PATTERN = /^[0-9]{6}$/;
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
const HASH_PATTERN = /^[0-9a-f]{64}$/i;
const SECRET_PATTERN = /^[0-9a-f]{64}$/i;

export const SECURITY_OTP_TTL_SECONDS = 300;
export const SECURITY_OTP_MAX_ATTEMPTS = 5;
export const SECURITY_OTP_RESEND_SECONDS = 60;

export function generateSecurityOtp() {
  return String(randomInt(0, 1000000)).padStart(6, '0');
}

export function hashSecurityOtp({
  challengeId,
  purpose,
  code,
  secret = process.env.AUTH_OTP_HASH_SECRET
}) {
  if (
    !UUID_PATTERN.test(challengeId) ||
    !['enable_2fa', 'disable_2fa'].includes(purpose) ||
    typeof code !== 'string' ||
    !OTP_PATTERN.test(code) ||
    typeof secret !== 'string' ||
    !SECRET_PATTERN.test(secret)
  ) {
    throw new Error('SECURITY_OTP_INPUT_INVALID');
  }

  return createHmac(
    'sha256',
    Buffer.from(secret, 'hex')
  )
    .update('segaloka:security-otp:v1:')
    .update(purpose)
    .update(':')
    .update(challengeId)
    .update(':')
    .update(code)
    .digest('hex');
}

export function verifySecurityOtp({
  challengeId,
  purpose,
  code,
  expectedHash,
  secret = process.env.AUTH_OTP_HASH_SECRET
}) {
  if (
    typeof expectedHash !== 'string' ||
    !HASH_PATTERN.test(expectedHash)
  ) {
    return false;
  }

  let actualHash;

  try {
    actualHash = hashSecurityOtp({
      challengeId,
      purpose,
      code,
      secret
    });
  } catch {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(actualHash, 'hex'),
    Buffer.from(expectedHash, 'hex')
  );
}