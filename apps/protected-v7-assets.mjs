import { readFile, realpath } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

export async function serveProtectedV7(req, res, options) {
  const { path, role, port, folder, appsRoot, json } = options;

  if (
    req.method !== 'GET' ||
    !(path === '/bff/ui' || path.startsWith('/bff/ui/'))
  ) {
    return false;
  }

  const accessResponse = await fetch(
    `http://127.0.0.1:${port}/bff/dashboard/access`,
    {
      headers: { cookie: req.headers.cookie || '' },
      signal: AbortSignal.timeout(10000)
    }
  );

  if (accessResponse.status !== 200) {
    json(
      res,
      [401, 403].includes(accessResponse.status)
        ? accessResponse.status
        : 503,
      { code: 'DASHBOARD_ACCESS_DENIED' }
    );
    return true;
  }

  const access = await accessResponse.json();

  if (
    access.authenticated !== true ||
    !Array.isArray(access.dashboards) ||
    !access.dashboards.some(item =>
      item.dashboard === role && item.role === role
    )
  ) {
    json(res, 403, { code: 'DASHBOARD_ACCESS_DENIED' });
    return true;
  }

  const root = resolve(appsRoot, folder, 'dist-v7');
  const requested = path === '/bff/ui'
    ? 'index.html'
    : path.slice('/bff/ui/'.length) || 'index.html';

  let decoded;
  try {
    decoded = decodeURIComponent(requested);
  } catch {
    json(res, 400, { code: 'INVALID_PATH' });
    return true;
  }

  if (
    decoded.includes('\0') ||
    decoded.includes('\\') ||
    decoded.startsWith('/') ||
    decoded.split('/').includes('..')
  ) {
    json(res, 403, { code: 'INVALID_PATH' });
    return true;
  }

  const file = resolve(root, decoded);
  const rel = relative(root, file);

  if (
    !rel ||
    rel === '..' ||
    rel.startsWith('..' + sep)
  ) {
    json(res, 403, { code: 'INVALID_PATH' });
    return true;
  }

  const type = mime[extname(file).toLowerCase()];
  if (!type) {
    json(res, 403, { code: 'ASSET_TYPE_NOT_ALLOWED' });
    return true;
  }

  try {
    const canonicalRoot = await realpath(root);
    const canonicalFile = await realpath(file);
    const canonicalRel = relative(canonicalRoot, canonicalFile);

    if (
      !canonicalRel ||
      canonicalRel === '..' ||
      canonicalRel.startsWith('..' + sep)
    ) {
      json(res, 403, { code: 'INVALID_PATH' });
      return true;
    }

    let data = await readFile(canonicalFile);

    if (decoded === 'index.html') {
      data = Buffer.from(
        data.toString('utf8').replaceAll(
          '/shared/v7-presentational.css',
          '/bff/ui/shared/v7-presentational.css'
        )
      );
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      json(res, 404, { code: 'ASSET_NOT_FOUND' });
    } else {
      throw error;
    }
  }

  return true;
}