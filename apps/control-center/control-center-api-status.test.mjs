import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(
  new URL('./frontend/control-center.html', import.meta.url),
  'utf8'
);
const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];

assert.ok(inlineScript, 'Control Center V7 inline script must exist.');
new vm.Script(inlineScript);

test('status Control Center berasal dari ringkasan API Segaloka', () => {
  assert.match(html, /fetch\('\/bff\/control-center\/summary'/);
  assert.match(html, /data\.source !== 'postgresql'/);
  assert.match(html, /typeof data\.realtime !== 'boolean'/);
  assert.match(html, /SEGALOKA_OVERVIEW\.realtime = data\.realtime/);
  assert.match(html, /PostgreSQL/);
  assert.match(html, /API Segaloka/);
});

test('operasi tulis ditolak sampai API persisten tersedia', () => {
  assert.match(html, /!DEMO && el\.hasAttribute\('data-mut'\)/);
  assert.match(html, /perubahan tidak disimpan/i);
});

test('runtime aktif tidak memanggil konektor atau URL Supabase', () => {
  assert.doesNotMatch(html, /supabase\.co/i);
  assert.doesNotMatch(html, /callTool\(['"]Supabase['"]/i);
  assert.doesNotMatch(html, /window\.claude\.use\(['"]mcp['"]/i);
  assert.match(html, /async function sql\(\)\s*\{\s*throw new Error\('LEGACY_DATABASE_CONNECTOR_DISABLED'\)/);
});
