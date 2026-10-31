import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from 'node:crypto';

import { isIP } from 'node:net';

const MAX_AGE_MS = 30000;
const NONCE_PATTERN = /^[a-f0-9]{32}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export function hashRequestBody(body) {
  if (!Buffer.isBuffer(body)) {
    throw new Error('INVALID_REQUEST_BODY');
  }

  return createHash('sha256').update(body).digest('hex');
}

function validTarget(target) {
  return typeof target === 'string' &&
    target.startsWith('/') &&
    !target.startsWith('//') &&
    !target.includes('#') &&
    !/[\r\n]/.test(target);
}

function validMethod(method) {
  return typeof method === 'string' &&
    /^[A-Z]+$/.test(method);
}

// Bentuk kanonis IP klien yang ditandatangani: IPv4-mapped IPv6 menjadi
// IPv4, IPv6 huruf kecil. Satu klien = satu identitas untuk rate limit.
export function canonicalClientIp(value) {
  if (typeof value !== 'string' || value.length > 45 || value.includes('%')) return null;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(value);
  const ip = mapped ? mapped[1] : value;
  const version = isIP(ip);
  if (version === 0) return null;
  return version === 6 ? ip.toLowerCase() : ip;
}

function signature(secret, data) {
  return createHmac('sha256', secret)
    .update([
      'segaloka-ingress-v3',
      data.timestamp,
      data.nonce,
      data.ip,
      data.method,
      data.target,
      data.bodyHash
    ].join('\n'))
    .digest('hex');
}

export function signIngressRequest(
  secret,
  { ip, method, target, body },
  timestamp = Date.now(),
  nonce = randomBytes(16).toString('hex')
) {
  const clientIp = canonicalClientIp(ip);

  if (
    typeof secret !== 'string' ||
    secret.length < 32 ||
    clientIp === null ||
    !validMethod(method) ||
    !validTarget(target) ||
    !Buffer.isBuffer(body) ||
    !Number.isSafeInteger(timestamp) ||
    !NONCE_PATTERN.test(nonce)
  ) {
    throw new Error('INVALID_INGRESS_REQUEST');
  }

  const data = {
    ip: clientIp,
    method,
    target,
    timestamp: String(timestamp),
    nonce,
    bodyHash: hashRequestBody(body)
  };

  return {
    'x-segaloka-client-ip': clientIp,
    'x-segaloka-client-time': data.timestamp,
    'x-segaloka-client-nonce': nonce,
    'x-segaloka-client-body-sha256': data.bodyHash,
    'x-segaloka-client-signature': signature(secret, data)
  };
}

export function verifyIngressRequest(
  headers,
  secret,
  { method, target, body },
  now = Date.now()
) {
  if (
    typeof secret !== 'string' ||
    secret.length < 32 ||
    !headers ||
    typeof headers !== 'object' ||
    !validMethod(method) ||
    !validTarget(target) ||
    !Buffer.isBuffer(body)
  ) {
    return null;
  }

  const ip = headers['x-segaloka-client-ip'];
  const timestamp = headers['x-segaloka-client-time'];
  const nonce = headers['x-segaloka-client-nonce'];
  const bodyHash = headers['x-segaloka-client-body-sha256'];
  const supplied = headers['x-segaloka-client-signature'];

  if (
    typeof ip !== 'string' ||
    canonicalClientIp(ip) !== ip ||
    typeof timestamp !== 'string' ||
    !/^\d{13}$/.test(timestamp) ||
    typeof nonce !== 'string' ||
    !NONCE_PATTERN.test(nonce) ||
    typeof bodyHash !== 'string' ||
    !HASH_PATTERN.test(bodyHash) ||
    typeof supplied !== 'string' ||
    !HASH_PATTERN.test(supplied)
  ) {
    return null;
  }

  const age = now - Number(timestamp);

  if (!Number.isFinite(age) || Math.abs(age) > MAX_AGE_MS) {
    return null;
  }

  const actualBodyHash = hashRequestBody(body);

  if (!timingSafeEqual(
    Buffer.from(bodyHash, 'hex'),
    Buffer.from(actualBodyHash, 'hex')
  )) {
    return null;
  }

  const expected = signature(secret, {
    ip,
    timestamp,
    nonce,
    method,
    target,
    bodyHash
  });

  if (!timingSafeEqual(
    Buffer.from(supplied, 'hex'),
    Buffer.from(expected, 'hex')
  )) {
    return null;
  }

  return {
    ip,
    nonce,
    timestamp: Number(timestamp)
  };
}