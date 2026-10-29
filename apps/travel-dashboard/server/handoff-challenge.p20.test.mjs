import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandoffChallengeStore } from './handoff-challenge.mjs';

test('issue creates a valid challenge', () => {
  const store = createHandoffChallengeStore();
  const challenge = store.issue();

  assert.match(challenge.id, /^[0-9a-f]{64}$/);
  assert.match(challenge.challenge, /^[0-9a-f]{64}$/);
  assert.equal(challenge.expiresIn, 60);
  assert.equal(store.has(challenge.id), true);
});

test('consume succeeds once only', () => {
  const store = createHandoffChallengeStore();
  const challenge = store.issue();

  assert.equal(
    store.consume(challenge.id, challenge.challenge),
    true
  );

  assert.equal(store.has(challenge.id), false);

  assert.equal(
    store.consume(challenge.id, challenge.challenge),
    false
  );
});

test('incorrect challenge invalidates pending entry', () => {
  const store = createHandoffChallengeStore();
  const challenge = store.issue();

  assert.equal(
    store.consume(challenge.id, '0'.repeat(64)),
    false
  );

  assert.equal(store.has(challenge.id), false);
});

test('expired challenge cannot be consumed', () => {
  let clock = 1000;

  const store = createHandoffChallengeStore({
    ttlMs: 1000,
    now: () => clock
  });

  const challenge = store.issue();

  clock += 1001;

  assert.equal(store.has(challenge.id), false);

  assert.equal(
    store.consume(challenge.id, challenge.challenge),
    false
  );
});

test('invalid identifiers are rejected', () => {
  const store = createHandoffChallengeStore();

  assert.equal(store.has('invalid'), false);
  assert.equal(store.consume('invalid', 'invalid'), false);
});

test('challenge identifiers are unique', () => {
  const store = createHandoffChallengeStore();

  const first = store.issue();
  const second = store.issue();

  assert.notEqual(first.id, second.id);
  assert.notEqual(first.challenge, second.challenge);
});