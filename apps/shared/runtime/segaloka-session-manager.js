(function (global) {
  'use strict';

  function createSessionManager(options) {
    const config = options || {};
    const fetchImpl = config.fetchImpl || global.fetch;
    const apiBase = config.apiBase || '';
    let accessToken = null;
    let refreshToken = null;
    let session = null;
    let refreshPromise = null;

    if (typeof fetchImpl !== 'function') {
      throw new Error('[Segaloka Session] fetch implementation required.');
    }

    function endpoint(path) {
      if (!path.startsWith('/')) {
        throw new Error('[Segaloka Session] API path must be absolute.');
      }
      return apiBase + path;
    }

    function clear() {
      accessToken = null;
      refreshToken = null;
      session = null;
    }

    async function request(path, init) {
      return fetchImpl(endpoint(path), Object.assign({
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit'
      }, init || {}));
    }

    async function readJson(response) {
      try {
        return await response.json();
      } catch (_) {
        return null;
      }
    }

    function acceptSession(payload) {
      const next = payload && payload.session;
      if (!next || typeof next.accessToken !== 'string' ||
          typeof next.refreshToken !== 'string') {
        throw new Error('[Segaloka Session] Invalid session response.');
      }
      accessToken = next.accessToken;
      refreshToken = next.refreshToken;
      session = Object.freeze({ ...next });
      return session;
    }

    async function login(email, password) {
      const response = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      const payload = await readJson(response);
      if (!response.ok || !payload || payload.authenticated !== true) {
        clear();
        const error = new Error(payload && payload.code || 'AUTH_FAILED');
        error.status = response.status;
        throw error;
      }
      acceptSession(payload);
      return getMe();
    }

    async function refresh() {
      if (!refreshToken) return false;
      if (refreshPromise) return refreshPromise;

      refreshPromise = (async () => {
        const response = await request('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });
        const payload = await readJson(response);
        if (!response.ok || !payload || payload.authenticated !== true) {
          clear();
          return false;
        }
        acceptSession(payload);
        return true;
      })().finally(() => {
        refreshPromise = null;
      });

      return refreshPromise;
    }

    async function getMe(retry) {
      if (!accessToken) return null;
      const response = await request('/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken
        }
      });

      if (response.status === 401 && !retry && await refresh()) {
        return getMe(true);
      }
      if (response.status === 401 || response.status === 403) {
        clear();
        return null;
      }
      if (!response.ok) {
        const error = new Error('AUTH_ME_FAILED');
        error.status = response.status;
        throw error;
      }

      const payload = await readJson(response);
      if (!payload || payload.authenticated !== true) {
        clear();
        return null;
      }
      return payload;
    }

    function hasRole(mePayload, role) {
      return Boolean(mePayload && Array.isArray(mePayload.memberships) &&
        mePayload.memberships.some(item => item && item.role === role));
    }

    async function logout() {
      const token = refreshToken;
      clear();
      if (!token) return;
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: token })
      });
    }

    return Object.freeze({
      login,
      refresh,
      getMe,
      hasRole,
      logout,
      clear,
      status() {
        return Object.freeze({
          authenticated: accessToken !== null,
          hasRefresh: refreshToken !== null,
          session
        });
      }
    });
  }

  global.SegalokaSession = Object.freeze({ createSessionManager });
})(window);
