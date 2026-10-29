(function () {
  'use strict';

  /*
   * SEGALOKA Travel — Pure UI Helper Layer
   * Phase 2L.2
   *
   * RULES:
   * - presentation only
   * - no canonical business data
   * - no auth/session implementation
   * - no Supabase
   * - no payment/gateway/refund
   * - no mutation of legacy V7 runtime
   */

  const ICONS = Object.freeze({
    circle: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3',
    plus: 'M12 5v14 M5 12h14',
    package: 'M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
    wallet: 'M20 7H5a2 2 0 0 1 0-4h13v4 M3 5v14a2 2 0 0 0 2 2h15V7 M16 14h.01',
    calendar: 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M16 2v4 M8 2v4 M3 10h18',
    building: 'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16 M16 9h2a2 2 0 0 1 2 2v10 M8 7h4 M8 11h4 M8 15h4 M2 21h20',
    store: 'M3 9l1.5-5h15L21 9 M3 9v11h18V9',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    filetext: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',
    branch: 'M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 9a9 9 0 0 1-9 9'
  });

  function esc(value) {
    return String(value == null ? '' : value).replace(
      /[&<>"']/g,
      function (char) {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[char];
      }
    );
  }

  function normalizeLang(lang) {
    return ['id', 'en', 'ar'].includes(lang) ? lang : 'id';
  }

  function locale(lang) {
    return {
      id: 'id-ID',
      en: 'en-US',
      ar: 'ar-u-ca-gregory-nu-latn'
    }[normalizeLang(lang)];
  }

  function l3(values, lang) {
    if (!Array.isArray(values)) {
      return values == null ? '' : String(values);
    }

    const index = {
      id: 0,
      en: 1,
      ar: 2
    }[normalizeLang(lang)];

    return values[index] == null ? (values[0] || '') : values[index];
  }

  function number(value, options, lang) {
    if (value == null || !Number.isFinite(Number(value))) {
      return '—';
    }

    return new Intl.NumberFormat(
      locale(lang),
      options
    ).format(Number(value));
  }

  function money(value, full, lang) {
    if (value == null || !Number.isFinite(Number(value))) {
      return '—';
    }

    const numeric = Number(value);

    return 'Rp ' + (
      full
        ? number(Math.round(numeric), undefined, lang)
        : number(
            numeric,
            {
              notation: 'compact',
              maximumFractionDigits: numeric >= 1000000000 ? 2 : 1
            },
            lang
          )
    );
  }

  function date(value, options, lang) {
    const dateValue = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(dateValue.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat(
      locale(lang),
      options || {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    ).format(dateValue);
  }

  function icon(name, className) {
    const path = ICONS[name] || ICONS.circle;

    return (
      '<svg class="ic ' +
      esc(className || '') +
      '" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="' +
      path +
      '"/></svg>'
    );
  }

  function panel(content, className) {
    return (
      '<section class="pnl ' +
      esc(className || '') +
      '">' +
      (content || '') +
      '</section>'
    );
  }

  function pageHead(config) {
    const cfg = config || {};

    const description = cfg.description
      ? '<p>' + esc(cfg.description) + '</p>'
      : '';

    const actions = cfg.actions
      ? '<div class="actions">' + cfg.actions + '</div>'
      : '';

    return (
      '<div class="phead">' +
        '<div class="ttl">' +
          '<h1>' + esc(cfg.title || '') + '</h1>' +
          description +
        '</div>' +
        actions +
      '</div>'
    );
  }

  function kpiRow(items) {
    const safeItems = Array.isArray(items) ? items : [];

    return (
      '<div class="kpis">' +
      safeItems.map(function (item) {
        const k = item || {};

        return (
          '<div class="kpi">' +
            '<div class="k">' +
              (k.icon ? icon(k.icon, 'sm') : '') +
              esc(k.label || k.k || '') +
            '</div>' +
            '<div class="v">' +
              (k.value == null ? '' : String(k.value)) +
            '</div>' +
            (
              k.description || k.d
                ? '<div class="d">' +
                    esc(k.description || k.d) +
                  '</div>'
                : ''
            ) +
          '</div>'
        );
      }).join('') +
      '</div>'
    );
  }

  function table(headers, rows, emptyText) {
    const safeHeaders = Array.isArray(headers) ? headers : [];
    const safeRows = Array.isArray(rows) ? rows : [];

    if (!safeRows.length) {
      return (
        '<div class="empty">' +
          '<p>' +
            esc(emptyText || 'Belum ada data.') +
          '</p>' +
        '</div>'
      );
    }

    return (
      '<div class="tbl-wrap">' +
        '<table class="t">' +
          '<thead><tr>' +
            safeHeaders.map(function (header) {
              return '<th>' + esc(header) + '</th>';
            }).join('') +
          '</tr></thead>' +
          '<tbody>' +
            safeRows.join('') +
          '</tbody>' +
        '</table>' +
      '</div>'
    );
  }

  const api = Object.freeze({
    version: '2L.2',
    presentationOnly: true,
    esc: esc,
    l3: l3,
    number: number,
    money: money,
    date: date,
    icon: icon,
    panel: panel,
    pageHead: pageHead,
    kpiRow: kpiRow,
    table: table
  });

  Object.defineProperty(window, 'SegalokaAffiliateUI', {
    value: api,
    writable: false,
    configurable: false
  });
})();