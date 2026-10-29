# Segaloka Integration Implementation Baseline

## Server Health
- Port 4192: Health endpoint unavailable
- Port 4201: Health endpoint unavailable

## Dashboard Applications
- affiliate
- agen
- control-center
- mitra
- travel
- traveler
- vendor

## Server API Route Declarations
- services\api\src\server.js:116
- services\api\src\server.js:121
- services\api\src\auth\email-verification-route.js:20
- services\api\src\auth\login-http.integration.js:151
- services\api\src\auth\login-route.js:25
- services\api\src\auth\me-route.js:6
- services\api\src\auth\password-reset-route.js:45
- services\api\src\auth\password-reset-route.js:86
- services\api\src\auth\registration-route.js:44
- services\api\src\auth\session-route.js:21
- services\api\src\auth\session-route.js:64
- services\api\src\documents\document-routes.js:7
- services\api\src\documents\document-routes.js:22
- services\api\src\documents\document-routes.js:85
- services\api\src\documents\document-routes.js:256
- services\api\src\documents\document-routes.js:414
- services\api\src\travel\booking-routes.js:77
- services\api\src\travel\booking-routes.js:140
- services\api\src\travel\booking-routes.js:223
- services\api\src\travel\booking-routes.js:275
- services\api\src\travel\certificate-revoke-routes.js:8
- services\api\src\travel\certificate-routes.js:46
- services\api\src\travel\certificate-routes.js:293
- services\api\src\travel\certificate-routes.js:369
- services\api\src\travel\departure-routes.js:22
- services\api\src\travel\status-routes.js:68
- services\api\src\travel\status-routes.js:138
- services\api\src\travel\traveler-certificate-download-routes.js:42
- services\api\src\travel\traveler-certificate-routes.js:72
- services\api\src\travel\traveler-certificate-routes.js:90

## Website Package and Booking Files
- src\components\booking\AccommodationBookingClient.tsx
- src\components\booking\AccommodationPackageInfoClient.tsx
- src\components\booking\BookingFormClient.tsx
- src\components\booking\visa\VisaBookingClient.tsx
- src\components\home\SponsoredPackageRail.tsx
- src\components\package\PackageDetailClient.tsx
- src\ui\visa-booking\visa-booking.i18n.ts

## Mobile Dart Files
- lib\main.dart

## Integration Requirements
- No Dashboard or Marketplace layout redesign.
- Control Center separated from six role dashboards.
- Travel Dashboard synchronized with Travel Website and Marketplace.
- Vendor advertisements require central approval.
- Mobile uses the same authorized backend data.
- Language and currency settings belong in Mobile Profile.
- Android emulator is the Mobile preview.
- Browser is used for Dashboard and Marketplace previews.
