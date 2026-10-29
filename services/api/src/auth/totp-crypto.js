import {
  createHmac,
  randomBytes,
  timingSafeEqual
} from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function encodeBase32(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new TypeError('INVALID_SECRET_BYTES');
  }

  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[
        (value >>> (bits - 5)) & 31
      ];

      bits -= 5;
    }

    value &= (1 << bits) - 1;
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[
      (value << (5 - bits)) & 31
    ];
  }

  return output;
}

export function decodeBase32(secret) {
  if (
    typeof secret !== 'string' ||
    !/^[A-Z2-7]{32}$/.test(secret)
  ) {
    throw new TypeError('INVALID_TOTP_SECRET');
  }

  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of secret) {
    const index = BASE32_ALPHABET.indexOf(char);

    value = (value << 5) | index;
    bits += 5;

    while (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }

    value &= (1 << bits) - 1;
  }

  if (bits !== 0 && value !== 0) {
    throw new TypeError('INVALID_TOTP_PADDING');
  }

  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return encodeBase32(randomBytes(20));
}

export function generateTotp({
  secret,
  timestamp = Date.now(),
  step = 30
}) {
  if (
    !Number.isFinite(timestamp) ||
    !Number.isSafeInteger(step) ||
    step <= 0
  ) {
    throw new TypeError('INVALID_TOTP_TIME');
  }

  const key = decodeBase32(secret);
  const counter = Math.floor(timestamp / (step * 1000));

  if (!Number.isSafeInteger(counter) || counter < 0) {
    throw new TypeError('INVALID_TOTP_COUNTER');
  }

  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', key)
    .update(message)
    .digest();

  const offset = digest[digest.length - 1] & 15;

  const binary =
    ((digest[offset] & 127) << 24) |
    ((digest[offset + 1] & 255) << 16) |
    ((digest[offset + 2] & 255) << 8) |
    (digest[offset + 3] & 255);

  return String(binary % 1000000).padStart(6, '0');
}

export function verifyTotp({
  secret,
  code,
  timestamp = Date.now(),
  window = 1
}) {
  if (
    typeof code !== 'string' ||
    !/^[0-9]{6}$/.test(code)
  ) {
    return { valid: false, counter: null };
  }

  if (!Number.isInteger(window) || window < 0 || window > 1) {
    throw new TypeError('INVALID_TOTP_WINDOW');
  }

  const currentCounter = Math.floor(timestamp / 30000);

  for (let offset = -window; offset <= window; offset++) {
    const counter = currentCounter + offset;

    if (counter < 0) continue;

    const expected = generateTotp({
      secret,
      timestamp: counter * 30000
    });

    if (
      timingSafeEqual(
        Buffer.from(code),
        Buffer.from(expected)
      )
    ) {
      return { valid: true, counter };
    }
  }

  return { valid: false, counter: null };
}

export function createTotpUri({
  secret,
  accountName,
  issuer = 'Segaloka'
}) {
  decodeBase32(secret);

  if (
    typeof accountName !== 'string' ||
    !accountName.trim()
  ) {
    throw new TypeError('INVALID_TOTP_ACCOUNT');
  }

  const label = `${issuer}:${accountName.trim()}`;

  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30'
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${params}`;
}