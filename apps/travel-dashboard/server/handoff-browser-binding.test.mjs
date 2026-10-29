import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validHandoffSecret,
  createBrowserBinding,
  hashBrowserBinding,
  equalBrowserBinding
} from './handoff-browser-binding.mjs';

test('binding is 256-bit random hex', () => {
  const binding = createBrowserBinding();

  assert.match(binding, /^[0-9a-f]{64}$/);
  assert.equal(validHandoffSecret(binding), true);
});

test('bindings are unique', () => {
  assert.notEqual(
    createBrowserBinding(),
    createBrowserBinding()
  );
});

test('binding hash is deterministic', () => {
  const binding = createBrowserBinding();

  assert.equal(
    hashBrowserBinding(binding),
    hashBrowserBinding(binding)
  );
});

test('equal binding succeeds', () => {
  const binding = createBrowserBinding();

  assert.equal(
    equalBrowserBinding(binding, binding),
    true
  );
});

test('different bindings are rejected', () => {
  assert.equal(
    equalBrowserBinding(
      createBrowserBinding(),
      createBrowserBinding()
    ),
    false
  );
});

test('invalid bindings are rejected', () => {
  assert.equal(validHandoffSecret('invalid'), false);
  assert.equal(equalBrowserBinding('invalid', 'invalid'), false);

  assert.throws(
    () => hashBrowserBinding('invalid'),
    /INVALID_BROWSER_BINDING/
  );
});