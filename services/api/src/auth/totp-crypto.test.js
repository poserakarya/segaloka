import test from 'node:test';
import assert from 'node:assert/strict';

import {
  encodeBase32,
  generateTotp,
  verifyTotp
} from './totp-crypto.js';

const secret = encodeBase32(
  Buffer.from('12345678901234567890', 'ascii')
);

test('TOTP mengikuti RFC 6238 SHA1 enam digit', () => {
  const vectors = [
    [59000, '287082'],
    [1111111109000, '081804'],
    [1111111111000, '050471'],
    [1234567890000, '005924'],
    [2000000000000, '279037'],
    [20000000000000, '353130']
  ];

  for (const [timestamp, expected] of vectors) {
    assert.equal(
      generateTotp({ secret, timestamp }),
      expected
    );
  }
});

test('Kode TOTP benar diterima', () => {
  const timestamp = 1234567890000;
  const code = generateTotp({ secret, timestamp });

  const result = verifyTotp({
    secret,
    code,
    timestamp
  });

  assert.equal(result.valid, true);
  assert.equal(result.counter, Math.floor(timestamp / 30000));
});

test('Kode TOTP salah ditolak', () => {
  const result = verifyTotp({
    secret,
    code: '999999',
    timestamp: 59000
  });

  assert.equal(result.valid, false);
});

test('Kode selain enam digit ditolak', () => {
  for (const code of ['12345', '1234567', 'abcdef', '']) {
    const result = verifyTotp({
      secret,
      code,
      timestamp: 59000
    });

    assert.equal(result.valid, false);
  }
});

test('Kode TOTP di luar toleransi waktu ditolak', () => {
  const code = generateTotp({
    secret,
    timestamp: 59000
  });

  const result = verifyTotp({
    secret,
    code,
    timestamp: 59000 + 120000
  });

  assert.equal(result.valid, false);
});