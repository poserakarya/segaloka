# SEGALOKA - INTEGRATION MASTER

## 1. Arsitektur

Server Segaloka adalah pusat:
- Authentication
- Authorization dan RBAC
- Tenant isolation
- API contracts
- Data validation
- Realtime synchronization
- Integration orchestration

PostgreSQL adalah sumber data utama.

## 2. Platform

### Dashboard
Status: IN PROGRESS

Tanggung jawab:
- Control Center
- Travel Dashboard
- Vendor Dashboard
- Affiliate Dashboard
- Mitra Dashboard
- Agen Dashboard
- Traveler Dashboard
- Operasional, keuangan, dan pengelolaan konten

### Website
Status: IN PROGRESS

Tanggung jawab:
- Marketplace publik
- Katalog dan pencarian
- Detail paket
- Visa dan akomodasi
- Booking
- Pembayaran
- Tracking dan chat pelanggan

### Mobile
Status: PLANNED

Kontrak API disiapkan dari awal.
Implementasi aplikasi dilakukan pada tahap berikutnya.

## 3. Aturan Integrasi

1. Satu domain data memiliki satu pemilik skema.
2. Jangan membuat tabel atau migrasi duplikat.
3. Perubahan skema harus dicatat beserta dependensinya.
4. Jangan menganggap endpoint tersedia sebelum diverifikasi.
5. Semua operasi tulis divalidasi oleh server.
6. Semua akses privat wajib diautentikasi.
7. Data organisasi wajib mengikuti tenant isolation.
8. Perubahan data menghasilkan event setelah transaksi berhasil.
9. Klien melakukan cache invalidation dan refetch otomatis.
10. Klien melakukan reconnect dan resync setelah offline.
11. Tidak boleh ada data demo pada lingkungan produksi.
12. Jangan push atau deploy tanpa persetujuan.

## 4. Kontrak Realtime yang Direncanakan

Event envelope:
- eventId
- contractVersion
- eventType
- resource
- entityId
- organizationId
- version
- occurredAt

Transport:
- Server-Sent Events untuk notifikasi perubahan
- API HTTPS untuk mengambil data terbaru
- Cursor untuk melanjutkan sinkronisasi
- Snapshot ulang jika cursor tidak lagi tersedia

Status: PLANNED, belum dianggap aktif.

## 5. Kepemilikan Flow

Dashboard:
Pengelolaan data -> API -> PostgreSQL -> Event

Website:
API -> katalog/booking/transaksi -> Event

Mobile:
API -> cache lokal -> sinkronisasi saat online

## 6. Proses Penambahan Fitur

1. Identifikasi flow bisnis.
2. Cari endpoint dan tabel existing.
3. Tetapkan pemilik data.
4. Tentukan role dan permission.
5. Tentukan perubahan skema jika diperlukan.
6. Tentukan event dan cache invalidation.
7. Implementasikan pada modul pemilik.
8. Uji API dan database.
9. Uji Dashboard dan Website.
10. Catat kontrak untuk Mobile.

## 7. Status Implementasi

- API utama: tersedia
- PostgreSQL: tersedia
- Dashboard integration: belum diverifikasi end-to-end
- Website integration: belum diverifikasi end-to-end
- Mobile integration: direncanakan
- Realtime SSE: belum diimplementasikan
- Transactional outbox: belum diaktifkan
- Automatic migration orchestration: belum diimplementasikan

## 8. Dokumen Terkait

- dashboard-api-requirements.md
- website-api-requirements.md
- mobile-api-requirements.md