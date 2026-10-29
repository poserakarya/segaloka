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

    links: () => [
      '<div class="page">',
      ui.pageHead({ title: 'Link referral', desc: 'Kelola link referral Affiliate.' }),
      '<section class="pnl" data-affiliate-referral-links>',
      '<div class="muted">Memuat link referral...</div>',
      '</section></div>'
    ].join(''),

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
    },
    async activate(key, root) {
      if (key !== 'links') return;
      const panel = root.querySelector('[data-affiliate-referral-links]');
      const api = ui.api;
      if (!panel || !api) return;
      const esc = ui.esc;
      const load = async () => {
        panel.innerHTML = '<div class="muted">Memuat link referral...</div>';
        try {
          const result = await api.links();
          const links = Array.isArray(result.items) ? result.items : [];
          panel.innerHTML = '<form data-referral-create-form><label>ID organisasi Travel aktif</label>' +
            '<input name="travelOrganizationId" required pattern="[0-9a-fA-F-]{36}">' +
            '<button type="submit">Buat link referral</button></form>' +
            (links.length ? '<div class="tbl-wrap"><table class="t"><thead><tr><th>Travel</th><th>Kode</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
              links.map(link => '<tr><td>' + esc(link.travelName || link.travelOrganizationId) + '</td><td class="mono">' +
                esc(link.referralCode) + '</td><td>' + esc(link.status) + '</td><td><button type="button" data-referral-toggle="' +
                esc(link.id) + '" data-status="' + (link.status === 'active' ? 'paused' : 'active') + '">' +
                (link.status === 'active' ? 'Pause' : 'Aktifkan') + '</button></td></tr>').join('') +
              '</tbody></table></div>' : '<div class="empty"><p>Belum ada link referral.</p></div>');
        } catch (error) {
          panel.innerHTML = '<div class="error">Gagal memuat: ' + esc(error.code || 'REQUEST_FAILED') + '</div>';
        }
      };
      await load();
      if (window.SegalokaAffiliateReferralStream) {
        window.SegalokaAffiliateReferralStream.close();
      }
      const stream = new EventSource(ui.api.events(), { withCredentials: true });
      stream.addEventListener('ready', () => { panel.dataset.sseReady = 'true'; });
      stream.addEventListener('affiliate.referral_link.created', load);
      stream.addEventListener('affiliate.referral_link.active', load);
      stream.addEventListener('affiliate.referral_link.paused', load);
      stream.addEventListener('error', () => { panel.dataset.sseState = 'error'; });
      window.SegalokaAffiliateReferralStream = stream;
      panel.addEventListener('submit', async event => {
        if (!event.target.matches('[data-referral-create-form]')) return;
        event.preventDefault();
        const id = new FormData(event.target).get('travelOrganizationId');
        try { await api.createLink(id); await load(); }
        catch (error) { panel.insertAdjacentHTML('afterbegin', '<div class="error">Gagal membuat: ' + esc(error.code || 'REQUEST_FAILED') + '</div>'); }
      });
      panel.addEventListener('click', async event => {
        const button = event.target.closest('[data-referral-toggle]');
        if (!button || !window.confirm('Ubah status link referral ini?')) return;
        button.disabled = true;
        try { await api.updateLink(button.dataset.referralToggle, button.dataset.status); await load(); }
        catch (error) { panel.insertAdjacentHTML('afterbegin', '<div class="error">Gagal menyimpan: ' + esc(error.code || 'REQUEST_FAILED') + '</div>'); button.disabled = false; }
      });
    }
  });
})();
