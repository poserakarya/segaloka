import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const apps = [
  ['vendor-dashboard', 4210, 4211, 'vendor.html'],
  ['affiliate-dashboard', 4220, 4221, 'affiliate.html'],
  ['agen-dashboard', 4230, 4231, 'agen.html'],
  ['mitra-dashboard', 4240, 4241, 'mitra.html'],
  ['traveler-portal', 4250, 4251, 'traveler.html']
];
const children = new Set();
for (const [name, frontendPort, bffPort, entry] of apps) {
  const app = resolve(root, 'apps', name);
  const bff = spawn(process.execPath, [resolve(app, 'server/bff.mjs')], { cwd: app, stdio: 'inherit', windowsHide: true });
  const frontend = spawn(process.execPath, [resolve(root, 'scripts/v7-static-server.mjs'), resolve(app, 'original-v7'), String(frontendPort), entry], { cwd: root, stdio: 'inherit', windowsHide: true });
  children.add(bff); children.add(frontend);
}
function stop(code = 0) { for (const child of children) child.kill(); process.exitCode = code; }
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
for (const child of children) child.on('exit', code => { if (code && !process.exitCode) stop(code); });
