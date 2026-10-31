// Audit statis port dan origin: setiap hostname staging menuju entry port
// dashboard yang benar, entry server meneruskan ke BFF dashboard itu sendiri,
// dan BFF hanya menerima Origin entry tersebut.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const EXPECTED = [
  { role: 'super_admin', host: 'control', upstream: 'control', entry: 4202, bff: 4203 },
  { role: 'travel', host: 'travel', upstream: 'travel', entry: 4200, bff: 4201 },
  { role: 'vendor', host: 'vendor', upstream: 'vendor', entry: 4204, bff: 4211, app: 'vendor-dashboard', server: 'server-v7.mjs' },
  { role: 'affiliate', host: 'affiliate', upstream: 'affiliate', entry: 4212, bff: 4221, app: 'affiliate-dashboard', server: 'server.mjs' },
  { role: 'agen', host: 'agen', upstream: 'agen', entry: 4216, bff: 4231, app: 'agen-dashboard', server: 'server.mjs' },
  { role: 'mitra', host: 'mitra', upstream: 'mitra', entry: 4214, bff: 4241, app: 'mitra-dashboard', server: 'server.mjs' },
  { role: 'traveler', host: 'traveler', upstream: 'traveler', entry: 4210, bff: 4251, app: 'traveler-portal', server: 'server.mjs' }
];

test('entry ports are unique and match the approved list', () => {
  const entries = EXPECTED.map(item => item.entry);
  const bffs = EXPECTED.map(item => item.bff);
  assert.equal(new Set(entries).size, entries.length);
  assert.equal(new Set([...entries, ...bffs]).size, entries.length + bffs.length);
});

test('nginx staging upstreams point each hostname to its own entry port', () => {
  const nginx = read('config/nginx/segaloka-staging.example.conf');
  for (const item of EXPECTED) {
    assert.match(
      nginx,
      new RegExp(`upstream segaloka_${item.upstream}_staging \\{ server 127\\.0\\.0\\.1:${item.entry}; \\}`),
      item.role
    );
    assert.match(
      nginx,
      new RegExp(`staging-${item.host}\\.segaloka\\.com\\s+-> segaloka_${item.upstream}_staging`),
      item.role
    );
  }
  assert.match(nginx, /upstream segaloka_api_staging \{ server 127\.0\.0\.1:4192; \}/);
});

test('portal entry servers proxy to their own BFF and BFFs accept only that entry origin', () => {
  for (const item of EXPECTED.filter(e => e.app)) {
    const entry = read(`apps/${item.app}/${item.server}`);
    const bff = read(`apps/${item.app}/server/bff.mjs`);
    const runtime = JSON.parse(read(`apps/${item.app}/v7-runtime.json`));

    assert.match(entry, new RegExp(`role(?: =|:) '${item.role}'`), item.role);
    assert.match(entry, new RegExp(`bffPort: ${item.bff}`), item.role);
    if (item.role !== 'vendor') assert.match(entry, new RegExp(`const port = ${item.entry};`), item.role);
    assert.equal(runtime.port, item.entry, item.role);
    assert.equal(runtime.bffPort, item.bff, item.role);

    assert.match(bff, new RegExp(`const port = ${item.bff};`), item.role);
    // Origin entry: literal http://127.0.0.1:<entry>, atau
    // allowedPublicOrigins(<entry>) (origin entry lokal + SEGALOKA_PUBLIC_ORIGIN).
    const origins = [
      ...[...bff.matchAll(/http:\/\/127\.0\.0\.1:(\d{4})/g)].map(m => Number(m[1])),
      ...[...bff.matchAll(/allowedPublicOrigins\((\d{4})\)/g)].map(m => Number(m[1]))
    ].filter(port => port !== 4192);
    assert.ok(bff.includes("process.env.API_ORIGIN || 'http://127.0.0.1:4192'"), item.role);
    assert.deepEqual([...new Set(origins)], [item.entry], `${item.role} BFF origins`);
  }
});

test('Control Center and Travel keep their entry/BFF pairing', () => {
  const control = read('apps/control-center/server.mjs');
  assert.match(control, /SEGALOKA_CONTROL_CENTER_PORT \|\| 4202/);
  assert.match(control, /SEGALOKA_CONTROL_CENTER_BFF_PORT \|\| 4203/);
  assert.match(read('apps/control-center/bff.mjs'), /SEGALOKA_BFF_PORT \|\| 4203/);

  const travelVite = read('apps/travel-dashboard/vite.config.ts');
  assert.match(travelVite, /port: 4200/);
  assert.match(travelVite, /'http:\/\/127\.0\.0\.1:4201'/);
  assert.ok(!travelVite.includes('D:/'));
  const travelBff = read('apps/travel-dashboard/server/bff.mjs');
  assert.match(travelBff, /BFF_PORT \|\| 4201/);
  assert.match(travelBff, /'http:\/\/127\.0\.0\.1:4200'/);
});

test('dashboard separation config matches the runtime', () => {
  const config = JSON.parse(read('config/dashboard-v7-separation.json'));
  for (const item of EXPECTED) {
    const entry = config.dashboards.find(d => d.role === item.role);
    assert.ok(entry, item.role);
    assert.equal(entry.port, item.entry, item.role);
    assert.equal(entry.bffPort, item.bff, item.role);
  }
});
