import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const loginHtml = await readFile(
  new URL('./public/index.html', import.meta.url),
  'utf8'
);
const inlineScript = loginHtml.match(/<script>([\s\S]*?)<\/script>/i)?.[1];

assert.ok(inlineScript, 'Control Center login script must exist.');
const compiledScript = new vm.Script(inlineScript);

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

function createHarness(responses) {
  const elements = new Map();
  const handlers = new Map();
  const redirects = [];
  const requests = [];

  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        id,
        value: '',
        textContent: '',
        classList: {
          toggle(name, force) {
            if (force) classes.add(name);
            else classes.delete(name);
          },
          contains: name => classes.has(name)
        },
        addEventListener(name, callback) {
          handlers.set(`${id}:${name}`, callback);
        }
      });
    }

    return elements.get(id);
  }

  const context = {
    document: {
      getElementById: element
    },
    fetch: async (path, options = {}) => {
      requests.push({ path, options });
      const result = responses.shift();

      if (!result) {
        throw new Error(`Unexpected request: ${path}`);
      }

      return result;
    },
    window: {
      location: {
        replace: path => redirects.push(path)
      }
    }
  };

  compiledScript.runInNewContext(context);

  return {
    elements,
    element,
    handlers,
    redirects,
    requests
  };
}

test('tanpa sesi, login ditampilkan dan akses dashboard tidak diteruskan', async () => {
  const harness = createHarness([
    response(401, { authenticated: false, code: 'AUTH_REQUIRED' })
  ]);

  await new Promise(resolve => setImmediate(resolve));

  assert.equal(harness.elements.get('login').classList.contains('hidden'), false);
  assert.deepEqual(harness.redirects, []);
  assert.deepEqual(harness.requests.map(request => request.path), [
    '/bff/dashboard/access'
  ]);
});

test('role selain super_admin tidak diarahkan ke dashboard V7', async () => {
  const harness = createHarness([
    response(200, {
      authenticated: true,
      workspaceSwitching: false,
      dashboards: [{
        dashboard: 'travel-dashboard',
        role: 'travel',
        organizationId: 'travel-1'
      }]
    })
  ]);

  await new Promise(resolve => setImmediate(resolve));

  assert.equal(harness.elements.get('login').classList.contains('hidden'), false);
  assert.deepEqual(harness.redirects, []);
});

test('login super_admin memeriksa akses lalu redirect ke /dashboard', async () => {
  const harness = createHarness([
    response(401, { authenticated: false, code: 'AUTH_REQUIRED' }),
    response(200, { authenticated: true }),
    response(200, {
      authenticated: true,
      workspaceSwitching: false,
      dashboards: [{
        dashboard: 'control-center',
        role: 'super_admin',
        organizationId: null
      }]
    })
  ]);

  await new Promise(resolve => setImmediate(resolve));
  harness.element('email').value = 'admin@example.test';
  harness.element('password').value = 'test-password';

  await harness.handlers.get('loginForm:submit')({
    preventDefault() {}
  });

  assert.deepEqual(harness.redirects, ['/dashboard']);
  assert.deepEqual(harness.requests.map(request => request.path), [
    '/bff/dashboard/access',
    '/bff/login',
    '/bff/dashboard/access'
  ]);
  assert.deepEqual(JSON.parse(harness.requests[1].options.body), {
    email: 'admin@example.test',
    password: 'test-password'
  });
  assert.equal(harness.element('password').value, '');
});

test('login role lain yang ditolak BFF tetap berada di halaman login', async () => {
  const harness = createHarness([
    response(401, { authenticated: false, code: 'AUTH_REQUIRED' }),
    response(403, {
      code: 'SUPER_ADMIN_ACCESS_REQUIRED',
      message: 'Akun tidak memiliki akses Control Center.'
    })
  ]);

  await new Promise(resolve => setImmediate(resolve));
  await harness.handlers.get('loginForm:submit')({
    preventDefault() {}
  });

  assert.deepEqual(harness.redirects, []);
  assert.equal(
    harness.elements.get('loginError').textContent,
    'Akun tidak memiliki akses Control Center.'
  );
  assert.deepEqual(harness.requests.map(request => request.path), [
    '/bff/dashboard/access',
    '/bff/login'
  ]);
});

test('server hanya menyajikan UI Control Center untuk role pusat yang eksplisit', async () => {
  const serverSource = await readFile(
    new URL('./server.mjs', import.meta.url),
    'utf8'
  );
  const bffSource = await readFile(
    new URL('./bff.mjs', import.meta.url),
    'utf8'
  );

  assert.match(serverSource, /data\.authenticated === true/);
  assert.match(serverSource, /data\.workspaceSwitching === false/);
  assert.match(serverSource, /item\.dashboard === 'control-center'/);
  assert.match(serverSource, /item\.role === 'super_admin'/);
  assert.match(serverSource, /item\.organizationId === null/);
  assert.match(serverSource, /join\(FRONTEND_DIR, 'control-center\.html'\)/);
  assert.match(
    bffSource,
    /function sessionCookie\(value, clear = false, path = '\/'\)/
  );
  assert.match(
    bffSource,
    /HttpOnly; SameSite=Strict; Path=\$\{path\}/
  );
  assert.match(bffSource, /sessionCookie\('', true, '\/bff'\)/);
  assert.match(
    bffSource,
    /sessionCookie\(\s*cookies\(req\)\.segaloka_control_center_session\s*\)/
  );
  assert.match(serverSource, /cookie: req\.headers\.cookie \|\| ''/);
  assert.match(serverSource, /const responseHeaders = \{ \.\.\.upstreamResponse\.headers \}/);
});
