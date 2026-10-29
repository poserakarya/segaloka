(function () {
  'use strict';

  const ui = window.SegalokaTravelerUI;

  if (!ui) {
    throw new Error('[Traveler Renderers] SegalokaTravelerUI belum tersedia.');
  }

  function page(title, description, path) {
    return [
      '<div class="page">',
      ui.pageHead({
        title: ui.esc(title),
        desc: ui.esc(description)
      }),
      ui.panel(
        '<div class="muted">Dashboard Traveler sudah terpisah. ' +
        'Fungsi dan data operasional belum disambungkan pada tahap ini.</div>' +
        '<div style="margin-top:12px"><span class="chip mono">' +
        ui.esc(path) +
        '</span></div>'
      ),
      '</div>'
    ].join('');
  }

  const renderers = Object.freeze({
    home: () =>
      page('Beranda','Beranda dan pencarian perjalanan.','/p/traveler'),

    segadeals: () =>
      page('SegaDeals','Permintaan dan penawaran SegaDeals.','/p/traveler/segadeals'),

    bookings: () =>
      page('Booking Saya','Daftar booking perjalanan.','/p/traveler/bookings'),

    chat: () =>
      page('Chat','Percakapan terkait perjalanan.','/p/traveler/chat'),

    profile: () =>
      page('Profil','Profil dan data Traveler.','/p/traveler/profile')
  });

  window.SegalokaTravelerRenderers = Object.freeze({
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
          '[Traveler Renderers] Renderer tidak dikenal: ' + key
        );
      }

      return renderer(context || {});
    }
  });
})();
