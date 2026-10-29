import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { createRequire } from 'node:module';

const root = 'D:\\Server-Segaloka';
const apiDir = `${root}\\services\\api`;
const ingressDir = `${root}\\services\\ingress`;

const require = createRequire(`${apiDir}\\package.json`);
const { signIngressRequest } = await import(
  `file:///${apiDir.replaceAll('\\', '/')}/src/security/ingress-identity-v3.js`
);

const originSecret = randomBytes(32).toString('hex');
const identitySecret = randomBytes(32).toString('hex');
const children = [];

function start(file, cwd, extraEnv) {
  const child = spawn(process.execPath, [file], {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdio: 'ignore',
    windowsHide: true
  });

  children.push(child);
  return child;
}

function request(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method: options.method ?? 'GET',
      headers: options.headers ?? {},
      agent: false,
      timeout: 3000
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        body: Buffer.concat(chunks).toString()
      }));
    });

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('TIMEOUT')));
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function waitFor(port, path, expected, child) {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('CHILD_EXITED');

    try {
      const response = await request(port, path);
      if (response.status === expected) return;
    } catch {}

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`PORT_${port}_NOT_READY`);
}

try {
  const api = start(`${apiDir}\\src\\server.js`, apiDir, {
    API_HOST: '127.0.0.1',
    API_PORT: '4192',
    INGRESS_IDENTITY_SECRET: identitySecret
  });

  await waitFor(4192, '/health', 200, api);

  const ready = await request(4192, '/ready');
  assert.equal(ready.status, 200);
  console.log('PASS: API test dan PostgreSQL READY');

  const ingress = start(`${ingressDir}\\src\\server.mjs`, ingressDir, {
    INGRESS_PORT: '4193',
    INGRESS_TARGET: 'http://127.0.0.1:4192',
    ORIGIN_AUTH_SECRET: originSecret,
    INGRESS_IDENTITY_SECRET: identitySecret
  });

  await waitFor(4193, '/health', 403, ingress);

  const noSecret = await request(4193, '/auth/login', {
    method: 'POST'
  });
  assert.equal(noSecret.status, 403);
  console.log('PASS: Origin tanpa secret ditolak');

  const wrongSecret = await request(4193, '/auth/login', {
    method: 'POST',
    headers: {
      'x-segaloka-origin-auth': 'invalid',
      'cf-connecting-ip': '203.0.113.10'
    }
  });
  assert.equal(wrongSecret.status, 403);
  console.log('PASS: Origin secret salah ditolak');

  const validHeaders = {
    'x-segaloka-origin-auth': originSecret,
    'cf-connecting-ip': '203.0.113.10'
  };

  const valid = await request(4193, '/health', {
    headers: validHeaders
  });
  assert.equal(valid.status, 200);
  console.log('PASS: Origin sah diteruskan');

  const loginBody = Buffer.from('{}');

  const ingressPost = await request(4193, '/auth/login', {
    method: 'POST',
    body: loginBody,
    headers: {
      ...validHeaders,
      'content-type': 'application/json'
    }
  });

  assert.equal(ingressPost.status, 400);
  console.log('PASS: POST sah melewati ingress dan validasi API');

  const spoofed = await request(4193, '/auth/login', {
    method: 'POST',
    body: loginBody,
    headers: {
      ...validHeaders,
      'content-type': 'application/json',
      'x-forwarded-for': '198.51.100.99',
      'x-real-ip': '198.51.100.98',
      'x-segaloka-client-ip': '198.51.100.97',
      'x-segaloka-client-signature': 'forged'
    }
  });

  assert.equal(spoofed.status, 400);
  console.log('PASS: Header identitas palsu tidak merusak autentikasi');
  const direct = await request(4192, '/auth/login', {
    method: 'POST'
  });
  assert.equal(direct.status, 403);
  console.log('PASS: API langsung tanpa HMAC ditolak');

  const body = Buffer.from('{}');

  const signedHeaders = signIngressRequest(identitySecret, {
    ip: '203.0.113.10',
    method: 'POST',
    target: '/auth/login',
    body
  });

  const first = await request(4192, '/auth/login', {
    method: 'POST',
    body,
    headers: {
      ...signedHeaders,
      'content-type': 'application/json'
    }
  });

  assert.notEqual(first.status, 403);
  assert.notEqual(first.status, 503);
  console.log(`PASS: HMAC valid diterima (HTTP ${first.status})`);

  const replay = await request(4192, '/auth/login', {
    method: 'POST',
    body,
    headers: {
      ...signedHeaders,
      'content-type': 'application/json'
    }
  });

  assert.equal(replay.status, 403);
  console.log('PASS: Replay nonce ditolak PostgreSQL');

  // RATE_LIMIT_IP_VERIFIED_TEST
  const unique = randomBytes(12).toString('hex');
  const emailA = `ingress-a-${unique}@example.invalid`;
  const emailB = `ingress-b-${unique}@example.invalid`;

  async function loginThroughIngress(ip, email, extraHeaders = {}) {
    const payload = Buffer.from(JSON.stringify({
      email,
      password: 'InvalidTestPassword-2026!'
    }));

    return request(4193, '/auth/login', {
      method: 'POST',
      body: payload,
      headers: {
        'x-segaloka-origin-auth': originSecret,
        'cf-connecting-ip': ip,
        'content-type': 'application/json',
        ...extraHeaders
      }
    });
  }

  const statusesA = [];

  for (let i = 0; i < 6; i++) {
    const response = await loginThroughIngress(
      '203.0.113.10',
      emailA
    );
    statusesA.push(response.status);
  }

  assert.deepEqual(
    statusesA,
    [401, 401, 401, 401, 401, 429]
  );
  console.log('PASS: Email A dibatasi setelah lima kegagalan');

  const visitorB = await loginThroughIngress(
    '203.0.113.20',
    emailB
  );

  assert.equal(visitorB.status, 401);
  console.log('PASS: IP B dan email B tidak ikut terblokir');

  const spoofedVisitor = await loginThroughIngress(
    '203.0.113.10',
    emailA,
    {
      'x-forwarded-for': '198.51.100.30',
      'x-real-ip': '198.51.100.40'
    }
  );

  assert.equal(spoofedVisitor.status, 429);
  console.log('PASS: Header IP palsu tidak melewati pembatasan email');

  const ipLimit = '203.0.113.50';
  const ipStatuses = [];

  for (let i = 0; i < 21; i++) {
    const uniqueEmail = `ip-limit-${unique}-${i}@example.invalid`;
    const response = await loginThroughIngress(
      ipLimit,
      uniqueEmail
    );
    ipStatuses.push(response.status);
  }

  assert.deepEqual(
    ipStatuses,
    [...Array(20).fill(401), 429]
  );
  console.log('PASS: IP dibatasi setelah 20 kegagalan lintas email');

  const spoofedIpLimit = await loginThroughIngress(
    ipLimit,
    `ip-spoof-${unique}@example.invalid`,
    {
      'x-forwarded-for': '198.51.100.60',
      'x-real-ip': '198.51.100.70'
    }
  );

  assert.equal(spoofedIpLimit.status, 429);
  console.log('PASS: Header IP palsu tidak melewati pembatasan IP');

  const independentIp = await loginThroughIngress(
    '203.0.113.60',
    `independent-${unique}@example.invalid`
  );

  assert.equal(independentIp.status, 401);
  console.log('PASS: IP lain tetap independen');
  console.log('TAHAP 14.28R: LULUS');
} finally {
  for (const child of children.reverse()) {
    if (child.exitCode === null) child.kill();
  }
}