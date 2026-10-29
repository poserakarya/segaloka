# Travel Branches API Contract — Draft

Status: draft for review. No endpoint is active and no migration has been applied.

## Resource

`travel_branches` belongs to exactly one `organizations` row whose `organization_type` is `travel`.

Inactive branches remain in storage and count toward the branch quota unless the approved product policy explicitly changes this rule. The initial recommendation is to count both active and inactive branches to prevent quota circumvention.

## Authentication and authorization

All routes require the existing session middleware and a global `super_admin` membership with `organization_id IS NULL`. No login or registration route is added to Control Center. Logout remains unchanged.

## Routes

### `GET /control-center/travel-branches`

Query parameters:

- `organizationId` — optional UUID filter for a Travel organization.
- `q` — optional bounded search over branch code, name, city, and PIC.
- `limit` — integer, default 25, maximum 100.
- `offset` — non-negative integer, default 0.

Response:

```json
{
  "source": "postgresql",
  "items": [],
  "pagination": { "limit": 25, "offset": 0, "total": 0 }
}
```

### `GET /control-center/travels/:travelId/branches`

Uses the same pagination and search contract, scoped to a validated Travel parent. A non-Travel parent returns `404` or the approved domain error; it must not expose branches from another organization.

### `POST /control-center/travels/:travelId/branches`

Request fields:

```json
{
  "branchCode": "JKT-01",
  "branchName": "Jakarta",
  "address": null,
  "countryCode": "ID",
  "province": null,
  "city": null,
  "postalCode": null,
  "phone": null,
  "email": null,
  "personInCharge": null
}
```

The handler must validate the parent as `travel`, acquire a transaction-scoped advisory lock keyed by the parent organization, lock/read the applicable subscription and entitlement rows, count existing branches, enforce the default quota of two plus an approved add-on entitlement, insert the row, and write an audit log before commit.

### `PATCH /control-center/travels/:travelId/branches/:branchId`

Only approved mutable fields may be changed. The handler must verify both `travelId` and `branchId` relationship, validate the request, update `updated_at`, write an audit log, and commit atomically. Re-parenting is not supported.

## Errors

- `401 AUTH_REQUIRED` — no valid session.
- `403 CONTROL_CENTER_ACCESS_DENIED` — not global `super_admin`.
- `404 TRAVEL_NOT_FOUND` / `BRANCH_NOT_FOUND` — resource or parent does not exist.
- `409 BRANCH_CODE_EXISTS` — duplicate code within the parent Travel.
- `409 BRANCH_QUOTA_EXCEEDED` — no available quota.
- `422 VALIDATION_ERROR` — invalid UUID or field values.
- `503 TRAVEL_BRANCHES_UNAVAILABLE` — upstream/database unavailable.

## BFF mapping

The BFF should proxy the four routes under `/bff/control-center/...` using the existing session cookie, same-origin policy, and access check. It must not accept a client-supplied organization as an authorization substitute.

## Frontend mapping

The existing routes `/travel/branches` and `/travel/:id/branches` may be wired only after migration and API activation. Until then, the existing legacy `BRANCHES` array must not be used as an active source; the UI should remain unavailable/read-only without fabricated values.

## Required tests

Test valid Travel, non-Travel parent, duplicate code, quota 1–2, quota exhaustion without add-on, quota with approved add-on, concurrent creates, 401/403, pagination/search, audit log creation, ID/EN/AR, and rollback on failed transaction.
