(function () {
  'use strict';

  const contracts = window.SegalokaAffiliateContracts;
  const ui = window.SegalokaAffiliateUI;
  const rendererRuntime = window.SegalokaAffiliateRenderers;

  if (!contracts) {
    throw new Error(
      '[Affiliate Bootstrap] SegalokaAffiliateContracts tidak tersedia.'
    );
  }

  if (!ui) {
    throw new Error(
      '[Affiliate Bootstrap] SegalokaAffiliateUI tidak tersedia.'
    );
  }

  if (!rendererRuntime) {
    throw new Error(
      '[Affiliate Bootstrap] SegalokaAffiliateRenderers tidak tersedia.'
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
        `[Affiliate Bootstrap] Contract tidak tersedia: ${key}`
      );
    }
  }

  if (contracts.app.role !== 'affiliate') {
    throw new Error(
      '[Affiliate Bootstrap] App contract bukan role Affiliate.'
    );
  }

  if (contracts.app.productionReady !== false) {
    throw new Error(
      '[Affiliate Bootstrap] Foundation tidak boleh productionReady.'
    );
  }

  if (rendererRuntime.productionReady !== false) {
    throw new Error(
      '[Affiliate Bootstrap] Renderer tidak boleh productionReady.'
    );
  }

  if (rendererRuntime.canonicalDataConnected !== false) {
    throw new Error(
      '[Affiliate Bootstrap] Canonical data belum boleh aktif.'
    );
  }

  if (rendererRuntime.authenticationConnected !== false) {
    throw new Error(
      '[Affiliate Bootstrap] Authentication belum boleh aktif.'
    );
  }

  if (rendererRuntime.tenantConnected !== false) {
    throw new Error(
      '[Affiliate Bootstrap] Tenant belum boleh aktif.'
    );
  }

  if (rendererRuntime.permissionConnected !== false) {
    throw new Error(
      '[Affiliate Bootstrap] Permission belum boleh aktif.'
    );
  }

  if (rendererRuntime.sharedServicesConnected !== false) {
    throw new Error(
      '[Affiliate Bootstrap] Shared services belum boleh aktif.'
    );
  }

  const navigation =
    contracts.navigation.items ||
    contracts.navigation.navigation ||
    contracts.navigation.menu ||
    [];

  if (!Array.isArray(navigation)) {
    throw new Error(
      '[Affiliate Bootstrap] Navigation contract bukan array.'
    );
  }

  if (navigation.length !== 4) {
    throw new Error(
      `[Affiliate Bootstrap] Expected 4 menu, actual ${navigation.length}.`
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
        `[Affiliate Bootstrap] Renderer tidak tersedia: ${key}`
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
    return document.getElementById('affiliate-content');
  }

  function getSideElement() {
    return document.getElementById('affiliate-navigation');
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
        '[Affiliate Bootstrap] Container navigasi tidak ditemukan.'
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
          ` data-affiliate-route="${ui.esc(item.key)}"`,
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
        '[Affiliate Bootstrap] Container work tidak ditemukan.'
      );
    }

    const item =
      normalizedNavigation.find(
        (entry) => entry.key === state.activeKey
      );

    if (!item) {
      throw new Error(
        `[Affiliate Bootstrap] Menu tidak ditemukan: ${state.activeKey}`
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
        `[Affiliate Bootstrap] Route key tidak dikenal: ${key}`
      );
    }

    state.activeKey = key;
    render();
  }

  document.addEventListener(
    'click',
    (event) => {
      const target =
        event.target.closest('[data-affiliate-route]');

      if (!target) {
        return;
      }

      event.preventDefault();

      navigate(
        target.getAttribute('data-affiliate-route')
      );
    }
  );

  render();

  window.SegalokaAffiliateRuntime = Object.freeze({
    phase: '2L.5',
    mode: 'presentation-router',
    productionReady: false,
    role: 'affiliate',

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