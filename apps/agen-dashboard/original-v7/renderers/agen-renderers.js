(function () {
  'use strict';

  const ui = window.SegalokaAgenUI;

  if (!ui) {
    throw new Error('[Agen Renderers] SegalokaAgenUI belum tersedia.');
  }

  function page(title, description, path) {
    return [
      '<div class="page">',
      ui.pageHead({
        title: ui.esc(title),
        desc: ui.esc(description)
      }),
      ui.panel(
        '<div class="muted">Dashboard Agen sudah terpisah. ' +
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
      page('Beranda','Ringkasan Agen.','/p/agen'),

    packages: () =>
      page('Paket & Daftar Jamaah','Paket dan pendaftaran jamaah.','/p/agen/packages'),

    bookings: () =>
      page('Booking','Booking Agen.','/p/agen/bookings'),

    commission: () =>
      page('Komisi','Komisi Agen.','/p/agen/commission')
  });

  window.SegalokaAgenRenderers = Object.freeze({
    version:'2L.4',
    mode:'presentation-only',
    productionReady:false,
    canonicalDataConnected:false,
    authenticationConnected:false,
    tenantConnected:false,
    permissionConnected:false,
    sharedServicesConnected:false,
    renderers,

    render(key, context) {
      const renderer=renderers[key];

      if(!renderer) {
        throw new Error(
          '[Agen Renderers] Renderer tidak dikenal: '+key
        );
      }

      return renderer(context || {});
    }
  });
})();
