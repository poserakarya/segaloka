(function () {
  'use strict';

  // keeps its identity while the extracted shared layout receives its
  // compatible visual aliases.
  document.body.setAttribute('data-segaloka-app', 'travel');
  const syncLayoutState = () => {
    document.body.classList.toggle(
      'travel-nav-open',
      document.body.classList.contains('traveler-nav-open')
    );
  };
  new MutationObserver(syncLayoutState).observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });
  syncLayoutState();
  document.querySelectorAll('[class]').forEach((element) => {
    Array.from(element.classList).forEach((name) => {
      if (name.startsWith('traveler-')) {
        element.classList.add('travel-' + name.slice('traveler-'.length));
      }
    });
  });

  const contracts = window.SegalokaTravelerContracts;
  const ui = window.SegalokaTravelerUI;
  const rendererRuntime = window.SegalokaTravelerRenderers;

  if (!contracts) {
    throw new Error(
      '[Traveler Bootstrap] SegalokaTravelerContracts tidak tersedia.'
    );
  }

  if (!ui) {
    throw new Error(
      '[Traveler Bootstrap] SegalokaTravelerUI tidak tersedia.'
    );
  }

  if (!rendererRuntime) {
    throw new Error(
      '[Traveler Bootstrap] SegalokaTravelerRenderers tidak tersedia.'
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
        `[Traveler Bootstrap] Contract tidak tersedia: ${key}`
      );
    }
  }

  if (contracts.app.app !== 'traveler') {
    throw new Error(
      '[Traveler Bootstrap] App contract bukan role Traveler.'
    );
  }

  if (contracts.app.productionReady !== false) {
    throw new Error(
      '[Traveler Bootstrap] Foundation tidak boleh productionReady.'
    );
  }

  if (rendererRuntime.productionReady !== false) {
    throw new Error(
      '[Traveler Bootstrap] Renderer tidak boleh productionReady.'
    );
  }

  if (rendererRuntime.canonicalDataConnected !== false) {
    throw new Error(
      '[Traveler Bootstrap] Canonical data belum boleh aktif.'
    );
  }

  if (rendererRuntime.authenticationConnected !== false) {
    throw new Error(
      '[Traveler Bootstrap] Authentication belum boleh aktif.'
    );
  }

  if (rendererRuntime.tenantConnected !== false) {
    throw new Error(
      '[Traveler Bootstrap] Tenant belum boleh aktif.'
    );
  }

  if (rendererRuntime.permissionConnected !== false) {
    throw new Error(
      '[Traveler Bootstrap] Permission belum boleh aktif.'
    );
  }

  if (rendererRuntime.sharedServicesConnected !== false) {
    throw new Error(
      '[Traveler Bootstrap] Shared services belum boleh aktif.'
    );
  }

  const navigation =
    contracts.navigation.items ||
    contracts.navigation.navigation ||
    contracts.navigation.menu ||
    [];

  if (!Array.isArray(navigation)) {
    throw new Error(
      '[Traveler Bootstrap] Navigation contract bukan array.'
    );
  }

  if (navigation.length !== 5) {
    throw new Error(
      `[Traveler Bootstrap] Expected 5 menu, actual ${navigation.length}.`
    );
  }

  const expectedKeys = navigation.map(item => item.key);

  if (expectedKeys.some(key => typeof key !== 'string' || !key)) {
    throw new Error(
      '[Traveler Bootstrap] Navigation contract memiliki key tidak valid.'
    );
  }

  for (const key of expectedKeys) {
    if (!rendererRuntime.renderers[key]) {
      throw new Error(
        `[Traveler Bootstrap] Renderer tidak tersedia: ${key}`
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
    return document.getElementById('traveler-content');
  }

  function getSideElement() {
    return document.getElementById('traveler-navigation');
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
        '[Traveler Bootstrap] Container navigasi tidak ditemukan.'
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
          ` data-traveler-route="${ui.esc(item.key)}"`,
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
        '[Traveler Bootstrap] Container work tidak ditemukan.'
      );
    }

    const item =
      normalizedNavigation.find(
        (entry) => entry.key === state.activeKey
      );

    if (!item) {
      throw new Error(
        `[Traveler Bootstrap] Menu tidak ditemukan: ${state.activeKey}`
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
        `[Traveler Bootstrap] Route key tidak dikenal: ${key}`
      );
    }

    state.activeKey = key;
    render();
  }

  document.addEventListener(
    'click',
    (event) => {
      const target =
        event.target.closest('[data-traveler-route]');

      if (!target) {
        return;
      }

      event.preventDefault();

      navigate(
        target.getAttribute('data-traveler-route')
      );
    }
  );

  render();

  window.SegalokaTravelerRuntime = Object.freeze({
    phase: '2L.5',
    mode: 'presentation-router',
    productionReady: false,
    role: 'traveler',

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
