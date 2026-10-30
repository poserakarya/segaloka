import http from 'node:http';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
function servicePort(envName, fallback) {
  const value = Number(process.env[envName] || fallback);
  if (!Number.isInteger(value) || value < 1024 || value > 65535) {
    throw new Error(`INVALID_CONTROL_CENTER_PORT:${envName}`);
  }
  return value;
}
const bffPort = servicePort('SEGALOKA_BFF_PORT', 4203);
const frontendPort = servicePort('SEGALOKA_CONTROL_CENTER_PORT', 4202);
if (bffPort === frontendPort) {
  throw new Error('CONTROL_CENTER_PORT_COLLISION');
}

const services = [
  {
    name: 'BFF',
    port: bffPort,
    path: '/bff/health',
    entrypoint: 'bff.mjs',
    isHealthy: body => body?.status === 'ok'
  },
  {
    name: 'frontend',
    port: frontendPort,
    path: '/health',
    entrypoint: 'server.mjs',
    isHealthy: body =>
      body?.status === 'ok' &&
      body?.application === 'control-center'
  }
];
const children = new Set();
let stopping = false;

function probe(service) {
  return new Promise((resolve, reject) => {
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
          let body;

          try {
            body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          } catch {
            body = null;
          }

          resolve({
            occupied: true,
            healthy:
              response.statusCode === 200 &&
              service.isHealthy(body)
          });
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error(`Port ${service.port} probe timed out.`));
    });
    request.on('error', error => {
      if (error.code === 'ECONNREFUSED') {
        resolve({ occupied: false, healthy: false });
        return;
      }

      reject(error);
    });
  });
}

function startService(service) {
  const child = spawn(
    process.execPath,
    [join(appDir, service.entrypoint)],
    {
      cwd: appDir,
      stdio: 'inherit',
      windowsHide: true
    }
  );

  children.add(child);

  child.once('error', error => {
    console.error(`[Control Center] ${service.name} failed to start:`, error);
    stop(1);
  });

  child.once('close', (code, signal) => {
    children.delete(child);

    if (!stopping) {
      console.error(
        `[Control Center] ${service.name} stopped unexpectedly (${signal || code}).`
      );
      stop(code ?? 1);
    }

    if (stopping && children.size === 0) {
      process.exitCode = exitCode;
    }
  });

  return child;
}

let exitCode = 0;

function stop(code) {
  if (stopping) {
    return;
  }

  stopping = true;
  exitCode = code;

  for (const child of children) {
    if (child.pid) {
      child.kill();
    }
  }

  if (children.size === 0) {
    process.exitCode = exitCode;
  }
}

async function main() {
  const checks = await Promise.all(services.map(async service => ({
    service,
    result: await probe(service)
  })));

  for (const { service, result } of checks) {
    if (result.occupied && !result.healthy) {
      throw new Error(
        `Port ${service.port} is occupied by a service that is not ` +
        `Control Center ${service.name}; leaving the existing process untouched.`
      );
    }

    if (result.healthy) {
      console.log(
        `[Control Center] Reusing ${service.name} on 127.0.0.1:${service.port}.`
      );
    }
  }

  for (const { service, result } of checks) {
    if (!result.healthy) {
      startService(service);
    }
  }

  if (children.size === 0) {
    console.log('[Control Center] Frontend and BFF are already healthy.');
  }
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
main().catch(error => {
  console.error('[Control Center] Startup failed:', error);
  stop(1);
});
