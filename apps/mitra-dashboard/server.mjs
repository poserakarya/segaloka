import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SEGALOKA_V7_ROOT = dirname(fileURLToPath(import.meta.url));
const SEGALOKA_V7_CONFIG = JSON.parse(
  readFileSync(resolve(SEGALOKA_V7_ROOT, 'v7-runtime.json'), 'utf8').replace(/^\uFEFF/, '')
);
const SEGALOKA_V7_ENTRY = resolve(
  SEGALOKA_V7_ROOT,
  SEGALOKA_V7_CONFIG.entry
);

if (!existsSync(SEGALOKA_V7_ENTRY)) {
  throw new Error('Dashboard V7 entry point not found');
}
import http from 'node:http';

const role = 'mitra';
const port = 4214;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({
      service: `segaloka-${role}`,
      status: 'running',
      dashboardAccess: 'protected'
    }));
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(302, {
      Location: 'http://127.0.0.1:4241/bff/ui',
      'Cache-Control': 'no-store'
    });
    res.end();
    return;
  }
  res.writeHead(403, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });

  res.end(
    'Dashboard memerlukan sesi dan otorisasi role Segaloka yang valid.'
  );
});

server.listen(port, '127.0.0.1', () => {
  console.log(
    `Segaloka ${role} runtime: http://127.0.0.1:${port}`
  );
});

