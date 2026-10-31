import test from 'node:test';
import assert from 'node:assert/strict';

import {
  signIngressRequest,
  verifyIngressRequest,
  hashRequestBody
} from '../src/security/ingress-identity-v3.js';

const secret = 'test-secret-only-not-for-production-123456789';
const otherSecret = 'different-test-secret-not-production-12345';

const body = Buffer.from('{"email":"test@example.com"}');
const request = {
  ip: '192.0.2.10',
  method: 'POST',
  target: '/auth/login',
  body
};

function signed() {
  return signIngressRequest(secret, request);
}

test('01 - valid signature accepted', () => {
  const headers = signed();
  const result = verifyIngressRequest(headers, secret, request);

  assert.equal(result?.ip, request.ip);
  assert.equal(result?.nonce, headers['x-segaloka-client-nonce']);
});

test('02 - modified IP rejected', () => {
  const headers = signed();
  headers['x-segaloka-client-ip'] = '192.0.2.99';

  assert.equal(verifyIngressRequest(headers, secret, request), null);
});

test('03 - modified HTTP method rejected', () => {
  const headers = signed();

  assert.equal(
    verifyIngressRequest(headers, secret, { ...request, method: 'GET' }),
    null
  );
});

test('04 - modified target rejected', () => {
  const headers = signed();

  assert.equal(
    verifyIngressRequest(headers, secret, {
      ...request,
      target: '/auth/register'
    }),
    null
  );
});

test('05 - modified request body rejected', () => {
  const headers = signed();

  assert.equal(
    verifyIngressRequest(headers, secret, {
      ...request,
      body: Buffer.from('{"email":"other@example.com"}')
    }),
    null
  );
});

test('06 - modified nonce rejected', () => {
  const headers = signed();
  headers['x-segaloka-client-nonce'] = 'a'.repeat(32);

  assert.equal(verifyIngressRequest(headers, secret, request), null);
});

test('07 - wrong secret rejected', () => {
  assert.equal(
    verifyIngressRequest(signed(), otherSecret, request),
    null
  );
});

test('08 - expired signature rejected', () => {
  const now = Date.now();
  const headers = signIngressRequest(
    secret,
    request,
    now - 31000
  );

  assert.equal(
    verifyIngressRequest(headers, secret, request, now),
    null
  );
});

test('09 - future signature rejected', () => {
  const now = Date.now();
  const headers = signIngressRequest(
    secret,
    request,
    now + 31000
  );

  assert.equal(
    verifyIngressRequest(headers, secret, request, now),
    null
  );
});

test('10 - unique nonce generated', () => {
  const first = signed();
  const second = signed();

  assert.notEqual(
    first['x-segaloka-client-nonce'],
    second['x-segaloka-client-nonce']
  );
});

test('11 - missing signature rejected', () => {
  const headers = signed();
  delete headers['x-segaloka-client-signature'];

  assert.equal(verifyIngressRequest(headers, secret, request), null);
});

test('12 - invalid body rejected when signing', () => {
  assert.throws(
    () => signIngressRequest(secret, { ...request, body: 'text' }),
    /INVALID_INGRESS_REQUEST/
  );
});

test('13 - request body hash deterministic', () => {
  assert.equal(hashRequestBody(body), hashRequestBody(Buffer.from(body)));
});

test('14 - forged forwarded IP does not change signed identity', () => {
  const headers = {
    ...signed(),
    'x-forwarded-for': '203.0.113.99'
  };

  assert.equal(
    verifyIngressRequest(headers, secret, request)?.ip,
    '192.0.2.10'
  );
});

test('15 - missing body hash rejected', () => {
  const headers = signed();
  delete headers['x-segaloka-client-body-sha256'];

  assert.equal(verifyIngressRequest(headers, secret, request), null);
});

test('16 - malformed request target rejected', () => {
  assert.throws(
    () => signIngressRequest(secret, {
      ...request,
      target: '//evil.example/path'
    }),
    /INVALID_INGRESS_REQUEST/
  );
});
test('client IP is canonicalised before signing; non-canonical forms are rejected', async () => {
  const { canonicalClientIp } = await import('../src/security/ingress-identity-v3.js');
  const secret = 'k'.repeat(64);
  const body = Buffer.from('{}');
  const signed = signIngressRequest(secret, { ip: '::FFFF:203.0.113.7', method: 'POST', target: '/auth/login', body });
  assert.equal(signed['x-segaloka-client-ip'], '203.0.113.7');
  assert.deepEqual(verifyIngressRequest(signed, secret, { method: 'POST', target: '/auth/login', body })?.ip, '203.0.113.7');

  const v6 = signIngressRequest(secret, { ip: '2001:DB8::1', method: 'GET', target: '/auth/me', body: Buffer.alloc(0) });
  assert.equal(v6['x-segaloka-client-ip'], '2001:db8::1');

  // Header IP diubah ke bentuk lain (walau setara) membatalkan verifikasi.
  for (const ip of ['::ffff:203.0.113.7', '2001:DB8::1']) {
    const tampered = { ...signed, 'x-segaloka-client-ip': ip };
    assert.equal(verifyIngressRequest(tampered, secret, { method: 'POST', target: '/auth/login', body }), null, ip);
  }
  for (const ip of ['fe80::1%eth0', 'localhost', '203.0.113.7, 10.0.0.1']) {
    assert.equal(canonicalClientIp(ip), null);
    assert.throws(() => signIngressRequest(secret, { ip, method: 'GET', target: '/', body: Buffer.alloc(0) }), /INVALID_INGRESS_REQUEST/);
  }
});
