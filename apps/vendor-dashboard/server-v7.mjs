import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const config = JSON.parse(
  readFileSync(resolve(root, 'v7-runtime.json'), 'utf8').replace(/^\uFEFF/, '')
);

if (config.role !== 'vendor') {
  throw new Error('Invalid Vendor V7 role');
}

const entry = resolve(root, config.entry);

if (!existsSync(entry)) {
  throw new Error('Vendor V7 entry not found');
}

const port = Number(config.port);

const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.url === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8'
    });

    res.end(JSON.stringify({
      service: 'segaloka-vendor-v7',
      status: 'running',
      entryReady: true,
      dashboardAccess: 'protected'
    }));

    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(302, {
      Location: 'http://127.0.0.1:4211/bff/ui',
      'Cache-Control': 'no-store'
    });
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
  console.log(`Vendor V7 runtime ready on ${port}`);
});
