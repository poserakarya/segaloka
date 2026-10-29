import { withLoginLock } from './login-lock.js';
import { loginWithProtection } from './login-workflow.js';

export async function secureLogin(
  pool,
  input,
  options = {}
) {
  const {
    ip,
    ipHashSecret = process.env.AUTH_IP_HASH_SECRET
  } = options;

  if (
    typeof ip !== 'string' ||
    ip.length === 0 ||
    typeof ipHashSecret !== 'string' ||
    !/^[0-9a-f]{64}$/.test(ipHashSecret)
  ) {
    throw new Error('SECURE_LOGIN_CONFIGURATION_INVALID');
  }

  const email = typeof input?.email === 'string'
    ? input.email.trim().toLowerCase()
    : '';

  return withLoginLock(
    pool,
    { email, ip, ipHashSecret },
    async transaction => {
      return loginWithProtection(
        transaction,
        input,
        {
          ip,
          ipHashSecret
        }
      );
    }
  );
}