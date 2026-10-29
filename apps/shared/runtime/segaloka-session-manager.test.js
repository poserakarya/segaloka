const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync(
  'apps/shared/runtime/segaloka-session-manager.js',
  'utf8'
);
const context = { window: {}, Promise, Object, Error, Boolean, JSON };
vm.runInNewContext(source, context);

const access = 'a'.repeat(64);
const refresh = 'b'.repeat(64);
const calls = [];
let meCalls = 0;
let refreshCalls = 0;

async function fetchImpl(path, init) {
  calls.push({ path, init });
  if (path === '/auth/me') {
    meCalls += 1;
    if (meCalls === 1) return response(401, { authenticated: false });
    return response(200, {
      authenticated: true,
      user: { id: 'user-1', email: 'traveler@example.invalid' },
      memberships: [{ role: 'traveler', organizationId: null }]
    });
  }
  if (path === '/auth/refresh') {
    refreshCalls += 1;
    return response(200, {
      authenticated: true,
      session: { accessToken: 'c'.repeat(64), refreshToken: 'd'.repeat(64) }
    });
  }
  if (path === '/auth/logout') return response(200, { success: true });
  throw new Error('unexpected path');
}

function response(status, body) {
  return { status, ok: status >= 200 && status < 300, async json() { return body; } };
}

(async () => {
  const manager = context.window.SegalokaSession.createSessionManager({ fetchImpl });

  // Seed only the in-memory test harness; no request is sent to a real API.
  manager.clear();
  const internal = manager;
  assert.equal(internal.status().authenticated, false);

  // Exercise refresh/401 handling through a synthetic session response.
  await (async () => {
    const original = fetchImpl;
    const loginManager = context.window.SegalokaSession.createSessionManager({
      fetchImpl: async (path, init) => {
        if (path === '/auth/login') return response(200, {
          authenticated: true,
          session: { accessToken: access, refreshToken: refresh }
        });
        return original(path, init);
      }
    });
    await loginManager.login('traveler@example.invalid', 'unit-test-only');
    assert.equal(loginManager.hasRole(await loginManager.getMe(), 'traveler'), true);
    assert.equal(refreshCalls, 1);
    assert.equal(loginManager.status().hasRefresh, true);
    await loginManager.logout();
    assert.equal(loginManager.status().authenticated, false);
  })();

  const authHeaders = calls.find(call => call.path === '/auth/me').init.headers;
  assert.match(authHeaders.Authorization, /^Bearer [0-9a-f]{64}$/);
  assert.equal(Object.prototype.hasOwnProperty.call(globalThis, 'localStorage'), false);
  console.log('session-manager isolated tests: PASS');
})();
