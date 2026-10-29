import {
  createCipheriv,
  createDecipheriv,
  randomBytes
} from 'node:crypto';

function encryptionKey() {
  const hex = process.env.OAUTH_CONFIG_ENCRYPTION_KEY;

  if (!/^[0-9a-f]{64}$/i.test(hex ?? '')) {
    throw new Error('OAUTH_CONFIG_ENCRYPTION_KEY_INVALID');
  }

  return Buffer.from(hex, 'hex');
}

export function encryptOAuthSecret(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('OAUTH_SECRET_REQUIRED');
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(
    'aes-256-gcm',
    encryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final()
  ]);

  return [
    'v1',
    iv.toString('hex'),
    cipher.getAuthTag().toString('hex'),
    encrypted.toString('hex')
  ].join(':');
}

export function decryptOAuthSecret(value) {
  const parts = String(value ?? '').split(':');

  if (
    parts.length !== 4 ||
    parts[0] !== 'v1'
  ) {
    throw new Error('OAUTH_SECRET_FORMAT_INVALID');
  }

  const [, ivHex, tagHex, dataHex] = parts;

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivHex, 'hex')
  );

  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final()
  ]).toString('utf8');
}