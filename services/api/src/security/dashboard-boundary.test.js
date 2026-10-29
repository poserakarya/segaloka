import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DASHBOARD_ROLES,
  resolveDashboardAccess
} from './dashboard-boundary.js';

const organizationA = '11111111-1111-4111-8111-111111111111';
const organizationB = '22222222-2222-4222-8222-222222222222';

test('seven dashboards have distinct roles', () => {
  assert.equal(Object.keys(DASHBOARD_ROLES).length, 7);
  assert.equal(new Set(Object.values(DASHBOARD_ROLES)).size, 7);
});

test('unknown dashboard is denied', () => {
  const result = resolveDashboardAccess({
    dashboard: 'unknown',
    memberships: [{ role: 'super_admin', organizationId: null }]
  });

  assert.equal(result.allowed, false);
});

test('missing memberships are denied', () => {
  const result = resolveDashboardAccess({
    dashboard: 'control-center',
    memberships: null
  });

  assert.equal(result.allowed, false);
});

test('traveler cannot access Control Center', () => {
  const result = resolveDashboardAccess({
    dashboard: 'control-center',
    memberships: [{ role: 'traveler', organizationId: null }]
  });

  assert.equal(result.allowed, false);
});

test('super admin can access Control Center', () => {
  const result = resolveDashboardAccess({
    dashboard: 'control-center',
    memberships: [{ role: 'super_admin', organizationId: null }]
  });

  assert.equal(result.allowed, true);
});

test('travel cannot access another travel organization', () => {
  const result = resolveDashboardAccess({
    dashboard: 'travel',
    organizationId: organizationB,
    memberships: [{
      role: 'travel',
      organizationId: organizationA
    }]
  });

  assert.equal(result.allowed, false);
});

test('travel can access its own organization', () => {
  const result = resolveDashboardAccess({
    dashboard: 'travel',
    organizationId: organizationA,
    memberships: [{
      role: 'travel',
      organizationId: organizationA
    }]
  });

  assert.equal(result.allowed, true);
});

test('vendor cannot access another vendor organization', () => {
  const result = resolveDashboardAccess({
    dashboard: 'vendor',
    organizationId: organizationB,
    memberships: [{
      role: 'vendor',
      organizationId: organizationA
    }]
  });

  assert.equal(result.allowed, false);
});

test('vendor requires organization', () => {
  const result = resolveDashboardAccess({
    dashboard: 'vendor',
    memberships: [{
      role: 'vendor',
      organizationId: organizationA
    }]
  });

  assert.equal(result.allowed, false);
});