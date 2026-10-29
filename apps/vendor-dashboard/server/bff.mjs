import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, relative, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { createSessionStore } from './session-store.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { signIngressRequest } from '../../../services/api/src/security/ingress-identity-v3.js';

const host = '127.0.0.1';
const port = 4211;
const apiOrigin = process.env.API_ORIGIN || 'http://127.0.0.1:4192';

const root = resolve(
  fileURLToPath(new URL('../../../', import.meta.url))
);

function loadIngressSecret() {
  const envPath = resolve(root, 'services/api/.env');
  const text = readFileSync(envPath, 'utf8');

  const match = text.match(
    /^INGRESS_IDENTITY_SECRET\s*=\s*(.+)$/m
  );

  if (!match) {
    throw new Error('INGRESS_SECRET_NOT_FOUND');
  }

  const value = match[1].trim();

  const secret = (
    value.startsWith('"') && value.endsWith('"')
  ) ? value.slice(1, -1) : value;

  if (secret.length < 32) {
    throw new Error('INVALID_INGRESS_SECRET');
  }

  return secret;
}

const ingressSecret = loadIngressSecret();
const requireApi = createRequire(
  new URL('../../../services/api/package.json', import.meta.url)
);
const { Pool } = requireApi('pg');

function readEnvFile(path) {
  const values = {};
  const content = readFileSync(path, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }

  return values;
}

const dbConfig = readEnvFile(
  resolve(root, 'services/api/.env')
);
const bffConfig = readEnvFile(
  resolve(root, 'apps/vendor-dashboard/server/.env')
);

const pool = new Pool({
  host: dbConfig.DB_HOST,
  port: Number(dbConfig.DB_PORT),
  database: dbConfig.DB_NAME,
  user: dbConfig.DB_USER,
  password: dbConfig.DB_PASSWORD,
  ssl: dbConfig.DB_SSL === 'true',
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});

const sessions = createSessionStore(
  pool,
  bffConfig.BFF_SESSION_ENCRYPTION_KEY
);

