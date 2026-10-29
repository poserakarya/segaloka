import { randomUUID } from 'node:crypto';

const MAX_LIMIT = 100;

export function parseTravelBranchPage(query = {}) {
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(query.limit ?? '25', 10) || 25)
  );
  const offset = Math.max(0, Number.parseInt(query.offset ?? '0', 10) || 0);
  const search = typeof query.q === 'string' ? query.q.trim().slice(0, 120) : '';
  return { limit, offset, search };
}

export function validateTravelBranchParent(parent) {
  if (!parent || parent.organization_type !== 'travel') {
    const error = new Error('TRAVEL_PARENT_REQUIRED');
    error.code = 'TRAVEL_PARENT_REQUIRED';
    error.statusCode = 422;
    throw error;
  }
  return parent;
}

export function createTravelBranchIdempotencyKey(value) {
  if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 128);
  return randomUUID();
}

export function branchQuotaAllows(activeCount, entitlement = 0) {
  const count = Number.isInteger(activeCount) && activeCount >= 0 ? activeCount : -1;
  const extra = Number.isInteger(entitlement) && entitlement >= 0 ? entitlement : 0;
  return count >= 0 && count < 2 + extra;
}
