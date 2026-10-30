# Fase B — Rancangan integrasi API, PostgreSQL, dan realtime

Status: **sebagian diimplementasikan (Fase B, tahap 1).** Lihat bagian 0 untuk yang aktif dan diuji. Tanpa migrasi baru dan tanpa `LISTEN/NOTIFY`; mekanisme tetap polling outbox.

## 0. Yang sudah aktif (diuji dengan API Fastify asli + PostgreSQL `_test`, Node 24)

| Perubahan (API) | Event `sync_outbox` (transaksi yang sama) |
|---|---|
| `POST /travel/bookings` | `travel.booking.created` / `travel_booking` |
| `POST /travel/bookings/:id/participants` | `travel.booking.participant_added` / `travel_booking_participant` |
| `POST /travel/bookings/:id/confirm` | `travel.booking.confirmed` / `travel_booking` |
| `POST /travel/participants/:id/verify-departure` | `travel.booking.participant_departed` / `travel_booking_participant` |
| `POST /travel/departures/:id/mark-departed` | `travel.departure.departed` / `travel_departure` |
| `POST /travel/departures` (sudah ada) | `travel.departure.created` / `travel_departure` |

Payload hanya berisi ID (`organizationId`, `bookingId`, `departureId`, `participantId`). Event ditulis setelah perubahan berhasil dan sebelum `COMMIT`. Kegagalan apa pun memicu `ROLLBACK`, sehingga perubahan dan event batal bersamaan (diuji).

| Stream API | Penerima | Filter (di SQL, terhadap state DB saat dikirim) | Proxy BFF |
|---|---|---|---|
| `GET /sync/events?organizationId=` | Travel (anggota org) / super_admin | `organization_id`, departure + booking | `/bff/sync/events` (Travel, sudah ada) |
| `GET /sync/agen/events` | role global `agen` | booking milik akun + hubungan `agent` approved dengan Travel tsb. | `/bff/sync/events` (Agen) |
| `GET /sync/mitra/events` | role global `mitra` | idem, hubungan `partner` | `/bff/sync/events` (Mitra) |
| `GET /sync/traveler/events` | role global `traveler` | booking milik akun atau akun sebagai peserta | `/bff/sync/events` (Traveler) |
| `GET /sync/control-center/events` | role global `super_admin` | semua org Travel produksi (`is_test_data = false`) | `/bff/sync/events` (Control Center) |
| `GET /sync/affiliate/events` (sudah ada) | affiliate dengan izin baca | link referral milik akun | `/bff/sync/affiliate/events` (sudah ada) |

Semua stream memakai satu mekanisme (`openOutboxStream`): kursor `Last-Event-ID`/`?after`, `retry: 3000`, heartbeat 20 detik, cek sesi **dan** cek ulang akses setiap 10 detik (`auth.expired` dengan `INVALID_SESSION`/`ACCESS_REVOKED`), polling 1,5 detik. Stream affiliate sebelumnya tanpa cek sesi/heartbeat; sekarang ikut mekanisme ini.

Runtime dashboard:
- **Agen, Mitra, Traveler (V7):** booking dibaca dari `/bff/bookings` (→ `/agen|mitra|traveler/bookings`), dipetakan ke `BOOKINGS` V7. Event SSE memicu baca ulang tanpa reload. Saat putus: cek `/bff/dashboard/access` (refresh token), baca ulang, lalu buka stream dengan `?after=<id terakhir>`.
- **Control Center:** event memicu `ccLoadBookings` (halaman `/booking`) atau `cc-summary-refresh` (`/overview`).
- **Travel:** event (departure dan booking) memicu baca ulang keberangkatan (perilaku yang sudah ada).
- Aksi V7 tanpa endpoint persisten tetap diblokir.

Belum terintegrasi: lihat bagian 6.

## 1. Kondisi saat ini (dari source)

### Realtime yang sudah ada
- Tabel `public.sync_outbox` (migrasi `0018_sync_outbox.sql`): `id bigint identity`, `organization_id`, `event_type`, `entity_type`, `entity_id`, `payload jsonb`, `created_at`.
- Penulis outbox hanya dua:
  - `services/api/src/travel/departure-routes.js` (`travel_departure`)
  - `services/api/src/affiliate/referral-links-route.js` (`affiliate_referral_link`)
- SSE di `services/api/src/sync-routes.js`:
  - `GET /sync/events?organizationId=` untuk Travel, difilter per organisasi dan `entity_type = 'travel_departure'`.
  - `GET /sync/affiliate/events` untuk link referral affiliate.
  - Mekanisme: polling outbox setiap `POLL_INTERVAL_MS = 1500`, cek sesi setiap 10 detik, heartbeat 20 detik, kursor `Last-Event-ID`.
