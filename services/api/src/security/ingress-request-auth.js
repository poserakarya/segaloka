import { verifyIngressRequest } from './ingress-identity-v3.js';
import { reserveIngressNonce } from './ingress-nonce-store.js';

export async function authenticateIngressRequest(
  pool,
  headers,
  secret,
  request,
  now = Date.now()
) {
  const identity = verifyIngressRequest(
    headers,
    secret,
    request,
    now
  );

  if (!identity) {
    return {
      allowed: false,
      reason: 'INVALID_SIGNATURE'
    };
  }

  try {
    const reserved = await reserveIngressNonce(pool, identity);

    if (!reserved) {
      return {
        allowed: false,
        reason: 'REPLAY_DETECTED'
      };
    }

    return {
      allowed: true,
      ip: identity.ip
    };
  } catch {
    return {
      allowed: false,
      reason: 'NONCE_STORAGE_UNAVAILABLE'
    };
  }
}