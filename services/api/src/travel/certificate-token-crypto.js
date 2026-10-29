import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
  timingSafeEqual
} from 'node:crypto';

const HEX64 = /^[0-9a-f]{64}$/i;
const FORMAT = 'v1';
const CONTEXT = Buffer.from(
  'segaloka:travel-certificate-token:v1',
  'utf8'
);

function encryptionKey(value = process.env.CERTIFICATE_ENCRYPTION_KEY) {
  if (typeof value !== 'string' || !HEX64.test(value)) {
    throw new Error('CERTIFICATE_ENCRYPTION_KEY_INVALID');
  }

  return Buffer.from(value, 'hex');
}

export function hashCertificateToken(token) {
  if (typeof token !== 'string' || !HEX64.test(token)) {
    throw new Error('CERTIFICATE_TOKEN_INVALID');
  }

  return createHash('sha256')
    .update(token.toLowerCase(), 'utf8')
    .digest('hex');
}

export function encryptCertificateToken(token, keyValue) {
  if (typeof token !== 'string' || !HEX64.test(token)) {
    throw new Error('CERTIFICATE_TOKEN_INVALID');
  }

  const key = encryptionKey(keyValue);
  const iv = randomBytes(12);

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(CONTEXT);

  const encrypted = Buffer.concat([
    cipher.update(token.toLowerCase(), 'utf8'),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return [
    FORMAT,
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex')
  ].join(':');
}

export function decryptCertificateToken(
  encryptedValue,
  expectedHash,
  keyValue
) {
  if (
    typeof encryptedValue !== 'string' ||
    typeof expectedHash !== 'string' ||
    !HEX64.test(expectedHash)
  ) {
    throw new Error('CERTIFICATE_TOKEN_CIPHERTEXT_INVALID');
  }

  const parts = encryptedValue.split(':');

  if (
    parts.length !== 4 ||
    parts[0] !== FORMAT ||
    !/^[0-9a-f]{24}$/i.test(parts[1]) ||
    !/^[0-9a-f]{32}$/i.test(parts[2]) ||
    !/^[0-9a-f]{128}$/i.test(parts[3])
  ) {
    throw new Error('CERTIFICATE_TOKEN_CIPHERTEXT_INVALID');
  }

  const key = encryptionKey(keyValue);

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(parts[1], 'hex')
    );

    decipher.setAAD(CONTEXT);
    decipher.setAuthTag(Buffer.from(parts[2], 'hex'));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(parts[3], 'hex')),
      decipher.final()
    ]).toString('utf8');

    const actualHash = Buffer.from(
      hashCertificateToken(plaintext),
      'hex'
    );

    const requiredHash = Buffer.from(
      expectedHash,
      'hex'
    );

    if (!timingSafeEqual(actualHash, requiredHash)) {
      throw new Error('CERTIFICATE_TOKEN_HASH_MISMATCH');
    }

    return plaintext;
  } catch {
    throw new Error('CERTIFICATE_TOKEN_DECRYPTION_FAILED');
  }
}