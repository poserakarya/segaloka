const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const [rootArg, role, portArg] = process.argv.slice(2);

if (!rootArg || !role || !portArg) {
  console.error('Usage: node server.cjs <root> <role> <port>');
  process.exit(1);
}

const root = fs.realpathSync(rootArg);
const port = Number(portArg);
const entry = `${role}.html`;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

http.createServer((req, res) => {
  let pathname;

  try {
    pathname = decodeURIComponent(
      new URL(req.url, 'http://localhost').pathname
    );
  } catch {
    res.writeHead(400).end('Bad Request');
    return;
  }

  if (pathname.includes('\0') || pathname.includes('\\')) {
    res.writeHead(400).end('Bad Request');
    return;
  }

  const relative = pathname === '/'
    ? entry
    : pathname.replace(/^\/+/, '');

  const target = path.resolve(root, relative);

  if (target !== root && !target.startsWith(root + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let realTarget;

  try {
    realTarget = fs.realpathSync(target);

    if (!realTarget.startsWith(root + path.sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    if (!fs.statSync(realTarget).isFile()) {
      res.writeHead(404).end('Not Found');
      return;
    }
  } catch {
    res.writeHead(404).end('Not Found');
    return;
  }

  const ext = path.extname(realTarget).toLowerCase();

  res.writeHead(200, {
    'Content-Type': mime[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; object-src 'none'; base-uri 'none'",
    'Referrer-Policy': 'no-referrer'
  });

  fs.createReadStream(realTarget).pipe(res);
}).listen(port, '127.0.0.1', () => {
  console.log(`${role} original UI: http://127.0.0.1:${port}`);
});