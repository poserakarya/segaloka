// Uji gerbang akses pratinjau (tools/preview/gate.mjs) terhadap upstream HTTP
// lokal: Basic Auth wajib, Origin publik dipetakan ke origin lokal, Origin
// asing ditolak, header Authorization tidak diteruskan, Location ditulis
// ulang, SSE mengalir, dan percobaan gagal berulang dikunci.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const gatePath = fileURLToPath(new URL('../tools/preview/gate.mjs', import.meta.url));
const UPSTREAM = 4891;
const PUBLIC = 4892;
const PASSWORD = 'gerbang-uji-0123456789';
const auth = 'Basic ' + Buffer.from(`penguji:${PASSWORD}`).toString('base64');

test('preview gate: auth, origin mapping, SSE, lockout', { timeout: 30000 }, async () => {
  const seen = [];
  const upstream = http.createServer((req, res) => {
    seen.push({ url: req.url, headers: req.headers });
    if (req.url === '/redirect') {
      res.writeHead(302, { Location: `http://127.0.0.1:${UPSTREAM}/bff/ui` });
      return res.end();
    }
    if (req.url === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write('event: ready\ndata: {}\n\n');
      setTimeout(() => res.end('event: change\ndata: {"n":1}\n\n'), 200);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  await new Promise(resolve => upstream.listen(UPSTREAM, '127.0.0.1', resolve));
  const gate = spawn(process.execPath, [gatePath], {
    env: {
      ...process.env,
      PREVIEW_GATE_USER: 'penguji',
      PREVIEW_GATE_PASSWORD: PASSWORD,
      PREVIEW_GATE_ROUTES: `${PUBLIC}=${UPSTREAM}`
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    await new Promise((resolve, reject) => {
      gate.stdout.on('data', chunk => { if (String(chunk).includes('preview-gate')) resolve(); });
      gate.once('exit', code => reject(new Error(`gate exited ${code}`)));
    });
    const url = path => `http://127.0.0.1:${PUBLIC}${path}`;
    const publicHost = `127.0.0.1:${PUBLIC}`;

    const anonymous = await fetch(url('/'));
    assert.equal(anonymous.status, 401);
    assert.match(anonymous.headers.get('www-authenticate'), /^Basic realm="Segaloka Preview"/);
    assert.equal(seen.length, 0, 'tanpa kredensial tidak boleh sampai ke upstream');

    const wrong = await fetch(url('/'), { headers: { Authorization: 'Basic ' + Buffer.from('penguji:salah').toString('base64') } });
    assert.equal(wrong.status, 401);

    const ok = await fetch(url('/bff/login'), {
      method: 'POST',
      headers: { Authorization: auth, Origin: `https://${publicHost}`, Referer: `https://${publicHost}/login`, 'Content-Type': 'application/json' },
      body: '{}'
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('x-robots-tag'), 'noindex, nofollow');
    const forwarded = seen.at(-1).headers;
    assert.equal(forwarded.origin, `http://127.0.0.1:${UPSTREAM}`);
    assert.equal(forwarded.host, `127.0.0.1:${UPSTREAM}`);
    assert.equal(forwarded.referer, `http://127.0.0.1:${UPSTREAM}/login`);
    assert.equal(forwarded.authorization, undefined);

    const foreign = await fetch(url('/bff/login'), {
      method: 'POST',
      headers: { Authorization: auth, Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: '{}'
    });
    assert.equal(foreign.status, 403);

    const redirect = await fetch(url('/redirect'), { headers: { Authorization: auth }, redirect: 'manual' });
    assert.equal(redirect.headers.get('location'), `https://${publicHost}/bff/ui`);

    const events = await fetch(url('/events'), { headers: { Authorization: auth } });
    assert.equal(events.headers.get('content-type'), 'text/event-stream');
    const text = await events.text();
    assert.ok(text.includes('event: ready') && text.includes('event: change'));

    for (let i = 0; i < 20; i++) {
      await fetch(url('/'), { headers: { Authorization: 'Basic ' + Buffer.from(`penguji:x${i}`).toString('base64') } });
    }
    assert.equal((await fetch(url('/'), { headers: { Authorization: auth } })).status, 429, 'dikunci setelah 20 kegagalan');
  } finally {
    gate.kill();
    upstream.close();
  }
});

test('preview gate refuses weak credentials', async () => {
  const gate = spawn(process.execPath, [gatePath], {
    env: { ...process.env, PREVIEW_GATE_USER: 'penguji', PREVIEW_GATE_PASSWORD: 'pendek', PREVIEW_GATE_ROUTES: '4893=4894' },
    stdio: ['ignore', 'ignore', 'pipe']
  });
  const code = await new Promise(resolve => gate.once('exit', resolve));
  assert.notEqual(code, 0);
});
