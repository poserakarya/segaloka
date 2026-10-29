import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bffSource = readFileSync(
  new URL('./bff.mjs', import.meta.url),
  'utf8'
);

function controlCenterMembership(me) {
  return Array.isArray(me?.memberships) &&
    me.memberships.some(m =>
      m.role === 'super_admin' &&
      m.organizationId === null
    );
}
test('tanpa membership ditolak', () => {
  assert.equal(controlCenterMembership({ memberships: [] }), false);
});

test('role Travel ditolak', () => {
  assert.equal(controlCenterMembership({
    memberships: [{ role: 'travel', organizationId: 'org-1' }]
  }), false);
});

test('role Vendor ditolak', () => {
  assert.equal(controlCenterMembership({
    memberships: [{ role: 'vendor', organizationId: 'org-1' }]
  }), false);
});

test('super_admin dengan organisasi ditolak', () => {
  assert.equal(controlCenterMembership({
    memberships: [{ role: 'super_admin', organizationId: 'org-1' }]
  }), false);
});

test('super_admin pusat diterima', () => {
  assert.equal(controlCenterMembership({
    memberships: [{ role: 'super_admin', organizationId: null }]
  }), true);
});

test('role palsu ditolak', () => {
  assert.equal(controlCenterMembership({
    memberships: [{ role: 'SUPER_ADMIN', organizationId: null }]
  }), false);
});

test('BFF menolak login tanpa membership Super Admin pusat', () => {
  assert.match(
    bffSource,
    /me\.status !== 200 \|\|\s*!controlCenterMembership\(me\.data\)/
  );
  assert.match(bffSource, /SUPER_ADMIN_ACCESS_REQUIRED/);
  assert.match(
    bffSource,
    /m\.role === 'super_admin' &&\s*m\.organizationId === null/
  );
});