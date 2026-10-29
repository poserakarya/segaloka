import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authenticateOrigin,
  resolveAuthenticatedClientIp
} from '../src/origin-security.mjs';

const secret = 'test-only-secret-that-is-at-least-32-characters';

test('valid authenticated request', () => {
  const headers = {
    'x-segaloka-origin-auth': secret,
    'cf-connecting-ip': '203.0.113.20'
  };

  assert.equal(authenticateOrigin(headers, secret), true);

  assert.equal(
    resolveAuthenticatedClientIp(headers, secret),
    '203.0.113.20'
  );
});

test('missing origin authentication rejected', () => {
  assert.equal(
    resolveAuthenticatedClientIp({
      'cf-connecting-ip': '203.0.113.20'
    }, secret),
    null
  );
});

test('incorrect origin authentication rejected', () => {
  assert.equal(
    resolveAuthenticatedClientIp({
      'x-segaloka-origin-auth': 'invalid',
      'cf-connecting-ip': '203.0.113.20'
    }, secret),
    null
  );
});

test('forged X-Forwarded-For not used', () => {
  assert.equal(
    resolveAuthenticatedClientIp({
      'x-segaloka-origin-auth': secret,
      'x-forwarded-for': '198.51.100.10',
      'cf-connecting-ip': '203.0.113.20'
    }, secret),
    '203.0.113.20'
  );
});

test('multiple client IP values rejected', () => {
  assert.equal(
    resolveAuthenticatedClientIp({
      'x-segaloka-origin-auth': secret,
      'cf-connecting-ip': '203.0.113.20, 198.51.100.10'
    }, secret),
    null
  );
});

test('invalid client IP rejected', () => {
  assert.equal(
    resolveAuthenticatedClientIp({
      'x-segaloka-origin-auth': secret,
      'cf-connecting-ip': 'not-an-ip'
    }, secret),
    null
  );
});

test('missing client IP rejected', () => {
  assert.equal(
    resolveAuthenticatedClientIp({
      'x-segaloka-origin-auth': secret
    }, secret),
    null
  );
});