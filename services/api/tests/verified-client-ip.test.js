import test from 'node:test';
import assert from 'node:assert/strict';
import { getClientIp } from '../src/security/trusted-proxy.js';

test('01 - verified IPv4 takes precedence', () => {
  assert.equal(getClientIp({
    verifiedClientIp: '192.0.2.25',
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'x-forwarded-for': '198.51.100.99' }
  }), '192.0.2.25');
});

test('02 - verified IPv6 takes precedence', () => {
  assert.equal(getClientIp({
    verifiedClientIp: '2001:db8::25',
    socket: { remoteAddress: '127.0.0.1' },
    headers: {}
  }), '2001:db8::25');
});

test('03 - invalid verified IP is ignored', () => {
  assert.equal(getClientIp({
    verifiedClientIp: 'not-an-ip',
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'x-forwarded-for': '198.51.100.99' }
  }), '127.0.0.1');
});

test('04 - forged forwarded header is ignored', () => {
  assert.equal(getClientIp({
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'x-forwarded-for': '198.51.100.99' }
  }), '127.0.0.1');
});

test('05 - missing verified IP uses socket fallback', () => {
  assert.equal(getClientIp({
    socket: { remoteAddress: '192.0.2.50' },
    headers: {}
  }), '192.0.2.50');
});