(function () {
  'use strict';

  const contracts = window.SegalokaTravelContracts;
  const ui = window.SegalokaTravelUI;
  const rendererRuntime = window.SegalokaTravelRenderers;

  if (!contracts) {
    throw new Error(
      '[Travel Bootstrap] SegalokaTravelContracts tidak tersedia.'
    );
  }

  if (!ui) {
    throw new Error(
      '[Travel Bootstrap] SegalokaTravelUI tidak tersedia.'
    );
  }

  if (!rendererRuntime) {
    throw new Error(
      '[Travel Bootstrap] SegalokaTravelRenderers tidak tersedia.'
    );
  }

  const requiredContracts = [
    'app',
    'auth',
    'data',
    'services',
    'navigation'
  ];

  for (const key of requiredContracts) {
    if (!contracts[key]) {
      throw new Error(
        `[Travel Bootstrap] Contract tidak tersedia: ${key}`
      );
    }
  }

  if (contracts.app.role !== 'travel') {
    throw new Error(
      '[Travel Bootstrap] App contract bukan role Travel.'
    );
  }

  if (contracts.app.productionReady !== false) {
    throw new Error(
      '[Travel Bootstrap] Foundation tidak boleh productionReady.'
    );
  }

  if (rendererRuntime.productionReady !== false) {
    throw new Error(
      '[Travel Bootstrap] Renderer tidak boleh productionReady.'
    );
  }

  if (rendererRuntime.canonicalDataConnected !== false) {
    throw new Error(
      '[Travel Bootstrap] Canonical data belum boleh aktif.'
    );
  }

  if (rendererRuntime.authenticationConnected !== false) {
    throw new Error(
      '[Travel Bootstrap] Authentication belum boleh aktif.'
    );
  }

  if (rendererRuntime.tenantConnected !== false) {
    throw new Error(
      '[Travel Bootstrap] Tenant belum boleh aktif.'
    );
  }

  if (rendererRuntime.permissionConnected !== false) {
    throw new Error(
      '[Travel Bootstrap] Permission belum boleh aktif.'
    );
  }

  if (rendererRuntime.sharedServicesConnected !== false) {
    throw new Error(
      '[Travel Bootstrap] Shared services belum boleh aktif.'
    );
  }

  const navigation =
    contracts.navigation.items ||
    contracts.navigation.navigation ||
    contracts.navigation.menu ||
    [];

  if (!Array.isArray(navigation)) {
    throw new Error(
      '[Travel Bootstrap] Navigation contract bukan array.'
    );
  }

  if (navigation.length !== 9) {
    throw new Error(
      `[Travel Bootstrap] Expected 9 menu, actual ${navigation.length}.`
    );
  }

  const expectedKeys = [
    'home',
    'packages',
    'bookings',
    'departures',
    'network',
    'vendors',
    'finance',
    'legal',
    'subscription'
  ];

  for (const key of expectedKeys) {
    if (!rendererRuntime.renderers[key]) {
      throw new Error(
        `[Travel Bootstrap] Renderer tidak tersedia: ${key}`
      );
    }
  }

  const state = {
    activeKey: 'home'
  };

  function iconName(key) {
    const map = {
      home: 'home',
      packages: 'package',
      bookings: 'calendar',
      departures: 'plane',
      network: 'users',
      vendors: 'building',
      finance: 'wallet',
      legal: 'shieldc',
      subscription: 'credit'
    };

    return map[key] || 'circle';
  }

  function getWorkElement() {
    return document.getElementById('travel-content');
  }

  function getSideElement() {
    return document.getElementById('travel-navigation');
  }

  function normalizeNavigationItem(item, index) {
    const key =
      item.key ||
      expectedKeys[index];

    return {
      key,
      label:
        item.label ||
        key,
      legacyPath:
        item.legacyPath ||
        ''
    };
  }

  const normalizedNavigation =
    navigation.map(normalizeNavigationItem);

  function renderNavigation() {
    const side = getSideElement();

    if (!side) {
      throw new Error(
        '[Travel Bootstrap] Container navigasi tidak ditemukan.'
      );
    }

    side.innerHTML = normalizedNavigation
      .map((item) => {
        const active =
          item.key === state.activeKey
            ? ' active'
            : '';

        return [
          '<button',
          ' type="button"',
          ` class="nav-item${active}"`,
          ` data-travel-route="${ui.esc(item.key)}"`,
          '>',
          ui.icon(iconName(item.key)),
          '<span>',
          ui.esc(item.label),
          '</span>',
          '</button>'
        ].join('');
      })
      .join('');
  }

  function renderPage() {
    const work = getWorkElement();

    if (!work) {
      throw new Error(
        '[Travel Bootstrap] Container work tidak ditemukan.'
      );
    }

    const item =
      normalizedNavigation.find(
        (entry) => entry.key === state.activeKey
      );

    if (!item) {
      throw new Error(
        `[Travel Bootstrap] Menu tidak ditemukan: ${state.activeKey}`
      );
    }

    work.innerHTML = rendererRuntime.render(
      item.key,
      {
        legacyPath: item.legacyPath
      }
    );
  }

  function render() {
    renderNavigation();
    renderPage();
  }

  function navigate(key) {
    if (!expectedKeys.includes(key)) {
      throw new Error(
        `[Travel Bootstrap] Route key tidak dikenal: ${key}`
      );
    }

    state.activeKey = key;
    render();
  }

  document.addEventListener(
    'click',
    (event) => {
      const target =
        event.target.closest('[data-travel-route]');

      if (!target) {
        return;
      }

      event.preventDefault();

      navigate(
        target.getAttribute('data-travel-route')
      );
    }
  );

  render();

  window.SegalokaTravelRuntime = Object.freeze({
    phase: '2L.5',
    mode: 'presentation-router',
    productionReady: false,
    role: 'travel',

    canonicalDataConnected: false,
    authenticationConnected: false,
    tenantConnected: false,
    permissionConnected: false,
    sharedServicesConnected: false,

    navigation: Object.freeze(
      normalizedNavigation.map(
        (item) => Object.freeze({
          ...item
        })
      )
    ),

    navigate
  });
})();