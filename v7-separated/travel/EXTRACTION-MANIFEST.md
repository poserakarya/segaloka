# Segaloka Travel Dashboard — Extraction Manifest

## Status

Phase 2B extraction foundation.

The files under `runtime/` are reference snapshots from the current
Segaloka V7 implementation.

They are NOT yet the production Travel Dashboard runtime.

## Source of Truth

Existing Segaloka V7 UI/UX and working business behavior remain the
reference during extraction.

Do not redesign the Travel Dashboard during role separation.

## Travel Dashboard Target Scope

The independent Travel Dashboard must ultimately preserve and combine:

- Beranda / Ringkasan
- Paket
- Booking
- Keberangkatan
- CRM / Leads
- Manifest
- Room List
- Mitra
- Agen
- Vendor
- Affiliate
- Keuangan / Ledger
- Legalitas
- Subscription
- Staff & Role
- Website Travel
- Analytics
- Profil Organisasi
- Cabang

## Existing V7 Route Source

Existing Travel portal behavior currently lives under:

`/p/travel`

Those routes are extraction sources only.

They must not remain the permanent authorization mechanism after role
separation.

## Canonical Shared Infrastructure

The Travel Dashboard must consume, not duplicate:

- authentication
- authorization
- role resolution
- tenant membership
- permission evaluation
- canonical IDs
- booking records
- payment records
- finance ledger
- gateway integration
- notifications
- audit trail
- realtime/event infrastructure
- Supabase access
- RLS enforcement

## Authorization Boundary

Final Travel authorization must require:

1. authenticated session
2. Travel role or authorized Travel staff role
3. Travel tenant membership
4. required permission
5. database RLS

Hostname, frontend route, query string, localStorage, or browser state
must never grant Travel access.

## Cross-Role Integration

Travel must continue to interact with canonical records used by:

- Traveler
- Vendor
- Affiliate
- Mitra
- Agen
- Super Admin

Cross-role notification destinations must eventually become
role-aware dashboard destinations instead of relying on one combined
`/p/*` router.

## Extraction Safety

Do not remove the original Travel implementation from Control Center
until:

- independent Travel runtime exists
- route parity passes
- UI parity passes
- action parity passes
- booking/payment integration passes
- cross-role notification checks pass
- authorization boundary passes

## Phase 2B

This phase creates only:

- isolated reference snapshots
- SHA256 reference manifest
- extraction manifest

No Control Center route is changed.
No production Travel runtime is activated.
No Supabase schema is changed.
No Vercel configuration is changed.
No deployment is performed.