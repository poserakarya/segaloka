# Phase 2J — Exact V7 Travel Renderer Reference Extraction

SOURCE
- apps/travel/runtime/portals.js
- SHA256: 64E5D7C97C703702FDF55EB42CF1FC29ACCACFCFCC504DB18A5156E87907A7CC

PURPOSE
Reference-only extraction of the existing V7 Travel UI/runtime slices.
These files MUST NOT be loaded as executable production runtime.

PRIMARY TRAVEL
- source lines: 58-114
- file: 01-primary-travel.reference.js

TRAVEL VENDOR SERVICES EXTENSION
- source lines: 131-137
- file: 02-vendor-services.reference.js

SHARED WITHDRAWAL
- source lines: 146-152
- file: 03-shared-withdrawal.reference.js
- shared by Travel, Vendor, Affiliate

CANONICAL NAVIGATION
- Mitra & Agen key: network
- canonical route: /p/travel/mitra
- /p/travel/network is invalid

SAFETY
- Reference-only.
- No canonical data duplicated.
- No authentication implemented here.
- No tenant authorization implemented here.
- No payment/gateway fork.
- No Supabase mutation.
- Legacy /p/travel remains intact.