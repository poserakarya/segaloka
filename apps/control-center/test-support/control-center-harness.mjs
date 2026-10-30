// Harness uji: menjalankan entry Control Center asli (server.mjs) di depan BFF
// tiruan khusus tes. Sesi tiruan ditentukan cookie
// segaloka_control_center_session: "admin" (super_admin), "travel" (role
// lain), atau tanpa cookie (belum login).
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const serverPath = fileURLToPath(new URL('../server.mjs', import.meta.url));

const ACCESS = {
  admin: { authenticated: true, workspaceSwitching: false, dashboards: [{ dashboard: 'control-center', role: 'super_admin', organizationId: null }] },
  travel: { authenticated: true, workspaceSwitching: false, dashboards: [{ dashboard: 'travel-dashboard', role: 'travel', organizationId: '33333333-3333-4333-8333-333333333333' }] }
};

function sessionOf(req) {
  const match = String(req.headers.cookie || '').match(/segaloka_control_center_session=([a-z]+)/);
  return match ? match[1] : null;
}

export async function startControlCenter({ loginResult = () => ({ status: 200, body: { authenticated: true } }) } = {}) {
  const requests = [];
  const bff = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null;
    requests.push({ method: req.method, path: req.url, body, origin: req.headers.origin });
    const send = (status, data, headers = {}) => {
      res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
      res.end(JSON.stringify(data));
    };
    const session = sessionOf(req);
    if (req.url === '/bff/dashboard/access') {
      return session && ACCESS[session] ? send(200, ACCESS[session]) : send(401, { authenticated: false, code: 'AUTH_REQUIRED' });
    }
    if (req.url === '/bff/login' && req.method === 'POST') {
      const result = loginResult(body);
      return send(result.status, result.body, result.session
        ? { 'Set-Cookie': `segaloka_control_center_session=${result.session}; HttpOnly; SameSite=Strict; Path=/` }
        : {});
    }
    if (req.url === '/bff/logout' && req.method === 'POST') {
      return send(200, { authenticated: false }, { 'Set-Cookie': 'segaloka_control_center_session=; Path=/; Max-Age=0' });
    }
    return send(404, { code: 'NOT_FOUND' });
  });
  await new Promise(resolve => bff.listen(0, '127.0.0.1', resolve));
  const bffPort = bff.address().port;

  const port = 4800 + Math.floor(Math.random() * 100);
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, SEGALOKA_CONTROL_CENTER_PORT: String(port), SEGALOKA_CONTROL_CENTER_BFF_PORT: String(bffPort) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', c => { output += c; });
  child.stderr.on('data', c => { output += c; });
  const origin = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error('server.mjs berhenti: ' + output);
    try { if ((await fetch(origin + '/health')).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }

  return {
    origin,
    requests,
    fetch(path, { session, ...options } = {}) {
      return fetch(origin + path, {
        ...options,
        headers: { ...(options.headers || {}), ...(session ? { cookie: `segaloka_control_center_session=${session}` } : {}) }
      });
    },
    async stop() {
      child.kill();
      await new Promise(resolve => bff.close(resolve));
    }
  };
}
