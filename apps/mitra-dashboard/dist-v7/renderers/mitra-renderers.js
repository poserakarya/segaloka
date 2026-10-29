(function () {
  'use strict';

  const ui = window.SegalokaMitraUI;

  if (!ui) {
    throw new Error('[Mitra Renderers] SegalokaMitraUI belum tersedia.');
  }

  function page(title, description, path) {
    return [
      '<div class="page">',
      ui.pageHead({
        title: ui.esc(title),
        desc: ui.esc(description)
      }),
      ui.panel(
        '<div class="muted">Dashboard Mitra Travel sudah terpisah. ' +
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
      page('Beranda','Ringkasan Mitra Travel.','/p/mitra'),

    packages: () =>
      page('Paket & Daftar Jamaah','Paket dan pendaftaran jamaah.','/p/mitra/packages'),

    bookings: () =>
      page('Booking','Booking Mitra Travel.','/p/mitra/bookings'),

    agents: () =>
      page('Agen saya','Agen yang berada di bawah Mitra Travel.','/p/mitra/agen'),

    commission: () =>
      page('Komisi','Komisi Mitra Travel.','/p/mitra/commission')
  });

  window.SegalokaMitraRenderers = Object.freeze({
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
          '[Mitra Renderers] Renderer tidak dikenal: ' + key
        );
      }

      return renderer(context || {});
    }
  });
})();
