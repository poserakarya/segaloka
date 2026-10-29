import 'dotenv/config';
import { request } from 'node:http';
import { signIngressRequest } from '../src/security/ingress-identity-v3.js';

const secret = process.env.INGRESS_IDENTITY_SECRET;

if (typeof secret !== 'string' || secret.length < 32) {
  throw new Error('INGRESS_SECRET_INVALID');
}

async function api(method, target, payload, accessToken) {
  const body = payload === undefined
    ? Buffer.alloc(0)
    : Buffer.from(JSON.stringify(payload), 'utf8');

  const headers = {
    ...signIngressRequest(secret, {
      ip: '127.0.0.1',
      method,
      target,
      body
    }),
    ...(payload === undefined
      ? {}
      : { 'content-type': 'application/json' }),
    ...(accessToken
      ? { authorization: `Bearer ${accessToken}` }
      : {})
  };

  return await new Promise((resolve, reject) => {
    const req = request({
      hostname: '127.0.0.1',
      port: 4190,
      path: target,
      method,
      headers,
      timeout: 10000
    }, (res) => {
      const chunks = [];

      res.on('data', chunk => chunks.push(chunk));

      res.on('end', () => {
        try {
          const text = Buffer.concat(chunks).toString('utf8');

          resolve({
            status: res.statusCode,
            data: text ? JSON.parse(text) : {}
          });
        } catch {
          reject(new Error('INVALID_API_RESPONSE'));
        }
      });

      res.on('error', reject);
    });

    req.on('timeout', () => {
      req.destroy(new Error('API_TIMEOUT'));
    });

    req.on('error', reject);
    req.end(body);
  });
}

let refreshToken = null;
let loggedOut = false;

try {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }

  const input = Buffer.concat(chunks);
  chunks.forEach(chunk => chunk.fill(0));

  let credentials;

  try {
    credentials = JSON.parse(input.toString('utf8'));
  } finally {
    input.fill(0);
  }

  if (
    typeof credentials.email !== 'string' ||
    typeof credentials.password !== 'string'
  ) {
    throw new Error('INVALID_TEST_CREDENTIALS');
  }

  const login = await api('POST', '/auth/login', credentials);

  credentials.password = null;
  credentials.email = null;

  console.log('LOGIN HTTP:', login.status);

  if (login.status !== 200 || !login.data.authenticated) {
    throw new Error('LOGIN_FAILED');
  }

  const session = login.data.session;

  if (
    typeof session?.accessToken !== 'string' ||
    typeof session?.refreshToken !== 'string'
  ) {
    throw new Error('SESSION_TOKEN_FORMAT_UNEXPECTED');
  }

  refreshToken = session.refreshToken;

  console.log('PASS: Login Admin Pusat berhasil.');

  const me = await api(
    'GET',
    '/auth/me',
    undefined,
    session.accessToken
  );

  console.log('ME HTTP:', me.status);

  if (me.status !== 200 || !me.data.authenticated) {
    throw new Error('ME_FAILED');
  }

  const isAdmin = Array.isArray(me.data.memberships) &&
    me.data.memberships.some(
      membership => membership.role === 'super_admin'
    );

  if (!isAdmin) {
    throw new Error('SUPER_ADMIN_ROLE_NOT_FOUND');
  }

  console.log('PASS: Role super_admin terverifikasi.');

  const logout = await api('POST', '/auth/logout', {
    refreshToken
  });

  console.log('LOGOUT HTTP:', logout.status);

  if (logout.status !== 200 || logout.data.success !== true) {
    throw new Error('LOGOUT_FAILED');
  }

  loggedOut = true;
  console.log('PASS: Logout berhasil.');
  console.log('PASS: Pengujian autentikasi E2E selesai.');
} catch (error) {
  console.error('STOP:', error.message);
  process.exitCode = 1;
} finally {
  if (refreshToken && !loggedOut) {
    try {
      await api('POST', '/auth/logout', { refreshToken });
    } catch {
      console.error('PERINGATAN: Logout pembersihan gagal.');
    }
  }
}