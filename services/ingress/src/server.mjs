import http from 'node:http';
import { isIP } from 'node:net';
import { resolveAuthenticatedClientIp } from './origin-security.mjs';
import { signIngressRequest } from '../../api/src/security/ingress-identity-v3.js';

const HOST = '127.0.0.1';
const PORT = Number(process.env.INGRESS_PORT ?? 4191);
const TARGET = process.env.INGRESS_TARGET ?? 'http://127.0.0.1:4190';

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('INVALID_INGRESS_PORT');
}

const targetUrlConfig = new URL(TARGET);

if (
  targetUrlConfig.protocol !== 'http:' ||
  targetUrlConfig.hostname !== '127.0.0.1' ||
  !targetUrlConfig.port ||
  targetUrlConfig.username ||
  targetUrlConfig.password ||
  targetUrlConfig.pathname !== '/' ||
  targetUrlConfig.search ||
  targetUrlConfig.hash ||
  Number(targetUrlConfig.port) === PORT
) {
  throw new Error('INVALID_INGRESS_TARGET');
}
const MAX_REQUEST_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

const secret = process.env.ORIGIN_AUTH_SECRET;
const identitySecret = process.env.INGRESS_IDENTITY_SECRET;

if (typeof secret !== 'string' || secret.length < 32) {
  throw new Error('ORIGIN_AUTH_SECRET_REQUIRED');
}

if (
  typeof identitySecret !== 'string' ||
  identitySecret.length < 32 ||
  identitySecret === secret
) {
  throw new Error('INGRESS_IDENTITY_SECRET_REQUIRED');
}

const blockedHeaders = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-connection',
  'proxy-authenticate',
  'proxy-authorization',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
  'content-length',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
  'cf-connecting-ip',
  'true-client-ip',
  'x-segaloka-origin-auth',
  'x-segaloka-client-ip',
  'x-segaloka-client-time',
  'x-segaloka-client-nonce',
  'x-segaloka-client-body-sha256',
  'x-segaloka-client-signature'
]);

function send(res, status, code) {
  if (res.headersSent) return res.destroy();

  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });

  res.end(JSON.stringify({ code }));
}

function cleanHeaders(source) {
  const result = {};
  const connection = source.connection;

  const additional = new Set(
    typeof connection === 'string'
      ? connection.split(',').map(v => v.trim().toLowerCase())
      : []
  );

  for (const [name, value] of Object.entries(source)) {
    const key = name.toLowerCase();

    if (
      blockedHeaders.has(key) ||
      additional.has(key) ||
      value === undefined
    ) continue;

    result[key] = value;
  }

  return result;
}

const server = http.createServer(async (req, res) => {
  const clientIp = resolveAuthenticatedClientIp(
    req.headers,
    secret
  );

  if (!clientIp || isIP(clientIp) === 0) {
    return send(res, 403, 'INGRESS_FORBIDDEN');
  }

  if (!req.url || !req.url.startsWith('/')) {
    return send(res, 400, 'INVALID_REQUEST_TARGET');
  }

  const rawLength = req.headers['content-length'];

  if (rawLength !== undefined) {
    if (!/^\d+$/.test(rawLength)) {
      return send(res, 400, 'INVALID_CONTENT_LENGTH');
    }

    if (Number(rawLength) > MAX_REQUEST_BYTES) {
      return send(res, 413, 'REQUEST_TOO_LARGE');
    }
  }

  const chunks = [];
  let size = 0;

  try {
    for await (const chunk of req) {
      size += chunk.length;

      if (size > MAX_REQUEST_BYTES) {
        return send(res, 413, 'REQUEST_TOO_LARGE');
      }

      chunks.push(chunk);
    }

    const body = Buffer.concat(chunks);
    const method = req.method ?? 'GET';

    if (
      (method === 'GET' || method === 'HEAD') &&
      body.length !== 0
    ) {
      return send(res, 400, 'BODY_NOT_ALLOWED');
    }

    const targetUrl = new URL(TARGET);
    const incomingUrl = new URL(req.url, TARGET);

    if (incomingUrl.origin !== targetUrl.origin) {
      return send(res, 400, 'INVALID_REQUEST_TARGET');
    }

    const response = await new Promise((resolve, reject) => {
      const upstreamRequest = http.request(
        incomingUrl,
        {
          method,
          headers: {
            ...cleanHeaders(req.headers),
            ...signIngressRequest(
              identitySecret,
              {
                ip: clientIp,
                method,
                target: incomingUrl.pathname + incomingUrl.search,
                body
              }
            )
          },
          timeout: 10000,
          agent: false
        },
        (upstreamResponse) => {
          const chunks = [];
          let total = 0;

          upstreamResponse.on('data', (chunk) => {
            total += chunk.length;

            if (total > MAX_RESPONSE_BYTES) {
              upstreamResponse.destroy(
                new Error('UPSTREAM_RESPONSE_TOO_LARGE')
              );
              return;
            }

            chunks.push(chunk);
          });

          upstreamResponse.once('end', () => {
            resolve({
              status: upstreamResponse.statusCode,
              headers: upstreamResponse.headers,
              body: Buffer.concat(chunks)
            });
          });

          upstreamResponse.once('error', reject);
        }
      );

      upstreamRequest.once('timeout', () => {
        upstreamRequest.destroy(
          new Error('UPSTREAM_TIMEOUT')
        );
      });

      upstreamRequest.once('error', reject);

      if (method !== 'GET' && method !== 'HEAD') {
        upstreamRequest.write(body);
      }

      upstreamRequest.end();
    });

    const responseHeaders = cleanHeaders(response.headers);

    delete responseHeaders['content-length'];
    delete responseHeaders['transfer-encoding'];

    res.writeHead(response.status, responseHeaders);

    if (
      method === 'HEAD' ||
      response.status === 204 ||
      response.status === 304
    ) {
      return res.end();
    }

    return res.end(response.body);
  } catch (error) {
    const kind = error instanceof Error
      ? error.name
      : 'UnknownError';

    // Log only the error category, never credentials or headers.
    const location = error instanceof Error
      ? (error.stack ?? '')
          .split('\n')
          .find(line => line.includes('server.mjs:'))
          ?.trim()
      : undefined;

    console.error('INGRESS_UPSTREAM_ERROR_TYPE:', kind);
    console.error(
      'INGRESS_UPSTREAM_ERROR_LOCATION:',
      location ?? 'UNKNOWN'
    );

    return send(res, 502, 'UPSTREAM_UNAVAILABLE');
  }
});

server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.maxHeadersCount = 64;

server.listen(PORT, HOST, () => {
  console.log(`Segaloka ingress listening on ${HOST}:${PORT}`);
});