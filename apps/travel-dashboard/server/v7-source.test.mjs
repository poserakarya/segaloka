import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { fileURLToPath } from 'node:url';

import { renderTravelV7Source } from './v7-source.mjs';

const originalPath = fileURLToPath(
  new URL('../original-v7/travel-existing.html', import.meta.url)
);

const context = {
  role: 'travel',
  organization: {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Travel Test',
    status: 'active'
  },
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Test User',
    email: 'test@example.invalid'
  }
};

test('serves the original Travel V7 source with role and tenant restrictions', async () => {
  const source = await readFile(originalPath, 'utf8');
  const html = renderTravelV7Source(source, context);

  assert.ok(html.includes('window.__SEGALOKA_TRAVEL_CONTEXT__='));
  assert.ok(html.includes('const DEMO = false;'));
  assert.ok(html.includes("S.role = 'travel';"));
  assert.ok(html.includes("S.route = '/p/travel/departures';"));
  assert.ok(html.includes('class="side-scroll"'));
  assert.ok(html.includes('id="work"'));
  assert.ok(html.includes('class="nav-list"'));
  assert.ok(html.includes('loadSegalokaTravelData();'));
  assert.ok(html.includes("new EventSource("));
  assert.ok(html.includes("travelSync.addEventListener('change'"));
  assert.ok(html.includes("travelSync.addEventListener('auth.expired'"));
  assert.ok(!html.includes('setInterval(realtime, 16000);'));
  assert.ok(!html.includes('sbConnect();'));
  assert.notEqual(html, source);

  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 2);
  assert.doesNotThrow(() => new Script(scripts[1][1]));
});

test('escapes session-derived organization text for inline script context', async () => {
  const source = await readFile(originalPath, 'utf8');
  const html = renderTravelV7Source(source, {
    ...context,
    organization: {
      ...context.organization,
      name: '</script><script>alert(1)</script>'
    }
  });

  assert.ok(html.includes('\\u003c/script\\u003e'));
  assert.ok(!html.includes('</script><script>alert(1)</script>'));
});

test('rejects a non-Travel or incomplete session context', async () => {
  const source = await readFile(originalPath, 'utf8');

  assert.throws(
    () => renderTravelV7Source(source, {
      ...context,
      role: 'super_admin'
    }),
    /INVALID_TRAVEL_V7_CONTEXT/
  );
});

test('Travel V7 output is pinned (Fase A: fonts, format, no simulation, observer fix)', async () => {
  const { createHash } = await import('node:crypto');
  const source = await readFile(originalPath, 'utf8');
  const html = renderTravelV7Source(source, context);

  // Hash output setelah Fase A. Perbedaan terhadap E2E-02 (5c3ee5cd…):
  // font lokal, window.__SEGALOKA_FORMAT__, patch LOC/money/fD/fDT/bahasa
  // awal, banner simulasi permission dihapus, kunci S.role/S.ux, dan
  // observer akun yang tidak lagi memicu dirinya sendiri.
  // Fase B tahap 2 (6673414c… -> 1733ae20…): pemuat GET /bff/bookings dan
  // fallback nama paket b.pkgName pada 12 titik render booking.
  // Pratinjau (1733ae20… -> 09de446a…): kartu organisasi statis tanpa
  // chevron/pent-pick, label "Organisasi", sel tabel >=5 kolom tidak dibungkus,
  // tabel bergulir di dalam .tbl-wrap pada layar <=640px.
  assert.equal(html.length, 1000252);
  assert.equal(
    createHash('sha256').update(html).digest('hex'),
    '09de446aa2c07a1c4ebe3db2b21fdf087cc1d05d5fb152f41325c72a778be0f1'
  );
});

test('removes permission simulation and Google Fonts from the Travel runtime', async () => {
  const source = await readFile(originalPath, 'utf8');
  const html = renderTravelV7Source(source, context);

  assert.ok(!html.includes('Mode simulasi permission'));
  assert.ok(!html.includes('fonts.googleapis.com'));
  assert.ok(!html.includes('fonts.gstatic.com'));
  assert.ok(html.includes('<link rel="stylesheet" href="/bff/fonts/fonts.css">'));
  assert.ok(html.includes(`Object.defineProperty(S, 'role', { value: "travel", writable: false, configurable: false });`));
  assert.ok(html.includes("Object.defineProperty(S, 'ux', { value: 'normal', writable: false, configurable: false });"));
  assert.ok(html.includes('if (name && name.textContent !== accountName)'));
});

test('fails safely with the Travel error prefix when an anchor is missing', async () => {
  const source = await readFile(originalPath, 'utf8');

  assert.throws(
    () => renderTravelV7Source(source.replace('const DEMO = /[?&]demo\\b/.test(location.search);', ''), context),
    /TRAVEL_V7_SOURCE_ANCHOR_INVALID:demo-flag/
  );
});
