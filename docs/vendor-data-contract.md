# Kontrak data Vendor (berdasarkan skema dan API yang ada)

Status: **audit + usulan.** Tidak ada skema, migrasi, atau endpoint Vendor baru yang dibuat. Dashboard Vendor saat ini menampilkan V7 asli dengan identitas organisasi dari sesi; tabel produk, order, dan keuangan kosong, dan aksinya diblokir.

## 1. Yang benar-benar ada di PostgreSQL

| Tabel / kolom | Relevansi Vendor | Migrasi |
|---|---|---|
| `organizations` (`organization_type IN ('travel','vendor')`, `status`, `is_test_data`) | Identitas organisasi Vendor | 0001, 0024 |
| `roles` (`vendor`), `memberships` (`user_id`, `organization_id`, `role_id`) | Akun Vendor terikat ke satu organisasi Vendor | 0001 |
| `partner_registration_applications` (`application_type IN ('travel','vendor')`, `status`, `payload jsonb`) + `registration_documents` + `partner_registration_events` | Pendaftaran Vendor dan dokumennya | 0038 |
| `registration_country_settings.allow_vendor` | Negara yang membuka pendaftaran Vendor | 0039 |
| `documents` + `document_types` (mis. `VENDOR_ID_CARD`) | Dokumen terbitan per organisasi | 0011, 0012 |
| `organization_subscriptions` | Trigger 0007 melarang subscription untuk Vendor | 0007 |

**Tidak ada** tabel produk/layanan Vendor, order dari Travel ke Vendor, saldo, payout, atau withdrawal Vendor.

## 2. Endpoint API yang ada untuk Vendor

| Endpoint | Siapa | Isi |
|---|---|---|
| `GET /dashboard/access` | akun Vendor | `{ dashboard: 'vendor', organizationId, organizationName }` (hanya org Vendor aktif) — **sudah dipakai** BFF Vendor |
| `GET /auth/me` | akun Vendor | user + memberships — **sudah dipakai** |
| `GET /registration/applications/mine`, `GET /registration/documents/:id` | pemilik aplikasi | status pendaftaran Vendor dan dokumennya |
| `GET /control-center/vendors` | super_admin | direktori Vendor (nama, status, jumlah anggota) — dipakai Control Center |
| `GET /documents/:id`, `/documents/types`, `/documents/templates` | sesuai otorisasi dokumen | dokumen organisasi |

Tidak ada stream SSE atau event outbox untuk Vendor.

## 3. Yang bisa disambungkan tanpa skema baru
1. **Status pendaftaran dan dokumen Vendor** di halaman V7 "Dokumen & Verifikasi" (`/p/vendor/documents`) dari `/registration/applications/mine` lewat BFF Vendor (endpoint BFF baru, read-only).
2. **Identitas organisasi** (sudah tampil).

## 4. Usulan skema produk/order (butuh persetujuan; belum dibuat)

Mengikuti entitas V7 (`VPRODUCTS`, `VORDERS`):

- `vendor_products(id, vendor_organization_id → organizations[vendor], name, category, unit, price_amount, currency, allotment, status: draft|review|published|archived, created_at, updated_at)`
- `vendor_orders(id, vendor_product_id, travel_organization_id → organizations[travel], booking_id → travel_bookings NULL, quantity, unit_price_amount, currency, status: requested|accepted|rejected|fulfilled|cancelled, note, created_by, created_at, updated_at)`
- Otorisasi:
  - Vendor hanya melihat/mengubah data organisasinya.
  - Travel hanya membuat/melihat order miliknya.
  - Control Center hanya baca.
- Event outbox `vendor_product` / `vendor_order` dalam transaksi yang sama. Stream `/sync/vendor/events` difilter dengan `vendor_organization_id`.
- Keuangan/payout Vendor menunggu keputusan integrasi pembayaran.
