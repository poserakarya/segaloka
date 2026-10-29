import { isIP } from 'node:net';

const trustedProxyAddresses = new Set(
  (process.env.TRUSTED_PROXY_IPS ?? '')
    .split(',')
    .map((address) => address.trim())
    .filter((address) => isIP(address) !== 0)
);

export function isTrustedProxy(address) {
  if (typeof address !== 'string') {
    return false;
  }

  const normalized = address.startsWith('::ffff:')
    ? address.slice(7)
    : address;

  if (!isIP(normalized)) {
    return false;
  }

  return trustedProxyAddresses.has(normalized);
}

export function getClientIp(request) {
  const verifiedIp = request.verifiedClientIp;

  if (typeof verifiedIp === 'string' && isIP(verifiedIp) !== 0) {
    return verifiedIp;
  }

  const remoteAddress = request.socket?.remoteAddress;

  if (!isTrustedProxy(remoteAddress)) {
    return remoteAddress ?? null;
  }

  const forwarded = request.headers['x-forwarded-for'];

  if (typeof forwarded !== 'string') {
    return remoteAddress ?? null;
  }

  const addresses = forwarded
    .split(',')
    .map((value) => value.trim());

  if (addresses.length !== 1) {
    return remoteAddress ?? null;
  }

  const clientAddress = addresses[0];

  if (!isIP(clientAddress)) {
    return remoteAddress ?? null;
  }

  return clientAddress;
}