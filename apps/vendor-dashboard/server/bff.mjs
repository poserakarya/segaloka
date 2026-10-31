// BFF Dashboard Vendor. Dua mode dengan handler yang sama (handleRequest):
//   container  `node server/bff.mjs`: listen 127.0.0.1:4211 di belakang entry
//              server-v7.mjs (IP klien dari x-real-ip entry, peer loopback).
//   Vercel     api/index.mjs memanggil handleRequest langsung lewat
//              createPortalRequestHandler (IP klien dari header edge Vercel).
// Tidak ada request antarproses ke 127.0.0.1 di dalam handler.
import http from 'node:http';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createRequire } from 'node:module';
import { createSessionStore } from './session-store.mjs';
import { createBffLoginContract } from '../../shared/runtime/bff-login-contract.mjs';
import { createMarketplaceHandoff, sendHandoffResult } from '../../shared/runtime/bff-marketplace-handoff.mjs';
import { serveV7PortalUi } from '../../shared/runtime/v7-portal-source.mjs';
import { serveSharedFont } from '../../shared/runtime/shared-fonts.mjs';
import { createConfigReader, readDbConfig, readIngressSecret } from '../../shared/runtime/service-config.mjs';
import { allowedPublicOrigins } from '../../shared/runtime/v7-portal-entry.mjs';
import { createClientIpResolver } from '../../shared/runtime/client-ip.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { signIngressRequest } from '../../../services/api/src/security/ingress-identity-v3.js';

const host = '127.0.0.1';
const port = 4211;
const apiOrigin = process.env.API_ORIGIN || 'http://127.0.0.1:4192';

const root = resolve(
  fileURLToPath(new URL('../../../', import.meta.url))
);

// Konfigurasi dari environment / <NAMA>_FILE (secret manager), dengan
// fallback ke berkas .env lokal yang sudah ada.
const readConfig = createConfigReader();
const apiEnvFile = resolve(root, 'services/api/.env');
const appEnvFile = resolve(root, 'apps/vendor-dashboard/server/.env');

