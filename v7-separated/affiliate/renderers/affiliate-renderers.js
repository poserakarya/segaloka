(function () {
  'use strict';

  const ui = window.SegalokaAffiliateUI;

  if (!ui) {
    throw new Error('[Affiliate Renderers] SegalokaAffiliateUI belum tersedia.');
  }

  function page(title, description, path) {
    return [
      '<div class="page">',
      ui.pageHead({
        title: ui.esc(title),
        desc: ui.esc(description)
      }),
      ui.panel(
        '<div class="muted">Dashboard Affiliate sudah terpisah. ' +
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
      page('Beranda','Ringkasan Affiliate.','/p/affiliate'),

    links: () =>
      page('Link referral','Link referral Affiliate.','/p/affiliate/links'),

    commissions: () =>
      page('Komisi','Komisi Affiliate.','/p/affiliate/commissions'),

    payout: () =>
      page('Payout','Payout Affiliate.','/p/affiliate/payout')
  });

  window.SegalokaAffiliateRenderers = Object.freeze({
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
          '[Affiliate Renderers] Renderer tidak dikenal: ' + key
        );
      }

      return renderer(context || {});
    }
  });
})();
