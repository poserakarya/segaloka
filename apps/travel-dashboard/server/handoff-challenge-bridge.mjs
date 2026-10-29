import {
  createBrowserBinding,
  equalBrowserBinding,
  validHandoffSecret
} from './handoff-browser-binding.mjs';

const DEFAULT_TTL_MS = 60_000;
const MAX_PENDING = 1000;

export function createHandoffChallengeBridge({
  challenges,
  createBinding = createBrowserBinding,
  ttlMs = DEFAULT_TTL_MS,
  now = () => Date.now()
}) {
  if (
    typeof challenges?.issue !== 'function' ||
    typeof challenges?.consume !== 'function' ||
    typeof createBinding !== 'function' ||
    typeof now !== 'function' ||
    !Number.isSafeInteger(ttlMs) ||
    ttlMs < 1 ||
    ttlMs > DEFAULT_TTL_MS
  ) {
    throw new Error('INVALID_HANDOFF_BRIDGE_DEPENDENCIES');
  }

  const bindings = new Map();

  function cleanup() {
    const current = now();

    for (const [id, record] of bindings) {
      if (record.expiresAt <= current) {
        bindings.delete(id);
      }
    }
  }

  function start() {
    cleanup();

    if (bindings.size >= MAX_PENDING) {
      throw new Error('HANDOFF_BRIDGE_CAPACITY_EXCEEDED');
    }

    const challenge = challenges.issue();
    const binding = createBinding();

    if (
      !validHandoffSecret(challenge?.id) ||
      !validHandoffSecret(challenge?.challenge) ||
      !validHandoffSecret(binding) ||
      !Number.isSafeInteger(challenge?.expiresIn) ||
      challenge.expiresIn < 1 ||
      challenge.expiresIn > 60
    ) {
      throw new Error('INVALID_HANDOFF_BRIDGE_CHALLENGE');
    }

    const effectiveTtl = Math.min(
      ttlMs,
      challenge.expiresIn * 1000
    );

    bindings.set(challenge.id, {
      binding,
      expiresAt: now() + effectiveTtl
    });

    return {
      id: challenge.id,
      challenge: challenge.challenge,
      binding,
      expiresIn: Math.ceil(effectiveTtl / 1000)
    };
  }

  function consume({
    cookieId,
    challengeId,
    challenge,
    binding
  } = {}) {
    cleanup();

    if (
      !validHandoffSecret(cookieId) ||
      !validHandoffSecret(challengeId) ||
      !validHandoffSecret(challenge) ||
      !validHandoffSecret(binding)
    ) {
      return false;
    }

    if (!equalBrowserBinding(cookieId, challengeId)) {
      return false;
    }

    const record = bindings.get(challengeId);

    if (!record) {
      return false;
    }

    // One-time use: delete before verification.
    bindings.delete(challengeId);

    if (record.expiresAt <= now()) {
      return false;
    }

    const validChallenge = challenges.consume(
      challengeId,
      challenge
    );

    const validBinding = equalBrowserBinding(
      record.binding,
      binding
    );

    return validChallenge && validBinding;
  }

  return {
    start,
    consume
  };
}