(function () {
  'use strict';

  // keeps its identity while the extracted shared layout receives its
  // compatible visual aliases.
  document.body.setAttribute('data-segaloka-app', 'travel');
  const syncLayoutState = () => {
    document.body.classList.toggle(
      'travel-nav-open',
      document.body.classList.contains('mitra-nav-open')
    );
  };
  new MutationObserver(syncLayoutState).observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });
  syncLayoutState();
  document.querySelectorAll('[class]').forEach((element) => {
    Array.from(element.classList).forEach((name) => {
      if (name.startsWith('mitra-')) {
        element.classList.add('travel-' + name.slice('mitra-'.length));
      }
    });
  });

  const contracts = window.SegalokaMitraContracts;
  const ui = window.SegalokaMitraUI;
  const rendererRuntime = window.SegalokaMitraRenderers;

  if (!contracts) {
    throw new Error(
      '[Mitra Bootstrap] SegalokaMitraContracts tidak tersedia.'
    );
  }

  if (!ui) {
    throw new Error(
      '[Mitra Bootstrap] SegalokaMitraUI tidak tersedia.'
    );
  }

  if (!rendererRuntime) {
    throw new Error(
      '[Mitra Bootstrap] SegalokaMitraRenderers tidak tersedia.'
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
        `[Mitra Bootstrap] Contract tidak tersedia: ${key}`
      );
    }
  }

  if (contracts.app.app !== 'mitra') {
    throw new Error(
      '[Mitra Bootstrap] App contract bukan role Mitra.'
    );
  }

  if (contracts.app.productionReady !== false) {
    throw new Error(
      '[Mitra Bootstrap] Foundation tidak boleh productionReady.'
    );
  }

  if (rendererRuntime.productionReady !== false) {
    throw new Error(
      '[Mitra Bootstrap] Renderer tidak boleh productionReady.'
    );
  }

  if (rendererRuntime.canonicalDataConnected !== false) {
    throw new Error(
      '[Mitra Bootstrap] Canonical data belum boleh aktif.'
    );
  }

  if (rendererRuntime.authenticationConnected !== false) {
    throw new Error(
      '[Mitra Bootstrap] Authentication belum boleh aktif.'
    );
  }

  if (rendererRuntime.tenantConnected !== false) {
    throw new Error(
      '[Mitra Bootstrap] Tenant belum boleh aktif.'
    );
  }

  if (rendererRuntime.permissionConnected !== false) {
    throw new Error(
      '[Mitra Bootstrap] Permission belum boleh aktif.'
    );
  }

  if (rendererRuntime.sharedServicesConnected !== false) {
    throw new Error(
      '[Mitra Bootstrap] Shared services belum boleh aktif.'
    );
  }

  const navigation =
    contracts.navigation.items ||
    contracts.navigation.navigation ||
    contracts.navigation.menu ||
    [];

  if (!Array.isArray(navigation)) {
    throw new Error(
      '[Mitra Bootstrap] Navigation contract bukan array.'
    );
  }

  if (navigation.length !== 5) {
    throw new Error(
      `[Mitra Bootstrap] Expected 5 menu, actual ${navigation.length}.`
    );
  }

  const expectedKeys = navigation.map(item => item.key);

  if (expectedKeys.some(key => typeof key !== 'string' || !key)) {
    throw new Error(
      '[Mitra Bootstrap] Navigation contract memiliki key tidak valid.'
    );
  }

  for (const key of expectedKeys) {
    if (!rendererRuntime.renderers[key]) {
      throw new Error(
        `[Mitra Bootstrap] Renderer tidak tersedia: ${key}`
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
    return document.getElementById('mitra-content');
  }

  function getSideElement() {
    return document.getElementById('mitra-navigation');
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
        '[Mitra Bootstrap] Container navigasi tidak ditemukan.'
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
          ` data-mitra-route="${ui.esc(item.key)}"`,
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
        '[Mitra Bootstrap] Container work tidak ditemukan.'
      );
    }

    const item =
      normalizedNavigation.find(
        (entry) => entry.key === state.activeKey
      );

    if (!item) {
      throw new Error(
        `[Mitra Bootstrap] Menu tidak ditemukan: ${state.activeKey}`
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
        `[Mitra Bootstrap] Route key tidak dikenal: ${key}`
      );
    }

    state.activeKey = key;
    render();
  }

  document.addEventListener(
    'click',
    (event) => {
      const target =
        event.target.closest('[data-mitra-route]');

      if (!target) {
        return;
      }

      event.preventDefault();

      navigate(
        target.getAttribute('data-mitra-route')
      );
    }
  );

  render();

  window.SegalokaMitraRuntime = Object.freeze({
    phase: '2L.5',
    mode: 'presentation-router',
    productionReady: false,
    role: 'mitra',

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
