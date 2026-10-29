/* Segaloka Travel — existing V7 interaction runtime */

const ovl = () => document.getElementById('ovl');
let lastFocus = null;
let confirmCb = null;

function closeOverlays() {
  const o = ovl();
  if (o && o.innerHTML) {
    o.innerHTML = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
}

function openLayer(html, focusSel) {
  lastFocus = document.activeElement;
  ovl().innerHTML = html;
  const f = ovl().querySelector(
    focusSel || 'input,textarea,select,button:not([data-act="close"])'
  );
  if (f) setTimeout(() => f.focus(), 20);
}

function modal({ title, body, foot, wide }) {
  openLayer(
    `<div class="scrim" data-act="close"></div>
    <div class="modal ${wide ? 'wide' : ''}" role="dialog"
      aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-h">
        <h3>${esc(title)}</h3>
        <button class="iconbtn" data-act="close"
          aria-label="${t('close')}">${ic('x')}</button>
      </div>
      <div class="modal-b">${body}</div>
      ${foot ? `<div class="modal-f">${foot}</div>` : ''}
    </div>`
  );
}

function confirmAction({
  title,
  desc,
  tone = 'primary',
  label,
  reason = true,
  resource,
  onOk
}) {
  if (S.ux === 'offline') {
    toast(
      'warn',
      L3(['Aksi ditunda','Action paused','تم إيقاف الإجراء']),
      t('offline_b')
    );
    return;
  }

  confirmCb = onOk;

  const tr = me('travel');
  const actor = tr && tr.name ? tr.name : 'Travel';

  modal({
    title,
    body:
      `${desc ? `<p style="margin:0 0 12px;color:var(--ink-2)">${desc}</p>` : ''}` +
      `${resource ? `<div class="chip mono" style="margin-bottom:12px">${esc(resource)}</div>` : ''}` +
      `${reason ? `<div class="field">
        <label for="cf-reason">${t('reason')} *</label>
        <textarea id="cf-reason" placeholder="${esc(t('reason_req'))}"></textarea>
        <span class="hint" id="cf-hint">${t('reason_req')}</span>
      </div>` : ''}` +
      `<div class="auditbox">
        ${ic('history')}
        <div>
          <b>${esc(L3(['Jejak audit','Audit trail','سجل التدقيق']))}</b><br>
          ${esc(t('audit_note'))}<br>
          <span class="mono">
            actor: ${esc(actor)} · source: Web · ${esc(fDT(nowTs()))}
          </span>
        </div>
      </div>`,
    foot:
      `<button class="btn" data-act="close">${t('cancel')}</button>
       <button class="btn ${tone}" data-act="confirm-ok"
         data-need="${reason ? 1 : 0}">
         ${esc(label || t('confirm'))}
       </button>`
  });
}

A.close = closeOverlays;

A['confirm-ok'] = el => {
  const need = el.dataset.need === '1';
  const ta = document.getElementById('cf-reason');
  const r = ta ? ta.value.trim() : '';

  if (need && !r) {
    ta.focus();
    ta.style.borderColor = 'var(--bad)';
    const hint = document.getElementById('cf-hint');
    if (hint) hint.style.color = 'var(--bad)';
    return;
  }

  const cb = confirmCb;
  confirmCb = null;
  closeOverlays();

  if (cb) cb(r || null);
};
