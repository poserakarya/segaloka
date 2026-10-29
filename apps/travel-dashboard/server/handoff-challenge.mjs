import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

const DEFAULT_TTL_MS = 60_000;
const MAX_PENDING = 1000;

function validChallenge(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{64}$/.test(value);
}

function hash(value) {
  return createHash('sha256').update(value).digest();
}

export function createHandoffChallengeStore({
  ttlMs = DEFAULT_TTL_MS,
  now = () => Date.now()
} = {}) {
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1 || ttlMs > 60_000) {
    throw new Error('INVALID_HANDOFF_CHALLENGE_TTL');
  }

  const pending = new Map();

  function cleanup() {
    const current = now();

    for (const [id, record] of pending) {
      if (record.expiresAt <= current) {
        pending.delete(id);
      }
    }
  }

  function issue() {
    cleanup();

    if (pending.size >= MAX_PENDING) {
      throw new Error('HANDOFF_CHALLENGE_CAPACITY_EXCEEDED');
    }

    const id = randomBytes(32).toString('hex');
    const challenge = randomBytes(32).toString('hex');

    pending.set(id, {
      digest: hash(challenge),
      expiresAt: now() + ttlMs
    });

    return {
      id,
      challenge,
      expiresIn: Math.ceil(ttlMs / 1000)
    };
  }

  function consume(id, challenge) {
    cleanup();

    if (!validChallenge(id) || !validChallenge(challenge)) {
      return false;
    }

    const record = pending.get(id);

    if (!record) {
      return false;
    }

    // Delete before verification to prevent replay.
    pending.delete(id);

    return timingSafeEqual(
      record.digest,
      hash(challenge)
    );
  }

  function has(id) {
    cleanup();

    return validChallenge(id) && pending.has(id);
  }

  return {
    issue,
    consume,
    has
  };
}