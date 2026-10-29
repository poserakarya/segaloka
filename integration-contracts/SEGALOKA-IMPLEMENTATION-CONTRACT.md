# SEGALOKA - IMPLEMENTATION CONTRACT

## Project Boundaries
- Server: D:\Server-Segaloka
- Dashboard: Dashboard-v7 (existing UI preserved)
- Marketplace: Segaloka-webs (existing UI preserved)
- Mobile: Segaloka-Aplikasi (Flutter Android)

## Canonical Backend
All clients must use authorized Server Segaloka APIs.
Do not invent endpoints or treat mock records as live data.

## Roles
- Super Admin Control Center
- Travel
- Vendor
- Affiliate
- Mitra
- Agen
- Traveler

Roles, permissions, and tenant ownership must be verified
against existing server authorization.

## Travel Synchronization
Travel Dashboard is responsible for authorized management of:
- Travel profile and branches
- Packages and publication
- Prices and inventory
- Departure schedules
- Bookings and travelers
- Payments and documents
- Travel website content

Published and eligible data must be readable by:
- Travel Website
- Segaloka Marketplace
- Flutter Mobile

## Advertising
Vendor creates and manages eligible campaigns.
Central Admin reviews and approves publication.
Only approved and eligible campaigns may be displayed.
Campaign targeting and placements must be authorized.

## Mobile UI
Use the user-provided Segaloka mobile design reference.
- Segaloka logo and notifications
- Travel photo hero
- Search and category tabs
- Eight service categories
- Upcoming departures
- Popular destinations
- SegaDeals
- Bottom navigation: Beranda, Jelajahi, Pesanan, Akun
- Language and currency under Akun > Pengaturan

Never show sample prices or packages as live inventory.

## Required End-to-End Verification
1. Travel creates or updates a package.
2. Server validates and persists changes.
3. Authorized publication makes package available.
4. Marketplace and Mobile read the same published data.
5. Booking creates a persisted server record.
6. Travel Dashboard receives the booking.
7. Payment status comes from verified server records.
8. Vendor campaign requires central approval.
9. Approved campaign appears only in permitted placements.

## Restrictions
- No Dashboard redesign.
- No Marketplace redesign.
- No workspace switching in Control Center.
- No duplicated business databases.
- No unapproved deployment.
- No new domains or hosting projects.