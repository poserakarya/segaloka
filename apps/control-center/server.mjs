import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), 'frontend');
const LOGIN_FILE = join(FRONTEND_DIR, 'control-center-login.html');

async function hasControlCenterAccess(req) {
  return new Promise(resolve => {
    const check = http.request({
      hostname: '127.0.0.1',
      port: Number(process.env.SEGALOKA_BFF_PORT || 4203),
      method: 'GET',
      path: '/bff/dashboard/access',
      headers: {
        cookie: req.headers.cookie || '',
        accept: 'application/json'
      },
      timeout: 5000
    }, response => {
      const chunks = [];

      response.on('data', chunk => chunks.push(chunk));

      response.on('end', () => {
        console.log('[CC ACCESS CHECK]', {
          upstreamStatus: response.statusCode,
          browserCookiePresent: Boolean(req.headers.cookie),
          cookieNamePresent: (req.headers.cookie || '')
            .split(';')
            .some(part => part.trim().startsWith('segaloka_control_center_session='))
        });

        if (response.statusCode !== 200) {
          resolve(false);
          return;
        }

        try {
          const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          resolve(
            data !== null &&
            typeof data === 'object' &&
            !Array.isArray(data) &&
            data.authenticated === true &&
            data.workspaceSwitching === false &&
            Array.isArray(data.dashboards) &&
            data.dashboards.some(item =>
              item !== null &&
              typeof item === 'object' &&
              item.dashboard === 'control-center' &&
              item.role === 'super_admin' &&
              item.organizationId === null
            )
          );
        } catch {
          resolve(false);
        }
      });
    });

    check.on('timeout', () => check.destroy());
    check.on('error', () => resolve(false));
    check.end();
  });
}
import http from 'node:http';

function proxyBff(req, res) {
  const origin = req.headers.origin;
  const configuredOrigin = process.env.CONTROL_CENTER_PUBLIC_ORIGIN;
  if (process.env.NODE_ENV === 'production' && (!configuredOrigin || !/^https:\/\/[^/]+$/.test(configuredOrigin))) {
    res.writeHead(503, { 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ code: 'PUBLIC_ORIGIN_NOT_CONFIGURED' }));
    return;
  }
  const expectedOrigin = configuredOrigin || `http://${HOST}:${PORT}`;

  if (origin !== undefined && origin !== expectedOrigin) {
    res.writeHead(403, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({ code: 'ORIGIN_FORBIDDEN' }));
    return;
  }

  const headers = { ...req.headers };
  const bffPort = Number(process.env.SEGALOKA_BFF_PORT || 4203);
  headers.host = `127.0.0.1:${bffPort}`;

  if (origin !== undefined) {
    headers.origin = `http://127.0.0.1:${bffPort}`;
  }

  delete headers.connection;
  delete headers['proxy-connection'];

  const upstream = http.request({
    hostname: '127.0.0.1',
    port: bffPort,
    method: req.method,
    path: req.url,
    headers,
    timeout: 10000
  }, upstreamResponse => {
    const responseHeaders = { ...upstreamResponse.headers };

    delete responseHeaders.connection;
    delete responseHeaders['transfer-encoding'];

    res.writeHead(
      upstreamResponse.statusCode ?? 502,
      responseHeaders
    );

    upstreamResponse.pipe(res);
  });

  upstream.on('timeout', () => {
    upstream.destroy(new Error('BFF_TIMEOUT'));
  });

  upstream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({ code: 'BFF_UNAVAILABLE' }));
    } else {
      res.destroy();
    }
  });

  req.pipe(upstream);
}

const HOST = '127.0.0.1';
const requestedPort = Number(process.env.SEGALOKA_CONTROL_CENTER_PORT || 4202);
if (!Number.isInteger(requestedPort) || requestedPort < 1024 || requestedPort > 65535) {
  throw new Error('Invalid SEGALOKA_CONTROL_CENTER_PORT');
}
const PORT = requestedPort;

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, `http://${HOST}:${PORT}`).pathname;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET' && path === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      application: 'control-center'
    }));
    return;
  }

  if (path === '/bff' || path.startsWith('/bff/')) {
    proxyBff(req, res);
    return;
  }

  if (req.method === 'GET' && path === '/runtime') {
    const remoteAddress = req.socket.remoteAddress;
    if (remoteAddress !== '127.0.0.1' &&
        remoteAddress !== '::1' &&
        remoteAddress !== '::ffff:127.0.0.1') {
      res.writeHead(403);
      res.end(JSON.stringify({ code: 'FORBIDDEN' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify({
      application: 'control-center',
      requiredRole: 'super_admin',
      workspaceSwitching: false,
      frontendIntegrated: false,
      apiIntegrated: false
    }));
    return;
  }

  if (req.method === 'GET' && path === '/login') {
    try {
      const html = await readFile(LOGIN_FILE);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer'
      });
      res.end(html);
    } catch {
      res.writeHead(500);
      res.end(JSON.stringify({ code: 'LOGIN_UNAVAILABLE' }));
    }
    return;
  }

  // SEGALOKA_CC_BUNDLE_ROUTE_V1
  if (req.method === 'GET' && path === '/control-center.bundle.js') {
    const allowed = await hasControlCenterAccess(req);

    if (!allowed) {
      res.writeHead(401, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({
        code: 'CONTROL_CENTER_ACCESS_REQUIRED'
      }));
      return;
    }

    try {
      const script = await readFile(
        join(FRONTEND_DIR, 'control-center.bundle.js')
      );

      res.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });

      res.end(script);
    } catch {
      res.writeHead(500);
      res.end(JSON.stringify({
        code: 'CONTROL_CENTER_BUNDLE_UNAVAILABLE'
      }));
    }

    return;
  }
  // SEGALOKA_CC_FRONTEND_ROUTE_V1
  if (req.method === 'GET' && (path === '/' || path === '/index.html' || path === '/dashboard')) {
    const allowed = await hasControlCenterAccess(req);

    if (!allowed && path === '/dashboard') {
      res.writeHead(302, { Location: '/login', 'Cache-Control': 'no-store' });
      res.end();
      return;
    }

    try {
      const html = await readFile(
        allowed && path === '/dashboard'
          ? join(FRONTEND_DIR, 'control-center.html')
          : join(FRONTEND_DIR, '..', 'public', 'index.html')
      );

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer'
      });

      res.end(html);
    } catch {
      res.writeHead(500);
      res.end(JSON.stringify({ code: 'FRONTEND_UNAVAILABLE' }));
    }

    return;
  }

  if (path === '/p' || path.startsWith('/p/')) {
    res.writeHead(404);
    res.end(JSON.stringify({ code: 'ROLE_ROUTE_FORBIDDEN' }));
    return;
  }
  res.writeHead(404);
  res.end(JSON.stringify({ code: 'NOT_FOUND' }));
});

server.listen(PORT, HOST, () => {
  console.log(`Control Center runtime listening on ${HOST}:${PORT}`);
});
