import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clientIpFromVercelHeaders,
  createClientIpResolver,
  normalizeIp,
  trustedProxies
} from './client-ip.mjs';

const req = (peer, headers = {}) => ({ socket: { remoteAddress: peer }, headers });

test('normalizeIp: kanonis, menolak nilai tidak sah', () => {
  assert.equal(normalizeIp('203.0.113.7'), '203.0.113.7');
  assert.equal(normalizeIp(' ::FFFF:203.0.113.7 '), '203.0.113.7');
  assert.equal(normalizeIp('2001:DB8::1'), '2001:db8::1');
  for (const bad of ['', 'localhost', '203.0.113.7, 10.0.0.1', 'fe80::1%eth0', '999.1.1.1', null, undefined, 42, 'a'.repeat(60)]) {
    assert.equal(normalizeIp(bad), null, String(bad));
  }
});

test('vercel: hanya header edge; x-vercel-forwarded-for lebih dulu', () => {
  assert.equal(clientIpFromVercelHeaders({ 'x-vercel-forwarded-for': '198.51.100.4', 'x-real-ip': '198.51.100.9' }), '198.51.100.4');
  assert.equal(clientIpFromVercelHeaders({ 'x-real-ip': '198.51.100.9' }), '198.51.100.9');
  assert.equal(clientIpFromVercelHeaders({ 'x-vercel-forwarded-for': '198.51.100.4, 10.0.0.1' }), '198.51.100.4');
  // X-Forwarded-For dari klien tidak pernah dipakai.
  assert.equal(clientIpFromVercelHeaders({ 'x-forwarded-for': '1.2.3.4' }), null);
  // Nilai tidak sah atau header ganda ditolak (lanjut ke sumber berikutnya).
  assert.equal(clientIpFromVercelHeaders({ 'x-vercel-forwarded-for': 'evil', 'x-real-ip': '198.51.100.9' }), '198.51.100.9');
  assert.equal(clientIpFromVercelHeaders({ 'x-vercel-forwarded-for': ['1.1.1.1', '2.2.2.2'] }), null);
});

test('proxy: spoofing dari peer tidak tepercaya diabaikan', () => {
  const entry = createClientIpResolver({ mode: 'proxy', env: { SEGALOKA_TRUSTED_PROXY_IPS: '172.30.0.0/24' } });
  // Klien langsung ke entry memalsukan header: dipakai IP peer TCP.
  assert.equal(entry(req('203.0.113.50', { 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '1.1.1.1' })), '203.0.113.50');
  // Loopback tidak dipercaya untuk entry.
  assert.equal(entry(req('127.0.0.1', { 'x-real-ip': '1.1.1.1' })), '127.0.0.1');
  // nginx di subnet tepercaya: X-Real-IP dipakai (dan dinormalisasi).
  assert.equal(entry(req('::ffff:172.30.0.5', { 'x-real-ip': '::ffff:198.51.100.20' })), '198.51.100.20');
  // nginx tanpa header sah: IP nginx (bukan nilai arbitrer).
  assert.equal(entry(req('172.30.0.5', { 'x-real-ip': 'bukan-ip' })), '172.30.0.5');
  assert.equal(entry(req('172.30.0.5', { 'x-forwarded-for': '1.1.1.1' })), '172.30.0.5');
});

test('proxy BFF: loopback (entry lokal) dipercaya hanya bila diminta', () => {
  const bff = createClientIpResolver({ mode: 'proxy', env: {}, trustLoopback: true });
  assert.equal(bff(req('127.0.0.1', { 'x-real-ip': '198.51.100.20' })), '198.51.100.20');
  assert.equal(bff(req('::1', { 'x-real-ip': '2001:db8::5' })), '2001:db8::5');
  assert.equal(bff(req('10.0.0.8', { 'x-real-ip': '198.51.100.20' })), '10.0.0.8');
  assert.equal(bff(req(undefined, { 'x-real-ip': '198.51.100.20' })), null);
});

test('konfigurasi proxy tepercaya tidak sah ditolak', () => {
  for (const value of ['nginx', '10.0.0.0/33', '::1/129', '10.0.0.0/x']) {
    assert.throws(() => trustedProxies({ SEGALOKA_TRUSTED_PROXY_IPS: value }), /INVALID_SEGALOKA_TRUSTED_PROXY_IPS/, value);
  }
  assert.throws(() => createClientIpResolver({ mode: 'header' }), /INVALID_CLIENT_IP_MODE/);
});
