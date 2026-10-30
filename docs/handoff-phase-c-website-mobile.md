# Handoff Fase C — Integrasi website dan aplikasi mobile dengan API Segaloka

Status: **handoff, belum dikerjakan.** Pada Fase A, `projects/Segaloka-webs` dan `projects/Segaloka-Aplikasi` tidak diubah sama sekali.

## Aturan
- Jangan mengubah `main`, melakukan merge, deploy, atau mengubah DNS tanpa persetujuan.
- Jangan memakai Supabase. API Fastify dan PostgreSQL Segaloka adalah satu-satunya backend.
- Tidak ada data dummy atau mock di runtime production. Mock hanya untuk pengujian terisolasi.
- Jangan menyatakan fitur "realtime" sebelum lolos E2E dengan API dan PostgreSQL `_test`.
- Pertahankan desain website dan aplikasi yang ada.

## Kondisi saat ini (dari source)

### Website — `projects/Segaloka-webs` (Next.js)
- Route API internal di `src/app/api/*` meneruskan auth, registrasi, dan master data ke API Segaloka. Contoh: `/api/auth/login`, `/api/auth/login/select-channel`, `/api/registration/*`, `/api/master-data/countries*`.
- Katalog paket, akomodasi, dan SegaDeals berasal dari **file statis**: `src/data/home.ts`, `src/data/accommodations.ts`, `src/data/segadeals.ts`, dan lainnya. Tidak ada pemanggilan API untuk katalog.
- Halaman yang memakai data katalog antara lain `src/app/search/page.tsx`, `src/app/booking/[slug]/page.tsx`, `src/app/paket/[slug]/page.tsx`, `src/app/segadeals/SegaDealsClient.tsx`, `src/app/affiliate/AffiliateClient.tsx`.
- Banyak berkas `*.bak-*` di `src/` (tidak dihapus).

### Aplikasi mobile — `projects/Segaloka-Aplikasi` (Flutter)
- Hanya `lib/main.dart` (272 baris), tanpa pemanggilan HTTP/API, tanpa autentikasi, tanpa model data. Praktis kerangka awal.

### API — `services/api`
- Belum ada endpoint katalog publik (paket/keberangkatan yang dipublikasikan Travel).
- Endpoint booking yang ada (`POST /travel/bookings`) mensyaratkan role Travel/Agen/Mitra (E2E-02). Traveler tidak dibuka lewat endpoint ini, jadi booking oleh traveler dari website/mobile butuh endpoint dan aturan otorisasi tersendiri.
- Realtime: lihat `docs/phase-b-realtime-design.md` (outbox + SSE).

## Pekerjaan yang diusulkan

### C1. API publik (prasyarat)
- `GET /public/catalog/packages` dan `GET /public/catalog/packages/:slug`: hanya data yang dipublikasikan Travel aktif, tanpa data internal, dengan `productionOrganizationFilter`.
- `GET /public/catalog/departures?packageId=` untuk kursi dan jadwal.
- `GET /sync/public/catalog/events`: SSE publik yang hanya mengirim `id`/`version` perubahan katalog, tanpa data pribadi, dengan rate limit.
- Endpoint booking traveler (`POST /traveler/bookings`) dengan aturan otorisasi dan verifikasi yang disepakati.
- Semua dengan tes otorisasi dan isolasi tenant di PostgreSQL `_test`.

### C2. Website
- Ganti sumber data statis katalog dengan API (server components / route `src/app/api/catalog/*` yang meneruskan ke API Segaloka).
- Revalidasi berbasis event katalog (SSE di sisi klien atau revalidate tag di server) agar perubahan dari Dashboard Travel tampil tanpa deploy ulang.
- Login traveler di website memakai kontrak 2FA yang sama (`/auth/login`, `select-channel`, `verify-otp`, `verify-authenticator`).
- Bahasa ID/EN/AR + RTL dan font Plus Jakarta Sans / IBM Plex Sans Arabic konsisten dengan dashboard (`apps/shared/assets/fonts` dapat dipakai ulang).

### C3. Aplikasi mobile
- Tentukan arsitektur: klien API, penyimpanan token aman (secure storage), refresh token.
- Login + 2FA opsional sesuai kontrak API.
- Katalog dan booking traveler memakai endpoint C1; realtime lewat SSE (atau polling dengan kursor yang sama) bila klien SSE Flutter dipakai.
- i18n ID/EN/AR dengan RTL.

### C4. Pengujian wajib
- **Website:** E2E Playwright terhadap API asli + PostgreSQL `_test`. Perubahan paket di Dashboard Travel harus tampil di website.
- **Mobile:** tes integrasi Flutter terhadap API tes.
- **Isolasi:** data Travel nonaktif atau test-data tidak muncul di katalog publik.

## Keputusan yang dibutuhkan sebelum Fase C
1. Kontrak katalog publik: field mana yang boleh tampil publik.
2. Aturan booking oleh traveler: pembayaran ditunda sampai integrasi pembayaran disetujui.
3. Target platform mobile (Android saja, atau Android + iOS) dan distribusi build uji.
4. Mekanisme realtime publik: SSE publik atau revalidasi berkala.
