'use strict';

const http = require('node:http');

const HOST = '127.0.0.1';
const LISTEN_PORT = Number(process.env.SEGALOKA_GATEWAY_PORT || 4220);
const WEBSITE_PORT = Number(process.env.SEGALOKA_WEBSITE_PORT || 3000);
const BFF_PORT = Number(process.env.SEGALOKA_GATEWAY_BFF_PORT || 4213);
const CONTROL_CENTER_PORT = Number(process.env.SEGALOKA_GATEWAY_CONTROL_CENTER_PORT || 4202);

for (const [name, value] of Object.entries({ LISTEN_PORT, WEBSITE_PORT, BFF_PORT, CONTROL_CENTER_PORT })) {
  if (!Number.isInteger(value) || value < 1024 || value > 65535) {
    throw new Error(`Invalid ${name}`);
  }
}

function routeFor(pathname) {
  if (pathname === '/bff' || pathname.startsWith('/bff/')) {
    return { port: BFF_PORT, prefix: '' };
  }
  if (pathname === '/login' || pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return { port: CONTROL_CENTER_PORT, prefix: '' };
  }
  if (pathname === '/control-center.bundle.js') {
    return { port: CONTROL_CENTER_PORT, prefix: '' };
  }
  return { port: WEBSITE_PORT, prefix: '' };
}

function proxy(req, res) {
  const url = new URL(req.url || '/', `http://${HOST}:${LISTEN_PORT}`);
  const target = routeFor(url.pathname);
  const headers = { ...req.headers };

  // The gateway is local-only and creates these headers itself.
  delete headers['x-forwarded-for'];
  delete headers['x-forwarded-host'];
  delete headers['x-forwarded-proto'];
  delete headers['x-forwarded-origin'];
  headers.host = `${HOST}:${target.port}`;
  headers['x-forwarded-host'] = `${HOST}:${LISTEN_PORT}`;
  headers['x-forwarded-proto'] = 'http';
  headers['x-forwarded-for'] = req.socket.remoteAddress || HOST;
  if (headers.origin) headers['x-forwarded-origin'] = headers.origin;
  headers.origin = `http://${HOST}:${target.port}`;
  delete headers.connection;
  delete headers['proxy-connection'];

  const upstream = http.request({
    hostname: HOST,
    port: target.port,
    method: req.method,
    path: url.pathname + url.search,
    headers,
    timeout: 15000
  }, response => {
    const responseHeaders = { ...response.headers };
    delete responseHeaders.connection;
    delete responseHeaders['transfer-encoding'];
    // The upstream cookie is intentionally preserved. It becomes host-only
    // for the canonical gateway origin because the upstream sets no Domain.
    res.writeHead(response.statusCode || 502, responseHeaders);
    response.pipe(res);
  });

  upstream.on('timeout', () => upstream.destroy(new Error('UPSTREAM_TIMEOUT')));
  upstream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({ code: 'GATEWAY_UPSTREAM_UNAVAILABLE' }));
    } else {
      res.destroy();
    }
  });
  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin && origin !== `http://${HOST}:${LISTEN_PORT}`) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ code: 'ORIGIN_FORBIDDEN' }));
    return;
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Cache-Control': 'no-store' });
    res.end();
    return;
  }
  proxy(req, res);
});

server.listen(LISTEN_PORT, HOST, () => {
  console.log(`Segaloka local gateway listening on http://${HOST}:${LISTEN_PORT}`);
});
