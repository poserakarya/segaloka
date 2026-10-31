// requestClientIp website (projects/Segaloka-webs/src/lib/client-ip-source.mjs,
// dipakai lib/client-ip.ts di semua route auth): sumber IP klien untuk tanda
// tangan ingress dan uji spoofing header. Env diisolasi per kasus.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const web = fileURLToPath(new URL('../projects/Segaloka-webs/', import.meta.url));

const { requestClientIp } = await import(new URL('../projects/Segaloka-webs/src/lib/client-ip-source.mjs', import.meta.url));

function evaluate(env, headers) {
  return requestClientIp(new Request('https://www.segaloka.com/api/auth/login', { headers }), env);
}

test('website requestClientIp: trust boundary per sumber', {
  skip: existsSync(`${web}src/lib/client-ip-source.mjs`) ? false : 'website tidak tersedia'
}, () => {
  const spoof = { 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '2.2.2.2' };

  // Vercel: header edge; x-vercel-forwarded-for lebih dulu.
  assert.equal(evaluate({ VERCEL: '1', NODE_ENV: 'production' }, { 'x-vercel-forwarded-for': '198.51.100.4', ...spoof }), '198.51.100.4');
  assert.equal(evaluate({ VERCEL: '1', NODE_ENV: 'production' }, { 'x-real-ip': '::ffff:198.51.100.9' }), '198.51.100.9');
  // X-Forwarded-For saja tidak pernah dipercaya.
  assert.equal(evaluate({ VERCEL: '1', NODE_ENV: 'production' }, { 'x-forwarded-for': '1.1.1.1' }), null);
  assert.equal(evaluate({ VERCEL: '1', NODE_ENV: 'production' }, { 'x-vercel-forwarded-for': 'bukan-ip' }), null);

  // Self-hosted di belakang nginx yang menimpa X-Real-IP.
  assert.equal(evaluate({ SEGALOKA_CLIENT_IP_SOURCE: 'x-real-ip', NODE_ENV: 'production' }, spoof), '2.2.2.2');
  assert.equal(evaluate({ SEGALOKA_CLIENT_IP_SOURCE: 'x-real-ip', NODE_ENV: 'production' }, { 'x-forwarded-for': '1.1.1.1' }), null);

  // Production tanpa sumber yang dikonfigurasi: fail closed (null), header
  // apa pun diabaikan. Uji lokal (non-production): 127.0.0.1.
  assert.equal(evaluate({ NODE_ENV: 'production' }, spoof), null);
  assert.equal(evaluate({ NODE_ENV: 'development' }, spoof), '127.0.0.1');
  assert.equal(evaluate({ SEGALOKA_CLIENT_IP_SOURCE: 'header-lain', NODE_ENV: 'production' }, spoof), null);
});
