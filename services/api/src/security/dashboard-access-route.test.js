import test from 'node:test';
import assert from 'node:assert/strict';
import { DASHBOARD_ROLES } from './dashboard-boundary.js';

test('dashboard access contract contains seven roles', () => {
  assert.equal(Object.keys(DASHBOARD_ROLES).length, 7);
  assert.equal(new Set(Object.values(DASHBOARD_ROLES)).size, 7);
});

test('control center role is super_admin', () => {
  assert.equal(DASHBOARD_ROLES['control-center'], 'super_admin');
});

test('travel and vendor have distinct roles', () => {
  assert.notEqual(DASHBOARD_ROLES.travel, DASHBOARD_ROLES.vendor);
});