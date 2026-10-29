import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { V7_ORIGINAL_SOURCE_URL } from '../shared/runtime/v7-portal-source.mjs';

const root = dirname(fileURLToPath(import.meta.url));

const config = JSON.parse(
  readFileSync(resolve(root, 'v7-runtime.json'), 'utf8').replace(/^\uFEFF/, '')
);

if (config.role !== 'vendor') {
  throw new Error('Invalid Vendor V7 role');
}

// Dashboard disajikan dari sumber V7 asli oleh BFF di /bff/ui setelah sesi
// dan role diverifikasi. Shell dist-v7 tidak lagi dipakai sebagai entry.
if (!existsSync(V7_ORIGINAL_SOURCE_URL)) {
  throw new Error('Vendor V7 original source not found');
}

const role = 'vendor';
const port = Number(config.port);
const bffUiUrl = 'http://127.0.0.1:4211/bff/ui';

const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.url === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify({
      service: `segaloka-${role}`,
      status: 'running',
      source: 'original-v7',
      dashboardAccess: 'protected'
    }));
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(302, { Location: bffUiUrl });
    res.end();
    return;
  }

  res.writeHead(403, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify({
    code: 'DASHBOARD_ACCESS_DENIED'
  }));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Segaloka ${role} V7 runtime: http://127.0.0.1:${port}`);
});
