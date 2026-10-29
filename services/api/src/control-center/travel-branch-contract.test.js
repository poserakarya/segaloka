import assert from 'node:assert/strict';
import test from 'node:test';
import {
  branchQuotaAllows,
  parseTravelBranchPage,
  validateTravelBranchParent
} from './travel-branch-contract.js';

test('travel branch pagination is bounded', () => {
  assert.deepEqual(parseTravelBranchPage({ limit: '999', offset: '-4', q: ' demo ' }), {
    limit: 100,
    offset: 0,
    search: 'demo'
  });
});

test('only Travel organizations can be branch parents', () => {
  assert.doesNotThrow(() => validateTravelBranchParent({ organization_type: 'travel' }));
  assert.throws(() => validateTravelBranchParent({ organization_type: 'vendor' }), error => (
    error.code === 'TRAVEL_PARENT_REQUIRED'
  ));
});

test('default branch quota is two with optional entitlement', () => {
  assert.equal(branchQuotaAllows(0), true);
  assert.equal(branchQuotaAllows(1), true);
  assert.equal(branchQuotaAllows(2), false);
  assert.equal(branchQuotaAllows(2, 1), true);
});
