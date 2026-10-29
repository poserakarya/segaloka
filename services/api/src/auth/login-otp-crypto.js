import {
  randomInt,
  createHmac,
  timingSafeEqual
} from 'node:crypto';

const OTP_PATTERN = /^[0-9]{6}$/;
const SECRET_PATTERN = /^[0-9a-fA-F]{64}$/;

function getSecret(secret) {
  if (
    typeof secret !== 'string' ||
    !SECRET_PATTERN.test(secret)
  ) {
    throw new Error('OTP_SECRET_INVALID');
  }

  return Buffer.from(secret, 'hex');
}

export function generateLoginOtp() {
  return String(randomInt(0, 1000000)).padStart(6, '0');
}

export function hashLoginOtp({
  challengeId,
  code,
  secret = process.env.AUTH_OTP_HASH_SECRET
}) {
  if (
    typeof challengeId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(challengeId) ||
    !OTP_PATTERN.test(code)
  ) {
    throw new Error('OTP_INPUT_INVALID');
  }

  return createHmac('sha256', getSecret(secret))
    .update('segaloka:login-otp:v1:')
    .update(challengeId)
    .update(':')
    .update(code)
    .digest('hex');
}

export function verifyLoginOtp({
  challengeId,
  code,
  expectedHash,
  secret = process.env.AUTH_OTP_HASH_SECRET
}) {
  if (
    typeof code !== 'string' ||
    !OTP_PATTERN.test(code) ||
    typeof expectedHash !== 'string' ||
    !/^[0-9a-f]{64}$/i.test(expectedHash)
  ) {
    return false;
  }

  const calculated = hashLoginOtp({
    challengeId,
    code,
    secret
  });

  return timingSafeEqual(
    Buffer.from(calculated, 'hex'),
    Buffer.from(expectedHash, 'hex')
  );
}

export const LOGIN_OTP_TTL_SECONDS = 300;
export const LOGIN_OTP_MAX_ATTEMPTS = 5;
export const LOGIN_OTP_RESEND_SECONDS = 60;