import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

function secureEquals(actual, expected) {
  if (
    typeof actual !== 'string' ||
    typeof expected !== 'string' ||
    expected.length < 32
  ) {
    return false;
  }

  const a = createHash('sha256').update(actual).digest();
  const b = createHash('sha256').update(expected).digest();

  return timingSafeEqual(a, b);
}

export function authenticateOrigin(headers, secret) {
  if (!headers || typeof headers !== 'object') return false;

  const supplied = headers['x-segaloka-origin-auth'];

  if (typeof supplied !== 'string') return false;

  return secureEquals(supplied, secret);
}

export function resolveAuthenticatedClientIp(headers, secret) {
  if (!authenticateOrigin(headers, secret)) {
    return null;
  }

  const rawIp = headers['cf-connecting-ip'];

  if (typeof rawIp !== 'string') {
    return null;
  }

  const ip = rawIp.trim();

  if (!ip || ip.includes(',') || isIP(ip) === 0) {
    return null;
  }

  return ip.startsWith('::ffff:')
    ? ip.slice(7)
    : ip;
}