function json(res, status, data, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  });

  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;

    if (size > 4096) {
      throw new Error('BODY_TOO_LARGE');
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function cookies(req) {
  const value = req.headers.cookie || '';

  return Object.fromEntries(
    value.split(';')
      .map(x => x.trim())
      .filter(Boolean)
      .map(x => {
        const index = x.indexOf('=');
        return [
          x.slice(0, index),
          x.slice(index + 1)
        ];
      })
  );
}

async function getSession(req) {
  const id = cookies(req).segaloka_vendor_session;

  return id ? await sessions.get(id) : null;
}

async function apiRequest(method, target, data, accessToken) {
  const body = data === undefined
    ? Buffer.alloc(0)
    : Buffer.from(JSON.stringify(data));

  const signed = signIngressRequest(
    ingressSecret,
    {
      ip: '127.0.0.1',
      method,
      target,
      body
    }
  );

  const response = await fetch(apiOrigin + target, {
    method,
    headers: {
      ...signed,
      ...(data === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {})
    },
    ...(data === undefined ? {} : { body }),
    signal: AbortSignal.timeout(10000)
  });

  const result = await response.json();

  return {
    status: response.status,
    data: result
  };
}

function accessTokenOf(session) {
  return session?.accessToken ||
    session?.access_token ||
    null;
}

function refreshTokenOf(session) {
  return session?.refreshToken ||
    session?.refresh_token ||
    null;
}

function vendorMembership(me) {
  return Array.isArray(me.memberships) &&
    me.memberships.some(m => {
      if (
        typeof m.role !== 'string' ||
        typeof m.organizationId !== 'string' ||
        m.organizationId.length === 0
      ) {
        return false;
      }

      return m.role === 'vendor';
    });
}
function isAllowedOrigin(req) {
  const origin = req.headers.origin;

  if (typeof origin !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(origin);

    return parsed.origin ===
      'http://127.0.0.1:4210';
  } catch {
    return false;
  }
}

function sessionCookie(value, clear = false) {
  const secure = process.env.NODE_ENV === 'production'
    ? '; Secure'
    : '';

  return `segaloka_vendor_session=${value}; ` +
    'HttpOnly; SameSite=Strict; Path=/bff' +
    secure +
    (clear ? '; Max-Age=0' : '');
}
const server = http.createServer(async (req, res) => {
  try {
    if (
      req.method === 'POST' &&
      !isAllowedOrigin(req)
    ) {
      return json(res, 403, {
        code: 'ORIGIN_NOT_ALLOWED'
      });
    }

    const path = new URL(
      req.url,
      `http://${host}:${port}`
    ).pathname;

    if (req.method === 'GET' && path === '/bff/health') {
      return json(res, 200, { status: 'ok' });
    }

    if (req.method === 'POST' && path === '/bff/login') {
      const body = JSON.parse(
        (await readBody(req)).toString('utf8')
      );

      if (
        typeof body.email !== 'string' ||
        typeof body.password !== 'string'
      ) {
        return json(res, 400, {
          code: 'INVALID_LOGIN_REQUEST'
        });
      }

      const login = await apiRequest(
        'POST',
        '/auth/login',
        {
          email: body.email,
          password: body.password
        }
      );

      if (login.status !== 200) {
        return json(res, login.status, {
          code: login.data.code || 'LOGIN_FAILED',
          message: login.data.message || 'Login gagal.'
        });
      }

      const accessToken = accessTokenOf(
        login.data.session
      );

      const refreshToken = refreshTokenOf(
        login.data.session
      );

      if (!accessToken || !refreshToken) {
        return json(res, 502, {
          code: 'INVALID_SESSION_RESPONSE'
        });
      }

      const me = await apiRequest(
        'GET',
        '/auth/me',
        undefined,
        accessToken
      );

      if (
        me.status !== 200 ||
        !vendorMembership(me.data)
      ) {
        await apiRequest('POST', '/auth/logout', {
          refreshToken
        });

        return json(res, 403, {
          code: 'VENDOR_ACCESS_REQUIRED',
          message: 'Akun tidak memiliki akses Dashboard Vendor.'
        });
      }

      const sessionId = randomBytes(32).toString('hex');

      await sessions.create(sessionId, me.data.user.id, {
        accessToken,
        refreshToken,
        user: me.data.user,
        memberships: me.data.memberships
      });

      return json(
        res,
        200,
        {
          authenticated: true,
          user: me.data.user,
          memberships: me.data.memberships
        },
        {
          'Set-Cookie':
            sessionCookie(sessionId)
        }
      );
    }

    if (req.method === 'GET' && path === '/bff/dashboard/access') {
      const session = await getSession(req);

      if (!session) {
        return json(res, 401, {
          authenticated: false,
          code: 'AUTH_REQUIRED'
        });
      }

      let currentSession = session;

      let me = await apiRequest(
        'GET',
        '/auth/me',
        undefined,
        currentSession.accessToken
      );

      if (me.status === 401) {
        const sessionId = cookies(req).segaloka_vendor_session;
        let invalidRefresh = false;

        const updated = await sessions.refresh(
          sessionId,
          async current => {
            if (current.accessToken !== session.accessToken) {
              return current;
            }

            const refreshed = await apiRequest(
              'POST',
              '/auth/refresh',
              { refreshToken: current.refreshToken }
            );

            if (refreshed.status === 401) {
              invalidRefresh = true;
              return null;
            }

            if (refreshed.status !== 200) {
              throw new Error('REFRESH_SERVICE_UNAVAILABLE');
            }

            const accessToken = accessTokenOf(refreshed.data.session);
            const refreshToken = refreshTokenOf(refreshed.data.session);

            if (!accessToken || !refreshToken) {
              throw new Error('INVALID_REFRESH_RESPONSE');
            }

            return {
              ...current,
              accessToken,
              refreshToken
            };
          }
        );

        if (!updated || invalidRefresh) {
          await sessions.revoke(sessionId);

          return json(
            res,
            401,
            { authenticated: false, code: 'INVALID_SESSION' },
            { 'Set-Cookie': sessionCookie('', true) }
          );
        }

        currentSession = updated;

        me = await apiRequest(
          'GET',
          '/auth/me',
          undefined,
          currentSession.accessToken
        );
      }

      if (me.status === 401) {
        return json(res, 401, {
          authenticated: false,
          code: 'INVALID_SESSION'
        });
      }

      if (me.status !== 200) {
        return json(res, 503, {
          code: 'AUTH_SERVICE_UNAVAILABLE'
        });
      }

      if (!vendorMembership(me.data)) {
        return json(res, 403, {
          code: 'VENDOR_ROLE_REQUIRED'
        });
      }

      const access = await apiRequest(
        'GET',
        '/dashboard/access',
        undefined,
        currentSession.accessToken
      );

      if (access.status === 401) {
        return json(res, 401, {
          authenticated: false,
          code: 'INVALID_SESSION'
        });
      }

      if (access.status !== 200) {
        return json(res, 503, {
          code: 'DASHBOARD_ACCESS_UNAVAILABLE'
        });
      }

      const vendorDashboards = (
        Array.isArray(access.data?.dashboards)
          ? access.data.dashboards
          : []
      ).filter(item =>
        item.dashboard === 'vendor' &&
        item.role === 'vendor' &&
        typeof item.organizationId === 'string' &&
        item.organizationId.length > 0
      );

      if (vendorDashboards.length === 0) {
        return json(res, 403, {
          code: 'VENDOR_ACCESS_DENIED'
        });
      }

      return json(res, 200, {
        authenticated: true,
        workspaceSwitching: false,
        dashboards: vendorDashboards
      });
    }
    if (req.method === 'GET' && path === '/bff/me') {
      const session = await getSession(req);

      if (!session) {
        return json(res, 401, {
          authenticated: false
        });
      }

      let me = await apiRequest(
        'GET',
        '/auth/me',
        undefined,
        session.accessToken
      );

      if (me.status === 401) {
        const sessionId =
          cookies(req).segaloka_vendor_session;

        let invalidRefresh = false;

        const updated = await sessions.refresh(
          sessionId,
          async current => {
            // Permintaan lain mungkin sudah merotasi token.
            if (current.accessToken !== session.accessToken) {
              return current;
            }

            const refreshed = await apiRequest(
              'POST',
              '/auth/refresh',
              { refreshToken: current.refreshToken }
            );

            if (refreshed.status === 401) {
              invalidRefresh = true;
              return null;
            }

            if (refreshed.status !== 200) {
              throw new Error('REFRESH_SERVICE_UNAVAILABLE');
            }

            const accessToken =
              accessTokenOf(refreshed.data.session);
            const refreshToken =
              refreshTokenOf(refreshed.data.session);

            if (!accessToken || !refreshToken) {
              throw new Error('INVALID_REFRESH_RESPONSE');
            }

            return {
              ...current,
              accessToken,
              refreshToken
            };
          }
        );

        if (!updated || invalidRefresh) {
          await sessions.revoke(sessionId);

          return json(
            res,
            401,
            { authenticated: false },
            { 'Set-Cookie': sessionCookie('', true) }
          );
        }

        me = await apiRequest(
          'GET',
          '/auth/me',
          undefined,
          updated.accessToken
        );
      }

      if (me.status === 401) {
        return json(res, 401, {
          authenticated: false
        });
      }

      if (me.status !== 200) {
        return json(res, 503, {
          code: 'SERVICE_UNAVAILABLE'
        });
      }

      return json(res, 200, me.data);
    }

    if (req.method === 'POST' && path === '/bff/logout') {
      const id = cookies(req).segaloka_vendor_session;
      const session = await getSession(req);

      try {
        if (session) {
          await apiRequest('POST', '/auth/logout', {
            refreshToken: session.refreshToken
          });
        }
      } finally {
        if (id) {
          await sessions.revoke(id);
        }
      }

      return json(
        res,
        200,
        { success: true },
        {
          'Set-Cookie':
            sessionCookie('', true)
        }
      );
    }

    // SEGALOKA_VENDOR_V7_PROTECTED_ROUTE_V1
    if (
      req.method === 'GET' &&
      (path === '/bff/ui' || path.startsWith('/bff/ui/'))
    ) {
      const session = await getSession(req);

      if (!session) {
        return json(res, 401, {
          authenticated: false,
          code: 'AUTH_REQUIRED'
        });
      }

      const accessResponse = await fetch(
        `http://${host}:${port}/bff/dashboard/access`,
        {
          method: 'GET',
          headers: {
            cookie: req.headers.cookie || ''
          },
          signal: AbortSignal.timeout(10000)
        }
      );

      if (accessResponse.status !== 200) {
        return json(
          res,
          [401, 403].includes(accessResponse.status)
            ? accessResponse.status
            : 503,
          { code: 'VENDOR_ACCESS_DENIED' }
        );
      }

      const access = await accessResponse.json();

      if (
        access.authenticated !== true ||
        !Array.isArray(access.dashboards) ||
        !access.dashboards.some(item =>
          item.dashboard === 'vendor' &&
          item.role === 'vendor' &&
          typeof item.organizationId === 'string' &&
          item.organizationId.length > 0
        )
      ) {
        return json(res, 403, {
          code: 'VENDOR_ACCESS_DENIED'
        });
      }

      const assetRoot = resolve(
        root,
        'apps/vendor-dashboard/dist-v7'
      );

      const requested = path === '/bff/ui'
        ? 'index.html'
        : path.slice('/bff/ui/'.length) || 'index.html';

      let decoded;

      try {
        decoded = decodeURIComponent(requested);
      } catch {
        return json(res, 400, {
          code: 'INVALID_PATH'
        });
      }

      if (
        decoded.includes('\0') ||
        decoded.includes('\\')
      ) {
        return json(res, 400, {
          code: 'INVALID_PATH'
        });
      }

      const assetPath = resolve(assetRoot, decoded);
      const rel = relative(assetRoot, assetPath);

      if (
        rel === '..' ||
        rel.startsWith('..' + sep) ||
        rel.startsWith(sep) ||
        rel === ''
      ) {
        return json(res, 403, {
          code: 'INVALID_ASSET_PATH'
        });
      }

      const types = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.woff2': 'font/woff2'
      };

      const type = types[extname(assetPath).toLowerCase()];

      if (!type) {
        return json(res, 403, {
          code: 'ASSET_TYPE_NOT_ALLOWED'
        });
      }

      try {
        let content = await readFile(assetPath);

        if (assetPath === resolve(assetRoot, 'index.html')) {
          content = Buffer.from(
            content.toString('utf8').replaceAll(
              '/shared/v7-presentational.css',
              '/bff/ui/shared/v7-presentational.css'
            )
          );
        }

        res.writeHead(200, {
          'Content-Type': type,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        });

        return res.end(content);
      } catch (error) {
        if (error.code === 'ENOENT') {
          return json(res, 404, {
            code: 'ASSET_NOT_FOUND'
          });
        }

        throw error;
      }
    }
    return json(res, 404, {
      code: 'NOT_FOUND'
    });
  } catch (error) {
    const status = error.message === 'BODY_TOO_LARGE'
      ? 413
      : error instanceof SyntaxError
        ? 400
        : 503;

    return json(res, status, {
      code: status === 503
        ? 'SERVICE_UNAVAILABLE'
        : 'INVALID_REQUEST'
    });
  }
});

server.listen(port, host, () => {
  console.log(
    `Segaloka Vendor BFF: http://${host}:${port}`
  );
});
