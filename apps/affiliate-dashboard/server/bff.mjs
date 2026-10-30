import http from 'node:http';
import { createRequire } from 'node:module';
import { createSessionStore } from './session-store.mjs';
import { createBffLoginContract } from '../../shared/runtime/bff-login-contract.mjs';
import { serveV7PortalUi } from '../../shared/runtime/v7-portal-source.mjs';
import { serveSharedFont } from '../../shared/runtime/shared-fonts.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { signIngressRequest } from '../../../services/api/src/security/ingress-identity-v3.js';

const host = '127.0.0.1';
const port = 4221;
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
  resolve(root, 'apps/affiliate-dashboard/server/.env')
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

const loginContract = createBffLoginContract({
  apiRequest,
  sessions,
  hasDashboardAccess: affiliateMembership,
  sessionCookie: sessionId => sessionCookie(sessionId),
  accessDeniedCode: 'AFFILIATE_ACCESS_REQUIRED',
  accessDeniedMessage: 'Akun tidak memiliki akses Dashboard affiliate.'
});

function json(res, status, data, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': 'http://127.0.0.1:4212',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Last-Event-ID',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
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
  const id = cookies(req).segaloka_affiliate_session;

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

function affiliateMembership(me) {
  return Array.isArray(me?.memberships) &&
    me.memberships.some(m => m?.role === 'affiliate');
}
function isAllowedOrigin(req) {
  const origin = req.headers.origin;

  if (typeof origin !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(origin);

    return parsed.origin ===
      'http://127.0.0.1:4212';
  } catch {
    return false;
  }
}

function sessionCookie(value, clear = false) {
  const secure = process.env.NODE_ENV === 'production'
    ? '; Secure'
    : '';

  return `segaloka_affiliate_session=${value}; ` +
    'HttpOnly; SameSite=Strict; Path=/bff' +
    secure +
    (clear ? '; Max-Age=0' : '');
}
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      return json(res, 204, null);
    }

    if (
      ['POST', 'PATCH'].includes(req.method) &&
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

    if (serveSharedFont(req, res, path)) {
      return;
    }

    if (req.method === 'GET' && path === '/bff/health') {
      return json(res, 200, { status: 'ok' });
    }

    if (req.method === 'POST' && loginContract.handles(path)) {
      const result = await loginContract.handle(path, await readBody(req));
      return json(res, result.status, result.body, result.headers);
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
        const sessionId = cookies(req).segaloka_affiliate_session;
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

      if (!affiliateMembership(me.data)) {
        return json(res, 403, {
          code: 'AFFILIATE_ROLE_REQUIRED'
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
        item.dashboard === 'affiliate' &&
        item.role === 'affiliate'
      );

      if (vendorDashboards.length === 0) {
        return json(res, 403, {
          code: 'AFFILIATE_ACCESS_DENIED'
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
          cookies(req).segaloka_affiliate_session;

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
      const id = cookies(req).segaloka_affiliate_session;
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

    if (req.method === 'GET' && path === '/bff/sync/affiliate/events') {
      const session = await getSession(req);
      if (!session) return json(res, 401, { authenticated: false, code: 'AUTH_REQUIRED' });

      const target = `/sync/affiliate/events${requestUrl.search}`;
      const signed = signIngressRequest(ingressSecret, {
        ip: '127.0.0.1', method: 'GET', target, body: Buffer.alloc(0)
      });
      const abort = new AbortController();
      res.once('close', () => abort.abort());
      const upstream = await fetch(apiOrigin + target, {
        headers: {
          ...signed,
          Authorization: `Bearer ${accessTokenOf(session)}`,
          ...(req.headers['last-event-id'] ? { 'Last-Event-ID': req.headers['last-event-id'] } : {})
        },
        signal: abort.signal
      });
      if (!upstream.ok || !upstream.body) {
        return json(res, upstream.status, await upstream.json());
      }
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': 'http://127.0.0.1:4212',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type, Last-Event-ID'
      });
      res.socket?.setNoDelay?.(true);
      res.flushHeaders?.();
      const reader = upstream.body.getReader();
      try {
        while (!res.destroyed) {
          const chunk = await reader.read();
          if (chunk.done) break;
          if (!res.write(Buffer.from(chunk.value))) {
            await new Promise(resolve => res.once('drain', resolve));
          }
        }
      } finally {
        reader.releaseLock();
      }
      if (!res.writableEnded && !res.destroyed) res.end();
      return;
    }

    const referralLinkMatch = path.match(
      /^\/bff\/affiliate\/referral-links(?:\/([0-9a-f-]+))?$/i
    );
    const isReferralCollection = referralLinkMatch &&
      !referralLinkMatch[1] &&
      ['GET', 'POST'].includes(req.method);
    const isReferralItem = referralLinkMatch &&
      referralLinkMatch[1] &&
      req.method === 'PATCH';

    if (isReferralCollection || isReferralItem) {
      const session = await getSession(req);

      if (!session) {
        return json(res, 401, {
          authenticated: false,
          code: 'AUTH_REQUIRED'
        });
      }

      const data = req.method === 'GET'
        ? undefined
        : JSON.parse((await readBody(req)).toString('utf8'));

      const target = referralLinkMatch[1]
        ? `/affiliate/referral-links/${referralLinkMatch[1]}`
        : '/affiliate/referral-links';
      const result = await apiRequest(
        req.method,
        target,
        data,
        accessTokenOf(session)
      );

      return json(res, result.status, result.data);
    }

    // SEGALOKA_V7_PORTAL_SOURCE_V1: sumber V7 asli, bukan shell dist-v7.
    if (await serveV7PortalUi(req, res, {
      path,
      role: 'affiliate',
      port,
      json,
      getSession
    })) {
      return;
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
    `Segaloka Affiliate BFF: http://${host}:${port}`
  );
});
