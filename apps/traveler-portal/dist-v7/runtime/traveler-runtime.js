(function (global) {
  'use strict';

  // Infrastructure-only extraction from the V7 runtime boundary.
  // This module deliberately owns no business data and never selects a workspace.
  const ROUTES = [];
  const HANDLERS = Object.create(null);
  let renderPage = null;
  let currentRoute = '/p/traveler';

  function isTravelerRoute(path) {
    return typeof path === 'string' &&
      (path === '/p/traveler' || path.startsWith('/p/traveler/'));
  }

  function route(pattern, renderer) {
    if (typeof pattern !== 'string' || !isTravelerRoute(pattern)) {
      throw new Error('[Traveler Runtime] Route di luar boundary Traveler.');
    }
    if (typeof renderer !== 'function') {
      throw new TypeError('[Traveler Runtime] Renderer route harus berupa fungsi.');
    }

    const keys = [];
    const source = '^' + pattern.replace(/:(\w+)/g, function (_, key) {
      keys.push(key);
      return '([^/]+)';
    }) + '$';

    ROUTES.push({ pattern, keys, re: new RegExp(source), renderer });
  }

  function resolve(path) {
    if (!isTravelerRoute(path)) return null;

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
    if (typeof action !== 'string' || !/^(u|traveler)-[a-z0-9-]+$/.test(action)) {
      throw new Error('[Traveler Runtime] Handler bukan handler Traveler.');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('[Traveler Runtime] Handler harus berupa fungsi.');
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
      throw new TypeError('[Traveler Runtime] Lifecycle renderer harus berupa fungsi.');
    }
    renderPage = fn;
  }

  function navigate(path) {
    if (!isTravelerRoute(path)) {
      throw new Error('[Traveler Runtime] Navigasi di luar boundary Traveler.');
    }
    currentRoute = path;
    return rerender();
  }

  function rerender() {
    if (!renderPage) return null;
    const resolved = resolve(currentRoute);
    return renderPage({
      path: currentRoute,
      match: resolved,
      role: 'traveler'
    });
  }

  function helperUI() {
    return global.SegalokaTravelerUI || null;
  }

  global.SegalokaTravelerRuntimeBoundary = Object.freeze({
    role: 'traveler',
    mode: 'infrastructure-only',
    route,
    resolve,
    on,
    dispatch,
    setRenderer,
    navigate,
    rerender,
    helperUI,
    routes() {
      return ROUTES.map(entry => entry.pattern);
    },
    handlers() {
      return Object.keys(HANDLERS);
    }
  });
})(window);
