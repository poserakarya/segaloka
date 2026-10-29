(function () {
  'use strict';

  const ui = window.SegalokaTravelUI;

  if (!ui) {
    throw new Error(
      '[Travel Renderers] SegalokaTravelUI belum tersedia.'
    );
  }

  const requiredUi = [
    'esc',
    'l3',
    'number',
    'money',
    'date',
    'icon',
    'panel',
    'pageHead',
    'kpiRow',
    'table'
  ];

  for (const key of requiredUi) {
    if (typeof ui[key] !== 'function') {
      throw new Error(
        `[Travel Renderers] UI helper tidak tersedia: ${key}`
      );
    }
  }

  function unavailablePage(input) {
    const config = input || {};

    const title =
      config.title ||
      'Travel';

    const description =
      config.description ||
      'Data operasional belum disambungkan.';

    const legacyPath =
      config.legacyPath ||
      '';

    return [
      '<div class="page">',
      ui.pageHead({
        title: ui.esc(title),
        desc: ui.esc(description)
      }),
      ui.panel(
        [
          '<div class="muted">',
          'Boundary UI Travel sudah aktif. ',
          'Canonical data, autentikasi, tenant, permission, ',
          'payment dan mutation belum diaktifkan pada tahap ini.',
          '</div>',
          legacyPath
            ? [
                '<div style="margin-top:12px">',
                '<span class="chip mono">',
                ui.esc(legacyPath),
                '</span>',
                '</div>'
              ].join('')
            : ''
        ].join('')
      ),
      '</div>'
    ].join('');
  }

  function renderHome(context) {
    return unavailablePage({
      title: 'Beranda',
      description:
        'Dashboard operasional Travel.',
      legacyPath:
        context && context.legacyPath
          ? context.legacyPath
          : '/p/travel'
    });
  }

  function renderPackages(context) {
    return unavailablePage({
      title: 'Paket',
      description:
        'Pengelolaan paket Travel.',
      legacyPath:
        context && context.legacyPath
          ? context.legacyPath
          : '/p/travel/packages'
    });
  }

  function renderBookings(context) {
    return unavailablePage({
      title: 'Booking',
      description:
        'Pengelolaan booking Travel.',
      legacyPath:
        context && context.legacyPath
          ? context.legacyPath
          : '/p/travel/bookings'
    });
  }

  function renderDepartures(context) {
    return unavailablePage({
      title: 'Keberangkatan',
      description:
        'Operasional keberangkatan Travel.',
      legacyPath:
        context && context.legacyPath
          ? context.legacyPath
          : '/p/travel/departures'
    });
  }

  function renderNetwork(context) {
    return unavailablePage({
      title: 'Mitra & Agen',
      description:
        'Jaringan Mitra Travel dan Agen.',
      legacyPath:
        context && context.legacyPath
          ? context.legacyPath
          : '/p/travel/mitra'
    });
  }

  function renderVendors(context) {
    return unavailablePage({
      title: 'Layanan Vendor',
      description:
        'Pengadaan layanan Vendor untuk Travel.',
      legacyPath:
        context && context.legacyPath
          ? context.legacyPath
          : '/p/travel/vendors'
    });
  }

  function renderFinance(context) {
    return unavailablePage({
      title: 'Keuangan',
      description:
        'Ringkasan keuangan Travel.',
      legacyPath:
        context && context.legacyPath
          ? context.legacyPath
          : '/p/travel/finance'
    });
  }

  function renderLegal(context) {
    return unavailablePage({
      title: 'Legalitas',
      description:
        'Dokumen dan status legalitas Travel.',
      legacyPath:
        context && context.legacyPath
          ? context.legacyPath
          : '/p/travel/legal'
    });
  }

  function renderSubscription(context) {
    return unavailablePage({
      title: 'Subscription',
      description:
        'Status paket berlangganan Travel.',
      legacyPath:
        context && context.legacyPath
          ? context.legacyPath
          : '/p/travel/subscription'
    });
  }

  const renderers = Object.freeze({
    home: renderHome,
    packages: renderPackages,
    bookings: renderBookings,
    departures: renderDepartures,
    network: renderNetwork,
    vendors: renderVendors,
    finance: renderFinance,
    legal: renderLegal,
    subscription: renderSubscription
  });

  window.SegalokaTravelRenderers = Object.freeze({
    version: '2L.4',
    mode: 'presentation-only',
    productionReady: false,

    canonicalDataConnected: false,
    authenticationConnected: false,
    tenantConnected: false,
    permissionConnected: false,
    sharedServicesConnected: false,

    renderers,

    render(key, context) {
      const renderer = renderers[key];

      if (!renderer) {
        throw new Error(
          `[Travel Renderers] Renderer tidak dikenal: ${key}`
        );
      }

      return renderer(context || {});
    }
  });
})();