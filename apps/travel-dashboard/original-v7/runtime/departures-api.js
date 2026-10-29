(function () {
  'use strict';

  const ui = window.SegalokaTravelUI;
  let renderSequence = 0;

  function escape(value) {
    return ui.esc(value);
  }

  function statusText(element, text, failed) {
    element.textContent = text;
    element.classList.toggle('bad', Boolean(failed));
    element.setAttribute('role', failed ? 'alert' : 'status');
  }

  function departureRows(departures) {
    return departures.map(departure => [
      '<tr>',
      '<td><strong>', escape(departure.title), '</strong></td>',
      '<td>', escape(departure.destination), '</td>',
      '<td>', escape(ui.date(departure.departure_date)), '</td>',
      '<td>', escape(
        departure.return_date
          ? ui.date(departure.return_date)
          : '—'
      ), '</td>',
      '<td><span class="chip">', escape(departure.status), '</span></td>',
      '</tr>'
    ].join(''));
  }

  function pageMarkup() {
    const form = [
      '<form id="travel-departure-form">',
      '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px">',
      '<div class="field"><label for="departure-title">Nama keberangkatan</label>',
      '<input id="departure-title" name="title" type="text" maxlength="200" required></div>',
      '<div class="field"><label for="departure-destination">Tujuan</label>',
      '<input id="departure-destination" name="destination" type="text" maxlength="200" required></div>',
      '<div class="field"><label for="departure-date">Tanggal berangkat</label>',
      '<input id="departure-date" name="departureDate" type="date" required></div>',
      '<div class="field"><label for="return-date">Tanggal kembali (opsional)</label>',
      '<input id="return-date" name="returnDate" type="date"></div>',
      '</div>',
      '<button class="btn primary" type="submit">', ui.icon('plus', 'sm'),
      'Simpan keberangkatan</button>',
      '</form>'
    ].join('');

    return [
      '<div class="page">',
      ui.pageHead({
        title: 'Keberangkatan',
        description: 'Jadwal keberangkatan dari API Segaloka.'
      }),
      ui.panel(
        '<div id="travel-departure-status" class="muted" role="status">' +
          'Memuat data API…</div>' +
          '<div style="margin-top:14px">' + form + '</div>',
        'departure-editor'
      ),
      ui.panel(
        '<div class="panel-h"><h2>Jadwal terdaftar</h2>' +
          '<button class="btn sm" id="travel-departure-refresh" type="button">' +
          'Muat ulang</button></div>' +
          '<div id="travel-departure-table"></div>',
        'departure-list'
      ),
      '</div>'
    ].join('');
  }

  async function jsonRequest(path, options) {
    const response = await fetch(path, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...(options || {})
    });

    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error('INVALID_API_RESPONSE');
    }

    if (!response.ok) {
      const error = new Error(body.code || 'API_REQUEST_FAILED');
      error.status = response.status;
      throw error;
    }

    return body;
  }

  async function loadDepartures(container, organizationId, sequence) {
    const status = container.querySelector('#travel-departure-status');
    const table = container.querySelector('#travel-departure-table');

    statusText(status, 'Memuat jadwal dari API Segaloka…', false);

    try {
      const data = await jsonRequest(
        '/bff/departures?organizationId=' +
          encodeURIComponent(organizationId)
      );

      if (sequence !== renderSequence) return;

      if (!Array.isArray(data.departures)) {
        throw new Error('INVALID_DEPARTURE_RESPONSE');
      }

      table.innerHTML = ui.table(
        [
          'Keberangkatan',
          'Tujuan',
          'Berangkat',
          'Kembali',
          'Status'
        ],
        departureRows(data.departures),
        'Belum ada keberangkatan terdaftar.'
      );
      statusText(status, 'Data dibaca dari API Segaloka.', false);
    } catch (error) {
      if (sequence !== renderSequence) return;

      if (error.status === 401) {
        window.location.replace('/');
        return;
      }

      statusText(
        status,
        'Gagal membaca jadwal: ' + error.message,
        true
      );
      table.replaceChildren();
      console.error('[Travel departures] Pembacaan gagal.', error);
    }
  }

  async function renderDepartures(container) {
    const sequence = ++renderSequence;
    container.innerHTML = pageMarkup();

    const status = container.querySelector('#travel-departure-status');
    const form = container.querySelector('#travel-departure-form');
    const refresh = container.querySelector('#travel-departure-refresh');

    let session;
    try {
      session = await window.SegalokaTravelSessionReady;
    } catch (error) {
      if (sequence === renderSequence) {
        statusText(
          status,
          'Akses Travel tidak dapat diverifikasi.',
          true
        );
      }
      return;
    }

    if (sequence !== renderSequence) return;

    if (session.dashboards.length !== 1) {
      statusText(
        status,
        'Akun ini memiliki beberapa organisasi Travel; pemilihan tenant belum tersedia.',
        true
      );
      form.hidden = true;
      return;
    }

    const organizationId = session.dashboards[0].organizationId;

    async function reload() {
      await loadDepartures(container, organizationId, sequence);
    }

    refresh.addEventListener('click', reload);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const submit = form.querySelector('[type="submit"]');
      const values = new FormData(form);

      const payload = {
        organizationId,
        title: String(values.get('title') || '').trim(),
        destination: String(values.get('destination') || '').trim(),
        departureDate: String(values.get('departureDate') || ''),
        returnDate: String(values.get('returnDate') || '') || null
      };

      submit.disabled = true;
      statusText(status, 'Menyimpan melalui API Segaloka…', false);

      try {
        const result = await jsonRequest('/bff/departures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!result.departure) {
          throw new Error('INVALID_DEPARTURE_RESPONSE');
        }

        form.reset();
        statusText(status, 'Keberangkatan tersimpan. Memuat ulang daftar…', false);
        await reload();
      } catch (error) {
        if (error.status === 401) {
          window.location.replace('/');
          return;
        }

        statusText(
          status,
          'Penyimpanan gagal: ' + error.message,
          true
        );
        console.error('[Travel departures] Penyimpanan gagal.', error);
      } finally {
        submit.disabled = false;
      }
    });

    await reload();
  }

  window.SegalokaTravelApi = Object.freeze({
    render(key, container) {
      if (key === 'departures') {
        renderDepartures(container).catch(error => {
          console.error('[Travel departures] Runtime gagal.', error);
        });
      }
    }
  });
})();
