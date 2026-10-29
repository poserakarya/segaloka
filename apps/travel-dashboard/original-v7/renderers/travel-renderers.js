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
    const cfg = context || {};
    const value = (key) =>
      cfg.stats && cfg.stats[key] != null ? cfg.stats[key] : '—';
    const empty = (title) =>
      '<div class="empty"><p>Belum ada data</p><span>Data akan tampil di sini setelah ada aktivitas pada modul ini.</span></div>';

    return [
      '<div class="page">',
      ui.pageHead({
        title: cfg.travelName || 'Beranda',
        description: 'Dashboard operasional tenant Travel — paket, booking, keberangkatan, dan keuangan Anda.'
      }),
      '<div class="grid c5">',
      ui.kpiRow([
        { icon: 'calendar', label: 'Booking aktif', value: value('activeBookings') },
        { icon: 'users', label: 'Jamaah terkonfirmasi', value: value('confirmedTravelers') },
        { icon: 'wallet', label: 'Pembayaran masuk', value: value('payments') },
        { icon: 'package', label: 'Paket published', value: value('publishedPackages') }
      ]),
      '</div>',
      '<div class="grid c5">',
      ui.panel('<div class="pnl-h"><b>Perlu Tindakan</b></div><div class="pnl-b">' + empty('Perlu Tindakan') + '</div>'),
      ui.panel('<div class="pnl-h"><b>Keberangkatan terdekat</b></div><div class="pnl-b">' + empty('Keberangkatan terdekat') + '</div>'),
      '</div>',
      ui.panel('<div class="pnl-h"><b>Booking terbaru</b></div><div class="pnl-b">' + empty('Booking terbaru') + '</div>'),
      '</div>'
    ].join('');
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
