/**
 * Central policy helpers for test organizations.
 *
 * These helpers intentionally use the authoritative organizations flag, not
 * frontend labels or an in-memory registry. Callers must use them only after
 * migration 0024 has been applied.
 */

export const TEST_DATA_MIGRATION = '0024_test_data_and_travel_branches';

const capabilityCache = new WeakMap();

export async function hasTestDataOrganizationColumn(db) {
  if (capabilityCache.has(db)) return capabilityCache.get(db);

  const promise = db.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'organizations'
         AND column_name = 'is_test_data'
     ) AS available`
  ).then(result => result.rows[0]?.available === true);

  capabilityCache.set(db, promise);
  return promise;
}

export async function isTestDataOrganization(db, organizationId) {
  if (!(await hasTestDataOrganizationColumn(db))) return false;

  const result = await db.query(
    `SELECT is_test_data
     FROM public.organizations
     WHERE id = $1
     LIMIT 1`,
    [organizationId]
  );
  return result.rows[0]?.is_test_data === true;
}

export async function productionOrganizationFilter(db, alias = 'o') {
  if (!(await hasTestDataOrganizationColumn(db))) return '';
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) throw new Error('INVALID_SQL_ALIAS');
  return ` AND ${alias}.is_test_data = FALSE`;
}

export function testOrganizationPredicate(alias = 'o') {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) {
    throw new Error('INVALID_SQL_ALIAS');
  }
  return `${alias}.is_test_data = FALSE`;
}

export function publicOrganizationPredicate(alias = 'o') {
  return testOrganizationPredicate(alias);
}

export function assertProductionOrganization(organization) {
  if (!organization || organization.is_test_data === true) {
    const error = new Error('TEST_DATA_NOT_ALLOWED_IN_PRODUCTION');
    error.code = 'TEST_DATA_NOT_ALLOWED_IN_PRODUCTION';
    error.statusCode = 409;
    throw error;
  }
  return organization;
}

export function isTestOrganization(organization) {
  return organization?.is_test_data === true;
}