const ingressSecret = readIngressSecret(readConfig, apiEnvFile);
// pg dari dependensi paket ini (Vercel, lewat ./pg.mjs agar ikut di-trace
// bundler) atau dari services/api (image container tanpa node_modules paket ini).
async function loadPg() {
  try {
    return (await import('./pg.mjs')).default;
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  return createRequire(new URL('../../../services/api/package.json', import.meta.url))('pg');
}
const { Pool } = await loadPg();

const dbConfig = readDbConfig(readConfig, apiEnvFile);
const bffConfig = {
  BFF_SESSION_ENCRYPTION_KEY: readConfig('BFF_SESSION_ENCRYPTION_KEY', appEnvFile)
};

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
// Koneksi idle yang diputus server tidak boleh menjatuhkan proses.
pool.on('error', error => {
  console.error(JSON.stringify({ service: 'vendor-bff', event: 'db_pool_error', code: error.code || null }));
});

const sessions = createSessionStore(
  pool,
  bffConfig.BFF_SESSION_ENCRYPTION_KEY
);

const loginContract = createBffLoginContract({
  apiRequest,
  sessions,
  hasDashboardAccess: vendorMembership,
  sessionCookie: sessionId => sessionCookie(sessionId),
  accessDeniedCode: 'VENDOR_ACCESS_REQUIRED',
  accessDeniedMessage: 'Akun tidak memiliki akses Dashboard Vendor.'
});

// Login hanya lewat Marketplace: sesi BFF dibuat dari tiket handoff.
const marketplaceHandoff = createMarketplaceHandoff({
  dashboard: 'vendor',
  apiRequest,
  completeSession: loginContract.completeSession,
  hasValidSession: async req => Boolean(await getSession(req)),
  successPath: '/bff/ui'
});

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

// IP klien per request (rate limit dan audit di API), dari handleRequest.
const requestContext = new AsyncLocalStorage();
// Mode container: BFF hanya listen 127.0.0.1, peer = entry yang menimpa
// x-real-ip, sehingga loopback dipercaya.
const proxyClientIp = createClientIpResolver({ mode: 'proxy', trustLoopback: true });

async function apiRequest(method, target, data, accessToken) {
  const body = data === undefined
    ? Buffer.alloc(0)
    : Buffer.from(JSON.stringify(data));

  const clientIp = requestContext.getStore()?.clientIp;
  if (!clientIp) throw new Error('CLIENT_IP_UNAVAILABLE');

  const signed = signIngressRequest(
    ingressSecret,
    {
      ip: clientIp,
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
// Origin entry lokal (mode container, ditulis ulang entry) atau origin
// publik SEGALOKA_PUBLIC_ORIGIN (mode Vercel, Origin browser asli).
const allowedOrigins = allowedPublicOrigins(4204);

function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  return typeof origin === 'string' && allowedOrigins.has(origin);
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
// Akses Dashboard Vendor untuk sesi pada request (termasuk refresh token).
// Dipakai GET /bff/dashboard/access, /bff/ui, dan /bff/vendor/verification
// di proses yang sama.
async function dashboardAccess(req) {
  const session = await getSession(req);

  if (!session) {
    return { status: 401, body: {
      authenticated: false,
      code: 'AUTH_REQUIRED'
    } };
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

      return {
        status: 401,
        body: { authenticated: false, code: 'INVALID_SESSION' },
        headers: { 'Set-Cookie': sessionCookie('', true) }
      };
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
    return { status: 401, body: {
      authenticated: false,
      code: 'INVALID_SESSION'
    } };
  }

  if (me.status !== 200) {
    return { status: 503, body: {
      code: 'AUTH_SERVICE_UNAVAILABLE'
    } };
  }

  if (!vendorMembership(me.data)) {
    return { status: 403, body: {
      code: 'VENDOR_ROLE_REQUIRED'
    } };
  }

  const access = await apiRequest(
    'GET',
    '/dashboard/access',
    undefined,
    currentSession.accessToken
  );

  if (access.status === 401) {
    return { status: 401, body: {
      authenticated: false,
      code: 'INVALID_SESSION'
    } };
  }

  if (access.status !== 200) {
    return { status: 503, body: {
      code: 'DASHBOARD_ACCESS_UNAVAILABLE'
    } };
  }

  const vendorDashboards = (
    Array.isArray(access.data?.dashboards)
      ? access.data.dashboards
      : []
  ).filter(item =>
    item.dashboard === 'vendor' &&
    item.role === 'vendor' &&
    typeof item.organizationId === 'string' &&
    item.organizationId.length > 0 &&
    // Sesi dari handoff terikat ke workspace yang dipilih.
    (!currentSession.organizationId || item.organizationId === currentSession.organizationId)
  );

  if (vendorDashboards.length === 0) {
    return { status: 403, body: {
      code: 'VENDOR_ACCESS_DENIED'
    } };
  }

  return { status: 200, body: {
    authenticated: true,
    workspaceSwitching: false,
    dashboards: vendorDashboards
  } };
}

// fetchImpl untuk serveV7PortalUi: pemeriksaan akses tanpa hop HTTP.
async function localAccessFetch(req) {
  const result = await dashboardAccess(req);
  return { status: result.status, json: async () => result.body };
}

export async function handleRequest(req, res, { clientIp = proxyClientIp(req) } = {}) {
  if (!clientIp) return json(res, 503, { code: 'CLIENT_IP_UNAVAILABLE' });
  return requestContext.run({ clientIp }, () => routeRequest(req, res));
}

async function routeRequest(req, res) {
  try {
    const handoffPath = new URL(req.url, `http://${host}:${port}`).pathname;
    if (marketplaceHandoff.handles(req.method, handoffPath)) {
      return sendHandoffResult(res, await marketplaceHandoff.handle(req, handoffPath, () => readBody(req)));
    }

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

    if (serveSharedFont(req, res, path)) {
      return;
    }

    if (req.method === 'GET' && path === '/bff/health') {
      return json(res, 200, { status: 'ok' });
    }

    if (req.method === 'POST' && loginContract.handles(path)) {
      // Dashboard non-admin tidak menerima login password langsung.
      return json(res, 404, { code: 'DASHBOARD_LOGIN_DISABLED' });
    }

    if (req.method === 'GET' && path === '/bff/dashboard/access') {
      const result = await dashboardAccess(req);
      return json(res, result.status, result.body, result.headers);
    }
    // Status verifikasi Vendor dari pendaftaran di database (read-only).
    // Tanpa aplikasi pendaftaran untuk organisasi ini, status = null
    // (UI menampilkan "Belum tersedia", bukan status simulasi V7).
    if (req.method === 'GET' && path === '/bff/vendor/verification') {
      const session = await getSession(req);
      if (!session) return json(res, 401, { authenticated: false, code: 'AUTH_REQUIRED' });
      const access = await dashboardAccess(req);
      if (access.status !== 200) {
        return json(res, [401, 403].includes(access.status) ? access.status : 503, {
          code: 'VENDOR_ACCESS_DENIED'
        }, access.headers);
      }
      const organizationId = access.body.dashboards?.[0]?.organizationId;
      const fresh = await getSession(req);
      const result = await apiRequest('GET', '/registration/applications/mine', undefined, accessTokenOf(fresh || session));
      if (result.status !== 200 || !Array.isArray(result.data?.items)) {
        return json(res, 503, { code: 'VENDOR_VERIFICATION_UNAVAILABLE' });
      }
      const applications = result.data.items.filter(item => item.applicationType === 'vendor');
      const application = applications.find(item => item.organizationId === organizationId) ||
        applications.find(item => !item.organizationId && item.status !== 'approved') || null;
      const VERIFICATION = {
        approved: 'verified',
        submitted: 'under_review',
        under_review: 'under_review',
        revision_required: 'pending',
        draft: 'pending',
        rejected: 'rejected'
      };
      return json(res, 200, {
        organizationId,
        verification: application ? VERIFICATION[application.status] || null : null,
        applicationStatus: application ? application.status : null
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

    // SEGALOKA_V7_PORTAL_SOURCE_V1: sumber V7 asli, bukan shell dist-v7.
    if (await serveV7PortalUi(req, res, {
      path,
      role: 'vendor',
      port,
      json,
      getSession,
      fetchImpl: () => localAccessFetch(req)
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
}

// Mode container: hanya bila berkas ini dijalankan langsung.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  http.createServer(handleRequest).listen(port, host, () => {
    console.log(
      `Segaloka Vendor BFF: http://${host}:${port}`
    );
  });
}
