import {
  randomBytes,
  createHash,
  timingSafeEqual
} from 'node:crypto';

const HEX64 = /^[0-9a-f]{64}$/;

export function validHandoffSecret(value) {
  return typeof value === 'string' && HEX64.test(value);
}

export function createBrowserBinding() {
  return randomBytes(32).toString('hex');
}

export function hashBrowserBinding(value) {
  if (!validHandoffSecret(value)) {
    throw new Error('INVALID_BROWSER_BINDING');
  }

  return createHash('sha256')
    .update(value)
    .digest('hex');
}

export function equalBrowserBinding(left, right) {
  if (
    !validHandoffSecret(left) ||
    !validHandoffSecret(right)
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(left, 'hex'),
    Buffer.from(right, 'hex')
  );
}