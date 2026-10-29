import http from 'node:http';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));

const services = [
  {
    name: 'BFF',
    port: 4201,
    path: '/bff/health',
    entrypoint: resolve(appDir, 'server/bff.mjs'),
    healthy: body => body?.status === 'ok'
  },
  {
    name: 'frontend',
    port: 4200,
    path: '/',
    entrypoint: resolve(appDir, 'node_modules/vite/bin/vite.js'),
    args: ['--host', '127.0.0.1', '--port', '4200', '--strictPort'],
    healthy: (_, text) =>
      text.includes('<div id="root">') &&
      text.includes('/src/main.tsx')
  }
];

const children = new Set();
let stopping = false;
let exitCode = 0;

function probe(service) {
  return new Promise((resolveProbe, rejectProbe) => {
    const request = http.get(
      {
        hostname: '127.0.0.1',
        port: service.port,
        path: service.path,
        timeout: 1500
      },
      response => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let body;

          try {
            body = JSON.parse(text);
          } catch {
            body = null;
          }

          resolveProbe({
            occupied: true,
            healthy: response.statusCode === 200 &&
              service.healthy(body, text)
          });
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error(`Port ${service.port} probe timed out.`));
    });
    request.on('error', error => {
      if (error.code === 'ECONNREFUSED') {
        resolveProbe({ occupied: false, healthy: false });
      } else {
        rejectProbe(error);
      }
    });
  });
}

function stop(code) {
  if (stopping) return;
  stopping = true;
  exitCode = code;

  for (const child of children) {
    child.kill();
  }

  if (children.size === 0) {
    process.exitCode = exitCode;
  }
}

function start(service) {
  const args = service.args
    ? [service.entrypoint, ...service.args]
    : [service.entrypoint];
  const child = spawn(process.execPath, args, {
    cwd: appDir,
    stdio: 'inherit',
    windowsHide: true
  });

  children.add(child);
  child.once('error', error => {
    console.error(`[Travel] ${service.name} failed to start:`, error);
    stop(1);
  });
  child.once('close', (code, signal) => {
    children.delete(child);

    if (!stopping) {
      console.error(
        `[Travel] ${service.name} stopped unexpectedly (${signal || code}).`
      );
      stop(code ?? 1);
    }

    if (stopping && children.size === 0) {
      process.exitCode = exitCode;
    }
  });
}

async function main() {
  const checks = [];

  for (const service of services) {
    checks.push({
      service,
      result: await probe(service)
    });
  }

  for (const { service, result } of checks) {
    if (result.occupied && !result.healthy) {
      throw new Error(
        `Port ${service.port} is occupied by an unrecognized service; ` +
        'leaving the existing process untouched.'
      );
    }

    if (result.healthy) {
      console.log(
        `[Travel] Reusing ${service.name} on 127.0.0.1:${service.port}.`
      );
    } else {
      start(service);
    }
  }
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
main().catch(error => {
  console.error('[Travel] Startup failed:', error);
  stop(1);
});
