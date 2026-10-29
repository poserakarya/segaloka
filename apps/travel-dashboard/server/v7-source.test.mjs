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

test('shared runtime keeps the Travel V7 output byte-identical', async () => {
  const { createHash } = await import('node:crypto');
  const source = await readFile(originalPath, 'utf8');
  const html = renderTravelV7Source(source, context);

  // Hash output sebelum refactor ke apps/shared/runtime/v7-portal-source.mjs.
  assert.equal(html.length, 997142);
  assert.equal(
    createHash('sha256').update(html).digest('hex'),
    '5c3ee5cdcccb2db6ee028f735fe7a73ccafcf3eb74d5d09b0f12a70c6f4f4714'
  );
});

test('fails safely with the Travel error prefix when an anchor is missing', async () => {
  const source = await readFile(originalPath, 'utf8');

  assert.throws(
    () => renderTravelV7Source(source.replace('const DEMO = /[?&]demo\\b/.test(location.search);', ''), context),
    /TRAVEL_V7_SOURCE_ANCHOR_INVALID:demo-flag/
  );
});
