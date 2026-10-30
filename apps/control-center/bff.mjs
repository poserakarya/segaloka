import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { createSessionStore } from './session-store.mjs';
import { classifyLoginResponse } from '../shared/runtime/bff-login-contract.mjs';
import { serveSharedFont } from '../shared/runtime/shared-fonts.mjs';
import { proxySyncStream } from '../shared/runtime/bff-sse-proxy.mjs';
import { createConfigReader, readDbConfig, readIngressSecret } from '../shared/runtime/service-config.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { signIngressRequest } from '../../services/api/src/security/ingress-identity-v3.js';

const host = '127.0.0.1';
const requestedPort = Number(process.env.SEGALOKA_BFF_PORT || 4203);
if (!Number.isInteger(requestedPort) || requestedPort < 1024 || requestedPort > 65535) {
  throw new Error('Invalid SEGALOKA_BFF_PORT');
}
const port = requestedPort;
const apiOrigin = process.env.API_ORIGIN || 'http://127.0.0.1:4192';
const isolatedTestConfig = process.env.SEGALOKA_CONTROL_TEST === '1';
const localDiagnostics = process.env.SEGALOKA_LOCAL_DIAGNOSTICS === '1' &&
  process.env.NODE_ENV !== 'production';

function diagnostic(route, requestId, fields) {
  if (!localDiagnostics) return;
  console.log(JSON.stringify({
    event: 'bff_diagnostic',
    requestId,
    route,
    ...fields
  }));
}

function responseShape(data) {
  return {
    topLevelKeys: data && typeof data === 'object' && !Array.isArray(data)
      ? Object.keys(data).sort()
      : [],
    itemCount: Array.isArray(data?.items) ? data.items.length : null,
    paginationTotal: Number.isSafeInteger(data?.pagination?.total)
      ? data.pagination.total
      : null,
    totalTravel: Number.isSafeInteger(data?.metrics?.totalTravel)
      ? data.metrics.totalTravel
      : null,
    totalVendor: Number.isSafeInteger(data?.metrics?.totalVendor)
      ? data.metrics.totalVendor
      : null
  };
}

const root = resolve(
  fileURLToPath(new URL('../../', import.meta.url))
);

function loadIngressSecret() {
  if (isolatedTestConfig) {
    const secret = process.env.CONTROL_TEST_INGRESS_IDENTITY_SECRET;

    if (typeof secret !== 'string' || secret.length < 32) {
      throw new Error('CONTROL_TEST_INGRESS_SECRET_NOT_CONFIGURED');
    }

    return secret;
  }

  return readIngressSecret(createConfigReader(), resolve(root, 'services/api/.env'));
}

const ingressSecret = loadIngressSecret();
const requireApi = createRequire(
  new URL('../../services/api/package.json', import.meta.url)
);
const { Pool } = requireApi('pg');

const readConfig = createConfigReader();

const dbConfig = isolatedTestConfig
  ? {
      DB_HOST: process.env.CONTROL_TEST_DB_HOST,
      DB_PORT: process.env.CONTROL_TEST_DB_PORT,
      DB_NAME: process.env.CONTROL_TEST_DB_NAME,
      DB_USER: process.env.CONTROL_TEST_DB_USER,
      DB_PASSWORD: process.env.CONTROL_TEST_DB_PASSWORD,
      DB_SSL: process.env.CONTROL_TEST_DB_SSL || 'false'
    }
  : readDbConfig(readConfig, resolve(root, 'services/api/.env'));
const bffConfig = isolatedTestConfig
  ? {
      BFF_SESSION_ENCRYPTION_KEY:
        process.env.CONTROL_TEST_BFF_SESSION_ENCRYPTION_KEY
    }
  : {
      BFF_SESSION_ENCRYPTION_KEY: readConfig(
        'BFF_SESSION_ENCRYPTION_KEY',
        resolve(root, 'apps/travel-dashboard/server/.env')
      )
    };

if (isolatedTestConfig) {
  for (const key of [
    'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
    'BFF_SESSION_ENCRYPTION_KEY'
  ]) {
    if (!dbConfig[key] && !bffConfig[key]) {
      throw new Error(`CONTROL_TEST_CONFIG_MISSING:${key}`);
    }
  }
}

