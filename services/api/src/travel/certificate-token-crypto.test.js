import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

import {
  encryptCertificateToken,
  decryptCertificateToken,
  hashCertificateToken
} from './certificate-token-crypto.js';

const key = randomBytes(32).toString('hex');
const token = randomBytes(32).toString('hex');

test('enkripsi dan dekripsi token berhasil', () => {
  const encrypted = encryptCertificateToken(token, key);

  assert.ok(encrypted.startsWith('v1:'));
  assert.ok(!encrypted.includes(token));

  const decrypted = decryptCertificateToken(
    encrypted,
    hashCertificateToken(token),
    key
  );

  assert.equal(decrypted, token);
});

test('enkripsi menghasilkan ciphertext berbeda', () => {
  const first = encryptCertificateToken(token, key);
  const second = encryptCertificateToken(token, key);

  assert.notEqual(first, second);
});

test('kunci yang salah ditolak', () => {
  const encrypted = encryptCertificateToken(token, key);

  assert.throws(() => {
    decryptCertificateToken(
      encrypted,
      hashCertificateToken(token),
      randomBytes(32).toString('hex')
    );
  }, /CERTIFICATE_TOKEN_DECRYPTION_FAILED/);
});

test('hash token yang tidak sesuai ditolak', () => {
  const encrypted = encryptCertificateToken(token, key);

  assert.throws(() => {
    decryptCertificateToken(
      encrypted,
      hashCertificateToken(randomBytes(32).toString('hex')),
      key
    );
  }, /CERTIFICATE_TOKEN_DECRYPTION_FAILED/);
});

test('ciphertext yang dimodifikasi ditolak', () => {
  const encrypted = encryptCertificateToken(token, key);
  const parts = encrypted.split(':');

  parts[3] = (
    parts[3][0] === 'a' ? 'b' : 'a'
  ) + parts[3].slice(1);

  assert.throws(() => {
    decryptCertificateToken(
      parts.join(':'),
      hashCertificateToken(token),
      key
    );
  }, /CERTIFICATE_TOKEN_DECRYPTION_FAILED/);
});

test('token dan kunci tidak valid ditolak', () => {
  assert.throws(
    () => encryptCertificateToken('invalid', key),
    /CERTIFICATE_TOKEN_INVALID/
  );

  assert.throws(
    () => encryptCertificateToken(token, 'invalid'),
    /CERTIFICATE_ENCRYPTION_KEY_INVALID/
  );
});