- Proxy SSE di BFF:
  - Travel: `/bff/sync/events`
  - Affiliate: `/bff/sync/affiliate/events`
  - Vendor, Agen, Mitra, Traveler, dan Control Center belum punya.

### Data yang sudah dibaca dari API
- **Travel:** keberangkatan (`GET /travel/departures`), dimuat ke tampilan V7 oleh runtime `apps/travel-dashboard/server/v7-source.mjs`.
- **Control Center:** ringkasan, travel, cabang, vendor, booking, audit log lewat `/control-center/*` (20 aksi `cc-*`).
- **Agen, Mitra, Traveler:** endpoint baca `GET /agen/bookings`, `/mitra/bookings`, `/traveler/bookings` (+ `/:id`), dan sertifikat traveler. Hasilnya belum dipetakan ke tampilan V7 portal; tabel V7 portal masih kosong.
- **Affiliate:** `GET/POST/PATCH /affiliate/referral-links`. Belum dipetakan ke V7.
- **Vendor:** belum ada endpoint data Vendor (produk, order, keuangan).

### Celah
- `POST /travel/bookings`, `/travel/bookings/:id/confirm`, `/travel/bookings/:id/participants`, dan verifikasi keberangkatan tidak menulis ke `sync_outbox`. Perubahan booking tidak pernah sampai ke dashboard lain secara realtime.
- Belum ada endpoint katalog publik (paket/keberangkatan) untuk website dan aplikasi mobile (lihat Fase C).
- Aksi bisnis V7 di portal diblokir oleh `apps/shared/runtime/v7-action-policy.mjs` sampai endpoint persisten tersedia. Setiap aksi yang nanti disambungkan harus dipindahkan dari daftar blokir secara eksplisit.

## 2. Prinsip
1. Satu sumber kebenaran: PostgreSQL Segaloka melalui API Fastify. Dashboard tidak menyimpan state bisnis lokal.
2. Setiap perubahan data yang terlihat oleh pihak lain menulis event ke `sync_outbox` **dalam transaksi yang sama** dengan perubahannya, sehingga tidak ada event tanpa data dan tidak ada data tanpa event.
3. Event difilter di API berdasarkan tenant dan role (RBAC yang sama dengan endpoint baca). BFF hanya meneruskan SSE dan tidak menambah izin.
4. Klien menerima event sebagai sinyal, lalu membaca ulang data lewat endpoint baca yang sudah berotorisasi. Payload event tidak dipakai sebagai data.
5. Tidak ada klaim "realtime" sebelum lolos tes E2E dengan API asli dan PostgreSQL `_test`: perubahan di dashboard A harus muncul di dashboard B tanpa reload, dan tidak muncul di tenant lain.

## 3. Rancangan

### 3.1 Penulis outbox baru (API)

| Perubahan | `entity_type` | `organization_id` | Penerima |
|---|---|---|---|
| Booking dibuat/dikonfirmasi/dibatalkan | `travel_booking` | Travel pemilik keberangkatan | Travel (org), Control Center, Agen/Mitra pemesan, Traveler pemesan |
| Peserta ditambah/diverifikasi | `travel_booking_participant` | idem | idem |
| Keberangkatan (sudah ada) | `travel_departure` | Travel | Travel, Control Center, Agen/Mitra yang punya hubungan approved |
| Hubungan partner disetujui/diubah | `travel_partner_relationship` | Travel | Travel, Agen/Mitra terkait |
| Link referral (sudah ada) | `affiliate_referral_link` | – | Affiliate pemilik |

Payload berisi `id` dan `version`/`updated_at` saja; data dibaca ulang dari endpoint.

### 3.2 Endpoint SSE per dashboard (API)
Semua memakai mekanisme yang sama dengan `/sync/events`: kursor, heartbeat, cek sesi, dan filter di SQL.

- `GET /sync/travel/events?organizationId=`: perluasan `/sync/events` ke `travel_booking*`.
- `GET /sync/partner/events`: Agen/Mitra. Filter: `travel_booking*` untuk booking milik user ini, dan `travel_departure` milik Travel yang punya `travel_partner_relationships` approved dengan user.
- `GET /sync/traveler/events`: booking dan sertifikat milik user.
- `GET /sync/control-center/events`: hanya `super_admin` global, semua `entity_type`.
- Vendor: menunggu endpoint data Vendor.

### 3.3 BFF dan runtime V7
- BFF portal: proxy SSE `/bff/sync/events` mengikuti pola Travel BFF (tanda tangan ingress, `Last-Event-ID`, `X-Accel-Buffering: no`).
- Runtime portal (`v7-portal-source.mjs`): pemuat data per portal, misalnya `apps/shared/runtime/v7-portal-data/<role>.mjs`, yang memetakan respons API ke array V7 (`BOOKINGS`, `DEPS`, `REFLINKS`, …) dengan bentuk field yang sama seperti `loadSegalokaTravelData()` Travel. Pemuat dipanggil saat boot dan pada setiap event `change`.
- Aksi V7 yang punya endpoint persisten dipindahkan dari blokir ke "tersambung", dengan handler yang memanggil BFF dan membaca ulang data. Aksi tanpa endpoint tetap diblokir dengan pesan "Belum tersambung ke server; perubahan tidak disimpan".

