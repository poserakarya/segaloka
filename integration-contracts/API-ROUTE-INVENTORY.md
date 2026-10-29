# Segaloka API Route Inventory

Generated from existing source code.

| Method | Endpoint | Source |
|---|---|---|
| GET | `/auth/me` | `auth\me-route.js:6` |
| GET | `/dashboard/access` | `security\dashboard-access-route.js` |
| GET | `/agen/bookings` | `portal-booking-routes.js` |
| GET | `/agen/bookings/:id` | `portal-booking-routes.js` |
| GET | `/certificates/:token/pdf` | `travel\certificate-routes.js:293` |
| GET | `/certificates/verify/:token` | `travel\certificate-routes.js:369` |
| POST | `/documents` | `documents\document-routes.js:85` |
| GET | `/documents/:id` | `documents\document-routes.js:414` |
| POST | `/documents/:id/issue` | `documents\document-routes.js:256` |
| GET | `/documents/templates` | `documents\document-routes.js:22` |
| GET | `/documents/types` | `documents\document-routes.js:7` |
| GET | `/health` | `server.js:116` |
| GET | `/ready` | `server.js:121` |
| POST | `/travel/bookings` | `travel\booking-routes.js:77` |
| GET | `/travel/bookings/:id` | `travel\booking-routes.js:223` |
| POST | `/travel/bookings/:id/confirm` | `travel\status-routes.js:68` |
| POST | `/travel/bookings/:id/participants` | `travel\booking-routes.js:140` |
| POST | `/travel/certificates/:id/revoke` | `travel\certificate-revoke-routes.js:8` |
| POST | `/travel/departures` | `travel\departure-routes.js:22` |
| GET | `/travel/departures?organizationId=:uuid` | `travel\departure-routes.js` |
| POST | `/travel/departures/:id/mark-departed` | `travel\status-routes.js:138` |
| POST | `/travel/participants/:id/certificate` | `travel\certificate-routes.js:46` |
| POST | `/travel/participants/:id/verify-departure` | `travel\booking-routes.js:275` |
| GET | `/traveler/bookings` | `portal-booking-routes.js` |
| GET | `/traveler/bookings/:id` | `portal-booking-routes.js` |
| GET | `/traveler/certificates` | `travel\traveler-certificate-routes.js:72` |
| GET | `/traveler/certificates/:id` | `travel\traveler-certificate-routes.js:90` |
| GET | `/traveler/certificates/:id/pdf` | `travel\traveler-certificate-download-routes.js:42` |
| GET | `/mitra/bookings` | `portal-booking-routes.js` |
| GET | `/mitra/bookings/:id` | `portal-booking-routes.js` |

`/dashboard/access` returns `organizationId` and `organizationName` for
eligible Travel and Vendor memberships; the BFF still enforces the matching
role and active organization before serving a dashboard.

## Integration Rules

- Affiliate referral-link routes are design-only and are not registered
  by `services/api/src/server.js` until referral-code semantics are
  reconciled with the V7 source.
- Inventory ini hanya menunjukkan deklarasi route.
- Autentikasi dan otorisasi harus diverifikasi terpisah.
- Jangan menganggap endpoint sudah lolos pengujian E2E.
- Jangan membuat endpoint duplikat.
- Dashboard dan Website menggunakan kontrak API yang sama.
- Mobile menggunakan kontrak yang sama pada tahap berikutnya.
