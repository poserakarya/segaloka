import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('Travel demo writer is absent from API and BFF', () => {
  const api = read('services/api/src/control-center/travel-demo-routes.js');
  const bff = read('apps/control-center/bff.mjs');
  assert.doesNotMatch(api, /app\.post\(['"]\/control-center\/test-data\/travel-demo/);
  assert.doesNotMatch(bff, /\/bff\/control-center\/test-data\/travel-demo/);
  assert.doesNotMatch(api, /INSERT INTO public\.test_data_batches/i);
});

test('Travel branch operations do not require test-data tables', () => {
  const api = read('services/api/src/control-center/travel-demo-routes.js');
  assert.doesNotMatch(api, /test_data_batches|test_data_records|hasTestDataOrganizationColumn/);
  assert.match(api, /table_name = 'travel_branches'/);
});

test('Handoff remains fail-closed until browser binding is verified', () => {
  const route = read('services/api/src/auth/dashboard-handoff-route.js');
  assert.match(route, /HANDOFF_CHALLENGE_NOT_READY/);
  assert.match(route, /return reply\.code\(503\)/);
});

test('Production BFF requires managed secrets and HTTPS upstream', () => {
  const bff = read('apps/control-center/bff.mjs');
  assert.match(bff, /process\.env\.INGRESS_IDENTITY_SECRET/);
  assert.match(bff, /process\.env\.BFF_SESSION_ENCRYPTION_KEY/);
  assert.match(bff, /API_ORIGIN_MUST_USE_HTTPS/);
});

test('Production PostgreSQL and session credentials fail closed', () => {
  const bff = read('apps/control-center/bff.mjs');
  assert.match(bff, /CONTROL_CENTER_DB_TLS_REQUIRED/);
  assert.match(bff, /CONTROL_CENTER_DB_CONFIGURATION_REQUIRED/);
  assert.match(bff, /CONTROL_CENTER_SESSION_KEY_REQUIRED/);
});

test('Control Center API transport supports HTTPS', () => {
  const bff = read('apps/control-center/bff.mjs');
  assert.match(bff, /import https from 'node:https'/);
  assert.match(bff, /url\.protocol === 'https:' \? https : http/);
});

test('Control Center rejects invalid database connection settings', () => {
  const bff = read('apps/control-center/bff.mjs');
  assert.match(bff, /CONTROL_CENTER_DB_PORT_INVALID/);
  assert.match(bff, /CONTROL_CENTER_DB_SSL_INVALID/);
  assert.match(bff, /Number\.isInteger\(dbPort\)/);
});

test('Control Center browser origin is configured for production HTTPS', () => {
  const server = read('apps/control-center/server.mjs');
  assert.match(server, /CONTROL_CENTER_PUBLIC_ORIGIN/);
  assert.match(server, /PUBLIC_ORIGIN_NOT_CONFIGURED/);
  assert.match(server, /origin !== expectedOrigin/);
});

test('Control Center supervisor uses validated configured service ports', () => {
  const start = read('apps/control-center/start.mjs');
  assert.match(start, /servicePort\('SEGALOKA_BFF_PORT', 4203\)/);
  assert.match(start, /servicePort\('SEGALOKA_CONTROL_CENTER_PORT', 4202\)/);
  assert.match(start, /CONTROL_CENTER_PORT_COLLISION/);
});

test('API recognizes existing Control Center production origin', () => {
  const server = read('services/api/src/server.js');
  assert.match(server, /'https:\/\/admin\.segaloka\.com'/);
});

test('Control Center frontend and BFF share configured port', () => {
  const server = read('apps/control-center/server.mjs');
  assert.match(server, /SEGALOKA_BFF_PORT/);
  assert.doesNotMatch(server, /SEGALOKA_CONTROL_CENTER_BFF_PORT/);
});

test('API requires explicit production bind host and valid port', () => {
  const server = read('services/api/src/server.js');
  assert.match(server, /API_HOST_REQUIRED_IN_PRODUCTION/);
  assert.match(server, /INVALID_API_PORT/);
});

test('API production database credentials and TLS fail closed', () => {
  const server = read('services/api/src/server.js');
  assert.match(server, /API_DATABASE_CONFIG_MISSING/);
  assert.match(server, /API_DATABASE_TLS_REQUIRED/);
  assert.match(server, /API_DATABASE_PORT_INVALID/);
});
