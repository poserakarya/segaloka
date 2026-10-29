# Segaloka dashboard - API Requirements

## Affiliate (Design Only; Not Activated)

V7 permits an Affiliate to link multiple Travel organizations, with one
link per Affiliate/Travel pair, and pause/resume links it owns. However,
the V7 URL is built with an Affiliate-level code on each Travel website,
while migration 0022 defines a distinct random code per Affiliate/Travel
row. The active organizations schema also has no website-domain field.
These differences leave URL generation and attribution unresolved.

The route implementation and tests are retained for review, but the
current API source entrypoint does not register them. The Affiliate BFF
proxy cannot make these routes active while the API does not register
them. The already-running API process was not restarted, so its exact
runtime route set remains unverified.

Migration 0022 is already recorded in the database inspected for this
audit from prior work. It adds a link registry and permissions; its
non-destructive rollback revokes those permissions while preserving
tables and records. No migration was applied as part of the current work.
Referral URL generation, code ownership/uniqueness, website resolution,
click attribution, and conversion recording must be reconciled before
activating the API.

## Agen and Mitra Bookings

V7 shows each role its own registered bookings. The existing canonical
tables are `travel_bookings`, `travel_booking_participants`,
`travel_departures`, and `travel_partner_relationships`; no parallel
booking table is introduced.

Implemented read-only contracts:

- `GET /agen/bookings[/:id]`: only bookings created by the authenticated
  Agen with an approved `agent` relationship to the active Travel.
- `GET /mitra/bookings[/:id]`: only bookings created by the authenticated
  Mitra with an approved `partner` relationship to the active Travel.

The Agen and Mitra BFFs expose their respective collection as
`GET /bff/bookings`.

Both require the corresponding global role. Responses contain booking,
departure, and registered-participant information, but no payment or
commission amounts.

The V7 Mitra-to-Agen hierarchy cannot be persisted: the existing partner
relationship table links an Agen/Mitra directly to a Travel and has no
Mitra-owned Agen association. Agent management and package registration
remain blocked until that domain relationship and authorization policy
are defined. V7 commission examples are not enabled.

## Traveler

Implemented read-only contracts:

- `GET /traveler/bookings[/:id]`: booking owner or authenticated Traveler
  participant only; participant fields are limited to that Traveler.
- `GET /traveler/certificates[/:id]` and
  `GET /traveler/certificates/:id/pdf`: require the explicit Traveler role
  and match the authenticated user's own participant record.

The Traveler BFF exposes booking and certificate JSON reads as
`GET /bff/bookings` and `GET /bff/certificates[/:id]`.

The booking and certificate routes use existing canonical tables. Package
catalog, profile, chat, reviews, document uploads, and SegaDeals do not yet
have complete active schemas/API contracts and are not represented with
placeholder data.

## Shared Runtime Gaps

- The database inspected has no `travel_packages` or
  `travel_package_departures` tables. Migration
  `database/migrations/0019_travel_catalog.sql` is a draft and is not
  recorded as applied.
- The inspected database has no `sync_outbox` table, and the API has no
  realtime delivery route. Realtime is not implemented.
- No finance, payment lifecycle, commission, payout, withdrawal, refund,
  or settlement domain table/route is available for these roles.
- API changes do not activate the corresponding original V7 frontends.
  Frontend rendering, real-user sessions, and end-to-end BFF/API access
  must be verified separately.
- New API route registrations and BFF proxies are source-level changes.
  Running API/BFF processes were not restarted, so these additions are
  not claimed as live endpoints yet.
- Live unauthenticated probes against the new Agen, Mitra, and Traveler
  BFF paths currently return HTTP 404 from the older running processes;
  the intended session-protected behavior is not live-verified.

No new schema migration was needed for the read-only booking contracts.
Do not apply draft or future migrations to a production database without
explicit approval.