const pool = new Pool({
  host: dbConfig.DB_HOST,
  port: Number(
    isolatedTestConfig
      ? dbConfig.DB_PORT
      : (process.env.CONTROL_CENTER_DB_PORT || '5434')
  ),
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
  const id = cookies(req).segaloka_control_center_session;

  return id ? await sessions.get(id) : null;
}

async function requireSuperAdmin(req, res) {
  const session = await getSession(req);
  if (!session?.accessToken) { json(res, 401, { code: 'AUTH_REQUIRED' }); return null; }
  const accessResponse = await fetch(`http://${host}:${port}/bff/dashboard/access`, { headers: { cookie: req.headers.cookie || '' }, signal: AbortSignal.timeout(10000) });
  if (!accessResponse.ok) { json(res, accessResponse.status === 403 ? 403 : 503, { code: 'CONTROL_CENTER_ACCESS_DENIED' }); return null; }
  const access = await accessResponse.json();
  const allowed = access.authenticated === true && access.workspaceSwitching === false && Array.isArray(access.dashboards) && access.dashboards.some(x => x.dashboard === 'control-center' && x.role === 'super_admin' && x.organizationId === null);
  if (!allowed) { json(res, 403, { code: 'CONTROL_CENTER_ACCESS_DENIED' }); return null; }
  return session;
}

async function apiRequest(method, target, data, accessToken) {
  const startedAt = performance.now();
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

  let response;
  try {
    response = await new Promise((resolve, reject) => {
      const url = new URL(apiOrigin + target);
      const request = http.request({
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        method,
        path: url.pathname + url.search,
        headers: {
          ...signed,
          ...(data === undefined
            ? {}
            : { 'Content-Type': 'application/json' }),
          ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {})
        },
        timeout: 10000
      }, upstream => {
        const chunks = [];
        upstream.on('data', chunk => chunks.push(chunk));
        upstream.on('end', () => {
          let parsed;
          const payload = Buffer.concat(chunks);
          if ((upstream.headers['content-type'] || '').includes('application/pdf')) {
            resolve({ status: upstream.statusCode || 502, data: payload, contentType: 'application/pdf', contentDisposition: upstream.headers['content-disposition'] });
            return;
          }
          try { parsed = JSON.parse(payload.toString('utf8')); } catch { reject(new Error('UPSTREAM_INVALID_JSON')); return; }
          resolve({ status: upstream.statusCode || 502, data: parsed, contentType: upstream.headers['content-type'] });
        });
        upstream.on('error', reject);
      });
      request.on('timeout', () => request.destroy(new Error('UPSTREAM_TIMEOUT')));
      request.on('error', reject);
      if (data !== undefined) request.write(body);
      request.end();
    });
  } catch (error) {
    diagnostic('BFF internal apiRequest', randomBytes(8).toString('hex'), {
      stage: 'upstream_transport',
      method,
      target,
      code: typeof error?.code === 'string' ? error.code : 'FETCH_FAILED',
      errorType: typeof error?.name === 'string' ? error.name : 'Error',
      errorMessage: typeof error?.message === 'string'
        ? error.message.replace(/[^A-Za-z0-9 _:-]/g, '').slice(0, 120)
        : 'unknown',
      upstreamOrigin: (() => { try { return new URL(apiOrigin).origin; } catch { return 'INVALID_ORIGIN'; } })(),
      durationMs: Math.round(performance.now() - startedAt)
    });
    throw error;
  }

  diagnostic('BFF internal apiRequest', randomBytes(8).toString('hex'), {
    stage: 'upstream_response',
    method,
    target,
    upstreamStatus: response.status,
    code: typeof response.data?.code === 'string' ? response.data.code.slice(0, 80) : undefined,
    durationMs: Math.round(performance.now() - startedAt)
  });

  return {
    status: response.status,
    data: response.data,
    contentType: response.contentType,
    contentDisposition: response.contentDisposition
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

function controlCenterMembership(me) {
  return Array.isArray(me?.memberships) &&
    me.memberships.some(m =>
      m.role === 'super_admin' &&
      m.organizationId === null
    );
}
function isAllowedOrigin(req) {
  const origin = req.headers.origin;

  if (typeof origin !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(origin);

    return parsed.origin ===
      `http://${host}:${port}`;
  } catch {
    return false;
  }
}

function sessionCookie(value, clear = false, path = '/') {
  const secure = process.env.NODE_ENV === 'production'
    ? '; Secure'
    : '';

  return `segaloka_control_center_session=${value}; ` +
    `HttpOnly; SameSite=Strict; Path=${path}` +
    secure +
    (clear ? '; Max-Age=0' : '');
}

function clearSessionCookies() {
  return [
    sessionCookie('', true),
    sessionCookie('', true, '/bff')
  ];
}

async function finishControlCenterLogin(res, login) {
  const accessToken = accessTokenOf(login.data?.session);
  const refreshToken = refreshTokenOf(login.data?.session);

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
    !controlCenterMembership(me.data)
  ) {
    await apiRequest('POST', '/auth/logout', {
      refreshToken
    });

    return json(res, 403, {
      code: 'SUPER_ADMIN_ACCESS_REQUIRED',
      message: 'Akun tidak memiliki akses Control Center.'
    });
  }

  const sessionId = randomBytes(32).toString('hex');

  await sessions.create(sessionId, me.data.user.id, {
    accessToken,
    refreshToken,
    user: me.data.user,
    memberships: me.data.memberships
  });

  return json(res, 200, {
    authenticated: true,
    user: me.data.user,
    memberships: me.data.memberships
  }, {
    'Set-Cookie': [
      sessionCookie(sessionId),
      sessionCookie('', true, '/bff')
    ]
  });
}
// API mengirim kolom cabang snake_case; UI V7 Control Center membaca
// camelCase. Alias ditambahkan tanpa membuang kolom aslinya.
function branchForUi(row) {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    organizationId: row.organizationId ?? row.organization_id,
    organizationName: row.organizationName ?? row.organization_name,
    branchCode: row.branchCode ?? row.branch_code,
    branchName: row.branchName ?? row.branch_name
  };
}

