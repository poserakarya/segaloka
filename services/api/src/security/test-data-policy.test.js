import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertProductionOrganization,
  hasTestDataOrganizationColumn,
  isTestDataOrganization,
  productionOrganizationFilter,
  isTestOrganization,
  testOrganizationPredicate
} from './test-data-policy.js';

test('test-data policy uses authoritative organization flag', () => {
  assert.equal(testOrganizationPredicate('o'), 'o.is_test_data = FALSE');
  assert.equal(isTestOrganization({ is_test_data: true }), true);
  assert.equal(isTestOrganization({ is_test_data: false }), false);
});

test('production guard rejects test organizations', () => {
  assert.throws(
    () => assertProductionOrganization({ is_test_data: true }),
    error => error.code === 'TEST_DATA_NOT_ALLOWED_IN_PRODUCTION'
  );
  assert.deepEqual(
    assertProductionOrganization({ id: 'real', is_test_data: false }),
    { id: 'real', is_test_data: false }
  );
});

test('SQL alias is validated', () => {
  assert.throws(() => testOrganizationPredicate('o; DROP TABLE users'));
});

test('legacy schema is fail-closed for the new policy without changing old queries', async () => {
  const calls = [];
  const db = {
    query: async sql => {
      calls.push(sql);
      return { rows: [{ available: false }] };
    }
  };
  assert.equal(await hasTestDataOrganizationColumn(db), false);
  assert.equal(await isTestDataOrganization(db, '00000000-0000-0000-0000-000000000000'), false);
  assert.equal(calls.length, 1);
});

test('active schema blocks marked organizations', async () => {
  let call = 0;
  const db = {
    query: async sql => {
      call += 1;
      if (call === 1) return { rows: [{ available: true }] };
      return { rows: [{ is_test_data: true }] };
    }
  };
  assert.equal(await isTestDataOrganization(db, '00000000-0000-0000-0000-000000000000'), true);
});

test('production filter is absent before migration and active after migration', async () => {
  const oldDb = { query: async () => ({ rows: [{ available: false }] }) };
  assert.equal(await productionOrganizationFilter(oldDb), '');

  const newDb = { query: async () => ({ rows: [{ available: true }] }) };
  assert.equal(await productionOrganizationFilter(newDb, 'o'), ' AND o.is_test_data = FALSE');
});
