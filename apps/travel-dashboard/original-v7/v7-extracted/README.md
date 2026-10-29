# Segaloka Travel V7 — Physical Extraction Boundary

Status: Phase 2N.10

## Source of truth

Existing Dashboard V7 Travel UI/UX and behavior remain authoritative.

This directory does NOT define a redesigned Travel dashboard.

## Travel-owned extraction

- owned/01-portals-primary-travel.js
  - exact extraction from portals.js lines 58-114

- owned/02-portals-travel-vendor-services.js
  - exact extraction from portals.js lines 132-137

## Role orchestration snapshots

- orchestration/10-flows.source.js
- orchestration/20-reviews.source.js
- orchestration/30-regfee.source.js
- orchestration/40-segadeals.source.js
- orchestration/50-sdterms.source.js

These snapshots preserve the existing V7 implementation for route-specific extraction.
They are not an independent canonical business layer.

## Shared services

The Travel dashboard must consume, not fork:

- gateway.js
- notify.js
- sync.js

## Canonical data

Travel must consume the canonical platform collections.
It must not create a second booking, payment, withdrawal, SegaDeals,
review, refund, upload, letter, or ledger truth.

## Effective route order

1. portals.js Travel base
2. flows.js package replacement
3. flows.js booking-list replacement
4. flows.js booking-detail replacement
5. reviews.js booking-detail enrichment
6. sdterms.js booking-detail enrichment
7. regfee.js Travel Mitra enrichment
8. reviews.js Travel Reviews route
9. flows.js Travel Finance replacement
10. segadeals.js Travel SegaDeals route
11. sdterms.js Travel SegaDeals enrichment

## Safety

- no redesign
- no simplified replacement
- no feature deletion
- no canonical data duplication
- no gateway fork
- no notification fork
- no sync fork
- no Control Center runtime modification in Phase 2N.10
- no Supabase mutation
- no Vercel mutation
- no commit/push/deploy