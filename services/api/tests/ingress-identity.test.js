import test from 'node:test';
import assert from 'node:assert/strict';

import {
  signIngressIdentity,
  verifyIngressIdentity
} from '../src/security/ingress-identity.js';

const secret = 'a'.repeat(64);
const wrongSecret = 'b'.repeat(64);
const now = 1791500000000;

test('valid ingress identity', () => {
  const headers = signIngressIdentity(secret, '203.0.113.20', now);

  assert.equal(
    verifyIngressIdentity(headers, secret, now),
    '203.0.113.20'
  );
});

test('wrong secret rejected', () => {
  const headers = signIngressIdentity(secret, '203.0.113.20', now);

  assert.equal(
    verifyIngressIdentity(headers, wrongSecret, now),
    null
  );
});

test('forged IP rejected', () => {
  const headers = signIngressIdentity(secret, '203.0.113.20', now);
  headers['x-segaloka-client-ip'] = '198.51.100.99';

  assert.equal(verifyIngressIdentity(headers, secret, now), null);
});

test('expired identity rejected', () => {
  const headers = signIngressIdentity(
    secret, '203.0.113.20', now - 60000
  );

  assert.equal(verifyIngressIdentity(headers, secret, now), null);
});

test('future timestamp rejected', () => {
  const headers = signIngressIdentity(
    secret, '203.0.113.20', now + 60000
  );

  assert.equal(verifyIngressIdentity(headers, secret, now), null);
});

test('invalid IP rejected', () => {
  assert.throws(() => {
    signIngressIdentity(secret, 'invalid-ip', now);
  });
});

test('missing headers rejected', () => {
  assert.equal(verifyIngressIdentity({}, secret, now), null);
});

test('forged X-Forwarded-For ignored', () => {
  const headers = signIngressIdentity(secret, '203.0.113.20', now);
  headers['x-forwarded-for'] = '198.51.100.99';

  assert.equal(
    verifyIngressIdentity(headers, secret, now),
    '203.0.113.20'
  );
});

test('nonce is unique', () => {
  const first = signIngressIdentity(secret, '203.0.113.20', now);
  const second = signIngressIdentity(secret, '203.0.113.20', now);

  assert.notEqual(
    first['x-segaloka-client-nonce'],
    second['x-segaloka-client-nonce']
  );

  assert.notEqual(
    first['x-segaloka-client-signature'],
    second['x-segaloka-client-signature']
  );
});

test('modified nonce rejected', () => {
  const headers = signIngressIdentity(secret, '203.0.113.20', now);

  headers['x-segaloka-client-nonce'] = '0'.repeat(32);

  assert.equal(verifyIngressIdentity(headers, secret, now), null);
});

test('missing nonce rejected', () => {
  const headers = signIngressIdentity(secret, '203.0.113.20', now);

  delete headers['x-segaloka-client-nonce'];

  assert.equal(verifyIngressIdentity(headers, secret, now), null);
});

test('invalid nonce rejected', () => {
  assert.throws(() => {
    signIngressIdentity(
      secret, '203.0.113.20', now, 'invalid'
    );
  });
});