### 3.4 Opsi pemicu: polling vs `LISTEN/NOTIFY`
- **Opsi 1 (tanpa migrasi):** tetap polling outbox 1,5 detik per koneksi SSE. Sederhana dan sudah teruji, tapi beban query bertambah seiring jumlah koneksi.
- **Opsi 2 (migrasi baru, mis. `0041_sync_outbox_notify.sql`):** trigger `AFTER INSERT ON sync_outbox` → `pg_notify('segaloka_sync', id)`. API memakai satu koneksi `LISTEN` lalu membangunkan stream terkait; polling tetap sebagai cadangan. Butuh persetujuan migrasi; hanya dijalankan di DB tes sampai disetujui.
- Rekomendasi: mulai dengan Opsi 1 untuk semua dashboard, ukur, lalu putuskan Opsi 2.

### 3.5 Preferensi akun
`apps/shared/runtime/account-preferences.mjs` sudah membaca `user.preferences` dari `/auth/me` dan `dashboard.preferences` dari `/dashboard/access` bila API menyediakannya. Saat ini API belum menyediakan keduanya, jadi nilai berasal dari Accept-Language atau default. Untuk preferensi akun sungguhan dibutuhkan:
- Kolom/tabel preferensi (migrasi baru, mis. `user_preferences(user_id, language, locale, currency, time_zone)`) beserta pengaturan organisasi.
- `/auth/me` dan `/dashboard/access` mengembalikan field tersebut, dan endpoint `PATCH` untuk mengubahnya.
- Pemilih bahasa di dashboard menyimpan ke akun lewat API, bukan hanya ke `localStorage`.

## 4. Rencana pengujian (wajib sebelum klaim realtime)
- `tests/realtime-cross-dashboard-e2e.mjs` dengan API Fastify asli dan PostgreSQL `_test`. Contoh: Agen membuat booking → muncul di Travel dan Control Center tanpa reload dalam ≤ 3 detik, dan tidak muncul di Travel lain maupun di Agen lain.
- Tes isolasi SSE per tenant/role di API: event Travel A tidak terkirim ke stream Travel B.
- Tes putus-sambung: kursor `Last-Event-ID` tidak melewatkan event.

## 5. Berkas yang diperkirakan disentuh
- **API:**
  - `services/api/src/sync-routes.js`
  - `services/api/src/travel/booking-routes.js`
  - `services/api/src/travel/departure-routes.js`
  - `services/api/src/portal-booking-routes.js`
  - endpoint Vendor baru
- **Migrasi (opsional, butuh persetujuan):** `database/migrations/0041_*.sql`
- **BFF:** `apps/{vendor,affiliate,agen,mitra}-dashboard/server/bff.mjs`, `apps/traveler-portal/server/bff.mjs`, `apps/control-center/bff.mjs`
- **Runtime:**
  - `apps/shared/runtime/v7-portal-source.mjs`
  - `apps/shared/runtime/v7-action-policy.mjs`
  - `apps/shared/runtime/v7-portal-data/*.mjs` (baru)
  - bundle Control Center lewat `apps/control-center/server.mjs`
- **Tes:** E2E lintas dashboard di atas.

## 6. Belum terintegrasi (setelah Fase B tahap 1)
- **Travel:** belum ada endpoint daftar booking per organisasi, jadi booking belum tampil di Dashboard Travel. Event booking memang diterima, tapi hanya memicu baca ulang keberangkatan.
- **Vendor:** belum ada endpoint data (produk, order, keuangan) maupun stream.
- **Affiliate:** stream dan endpoint link referral sudah ada, tapi belum dipetakan ke `REFLINKS` V7.
- **Control Center:** realtime hanya untuk halaman Booking dan Overview; halaman Travel, Vendor, cabang, dan audit masih dimuat saat dibuka atau di-refresh.
- Booking dari API belum punya paket, harga, maupun pembayaran, sehingga kolom total/terbayar di V7 tampil "—". Detail booking traveler V7 (`/p/traveler/bookings/:id`) memerlukan entitas Travel V7 dan masih menampilkan state kosong.
- Aksi pembuatan booking dari UI V7 Agen/Mitra (`ma-reg-go`) belum disambungkan ke `POST /travel/bookings` dan tetap diblokir.
- Preferensi akun belum tersimpan (butuh migrasi; tidak dikerjakan pada tahap ini).
