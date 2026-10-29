(function (global) {
  'use strict';

  // Infrastructure-only Vendor boundary. It owns no business data and does
  // not load or adapt the legacy combined runtime.
  const ROUTES = [];
  const HANDLERS = Object.create(null);
  const ALLOWED_ROUTES = new Set([
    '/p/vendor',
    '/p/vendor/products',
    '/p/vendor/orders',
    '/p/vendor/finance',
    '/p/vendor/documents'
  ]);
  let renderPage = null;
  let currentRoute = '/p/vendor';

  function isVendorRoute(path) {
    return typeof path === 'string' &&
      (path === '/p/vendor' || path.startsWith('/p/vendor/'));
  }

  function route(pattern, renderer) {
    if (typeof pattern !== 'string' || !ALLOWED_ROUTES.has(pattern)) {
      throw new Error('[Vendor Runtime] Route di luar boundary Vendor.');
    }
    if (typeof renderer !== 'function') {
      throw new TypeError('[Vendor Runtime] Renderer route harus berupa fungsi.');
    }
    const keys = [];
    const source = '^' + pattern.replace(/:(\w+)/g, function (_, key) {
      keys.push(key);
      return '([^/]+)';
    }) + '$';
    ROUTES.push({ pattern, keys, re: new RegExp(source), renderer });
  }

  function resolve(path) {
    if (!isVendorRoute(path)) return null;
    for (let i = ROUTES.length - 1; i >= 0; i -= 1) {
      const entry = ROUTES[i];
      const match = path.match(entry.re);
      if (!match) continue;
      const params = {};
      entry.keys.forEach((key, index) => {
        params[key] = decodeURIComponent(match[index + 1]);
      });
      return { pattern: entry.pattern, params, renderer: entry.renderer };
    }
    return null;
  }

  function on(action, handler) {
    if (typeof action !== 'string' || !/^vendor-[a-z0-9-]+$/.test(action)) {
      throw new Error('[Vendor Runtime] Handler bukan handler Vendor.');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('[Vendor Runtime] Handler harus berupa fungsi.');
    }
    HANDLERS[action] = handler;
  }

  function dispatch(action, element) {
    const handler = HANDLERS[action];
    if (!handler) return false;
    handler(element);
    return true;
  }

  function setRenderer(fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('[Vendor Runtime] Lifecycle renderer harus berupa fungsi.');
    }
    renderPage = fn;
  }

  function navigate(path) {
    if (!isVendorRoute(path) || !resolve(path)) {
      throw new Error('[Vendor Runtime] Navigasi di luar boundary Vendor.');
    }
    currentRoute = path;
    return rerender();
  }

  function rerender() {
    if (!renderPage) return null;
    return renderPage({
      path: currentRoute,
      match: resolve(currentRoute),
      role: 'vendor'
    });
  }

  global.SegalokaVendorRuntimeBoundary = Object.freeze({
    role: 'vendor',
    mode: 'infrastructure-only',
    route,
    resolve,
    on,
    dispatch,
    setRenderer,
    navigate,
    rerender,
    routes() { return ROUTES.map(entry => entry.pattern); },
    handlers() { return Object.keys(HANDLERS); }
  });
})(window);
