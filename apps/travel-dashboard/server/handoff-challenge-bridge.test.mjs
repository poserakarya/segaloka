import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createHandoffChallengeStore
} from './handoff-challenge.mjs';

import {
  createHandoffChallengeBridge
} from './handoff-challenge-bridge.mjs';

function fixture(options = {}) {
  return createHandoffChallengeBridge({
    challenges: createHandoffChallengeStore(),
    ...options
  });
}

function input(issued) {
  return {
    cookieId: issued.id,
    challengeId: issued.id,
    challenge: issued.challenge,
    binding: issued.binding
  };
}

test('valid challenge succeeds once', () => {
  const bridge = fixture();
  const issued = bridge.start();

  assert.equal(bridge.consume(input(issued)), true);
  assert.equal(bridge.consume(input(issued)), false);
});

test('different browser cookie rejected', () => {
  const bridge = fixture();
  const issued = bridge.start();

  assert.equal(bridge.consume({
    ...input(issued),
    cookieId: 'a'.repeat(64)
  }), false);

  assert.equal(bridge.consume(input(issued)), true);
});

test('incorrect binding rejected and cannot replay', () => {
  const bridge = fixture();
  const issued = bridge.start();

  assert.equal(bridge.consume({
    ...input(issued),
    binding: 'b'.repeat(64)
  }), false);

  assert.equal(bridge.consume(input(issued)), false);
});

test('incorrect challenge rejected and cannot replay', () => {
  const bridge = fixture();
  const issued = bridge.start();

  assert.equal(bridge.consume({
    ...input(issued),
    challenge: 'c'.repeat(64)
  }), false);

  assert.equal(bridge.consume(input(issued)), false);
});

test('invalid input rejected', () => {
  const bridge = fixture();

  assert.equal(bridge.consume({}), false);
  assert.equal(bridge.consume(), false);
});

test('missing dependencies fail closed', () => {
  assert.throws(
    () => createHandoffChallengeBridge({}),
    /INVALID_HANDOFF_BRIDGE_DEPENDENCIES/
  );
});

test('expired challenge rejected', () => {
  let now = 1000;

  const challenges = createHandoffChallengeStore({
    ttlMs: 1000,
    now: () => now
  });

  const bridge = createHandoffChallengeBridge({
    challenges,
    ttlMs: 1000,
    now: () => now
  });

  const issued = bridge.start();

  now = 2001;

  assert.equal(bridge.consume(input(issued)), false);
});

test('bridge TTL cannot exceed 60 seconds', () => {
  assert.throws(
    () => fixture({ ttlMs: 61_000 }),
    /INVALID_HANDOFF_BRIDGE_DEPENDENCIES/
  );
});

test('capacity is bounded', () => {
  const bridge = fixture();

  for (let i = 0; i < 1000; i++) {
    bridge.start();
  }

  assert.throws(
    () => bridge.start(),
    /HANDOFF_BRIDGE_CAPACITY_EXCEEDED/
  );
});

test('expired bindings release capacity', () => {
  let now = 1000;

  const challenges = createHandoffChallengeStore({
    ttlMs: 1000,
    now: () => now
  });

  const bridge = createHandoffChallengeBridge({
    challenges,
    ttlMs: 1000,
    now: () => now
  });

  for (let i = 0; i < 1000; i++) {
    bridge.start();
  }

  now = 2001;

  const issued = bridge.start();

  assert.equal(typeof issued.id, 'string');
  assert.equal(issued.id.length, 64);
});