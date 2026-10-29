import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';

import {
  ORIGINAL_V7_BOOT,
  renderV7PortalSource,
  V7_PORTAL_HTML_HEADERS,
  V7_PORTALS
} from './v7-portal-source.mjs';

const source = await readFile(
  new URL('../../travel-dashboard/original-v7/travel-existing.html', import.meta.url),
  'utf8'
);

const USER = '11111111-1111-4111-8111-111111111111';
const ORG = '22222222-2222-4222-8222-222222222222';

function contextFor(role, overrides = {}) {
  const tenant = V7_PORTALS[role].tenantKind === 'organization'
    ? { id: ORG, name: 'Organisasi Uji', status: 'active', kind: 'organization' }
    : { id: USER, name: 'Akun Uji', status: 'active', kind: 'user' };

  return {
    role,
    tenant,
    user: { id: USER, name: 'Akun Uji', email: 'uji@example.invalid' },
    ...overrides
  };
}

for (const role of Object.keys(V7_PORTALS)) {
  test(`${role}: serves the original V7 source restricted to /p/${role}`, () => {
    const html = renderV7PortalSource(source, contextFor(role));

    assert.ok(html.startsWith('<!doctype html><html lang="id"><head>'));
    assert.ok(html.includes('window.__SEGALOKA_PORTAL_CONTEXT__='));
    assert.ok(html.includes('const MOCK = false;'));
    assert.ok(html.includes('const DEMO = false;'));
    assert.ok(html.includes(`S.role = "${role}";`));
    assert.ok(html.includes(`S.route = '/p/${role}';`));
    assert.ok(html.includes(`location.hash = '#/p/${role}';`));
    assert.ok(html.includes('<base href="/bff/ui/">'));
    // Struktur visual V7 asli tetap ada.
    assert.ok(html.includes('class="side-scroll"'));
    assert.ok(html.includes('id="work"'));
    assert.ok(html.includes('class="nav-list"'));
    // Data demo, simulator, dan koneksi Supabase lama tidak aktif.
    assert.ok(!html.includes('setInterval(realtime, 16000);'));
    assert.ok(!html.includes('\nsbConnect();'));
    assert.ok(html.includes('sql = portalLegacyGatewayDisabled;'));
    assert.ok(html.includes("Belum tersambung ke server; perubahan tidak disimpan"));
    assert.ok(!html.includes("t('ux_sim')"));
    assert.ok(!html.includes('<b>Admin Pusat</b><div class="muted" style="font-size:12px">admin@segaloka.example</div>'));

    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 2);
    assert.doesNotThrow(() => new Script(scripts[1][1]));
  });
}

test('portal output is deterministic and leaves the source untouched', () => {
  const before = source.slice();
  const first = renderV7PortalSource(source, contextFor('agen'));
  const second = renderV7PortalSource(source, contextFor('agen'));

  assert.equal(first, second);
  assert.equal(source, before);
});

test('escapes session-derived tenant text in the inline context script', () => {
  const html = renderV7PortalSource(source, contextFor('vendor', {
    tenant: {
      id: ORG,
      name: '</script><script>alert(1)</script>',
      status: 'active',
      kind: 'organization'
    }
  }));

  assert.ok(html.includes('\\u003c/script\\u003e'));
  assert.ok(!html.includes('</script><script>alert(1)</script>'));
});

test('rejects travel, unknown roles, inactive tenants, and cross-user tenants', () => {
  assert.throws(() => renderV7PortalSource(source, { ...contextFor('agen'), role: 'travel' }), /INVALID_V7_PORTAL_CONTEXT/);
  assert.throws(() => renderV7PortalSource(source, { ...contextFor('agen'), role: 'super_admin' }), /INVALID_V7_PORTAL_CONTEXT/);
  assert.throws(() => renderV7PortalSource(source, contextFor('vendor', {
    tenant: { id: ORG, name: 'x', status: 'suspended', kind: 'organization' }
  })), /INVALID_V7_PORTAL_CONTEXT/);
  assert.throws(() => renderV7PortalSource(source, contextFor('agen', {
    tenant: { id: ORG, name: 'x', status: 'active', kind: 'user' }
  })), /INVALID_V7_PORTAL_CONTEXT/);
  assert.throws(() => renderV7PortalSource(source, contextFor('vendor', {
    tenant: { id: USER, name: 'x', status: 'active', kind: 'user' }
  })), /INVALID_V7_PORTAL_CONTEXT/);
});

test('fails safely when an anchor in the source does not match', () => {
  assert.throws(
    () => renderV7PortalSource(source.replace('const MOCK = true;', 'const MOCK = 1;'), contextFor('mitra')),
    /MITRA_V7_SOURCE_ANCHOR_INVALID:mock-flag/
  );
  assert.throws(
    () => renderV7PortalSource(source + '\n' + ORIGINAL_V7_BOOT, contextFor('mitra')),
    /MITRA_V7_SOURCE_ANCHOR_INVALID:secure-boot/
  );
  assert.throws(
    () => renderV7PortalSource(source.replace('</style>', '</style><style></style>'), contextFor('traveler')),
    /TRAVELER_V7_SOURCE_ANCHOR_INVALID:style/
  );
});

test('HTML responses restrict network access to the same origin', () => {
  assert.match(V7_PORTAL_HTML_HEADERS['Content-Security-Policy'], /connect-src 'self'/);
  assert.equal(V7_PORTAL_HTML_HEADERS['Cache-Control'], 'no-store');
  assert.equal(V7_PORTAL_HTML_HEADERS['X-Frame-Options'], 'DENY');
});
