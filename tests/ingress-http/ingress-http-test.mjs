import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import http from 'node:http';

const ROOT = 'D:\\Server-Segaloka';
const PORT = 4191;
const ORIGIN = `http://127.0.0.1:${PORT}`;

const originSecret = randomBytes(32).toString('hex');
const identitySecret = randomBytes(32).toString('hex');

const originAuth = originSecret;

const child = spawn(
  process.execPath,
  [`${ROOT}\\services\\ingress\\src\\server.mjs`],
  {
    cwd: ROOT,
    env: {
      ...process.env,
      ORIGIN_AUTH_SECRET: originSecret,
      INGRESS_IDENTITY_SECRET: identitySecret
    },
    stdio: 'ignore',
    windowsHide: true
  }
);

function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `${ORIGIN}${path}`,
      { method, headers, timeout: 3000, agent: false },
      res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({
          status: res.statusCode,
          body: Buffer.concat(chunks).toString()
        }));
      }
    );

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('TIMEOUT')));

    if (body !== null) req.write(body);
    req.end();
  });
}

async function waitUntilReady() {
  for (let i = 0; i < 40; i++) {
    if (child.exitCode !== null) {
      throw new Error('INGRESS_EXITED');
    }

    try {
      const result = await request('GET', '/health');
      if (result.status === 403) return;
    } catch {}

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('INGRESS_NOT_READY');
}

const authorized = {
  'x-segaloka-origin-auth': originAuth,
  'cf-connecting-ip': '203.0.113.10'
};

try {
  await waitUntilReady();

  const unsigned = await request('GET', '/health');
  assert.equal(unsigned.status, 403);
  console.log('PASS: Permintaan tanpa autentikasi ditolak');

  const invalid = await request('GET', '/health', {
    ...authorized,
    'x-segaloka-origin-auth': 'invalid'
  });
  assert.equal(invalid.status, 403);
  console.log('PASS: Autentikasi origin salah ditolak');

  const valid = await request('GET', '/health', authorized);
  assert.equal(valid.status, 200);
  console.log('PASS: GET tanpa body diteruskan');

  const body = Buffer.from('unexpected-body');
  const withBody = await request('GET', '/health', {
    ...authorized,
    'content-length': String(body.length)
  }, body);

  assert.equal(withBody.status, 400);
  assert.match(withBody.body, /BODY_NOT_ALLOWED/);
  console.log('PASS: GET dengan body ditolak');

  const ready = await request('GET', '/ready', authorized);
  assert.equal(ready.status, 200);
  console.log('PASS: Endpoint ready diteruskan');

  const head = await request('HEAD', '/health', authorized);
  assert.equal(head.status, 200);
  console.log('PASS: HEAD tanpa body diteruskan');

  const headBody = Buffer.from('unexpected-body');
  const headWithBody = await request('HEAD', '/health', {
    ...authorized,
    'content-length': String(headBody.length)
  }, headBody);

  assert.equal(headWithBody.status, 400);
  console.log('PASS: HEAD dengan body ditolak');

  const loginBody = JSON.stringify({
    email: 'ingress-test@example.invalid',
    password: 'InvalidTestPassword123!'
  });

  const login = await request('POST', '/auth/login', {
    ...authorized,
    'content-type': 'application/json',
    'content-length': String(Buffer.byteLength(loginBody))
  }, loginBody);

  assert.notEqual(login.status, 502);
  assert.notEqual(login.status, 403);
  console.log(`PASS: POST mencapai backend (HTTP ${login.status})`);

  console.log('TAHAP 14.28F: PENGUJIAN HTTP TAMBAHAN LULUS');
} finally {
  child.kill();
}