import {
  createCipheriv,
  createDecipheriv,
  randomBytes
} from 'node:crypto';

const KEY_ENV = 'SEGALOKA_TOTP_ENCRYPTION_KEY';

function getEncryptionKey() {
  const encoded = process.env[KEY_ENV];

  if (
    typeof encoded !== 'string' ||
    !/^[a-fA-F0-9]{64}$/.test(encoded)
  ) {
    throw new Error('TOTP_ENCRYPTION_KEY_NOT_CONFIGURED');
  }

  return Buffer.from(encoded, 'hex');
}

function getAssociatedData(userId) {
  if (
    typeof userId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
  ) {
    throw new TypeError('INVALID_TOTP_USER_ID');
  }

  return Buffer.from(
    `segaloka:totp:v1:${userId.toLowerCase()}`,
    'utf8'
  );
}

export function encryptTotpSecret({ userId, secret }) {
  if (
    typeof secret !== 'string' ||
    !/^[A-Z2-7]{32}$/.test(secret)
  ) {
    throw new TypeError('INVALID_TOTP_SECRET');
  }

  const key = getEncryptionKey();
  const iv = randomBytes(12);

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(getAssociatedData(userId));

  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final()
  ]);

  return {
    secretEncrypted: encrypted,
    encryptionIv: iv,
    encryptionTag: cipher.getAuthTag()
  };
}

export function decryptTotpSecret({
  userId,
  secretEncrypted,
  encryptionIv,
  encryptionTag
}) {
  const key = getEncryptionKey();

  if (
    !Buffer.isBuffer(secretEncrypted) ||
    !Buffer.isBuffer(encryptionIv) ||
    !Buffer.isBuffer(encryptionTag) ||
    encryptionIv.length !== 12 ||
    encryptionTag.length !== 16
  ) {
    throw new TypeError('INVALID_TOTP_ENCRYPTED_DATA');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    encryptionIv
  );

  decipher.setAAD(getAssociatedData(userId));
  decipher.setAuthTag(encryptionTag);

  const plaintext = Buffer.concat([
    decipher.update(secretEncrypted),
    decipher.final()
  ]).toString('utf8');

  if (!/^[A-Z2-7]{32}$/.test(plaintext)) {
    throw new Error('INVALID_DECRYPTED_TOTP_SECRET');
  }

  return plaintext;
}