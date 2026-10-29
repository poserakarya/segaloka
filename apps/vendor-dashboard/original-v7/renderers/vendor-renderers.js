(function () {
  'use strict';

  const ui = window.SegalokaVendorUI;

  if (!ui) {
    throw new Error('[Vendor Renderers] SegalokaVendorUI belum tersedia.');
  }

  function page(title, description, path) {
    return [
      '<div class="page">',
      ui.pageHead({
        title: ui.esc(title),
        desc: ui.esc(description)
      }),
      ui.panel(
        '<div class="muted">Dashboard Vendor sudah terpisah. ' +
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
      page('Beranda','Ringkasan operasional Vendor.','/p/vendor'),

    products: () =>
      page('Produk','Pengelolaan produk dan layanan Vendor.','/p/vendor/products'),

    orders: () =>
      page('Order','Pengelolaan order layanan dari Travel.','/p/vendor/orders'),

    finance: () =>
      page('Keuangan','Ringkasan keuangan dan pencairan Vendor.','/p/vendor/finance'),

    documents: () =>
      page('Dokumen','Dokumen dan verifikasi Vendor.','/p/vendor/documents')
  });

  window.SegalokaVendorRenderers = Object.freeze({
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
        throw new Error('[Vendor Renderers] Renderer tidak dikenal: ' + key);
      }
      return renderer(context || {});
    }
  });
})();
