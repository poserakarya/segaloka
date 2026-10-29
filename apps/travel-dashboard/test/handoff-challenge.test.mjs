import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandoffChallengeStore } from '../server/handoff-challenge.mjs';

test('issues cryptographically shaped challenge', () => {
  const store = createHandoffChallengeStore();
  const issued = store.issue();

  assert.match(issued.id, /^[0-9a-f]{64}$/);
  assert.match(issued.challenge, /^[0-9a-f]{64}$/);
  assert.notEqual(issued.id, issued.challenge);
  assert.equal(issued.expiresIn, 60);
});

test('challenge is consumed only once', () => {
  const store = createHandoffChallengeStore();
  const issued = store.issue();

  assert.equal(store.consume(issued.id, issued.challenge), true);
  assert.equal(store.consume(issued.id, issued.challenge), false);
});

test('invalid challenge is rejected', () => {
  const store = createHandoffChallengeStore();
  const issued = store.issue();

  assert.equal(store.consume(issued.id, 'invalid'), false);
  assert.equal(store.consume(issued.id, issued.challenge), true);
});

test('wrong valid challenge invalidates pending attempt', () => {
  const store = createHandoffChallengeStore();
  const issued = store.issue();

  const wrong = '0'.repeat(64) === issued.challenge
    ? '1'.repeat(64)
    : '0'.repeat(64);

  assert.equal(store.consume(issued.id, wrong), false);
  assert.equal(store.consume(issued.id, issued.challenge), false);
});

test('expired challenge cannot be consumed', () => {
  let clock = 1000;

  const store = createHandoffChallengeStore({
    ttlMs: 1000,
    now: () => clock
  });

  const issued = store.issue();

  clock = 2000;

  assert.equal(store.consume(issued.id, issued.challenge), false);
});

test('challenge capacity is bounded', () => {
  const store = createHandoffChallengeStore();

  for (let i = 0; i < 1000; i++) {
    store.issue();
  }

  assert.throws(
    () => store.issue(),
    /HANDOFF_CHALLENGE_CAPACITY_EXCEEDED/
  );
});