import { loginWithPassword } from './login-service.js';
import {
  checkLoginRateLimit,
  recordLoginAttempt
} from './login-rate-limit.js';

const INVALID = Object.freeze({
  authenticated: false,
  reason: 'INVALID_CREDENTIALS'
});

const BLOCKED = Object.freeze({
  authenticated: false,
  reason: 'RATE_LIMITED',
  retryAfterSeconds: 900
});

export async function loginWithProtection(
  pool,
  input,
  options = {}
) {
  const {
    ip,
    ipHashSecret = process.env.AUTH_IP_HASH_SECRET,
    login = loginWithPassword,
    check = checkLoginRateLimit,
    record = recordLoginAttempt
  } = options;

  if (
    typeof ip !== 'string' ||
    ip.length === 0 ||
    typeof ipHashSecret !== 'string' ||
    !/^[0-9a-f]{64}$/.test(ipHashSecret)
  ) {
    throw new Error('LOGIN_SECURITY_CONFIGURATION_INVALID');
  }

  const email = typeof input?.email === 'string'
    ? input.email.trim().toLowerCase()
    : '';

  const context = { email, ip, ipHashSecret };

  const limit = await check(pool, context);

  if (!limit.allowed) {
    await record(pool, {
      ...context,
      outcome: 'blocked'
    });

    return {
      ...BLOCKED,
      retryAfterSeconds: limit.retryAfterSeconds
    };
  }

  const result = await login(pool, input);

  await record(pool, {
    ...context,
    outcome: (result.authenticated || result.credentialsVerified)
      ? 'success'
      : 'failure'
  });

  if (!result.authenticated && !result.credentialsVerified) {
    return { ...INVALID };
  }

  return result;
}