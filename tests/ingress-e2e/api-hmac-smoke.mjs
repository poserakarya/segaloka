import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import http from 'node:http';

const root = 'D:\\Server-Segaloka';
const apiDir = `${root}\\services\\api`;
const secret = randomBytes(32).toString('hex');

const child = spawn(
  process.execPath,
  [`${apiDir}\\src\\server.js`],
  {
    cwd: apiDir,
    env: {
      ...process.env,
      API_HOST: '127.0.0.1',
      API_PORT: '4192',
      INGRESS_IDENTITY_SECRET: secret
    },
    stdio: 'ignore',
    windowsHide: true
  }
);

function request(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:4192${path}`,
      { method, timeout: 3000, agent: false },
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
    req.end();
  });
}

async function waitReady() {
  for (let i = 0; i < 50; i++) {
    if (child.exitCode !== null) {
      throw new Error('TEST_API_EXITED');
    }

    try {
      const result = await request('/health');

      if (result.status === 200) return;
    } catch {}

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('TEST_API_NOT_READY');
}

try {
  await waitReady();

  const health = await request('/health');
  assert.equal(health.status, 200);
  console.log('PASS: API pengujian aktif pada port 4192');

  const ready = await request('/ready');
  assert.equal(ready.status, 200);
  console.log('PASS: PostgreSQL terhubung ke API pengujian');

  const unsigned = await request('/auth/login', 'POST');
  assert.equal(unsigned.status, 403);
  console.log('PASS: POST tanpa HMAC ditolak');

  const healthQuery = await request('/health?check=1');
  assert.equal(healthQuery.status, 403);
  console.log('PASS: URL health dengan query memerlukan HMAC');

  console.log('TAHAP 14.28P: SEMUA PENGUJIAN LULUS');
} finally {
  child.kill();
}