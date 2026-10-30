// Uji entry Control Center yang aktif (server.mjs) dan bundle V7 yang benar-
// benar disajikan ke browser, dengan BFF tiruan khusus tes. Menggantikan uji
// lama terhadap skrip inline control-center.html (sejak Fase A, V7 Control
// Center dimuat dari /control-center.bundle.js lewat server.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';

import { startControlCenter } from './test-support/control-center-harness.mjs';

test('served Control Center bundle: API-backed data, blocked writes, no legacy connectors', {
  timeout: 60000
}, async () => {
  const cc = await startControlCenter();
  try {
    // Tanpa sesi super_admin: bundle dan dashboard tidak disajikan.
    assert.equal((await cc.fetch('/control-center.bundle.js')).status, 401);
    assert.equal((await cc.fetch('/control-center.bundle.js', { session: 'travel' })).status, 401);
    const anonymousDashboard = await cc.fetch('/dashboard', { redirect: 'manual' });
    assert.equal(anonymousDashboard.status, 302);
    assert.equal(anonymousDashboard.headers.get('location'), '/login');

    const response = await cc.fetch('/control-center.bundle.js', { session: 'admin' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const bundle = await response.text();

    // Status/ringkasan dari API Segaloka (PostgreSQL), bukan data lokal.
    assert.match(bundle, /fetch\('\/bff\/control-center\/summary'/);
    assert.match(bundle, /result\.source === 'postgresql'/);
    // Operasi tanpa endpoint persisten diblokir oleh guard aksi V7.
    assert.match(bundle, /window\.__SEGALOKA_V7_ACTION_POLICY__ = Object\.freeze/);
    assert.match(bundle, /perubahan tidak disimpan/i);
    // Simulasi role terkunci dan realtime SSE aktif.
    assert.match(bundle, /SEGALOKA_CC_SIMULATION_LOCK_V1/);
    assert.match(bundle, /SEGALOKA_CC_REALTIME_V1/);
    // Konektor SQL Supabase lama mati sebelum memanggil apa pun.
    assert.match(bundle, /async function sql\(q\) \{\s*throw new Error\('Legacy Supabase SQL connector disabled'\)/);

    // Dashboard super_admin: CSP membatasi koneksi ke origin sendiri, sehingga
    // URL Supabase/omnichannel lama di bundle tidak dapat dihubungi.
    const dashboard = await cc.fetch('/dashboard', { session: 'admin' });
    assert.equal(dashboard.status, 200);
    assert.match(dashboard.headers.get('content-security-policy'), /connect-src 'self'/);
    const html = await dashboard.text();
    assert.match(html, /<script src="\/control-center\.bundle\.js"><\/script>/);
    assert.doesNotMatch(html, /supabase\.co/i);
  } finally {
    await cc.stop();
  }
});
