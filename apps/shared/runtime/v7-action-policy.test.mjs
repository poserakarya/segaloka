import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildV7ActionGuardScript,
  classifyV7Action,
  isV7ActionAllowed,
  MEMORY_ONLY_ACTIONS,
  MODAL_ACTIONS,
  NAVIGATION_ACTIONS,
  PAYMENT_OMNICHANNEL_ACTIONS,
  SUPABASE_GATEWAY_ACTIONS,
  V7_ACTION_BLOCKED_MESSAGE,
  v7ActionPolicySummary
} from './v7-action-policy.mjs';

const source = await readFile(
  new URL('../../travel-dashboard/original-v7/travel-existing.html', import.meta.url),
  'utf8'
);
const sourceActions = [
  ...new Set([...source.matchAll(/data-act="([a-z0-9-]+)"/g)].map(m => m[1]))
];

test('every data-act in the original V7 source is classified exactly once', () => {
  const classified = [
    ...NAVIGATION_ACTIONS,
    ...MODAL_ACTIONS,
    ...MEMORY_ONLY_ACTIONS,
    ...SUPABASE_GATEWAY_ACTIONS,
    ...PAYMENT_OMNICHANNEL_ACTIONS
  ];

  assert.equal(sourceActions.length, 234);
  assert.equal(new Set(classified).size, classified.length);
  assert.deepEqual([...classified].sort(), [...sourceActions].sort());
  assert.deepEqual(v7ActionPolicySummary(), {
    navigation: 37,
    modal: 36,
    'memory-only': 97,
    'supabase-gateway': 10,
    'payment-omnichannel': 54
  });
});

test('only navigation and modal actions are allowed; unknown actions are denied', () => {
  for (const action of NAVIGATION_ACTIONS) assert.equal(isV7ActionAllowed(action), true);
  for (const action of MODAL_ACTIONS) assert.equal(isV7ActionAllowed(action), true);

  for (const action of [
    ...MEMORY_ONLY_ACTIONS,
    ...SUPABASE_GATEWAY_ACTIONS,
    ...PAYMENT_OMNICHANNEL_ACTIONS
  ]) {
    assert.equal(isV7ActionAllowed(action), false, action);
  }

  assert.equal(classifyV7Action('not-a-real-action'), 'unknown');
  assert.equal(isV7ActionAllowed('not-a-real-action'), false);
  assert.equal(isV7ActionAllowed('pay-go'), false);
  assert.equal(isV7ActionAllowed('sync-now'), false);
  assert.equal(isV7ActionAllowed('confirm-ok'), false);
  assert.equal(isV7ActionAllowed('role'), false);
});

test('guard script wraps blocked handlers with the required message and no success toast', () => {
  const script = buildV7ActionGuardScript({ overrides: ['signout'] });
  const toasts = [];
  const listeners = [];
  const A = {
    nav: () => 'nav',
    'pay-go': () => 'paid',
    'confirm-ok': () => 'saved',
    signout: () => 'logout'
  };
  const context = {
    A,
    toast: (tone, title) => toasts.push([tone, title]),
    document: {
      addEventListener: (type, handler, capture) =>
        listeners.push({ type, handler, capture })
    },
    window: {}
  };

  new Function(...Object.keys(context), script)(...Object.values(context));

  assert.equal(A.nav(), 'nav');
  assert.equal(A.signout(), 'logout');
  assert.equal(A['pay-go'](), undefined);
  assert.equal(A['confirm-ok'](), undefined);
  assert.deepEqual(toasts, [
    ['warn', V7_ACTION_BLOCKED_MESSAGE],
    ['warn', V7_ACTION_BLOCKED_MESSAGE]
  ]);
  assert.equal(V7_ACTION_BLOCKED_MESSAGE, 'Belum tersambung ke server; perubahan tidak disimpan');

  const click = listeners.find(item => item.type === 'click');
  assert.equal(click.capture, true);

  const blockedEvent = {
    target: { closest: () => ({ dataset: { act: 'u-send' } }) },
    defaultPrevented: false,
    stopped: false,
    preventDefault() { this.defaultPrevented = true; },
    stopImmediatePropagation() { this.stopped = true; }
  };
  click.handler(blockedEvent);
  assert.equal(blockedEvent.defaultPrevented, true);
  assert.equal(blockedEvent.stopped, true);

  const allowedEvent = {
    target: { closest: () => ({ dataset: { act: 'nav' } }) },
    preventDefault() { throw new Error('must not block navigation'); },
    stopImmediatePropagation() { throw new Error('must not block navigation'); }
  };
  click.handler(allowedEvent);

  assert.ok(listeners.some(item => item.type === 'submit' && item.capture === true));
  assert.deepEqual(context.window.__SEGALOKA_V7_ACTION_POLICY__, v7ActionPolicySummary());
});
