import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { createSessionStore } from './session-store.mjs';
import { createHandoffChallengeStore } from './handoff-challenge.mjs';
import { classifyLoginResponse } from './login-flow.mjs';
import { renderTravelV7Source } from './v7-source.mjs';
import {
  createReadStream,
  readFileSync,
  realpathSync,
  statSync
} from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { signIngressRequest } from '../../../services/api/src/security/ingress-identity-v3.js';

const testDatabaseMode =
  process.env.SEGALOKA_TEST_DATABASE === 'true';
const host = process.env.BFF_HOST || '127.0.0.1';
const port = Number(process.env.BFF_PORT || 4201);
const apiOrigin =
  process.env.API_ORIGIN || 'http://127.0.0.1:4192';
const sseTrace = process.env.SEGALOKA_SSE_TRACE === 'true';

const root = resolve(
  fileURLToPath(new URL('../../../', import.meta.url))
);
const originalUiRoot = realpathSync(
  resolve(fileURLToPath(new URL('../original-v7/', import.meta.url)))
);

function loadIngressSecret() {
  if (testDatabaseMode) {
    const testSecret = process.env.INGRESS_IDENTITY_SECRET;
    if (typeof testSecret !== 'string' || testSecret.length < 32) {
      throw new Error('TEST_INGRESS_SECRET_REQUIRED');
    }
    return testSecret;
  }

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

const dbConfig = testDatabaseMode
  ? {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_NAME: process.env.DB_NAME,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_SSL: process.env.DB_SSL
    }
  : readEnvFile(resolve(root, 'services/api/.env'));
const bffConfig = testDatabaseMode
  ? {
      BFF_SESSION_ENCRYPTION_KEY:
        process.env.BFF_SESSION_ENCRYPTION_KEY
    }
  : readEnvFile(
      resolve(root, 'apps/travel-dashboard/server/.env')
    );

if (testDatabaseMode) {
  const testDbName = dbConfig.DB_NAME || '';
  const apiAddress = new URL(apiOrigin);
  const dbHost = dbConfig.DB_HOST;
  const frontendAddress = new URL(process.env.FRONTEND_ORIGIN || '');
  const testSessionKey = bffConfig.BFF_SESSION_ENCRYPTION_KEY || '';

  if (
    !/(^|[_-])(test|testing|e2e)([_-]|$)/i.test(testDbName) ||
    !['127.0.0.1', 'localhost', '::1'].includes(dbHost) ||
    !Number.isInteger(Number(dbConfig.DB_PORT)) ||
    typeof dbConfig.DB_USER !== 'string' ||
    typeof dbConfig.DB_PASSWORD !== 'string' ||
    dbConfig.DB_SSL !== 'false' ||
    apiAddress.hostname !== '127.0.0.1' ||
    apiAddress.protocol !== 'http:' ||
    Number(apiAddress.port) === 4192 ||
    port === 4201 ||
    !['127.0.0.1', 'localhost'].includes(frontendAddress.hostname) ||
    frontendAddress.protocol !== 'http:' ||
    Number(frontendAddress.port) === 4200 ||
    Buffer.from(testSessionKey, 'base64').length !== 32 ||
    Buffer.from(testSessionKey, 'base64').toString('base64') !== testSessionKey ||
    process.env.FRONTEND_ORIGIN === 'http://127.0.0.1:4200'
  ) {
    throw new Error('UNSAFE_TRAVEL_TEST_DATABASE_CONFIGURATION');
  }
}

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

const handoffChallenges = createHandoffChallengeStore();

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
  const id = cookies(req).segaloka_travel_session;

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

function travelMembership(me) {
  return Array.isArray(me.memberships) &&
    me.memberships.some(m => {
      if (
        typeof m.role !== 'string' ||
        typeof m.organizationId !== 'string' ||
        m.organizationId.length === 0
      ) {
        return false;
      }

      return m.role === 'travel' ||
        m.role === 'TRAVEL_OWNER' ||
        m.role === 'TRAVEL_ADMIN' ||
        m.role.startsWith('TRAVEL_');
    });
}

async function authorizedTravelSession(req) {
    const session = await getSession(req);

    if (!session) {
      return {
        status: 401,
        body: { authenticated: false, code: 'AUTH_REQUIRED' }
      };
    }

    const me = await apiRequest(
      'GET',
      '/auth/me',
      undefined,
      session.accessToken
    );

    if (me.status === 401) {
      return {
        status: 401,
        body: { authenticated: false, code: 'INVALID_SESSION' }
      };
    }

    if (me.status !== 200) {
      return {
        status: 503,
        body: { code: 'AUTH_SERVICE_UNAVAILABLE' }
      };
    }

    if (!travelMembership(me.data)) {
      return {
        status: 403,
        body: { code: 'TRAVEL_ROLE_REQUIRED' }
      };
    }

    const access = await apiRequest(
      'GET',
      '/dashboard/access',
      undefined,
      session.accessToken
    );

    if (access.status === 401) {
      return {
        status: 401,
        body: { authenticated: false, code: 'INVALID_SESSION' }
      };
    }

    if (access.status !== 200) {
      return {
        status: 503,
        body: { code: 'DASHBOARD_ACCESS_UNAVAILABLE' }
      };
    }

    const dashboards = (
      Array.isArray(access.data?.dashboards)
        ? access.data.dashboards
        : []
    ).filter(item =>
      item.dashboard === 'travel' &&
      item.role === 'travel' &&
      typeof item.organizationId === 'string' &&
      item.organizationId.length > 0
    );

    if (dashboards.length === 0) {
      return {
        status: 403,
        body: { code: 'TRAVEL_ACCESS_DENIED' }
      };
    }

    if (dashboards.length !== 1) {
      return {
        status: 409,
        body: { code: 'TRAVEL_ORGANIZATION_SELECTION_REQUIRED' }
      };
    }

    return {
      status: 200,
      session,
      dashboards
    };
}

function contentType(path) {
    const types = {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2'
    };

    return types[extname(path).toLowerCase()] ||
      'application/octet-stream';
}
function isAllowedOrigin(req) {
  const origin = req.headers.origin;

  if (typeof origin !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(origin);

    return parsed.origin === `http://${host}:${port}` ||
      parsed.origin === (
        process.env.FRONTEND_ORIGIN ||
        'http://127.0.0.1:4200'
      );
  } catch {
    return false;
  }
}

function sessionCookie(value, clear = false) {
  const secure = process.env.NODE_ENV === 'production'
    ? '; Secure'
    : '';

  return `segaloka_travel_session=${value}; ` +
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

    const requestUrl = new URL(
      req.url,
      `http://${host}:${port}`
    );
    const path = requestUrl.pathname;

    if (
      req.method === 'POST' &&
      path === '/bff/auth/handoff'
    ) {
      return json(res, 503, {
        code: 'HANDOFF_BRIDGE_NOT_READY'
      });
    }
    if (
      req.method === 'POST' &&
      path === '/bff/auth/handoff/start'
    ) {
      const challenge = handoffChallenges.issue();

      const secure = process.env.NODE_ENV === 'production'
        ? '; Secure'
        : '';

      res.setHeader(
        'Set-Cookie',
        `segaloka_handoff_id=${challenge.id}; ` +
        'HttpOnly; SameSite=Lax; Path=/bff/auth/handoff; ' +
        'Max-Age=60' +
        secure
      );

      return json(res, 200, {
        initialized: true,
        expiresIn: challenge.expiresIn
      }, {
        'Referrer-Policy': 'no-referrer'
      });
    }

    if (req.method === 'GET' && path === '/bff/health') {
      return json(res, 200, { status: 'ok' });
    }

    if (req.method === 'GET' && path === '/bff/status') {
      try {
        const [api, database] = await Promise.all([
          apiRequest('GET', '/health'),
          apiRequest('GET', '/ready')
        ]);

        return json(res, 200, {
          api: {
            connected: api.status === 200 &&
              api.data?.service === 'segaloka-api' &&
              api.data?.status === 'ok'
          },
          database: {
            ready: database.status === 200 &&
              database.data?.database?.connected === true &&
              database.data?.status === 'ready'
          }
        });
      } catch (error) {
        console.error(
          '[Travel BFF] Segaloka status check failed:',
          error.name || 'Error'
        );
        return json(res, 503, {
          code: 'API_STATUS_UNAVAILABLE'
        });
      }
    }

    if (
      req.method === 'GET' &&
      path === '/bff/sync/events'
    ) {
      const access = await authorizedTravelSession(req);

      if (access.status !== 200) {
        return json(res, access.status, access.body);
      }

      const organizationId =
        requestUrl.searchParams.get('organizationId');
      const organizationAllowed = access.dashboards.some(
        item => item.organizationId === organizationId
      );

      if (!organizationAllowed) {
        return json(res, 403, {
          code: 'TRAVEL_ORGANIZATION_ACCESS_DENIED'
        });
      }

      const apiTarget = new URLSearchParams({
        organizationId
      });
      const requestedCursor =
        requestUrl.searchParams.get('after');

      if (requestedCursor !== null) {
        apiTarget.set('after', requestedCursor);
      }

      const target = `/sync/events?${apiTarget.toString()}`;
      const signed = signIngressRequest(
        ingressSecret,
        {
          ip: '127.0.0.1',
          method: 'GET',
          target,
          body: Buffer.alloc(0)
        }
      );
      const abort = new AbortController();
      let upstream;

      res.once('close', () => {
        if (!res.writableEnded) {
          abort.abort();
        }
      });

      try {
        upstream = await fetch(apiOrigin + target, {
          method: 'GET',
          headers: {
            ...signed,
            Authorization: `Bearer ${access.session.accessToken}`,
            ...(req.headers['last-event-id']
              ? { 'Last-Event-ID': req.headers['last-event-id'] }
              : {})
          },
          signal: abort.signal
        });

        if (!upstream.ok || !upstream.body) {
          const result = await upstream.json();
          return json(res, upstream.status, result);
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'X-Content-Type-Options': 'nosniff'
        });
        res.socket?.setNoDelay?.(true);
        res.flushHeaders?.();
        if (sseTrace) console.log(JSON.stringify({ layer: 'bff', phase: 'headers', contentType: upstream.headers.get('content-type'), cacheControl: upstream.headers.get('cache-control'), transferEncoding: upstream.headers.get('transfer-encoding'), contentEncoding: upstream.headers.get('content-encoding') }));

        const reader = upstream.body.getReader();
        try {
          while (!res.destroyed) {
            const chunk = await reader.read();
            if (chunk.done) break;
            const bytes = Buffer.from(chunk.value);
            const writable = res.write(bytes);
            if (sseTrace) console.log(JSON.stringify({ layer: 'bff', phase: 'chunk', bytes: bytes.length, writable, destroyed: res.destroyed }));
            if (!writable) await new Promise(resolve => res.once('drain', resolve));
            res.flushHeaders?.();
          }
          if (!res.writableEnded && !res.destroyed) res.end();
        } catch (error) {
          console.error(
            '[Travel BFF] Sync stream failed:',
            error.name || 'Error'
          );
          if (!res.destroyed) res.destroy(error);
        } finally {
          reader.releaseLock();
        }
        return;
      } catch (error) {
        if (abort.signal.aborted) return;

        console.error(
          '[Travel BFF] Sync API unavailable:',
          error.name || 'Error'
        );
        return json(res, 503, {
          code: 'SYNC_UNAVAILABLE'
        });
      }
    }

    if (req.method === 'GET' && path === '/bff/dashboard') {
      const access = await authorizedTravelSession(req);

      if (access.status !== 200) {
        return json(res, access.status, access.body);
      }

      const dashboard = access.dashboards[0];
      const html = renderTravelV7Source(
        readFileSync(
          resolve(originalUiRoot, 'travel-existing.html'),
          'utf8'
        ),
        {
          role: 'travel',
          organization: {
            id: dashboard.organizationId,
            name: dashboard.organizationName,
            status: 'active'
          },
          user: {
            id: access.session.user.id,
            name: access.session.user.fullName ||
              access.session.user.name ||
              access.session.user.email,
            email: access.session.user.email
          }
        }
      );

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer'
      });
      return res.end(html);
    }

    if (
      req.method === 'GET' &&
      path.startsWith('/bff/ui/')
    ) {
      const access = await authorizedTravelSession(req);

      if (access.status !== 200) {
        return json(res, access.status, access.body);
      }

      let relativePath;

      try {
        relativePath = decodeURIComponent(
          path.slice('/bff/ui/'.length)
        );
      } catch {
        return json(res, 400, { code: 'INVALID_ASSET_PATH' });
      }

      const assetPath = resolve(originalUiRoot, relativePath);

      if (!assetPath.startsWith(originalUiRoot + sep)) {
        return json(res, 403, { code: 'ASSET_PATH_FORBIDDEN' });
      }

      let realAssetPath;

      try {
        realAssetPath = realpathSync(assetPath);
        if (
          !realAssetPath.startsWith(originalUiRoot + sep) ||
          !statSync(realAssetPath).isFile()
        ) {
          return json(res, 404, { code: 'ASSET_NOT_FOUND' });
        }
      } catch {
        return json(res, 404, { code: 'ASSET_NOT_FOUND' });
      }

      res.writeHead(200, {
        'Content-Type': contentType(realAssetPath),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      });

      const stream = createReadStream(realAssetPath);
      stream.on('error', error => {
        console.error(
          '[Travel BFF] UI asset read failed:',
          error.code || error.name
        );
        if (!res.headersSent) {
          json(res, 500, { code: 'ASSET_READ_FAILED' });
        } else {
          res.destroy();
        }
      });
      return stream.pipe(res);
    }

    if (
      (req.method === 'GET' || req.method === 'POST') &&
      path === '/bff/departures'
    ) {
      const access = await authorizedTravelSession(req);

      if (access.status !== 200) {
        return json(res, access.status, access.body);
      }

      let organizationId;
      let payload;

      if (req.method === 'GET') {
        organizationId = requestUrl.searchParams.get('organizationId');
      } else {
        try {
          payload = JSON.parse(
            (await readBody(req)).toString('utf8')
          );
        } catch (error) {
          if (error.message === 'BODY_TOO_LARGE') throw error;
          return json(res, 400, { code: 'INVALID_REQUEST' });
        }

        organizationId = payload?.organizationId;
      }

      const organizationAllowed = access.dashboards.some(
        item => item.organizationId === organizationId
      );

      if (!organizationAllowed) {
        return json(res, 403, {
          code: 'TRAVEL_ORGANIZATION_ACCESS_DENIED'
        });
      }

      const apiResult = req.method === 'GET'
        ? await apiRequest(
            'GET',
            `/travel/departures?organizationId=${encodeURIComponent(organizationId)}`,
            undefined,
            access.session.accessToken
          )
        : await apiRequest(
            'POST',
            '/travel/departures',
            payload,
            access.session.accessToken
          );

      return json(res, apiResult.status, apiResult.data);
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

      const loginFlow = classifyLoginResponse(login.data);

      if (loginFlow.type === 'verification_required') {
        return json(res, 200, {
          authenticated: false,
          code: 'OTP_CHANNEL_REQUIRED',
          preAuthTicket: loginFlow.preAuthTicket,
          availableMethods: loginFlow.availableMethods,
          expiresIn: loginFlow.expiresIn
        });
      }

      if (loginFlow.type !== 'authenticated') {
        return json(res, 502, {
          code: 'INVALID_SESSION_RESPONSE'
        });
      }

      const accessToken = accessTokenOf(
        loginFlow.session
      );

      const refreshToken = refreshTokenOf(
        loginFlow.session
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
        !travelMembership(me.data)
      ) {
        await apiRequest('POST', '/auth/logout', {
          refreshToken
        });

        return json(res, 403, {
          code: 'TRAVEL_ACCESS_REQUIRED',
          message: 'Akun tidak memiliki akses Dashboard Travel.'
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
          authenticated: false,
          code: 'INVALID_VERIFICATION_REQUEST'
        });
      }

      const language = ['ID', 'EN', 'AR'].includes(
        body.language
      ) ? body.language : 'ID';

      const result = await apiRequest(
        'POST',
        '/auth/login/select-channel',
        {
          preAuthTicket: body.preAuthTicket,
          channel: body.channel,
          language
        }
      );

      if (result.status !== 200) {
        return json(res, result.status, {
          authenticated: false,
          code: result.data?.code || 'OTP_CHANNEL_FAILED',
          message: result.data?.message ||
            'Pengiriman kode verifikasi gagal.'
        });
      }

      if (
        result.data?.authenticated !== false ||
        result.data?.code !== 'OTP_REQUIRED' ||
        typeof result.data?.challengeId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          result.data.challengeId
        ) ||
        result.data.channel !== body.channel
      ) {
        return json(res, 502, {
          authenticated: false,
          code: 'INVALID_OTP_RESPONSE'
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
      (
        path === '/bff/login/verify-otp' ||
        path === '/bff/login/verify-authenticator'
      )
    ) {
      const body = JSON.parse(
        (await readBody(req)).toString('utf8')
      );

      const authenticator =
        path === '/bff/login/verify-authenticator';

      const validCode =
        typeof body.code === 'string' &&
        /^[0-9]{6}$/.test(body.code);

      const validIdentity = authenticator
        ? (
            typeof body.preAuthTicket === 'string' &&
            /^[0-9a-f]{64}$/.test(body.preAuthTicket)
          )
        : (
            typeof body.challengeId === 'string' &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              body.challengeId
            )
          );

      if (!validCode || !validIdentity) {
        return json(res, 400, {
          authenticated: false,
          code: 'INVALID_VERIFICATION_REQUEST'
        });
      }

      const verification = await apiRequest(
        'POST',
        authenticator
          ? '/auth/login/verify-authenticator'
          : '/auth/login/verify-otp',
        authenticator
          ? {
              preAuthTicket: body.preAuthTicket,
              code: body.code
            }
          : {
              challengeId: body.challengeId,
              code: body.code
            }
      );

      if (verification.status !== 200) {
        return json(res, verification.status, {
          authenticated: false,
          code: verification.data?.code ||
            'VERIFICATION_FAILED',
          message: verification.data?.message ||
            'Kode verifikasi tidak valid.'
        });
      }

      const verifiedFlow = classifyLoginResponse(
        verification.data
      );

      if (verifiedFlow.type !== 'authenticated') {
        return json(res, 502, {
          authenticated: false,
          code: 'INVALID_VERIFICATION_RESPONSE'
        });
      }

      const accessToken = accessTokenOf(
        verifiedFlow.session
      );

      const refreshToken = refreshTokenOf(
        verifiedFlow.session
      );

      if (!accessToken || !refreshToken) {
        return json(res, 502, {
          authenticated: false,
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
        !travelMembership(me.data)
      ) {
        await apiRequest('POST', '/auth/logout', {
          refreshToken
        });

        return json(res, 403, {
          authenticated: false,
          code: 'TRAVEL_ACCESS_REQUIRED',
          message: 'Akun tidak memiliki akses Dashboard Travel.'
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
          'Set-Cookie': sessionCookie(sessionId)
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
        const sessionId = cookies(req).segaloka_travel_session;
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

      if (!travelMembership(me.data)) {
        return json(res, 403, {
          code: 'TRAVEL_ROLE_REQUIRED'
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

      const travelDashboards = (
        Array.isArray(access.data?.dashboards)
          ? access.data.dashboards
          : []
      ).filter(item =>
        item.dashboard === 'travel' &&
        item.role === 'travel' &&
        typeof item.organizationId === 'string' &&
        item.organizationId.length > 0
      );

      if (travelDashboards.length === 0) {
        return json(res, 403, {
          code: 'TRAVEL_ACCESS_DENIED'
        });
      }

      return json(res, 200, {
        authenticated: true,
        workspaceSwitching: false,
        dashboards: travelDashboards
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
          cookies(req).segaloka_travel_session;

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
      const id = cookies(req).segaloka_travel_session;
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
