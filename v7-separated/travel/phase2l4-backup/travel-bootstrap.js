(() => {
  'use strict';

  const Contracts = window.SegalokaTravelContracts;

  if (!Contracts) {
    throw new Error(
      'Segaloka Travel: runtime contracts tidak ditemukan.'
    );
  }

  const requiredContracts = [
    'app',
    'auth',
    'data',
    'services',
    'navigation'
  ];

  for (const name of requiredContracts) {
    if (!Contracts[name]) {
      throw new Error(
        `Segaloka Travel: contract "${name}" tidak tersedia.`
      );
    }
  }

  if (Contracts.app.app !== 'travel') {
    throw new Error(
      'Segaloka Travel: app contract bukan Travel.'
    );
  }

  if (Contracts.app.productionReady !== false) {
    throw new Error(
      'Segaloka Travel: production guard tidak valid.'
    );
  }

  if (Contracts.auth.requiredRole !== 'travel') {
    throw new Error(
      'Segaloka Travel: auth role contract tidak valid.'
    );
  }

  if (
    Contracts.data.duplicateBusinessData !== false ||
    Contracts.services.rules.travelMayDuplicate !== false
  ) {
    throw new Error(
      'Segaloka Travel: canonical data boundary tidak valid.'
    );
  }

  const navigation = Contracts.navigation.items;

  if (!Array.isArray(navigation) || navigation.length !== 9) {
    throw new Error(
      'Segaloka Travel: navigation contract tidak lengkap.'
    );
  }

  const state = {
    activeKey: 'home',
    sidebarOpen: false
  };

  const navRoot =
    document.getElementById('travel-navigation');

  const contentRoot =
    document.getElementById('travel-content');

  const pageTitle =
    document.getElementById('travel-page-title');

  const sidebarOpen =
    document.getElementById('travel-sidebar-open');

  const sidebarClose =
    document.getElementById('travel-sidebar-close');

  const overlay =
    document.getElementById('travel-sidebar-overlay');

  if (
    !navRoot ||
    !contentRoot ||
    !pageTitle ||
    !sidebarOpen ||
    !sidebarClose ||
    !overlay
  ) {
    throw new Error(
      'Segaloka Travel: shell DOM tidak lengkap.'
    );
  }

  const escapeHtml = value =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const iconText = item => {
    const map = {
      home: 'BR',
      packages: 'PK',
      bookings: 'BK',
      departures: 'KB',
      network: 'MA',
      vendors: 'VN',
      finance: 'KE',
      legal: 'LG',
      subscription: 'SB'
    };

    return map[item.key] || '•';
  };

  const setSidebar = open => {
    state.sidebarOpen = Boolean(open);

    document.body.classList.toggle(
      'travel-nav-open',
      state.sidebarOpen
    );

    overlay.hidden = !state.sidebarOpen;
  };

  const renderNavigation = () => {
    navRoot.innerHTML = navigation
      .map(item => {
        const current =
          item.key === state.activeKey
            ? ' aria-current="page"'
            : '';

        return `
          <button
            type="button"
            class="travel-nav-item"
            data-travel-route="${escapeHtml(item.key)}"
            ${current}
          >
            <span
              class="travel-nav-icon"
              aria-hidden="true"
            >
              ${escapeHtml(iconText(item))}
            </span>

            <span>${escapeHtml(item.label)}</span>
          </button>
        `;
      })
      .join('');
  };

  const renderContent = () => {
    const item =
      navigation.find(
        entry => entry.key === state.activeKey
      ) || navigation[0];

    pageTitle.textContent = item.label;

    contentRoot.innerHTML = `
      <section class="travel-shell-state">
        <header class="travel-shell-header">
          <div class="travel-shell-eyebrow">
            TRAVEL DASHBOARD
          </div>

          <h1>${escapeHtml(item.label)}</h1>

          <p>
            Shell Travel V7 sudah berjalan pada boundary aplikasi
            Travel yang terpisah. Konten bisnis halaman ini belum
            diaktifkan sampai data, auth, permission, dan shared
            services dipasang melalui contract yang benar.
          </p>
        </header>

        <div class="travel-shell-notice">
          <strong>
            UI shell aktif — business runtime belum aktif.
          </strong>

          <span>
            Legacy source:
            ${escapeHtml(item.legacyPath)}.
            Tidak ada data booking, pembayaran, tenant, pengguna,
            atau transaksi palsu yang dibuat pada Phase 2H.
          </span>
        </div>
      </section>
    `;
  };

  const activate = key => {
    if (!navigation.some(item => item.key === key)) {
      return;
    }

    state.activeKey = key;

    renderNavigation();
    renderContent();
    setSidebar(false);

    contentRoot.focus({
      preventScroll: true
    });
  };

  navRoot.addEventListener('click', event => {
    const button =
      event.target.closest('[data-travel-route]');

    if (!button) {
      return;
    }

    activate(button.dataset.travelRoute);
  });

  sidebarOpen.addEventListener(
    'click',
    () => setSidebar(true)
  );

  sidebarClose.addEventListener(
    'click',
    () => setSidebar(false)
  );

  overlay.addEventListener(
    'click',
    () => setSidebar(false)
  );

  window.addEventListener('keydown', event => {
    if (
      event.key === 'Escape' &&
      state.sidebarOpen
    ) {
      setSidebar(false);
    }
  });

  renderNavigation();
  renderContent();

  window.SegalokaTravelRuntime = Object.freeze({
    phase: '2H',
    mode: 'ui-shell',
    productionReady: false,
    role: 'travel',
    canonicalDataConnected: false,
    authenticationConnected: false,
    sharedServicesConnected: false
  });
})();