function branchResponseForUi(data) {
  if (!data || typeof data !== 'object') return data;
  return {
    ...data,
    ...(Array.isArray(data.items) ? { items: data.items.map(branchForUi) } : {}),
    ...(data.branch ? { branch: branchForUi(data.branch) } : {})
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (
      ['POST', 'PUT'].includes(req.method) &&
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

      const login = await apiRequest('POST', '/auth/login', {
        email: body.email,
        password: body.password
      });

      if (login.status !== 200) {
        return json(res, login.status, {
          code: login.data?.code || 'LOGIN_FAILED',
          message: login.data?.message || 'Login gagal.'
        });
      }

      if (
        login.data?.authenticated === false &&
        login.data?.code === 'OTP_CHANNEL_REQUIRED'
      ) {
        return json(res, 200, {
          authenticated: false,
          code: 'OTP_CHANNEL_REQUIRED',
          preAuthTicket: login.data.preAuthTicket,
          availableMethods: login.data.availableMethods,
          expiresIn: login.data.expiresIn
        });
      }

      if (login.data?.authenticated !== true) {
        return json(res, 502, {
          code: 'INVALID_LOGIN_RESPONSE'
        });
      }

      return finishControlCenterLogin(res, login);
    }

    if (
      req.method === 'POST' &&
      path === '/bff/login/select-channel'
    ) {
      const body = JSON.parse(
        (await readBody(req)).toString('utf8')
      );

      if (
        typeof body.preAuthTicket !== 'string' ||
        !/^[0-9a-f]{64}$/.test(body.preAuthTicket) ||
        !['email', 'whatsapp'].includes(body.channel)
      ) {
        return json(res, 400, {
          code: 'INVALID_OTP_CHANNEL_REQUEST'
        });
      }

      const result = await apiRequest(
        'POST',
        '/auth/login/select-channel',
        {
          preAuthTicket: body.preAuthTicket,
          channel: body.channel,
          language: 'ID'
        }
      );

      if (result.status !== 200) {
        return json(res, result.status, {
          authenticated: false,
          code: result.data?.code || 'OTP_CHANNEL_FAILED',
          message: result.data?.message || 'Verifikasi gagal.'
        });
      }

      return json(res, 200, {
        authenticated: false,
        code: 'OTP_REQUIRED',
        challengeId: result.data.challengeId,
        channel: result.data.channel,
        expiresIn: result.data.expiresIn
      });
    }

    if (
      req.method === 'POST' &&
      path === '/bff/login/verify-otp'
    ) {
      const body = JSON.parse(
        (await readBody(req)).toString('utf8')
      );

      if (
        typeof body.challengeId !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(body.challengeId) ||
        typeof body.code !== 'string' ||
        !/^[0-9]{6}$/.test(body.code)
      ) {
        return json(res, 400, {
          code: 'INVALID_OTP_VERIFY_REQUEST'
        });
      }

      const result = await apiRequest(
        'POST',
        '/auth/login/verify-otp',
        {
          challengeId: body.challengeId,
          code: body.code
        }
      );

      if (
        result.status !== 200 ||
        result.data?.authenticated !== true
      ) {
        return json(res, result.status, {
          authenticated: false,
          code: result.data?.code || 'OTP_VERIFY_FAILED',
          message: result.data?.message || 'Kode OTP tidak valid.'
        });
      }

      return finishControlCenterLogin(res, result);
    }

    if (
      req.method === 'POST' &&
      path === '/bff/login/verify-authenticator'
    ) {
      const body = JSON.parse(
        (await readBody(req)).toString('utf8')
      );

      if (
        typeof body.preAuthTicket !== 'string' ||
        !/^[0-9a-f]{64}$/.test(body.preAuthTicket) ||
        typeof body.code !== 'string' ||
        !/^[0-9]{6}$/.test(body.code)
      ) {
        return json(res, 400, {
          code: 'INVALID_AUTHENTICATOR_VERIFY_REQUEST'
        });
      }

      const result = await apiRequest(
        'POST',
        '/auth/login/verify-authenticator',
        {
          preAuthTicket: body.preAuthTicket,
          code: body.code
        }
      );

      // Sesi hanya dibuat setelah API memverifikasi kode TOTP.
      if (
        result.status !== 200 ||
        classifyLoginResponse(result.data).type !== 'authenticated'
      ) {
        return json(res, result.status === 200 ? 502 : result.status, {
          authenticated: false,
          code: result.data?.code || 'AUTHENTICATOR_VERIFY_FAILED',
          message: result.data?.message || 'Kode authenticator tidak valid.'
        });
      }

      return finishControlCenterLogin(res, result);
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
        const sessionId = cookies(req).segaloka_control_center_session;
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
            { 'Set-Cookie': clearSessionCookies() }
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

      if (!controlCenterMembership(me.data)) {
        return json(res, 403, {
          code: 'SUPER_ADMIN_ROLE_REQUIRED'
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

      const controlCenterDashboards = (
        Array.isArray(access.data?.dashboards)
          ? access.data.dashboards
          : []
      ).filter(item =>
        item.dashboard === 'control-center' &&
        item.role === 'super_admin' &&
        item.organizationId === null
      );

      if (controlCenterDashboards.length === 0) {
        return json(res, 403, {
          code: 'CONTROL_CENTER_ACCESS_DENIED'
        });
      }

      return json(res, 200, {
        authenticated: true,
        workspaceSwitching: false,
        dashboards: controlCenterDashboards
      }, {
        'Set-Cookie': [
          sessionCookie(
            cookies(req).segaloka_control_center_session
          ),
          sessionCookie('', true, '/bff')
        ]
      });
    }
    if ((req.method === 'GET' || req.method === 'PATCH') && (path === '/bff/registration-applications' || /^\/bff\/registration-applications\/[0-9a-f-]+$/.test(path))) {
      const session = await requireSuperAdmin(req, res); if (!session) return;
      const target = path === '/bff/registration-applications' ? '/admin/registration-applications' : '/admin/registration-applications/' + path.split('/').pop();
      const body = req.method === 'PATCH' ? JSON.parse((await readBody(req)).toString('utf8')) : undefined;
      const result = await apiRequest(req.method, target, body, session.accessToken);
      return json(res, result.status, result.data);
    }
    if (req.method === 'GET' && path === '/bff/control-center/summary') {
      const session = await getSession(req);

      if (!session) {
        return json(res, 401, {
          authenticated: false,
          code: 'AUTH_REQUIRED'
        });
      }

      // Validasi identitas dan refresh token jika diperlukan.
      // Gunakan alur akses yang sudah ada di BFF.
      const accessResponse = await fetch(
        `http://${host}:${port}/bff/dashboard/access`,
        {
          headers: {
            cookie: req.headers.cookie || ''
          },
          signal: AbortSignal.timeout(10000)
        }
      );

      if (accessResponse.status !== 200) {
        const status = [401, 403].includes(accessResponse.status)
          ? accessResponse.status
          : 503;

        return json(res, status, {
          code: status === 503
            ? 'DASHBOARD_ACCESS_UNAVAILABLE'
            : 'CONTROL_CENTER_ACCESS_DENIED'
        });
      }

      const access = await accessResponse.json();

      const allowed = (
        access.authenticated === true &&
        access.workspaceSwitching === false &&
        Array.isArray(access.dashboards) &&
        access.dashboards.some(item =>
          item.dashboard === 'control-center' &&
          item.role === 'super_admin' &&
          item.organizationId === null
        )
      );

      if (!allowed) {
        return json(res, 403, {
          code: 'CONTROL_CENTER_ACCESS_DENIED'
        });
      }

      // Ambil ulang sesi karena token mungkin baru dirotasi.
      const currentSession = await getSession(req);

      if (!currentSession?.accessToken) {
        return json(res, 401, {
          authenticated: false,
          code: 'INVALID_SESSION'
        });
      }

      const summary = await apiRequest(
        'GET',
        '/control-center/summary',
        undefined,
        currentSession.accessToken
      );

      if (summary.status !== 200) {
        const status = [401, 403].includes(summary.status)
          ? summary.status
          : 503;

        return json(res, status, {
          code: summary.data?.code ||
            'CONTROL_CENTER_SUMMARY_UNAVAILABLE'
        });
      }

      diagnostic('GET /bff/control-center/summary', randomBytes(8).toString('hex'), {
        stage: 'api_response_shape', upstreamStatus: summary.status,
        ...responseShape(summary.data)
      });

      return json(res, 200, summary.data);
    }
    if (req.method === 'GET' && path === '/bff/control-center/travels/export.pdf') {
      const requestId = randomBytes(8).toString('hex');
      const startedAt = performance.now();
      const session = await getSession(req);
      if (!session?.accessToken) return json(res, 401, { authenticated: false, code: 'AUTH_REQUIRED' });
      const accessResponse = await fetch(`http://${host}:${port}/bff/dashboard/access`, { headers: { cookie: req.headers.cookie || '' }, signal: AbortSignal.timeout(10000) });
      if (accessResponse.status !== 200) return json(res, accessResponse.status === 403 ? 403 : 503, { code: accessResponse.status === 403 ? 'CONTROL_CENTER_ACCESS_DENIED' : 'DASHBOARD_ACCESS_UNAVAILABLE' });
      const access = await accessResponse.json();
      const allowed = access.authenticated === true && access.workspaceSwitching === false && access.dashboards?.some(item => item.dashboard === 'control-center' && item.role === 'super_admin' && item.organizationId === null);
      if (!allowed) return json(res, 403, { code: 'CONTROL_CENTER_ACCESS_DENIED' });
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      const result = await apiRequest('GET', '/control-center/travels/export.pdf' + query, undefined, session.accessToken);
      const contentType = String(result.contentType || '').split(';', 1)[0].trim().toLowerCase();
      const isPdf = Buffer.isBuffer(result.data) && contentType === 'application/pdf';
      diagnostic('GET /bff/control-center/travels/export.pdf', requestId, {
        stage: isPdf && result.status === 200 ? 'upstream_pdf_ready' : 'upstream_pdf_rejected',
        upstreamStatus: result.status,
        contentType,
        byteLength: Buffer.isBuffer(result.data) ? result.data.length : 0,
        signature: Buffer.isBuffer(result.data) ? result.data.subarray(0, 4).toString('ascii') : '',
        durationMs: Math.round(performance.now() - startedAt)
      });
      if (result.status !== 200 || !isPdf) return json(res, result.status === 401 || result.status === 403 ? result.status : 503, { code: result.data?.code || 'CONTROL_CENTER_TRAVEL_EXPORT_UNAVAILABLE' });
      res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': result.contentDisposition || 'attachment; filename="Segaloka-Laporan-Travel.pdf"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(result.data);
    }
    if (req.method === 'GET' && path === '/bff/control-center/travels') {
      const requestId = randomBytes(8).toString('hex');
      const startedAt = performance.now();
      const route = 'GET /bff/control-center/travels';
      diagnostic(route, requestId, { stage: 'request_started' });
      const session = await getSession(req);
      if (!session?.accessToken) {
        diagnostic(route, requestId, {
          stage: 'session_validation', status: 401,
          code: 'AUTH_REQUIRED', durationMs: Math.round(performance.now() - startedAt)
        });
        return json(res, 401, { authenticated: false, code: 'AUTH_REQUIRED' });
      }

      const accessResponse = await fetch(`http://${host}:${port}/bff/dashboard/access`, {
        headers: { cookie: req.headers.cookie || '' },
        signal: AbortSignal.timeout(10000)
      });
      if (accessResponse.status !== 200) {
        diagnostic(route, requestId, {
          stage: 'dashboard_access', status: accessResponse.status,
          code: accessResponse.status === 403
            ? 'CONTROL_CENTER_ACCESS_DENIED'
            : 'DASHBOARD_ACCESS_UNAVAILABLE',
          durationMs: Math.round(performance.now() - startedAt)
        });
        return json(res, accessResponse.status === 403 ? 403 : 503, {
          code: accessResponse.status === 403
            ? 'CONTROL_CENTER_ACCESS_DENIED'
            : 'DASHBOARD_ACCESS_UNAVAILABLE'
        });
      }

      const access = await accessResponse.json();
      const allowed = access.authenticated === true &&
        access.workspaceSwitching === false &&
        access.dashboards?.some(item =>
          item.dashboard === 'control-center' &&
          item.role === 'super_admin' &&
          item.organizationId === null
        );
      if (!allowed) {
        diagnostic(route, requestId, {
          stage: 'role_validation', status: 403,
          code: 'CONTROL_CENTER_ACCESS_DENIED',
          durationMs: Math.round(performance.now() - startedAt)
        });
        return json(res, 403, { code: 'CONTROL_CENTER_ACCESS_DENIED' });
      }

      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      const result = await apiRequest(
        'GET',
        '/control-center/travels' + query,
        undefined,
        session.accessToken
      );
      if (result.status !== 200) {
        diagnostic(route, requestId, {
          stage: 'api_upstream', upstreamStatus: result.status,
          code: typeof result.data?.code === 'string'
            ? result.data.code.slice(0, 80)
            : 'UPSTREAM_ERROR',
          durationMs: Math.round(performance.now() - startedAt)
        });
        return json(res, [401, 403].includes(result.status) ? result.status : 503, {
          code: result.data?.code || 'CONTROL_CENTER_TRAVEL_UNAVAILABLE'
        });
      }
      diagnostic(route, requestId, {
        stage: 'completed', upstreamStatus: 200,
        ...responseShape(result.data),
        durationMs: Math.round(performance.now() - startedAt)
      });
      return json(res, 200, result.data);
    }
    if (req.method === 'GET' && /^\/bff\/control-center\/travels\/[0-9a-f-]{36}$/i.test(path)) {
      const session = await getSession(req);
      if (!session?.accessToken) {
        return json(res, 401, { authenticated: false, code: 'AUTH_REQUIRED' });
      }
      const accessResponse = await fetch(`http://${host}:${port}/bff/dashboard/access`, {
        headers: { cookie: req.headers.cookie || '' }, signal: AbortSignal.timeout(10000)
      });
      if (accessResponse.status !== 200) {
        return json(res, accessResponse.status === 403 ? 403 : 503, { code: accessResponse.status === 403 ? 'CONTROL_CENTER_ACCESS_DENIED' : 'DASHBOARD_ACCESS_UNAVAILABLE' });
      }
      const access = await accessResponse.json();
      const allowed = access.authenticated === true && access.workspaceSwitching === false && access.dashboards?.some(item => item.dashboard === 'control-center' && item.role === 'super_admin' && item.organizationId === null);
      if (!allowed) return json(res, 403, { code: 'CONTROL_CENTER_ACCESS_DENIED' });
      const id = path.slice('/bff/control-center/travels/'.length);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 404, { code: 'TRAVEL_NOT_FOUND' });
      const result = await apiRequest('GET', '/control-center/travels/' + encodeURIComponent(id), undefined, session.accessToken);
      if (result.status !== 200) return json(res, [401, 403, 404].includes(result.status) ? result.status : 503, { code: result.data?.code || 'CONTROL_CENTER_TRAVEL_UNAVAILABLE' });
      return json(res, 200, result.data);
    }
    if ((req.method === 'GET' || req.method === 'POST') &&
      (path === '/bff/control-center/travel-branches' || path.startsWith('/bff/control-center/travels/'))) {
      const session = await getSession(req);
      if (!session?.accessToken) return json(res, 401, { authenticated: false, code: 'AUTH_REQUIRED' });
      const accessResponse = await fetch(`http://${host}:${port}/bff/dashboard/access`, {
        headers: { cookie: req.headers.cookie || '' }, signal: AbortSignal.timeout(10000)
      });
      if (accessResponse.status !== 200) return json(res, accessResponse.status === 403 ? 403 : 503, { code: accessResponse.status === 403 ? 'CONTROL_CENTER_ACCESS_DENIED' : 'DASHBOARD_ACCESS_UNAVAILABLE' });
      const access = await accessResponse.json();
      const allowed = access.authenticated === true && access.workspaceSwitching === false && access.dashboards?.some(item => item.dashboard === 'control-center' && item.role === 'super_admin' && item.organizationId === null);
      if (!allowed) return json(res, 403, { code: 'CONTROL_CENTER_ACCESS_DENIED' });
      const match = path.match(/^\/bff\/control-center\/travels\/([0-9a-f-]{36})\/branches$/i);
      if (path.startsWith('/bff/control-center/travels/') && !match) return json(res, 404, { code: 'TRAVEL_BRANCH_ROUTE_NOT_FOUND' });
      const target = match
        ? '/control-center/travels/' + encodeURIComponent(match[1]) + '/branches' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '')
        : '/control-center/travel-branches' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
      const body = req.method === 'POST' ? (await readBody(req)).toString('utf8') : undefined;
      const result = await apiRequest(req.method, target, body, session.accessToken);
      if (result.status !== 200 && result.status !== 201) return json(res, [400, 401, 403, 404, 409, 422].includes(result.status) ? result.status : 503, { code: result.data?.code || 'CONTROL_CENTER_BRANCH_UNAVAILABLE' });
      return json(res, result.status, branchResponseForUi(result.data));
    }
    if (req.method === 'PATCH' && path.startsWith('/bff/control-center/travel-branches/')) {
      const session = await getSession(req);
      if (!session?.accessToken) return json(res, 401, { authenticated: false, code: 'AUTH_REQUIRED' });
      const accessResponse = await fetch(`http://${host}:${port}/bff/dashboard/access`, { headers: { cookie: req.headers.cookie || '' }, signal: AbortSignal.timeout(10000) });
      if (accessResponse.status !== 200) return json(res, accessResponse.status === 403 ? 403 : 503, { code: accessResponse.status === 403 ? 'CONTROL_CENTER_ACCESS_DENIED' : 'DASHBOARD_ACCESS_UNAVAILABLE' });
      const access = await accessResponse.json();
      const allowed = access.authenticated === true && access.workspaceSwitching === false && access.dashboards?.some(item => item.dashboard === 'control-center' && item.role === 'super_admin' && item.organizationId === null);
      if (!allowed) return json(res, 403, { code: 'CONTROL_CENTER_ACCESS_DENIED' });
      const id = path.slice('/bff/control-center/travel-branches/'.length);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 404, { code: 'TRAVEL_BRANCH_NOT_FOUND' });
      const result = await apiRequest('PATCH', '/control-center/travel-branches/' + encodeURIComponent(id), (await readBody(req)).toString('utf8'), session.accessToken);
      if (result.status !== 200) return json(res, [400, 401, 403, 404, 409, 422].includes(result.status) ? result.status : 503, { code: result.data?.code || 'CONTROL_CENTER_BRANCH_UNAVAILABLE' });
      return json(res, 200, result.data);
    }
    if (req.method === 'POST' && path === '/bff/control-center/test-data/travel-demo') {
      // Seed data uji tidak tersedia di production (API juga tidak mendaftarkannya).
      if (process.env.NODE_ENV === 'production') return json(res, 404, { code: 'NOT_FOUND' });
      const session = await getSession(req);
      if (!session?.accessToken) return json(res, 401, { authenticated: false, code: 'AUTH_REQUIRED' });
      const accessResponse = await fetch(`http://${host}:${port}/bff/dashboard/access`, { headers: { cookie: req.headers.cookie || '' }, signal: AbortSignal.timeout(10000) });
      if (accessResponse.status !== 200) return json(res, accessResponse.status === 403 ? 403 : 503, { code: accessResponse.status === 403 ? 'CONTROL_CENTER_ACCESS_DENIED' : 'DASHBOARD_ACCESS_UNAVAILABLE' });
      const access = await accessResponse.json();
      const allowed = access.authenticated === true && access.workspaceSwitching === false && access.dashboards?.some(item => item.dashboard === 'control-center' && item.role === 'super_admin' && item.organizationId === null);
      if (!allowed) return json(res, 403, { code: 'CONTROL_CENTER_ACCESS_DENIED' });
      const result = await apiRequest('POST', '/control-center/test-data/travel-demo', (await readBody(req)).toString('utf8'), session.accessToken);
      if (![200, 201].includes(result.status)) return json(res, [400, 401, 403, 404, 409, 422].includes(result.status) ? result.status : 503, { code: result.data?.code || 'TRAVEL_DEMO_UNAVAILABLE' });
      return json(res, result.status, result.data);
    }
    if (req.method === 'GET' && path === '/bff/control-center/vendors') {
      const session = await getSession(req);
      if (!session?.accessToken) return json(res, 401, { authenticated: false, code: 'AUTH_REQUIRED' });
      const accessResponse = await fetch(`http://${host}:${port}/bff/dashboard/access`, {
        headers: { cookie: req.headers.cookie || '' }, signal: AbortSignal.timeout(10000)
      });
      if (accessResponse.status !== 200) return json(res, accessResponse.status === 403 ? 403 : 503, { code: 'CONTROL_CENTER_ACCESS_DENIED' });
      const access = await accessResponse.json();
      const allowed = access.authenticated === true && access.workspaceSwitching === false && access.dashboards?.some(item => item.dashboard === 'control-center' && item.role === 'super_admin' && item.organizationId === null);
      if (!allowed) return json(res, 403, { code: 'CONTROL_CENTER_ACCESS_DENIED' });
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      const result = await apiRequest('GET', '/control-center/vendors' + query, undefined, session.accessToken);
      if (result.status !== 200) return json(res, [401, 403].includes(result.status) ? result.status : 503, { code: result.data?.code || 'CONTROL_CENTER_VENDOR_UNAVAILABLE' });
      return json(res, 200, result.data);
    }
    // Realtime Control Center: hanya super_admin; filter di API.
    if (req.method === 'GET' && path === '/bff/sync/events') {
      const accessResponse = await fetch(`http://${host}:${port}/bff/dashboard/access`, { headers: { cookie: req.headers.cookie || '' }, signal: AbortSignal.timeout(10000) });
      if (accessResponse.status !== 200) return json(res, [401, 403].includes(accessResponse.status) ? accessResponse.status : 503, { code: 'CONTROL_CENTER_ACCESS_DENIED' });
      const access = await accessResponse.json();
      const allowed = access.authenticated === true && access.dashboards?.some(item => item.dashboard === 'control-center' && item.role === 'super_admin' && item.organizationId === null);
      if (!allowed) return json(res, 403, { code: 'CONTROL_CENTER_ACCESS_DENIED' });
      const session = await getSession(req);
      if (!session?.accessToken) return json(res, 401, { authenticated: false, code: 'AUTH_REQUIRED' });
      return proxySyncStream(req, res, {
        apiOrigin,
        target: '/sync/control-center/events',
        ingressSecret,
        accessToken: session.accessToken,
        signIngressRequest,
        json,
        label: 'Control Center BFF'
      });
    }

    if (req.method === 'GET' && path === '/bff/control-center/bookings') {
      const session = await getSession(req);
      if (!session?.accessToken) return json(res, 401, { authenticated: false, code: 'AUTH_REQUIRED' });
      const accessResponse = await fetch(`http://${host}:${port}/bff/dashboard/access`, { headers: { cookie: req.headers.cookie || '' }, signal: AbortSignal.timeout(10000) });
      if (accessResponse.status !== 200) return json(res, accessResponse.status === 403 ? 403 : 503, { code: 'CONTROL_CENTER_ACCESS_DENIED' });
      const access = await accessResponse.json();
      const allowed = access.authenticated === true && access.workspaceSwitching === false && access.dashboards?.some(item => item.dashboard === 'control-center' && item.role === 'super_admin' && item.organizationId === null);
      if (!allowed) return json(res, 403, { code: 'CONTROL_CENTER_ACCESS_DENIED' });
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      const result = await apiRequest('GET', '/control-center/bookings' + query, undefined, session.accessToken);
      if (result.status !== 200) return json(res, [401, 403].includes(result.status) ? result.status : 503, { code: result.data?.code || 'CONTROL_CENTER_BOOKING_UNAVAILABLE' });
      return json(res, 200, result.data);
    }
    if (req.method === 'GET' && path === '/bff/control-center/audit-logs') {
      const session = await getSession(req);
      if (!session?.accessToken) return json(res, 401, { authenticated: false, code: 'AUTH_REQUIRED' });
      const accessResponse = await fetch(`http://${host}:${port}/bff/dashboard/access`, {
        headers: { cookie: req.headers.cookie || '' }, signal: AbortSignal.timeout(10000)
      });
      if (accessResponse.status !== 200) return json(res, accessResponse.status === 403 ? 403 : 503, { code: 'CONTROL_CENTER_ACCESS_DENIED' });
      const access = await accessResponse.json();
      const allowed = access.authenticated === true && access.workspaceSwitching === false && access.dashboards?.some(item => item.dashboard === 'control-center' && item.role === 'super_admin' && item.organizationId === null);
      if (!allowed) return json(res, 403, { code: 'CONTROL_CENTER_ACCESS_DENIED' });
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      const result = await apiRequest('GET', '/control-center/audit-logs' + query, undefined, session.accessToken);
      if (result.status !== 200) return json(res, [401, 403].includes(result.status) ? result.status : 503, { code: result.data?.code || 'CONTROL_CENTER_AUDIT_LOG_UNAVAILABLE' });
      return json(res, 200, result.data);
    }
    if (
      ['GET', 'PUT'].includes(req.method) &&
      path === '/bff/integrations/google'
    ) {
      const session = await getSession(req);

      if (!session?.accessToken) {
        return json(res, 401, {
          authenticated: false,
          code: 'AUTH_REQUIRED'
        });
      }

      const accessResponse = await fetch(
        `http://${host}:${port}/bff/dashboard/access`,
        {
          headers: {
            cookie: req.headers.cookie || ''
          },
          signal: AbortSignal.timeout(10000)
        }
      );

      if (accessResponse.status !== 200) {
        return json(
          res,
          accessResponse.status === 403 ? 403 : 503,
          {
            code: accessResponse.status === 403
              ? 'CONTROL_CENTER_ACCESS_DENIED'
              : 'DASHBOARD_ACCESS_UNAVAILABLE'
          }
        );
      }

      const access = await accessResponse.json();

      const allowed =
        access.authenticated === true &&
        access.workspaceSwitching === false &&
        access.dashboards?.some(item =>
          item.dashboard === 'control-center' &&
          item.role === 'super_admin' &&
          item.organizationId === null
        );

      if (!allowed) {
        return json(res, 403, {
          code: 'CONTROL_CENTER_ACCESS_DENIED'
        });
      }

      let body;

      if (req.method === 'PUT') {
        try {
          body = JSON.parse(
            (await readBody(req)).toString('utf8')
          );
        } catch {
          return json(res, 400, {
            code: 'INVALID_GOOGLE_CONFIG'
          });
        }

        if (
          !body ||
          typeof body !== 'object' ||
          Array.isArray(body)
        ) {
          return json(res, 400, {
            code: 'INVALID_GOOGLE_CONFIG'
          });
        }
      }

      const result = await apiRequest(
        req.method,
        '/admin/integrations/google',
        body,
        session.accessToken
      );

      return json(
        res,
        [200, 400, 401, 403, 404, 409, 422].includes(result.status)
          ? result.status
          : 503,
        result.data
      );
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
          cookies(req).segaloka_control_center_session;

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
            { 'Set-Cookie': clearSessionCookies() }
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
      const id = cookies(req).segaloka_control_center_session;
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
          'Set-Cookie': clearSessionCookies()
        }
      );
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
    `Segaloka Travel BFF: http://${host}:${port}`
  );
});
