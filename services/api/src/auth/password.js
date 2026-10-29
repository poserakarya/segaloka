import argon2 from 'argon2';

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

const ARGON2_OPTIONS = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
});

export function validatePassword(password) {
  if (typeof password !== 'string') {
    return {
      valid: false,
      reason: 'Password harus berupa teks.'
    };
  }

  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return {
      valid: false,
      reason: 'Password harus terdiri dari 12 sampai 128 karakter.'
    };
  }

  return { valid: true };
}

export async function hashPassword(password) {
  const validation = validatePassword(password);

  if (!validation.valid) {
    throw new TypeError(validation.reason);
  }

  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash, password) {
  if (
    typeof hash !== 'string' ||
    !hash.startsWith('$argon2id$') ||
    typeof password !== 'string'
  ) {
    return false;
  }

  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}