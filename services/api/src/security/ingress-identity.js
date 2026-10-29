import {
  createHmac,
  randomBytes,
  timingSafeEqual
} from 'node:crypto';

import { isIP } from 'node:net';

const MAX_AGE_MS = 30000;
const NONCE_PATTERN = /^[a-f0-9]{32}$/;

function signature(secret, ip, timestamp, nonce) {
  return createHmac('sha256', secret)
    .update(`segaloka-ingress-v2\n${timestamp}\n${nonce}\n${ip}`)
    .digest('hex');
}

export function signIngressIdentity(
  secret,
  ip,
  timestamp = Date.now(),
  nonce = randomBytes(16).toString('hex')
) {
  if (
    typeof secret !== 'string' ||
    secret.length < 32 ||
    typeof ip !== 'string' ||
    isIP(ip) === 0 ||
    !Number.isSafeInteger(timestamp) ||
    !NONCE_PATTERN.test(nonce)
  ) {
    throw new Error('INVALID_INGRESS_IDENTITY');
  }

  const time = String(timestamp);

  return {
    'x-segaloka-client-ip': ip,
    'x-segaloka-client-time': time,
    'x-segaloka-client-nonce': nonce,
    'x-segaloka-client-signature':
      signature(secret, ip, time, nonce)
  };
}

export function verifyIngressIdentity(
  headers,
  secret,
  now = Date.now()
) {
  if (
    typeof secret !== 'string' ||
    secret.length < 32 ||
    !headers ||
    typeof headers !== 'object'
  ) {
    return null;
  }

  const ip = headers['x-segaloka-client-ip'];
  const timestamp = headers['x-segaloka-client-time'];
  const nonce = headers['x-segaloka-client-nonce'];
  const supplied = headers['x-segaloka-client-signature'];

  if (
    typeof ip !== 'string' ||
    isIP(ip) === 0 ||
    typeof timestamp !== 'string' ||
    !/^\d{13}$/.test(timestamp) ||
    typeof nonce !== 'string' ||
    !NONCE_PATTERN.test(nonce) ||
    typeof supplied !== 'string' ||
    !/^[a-f0-9]{64}$/.test(supplied)
  ) {
    return null;
  }

  const age = now - Number(timestamp);

  if (
    !Number.isFinite(age) ||
    Math.abs(age) > MAX_AGE_MS
  ) {
    return null;
  }

  const expected = signature(
    secret,
    ip,
    timestamp,
    nonce
  );

  const actualBuffer = Buffer.from(supplied, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  return ip;
}