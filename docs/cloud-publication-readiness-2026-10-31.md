# Audit kesiapan publikasi Dashboard Segaloka — 31 Oktober 2026

Status: **BELUM SIAP PRODUCTION**. Dokumen ini mencatat hasil inspeksi read-only GitHub, Vercel, dan Railway. Bukan bukti bahwa layanan API atau PostgreSQL cloud sudah aktif.

## Ruang lingkup dan prinsip
- Repository: `poserakarya/segaloka`, branch kerja `e2e-02`. Jangan ubah `main` tanpa persetujuan.
- Pertahankan tujuh Dashboard V7 existing dan satu API bersama; tidak membuat ulang UI.
- Marketplace adalah pintu masuk login Travel, Vendor, Affiliate, Mitra, Agen, dan Traveler; akses dashboard wajib melewati autentikasi, pemeriksaan role, membership, dan tenant server-side.
- Control Center hanya untuk Super Admin. URL login dapat diakses, data dan tindakan admin tidak publik.
- Tidak menggunakan Supabase, data demo production, atau layanan berbayar tanpa persetujuan.

## Bukti yang sudah diperiksa
1. Proyek Vercel pada akun Segaloka: `segaloka` (Next.js) dan `segaloka-control-center` (Node.js). Keduanya memiliki deployment READY tetapi properti `live: false` pada saat pemeriksaan.
2. `admin.segaloka.com` terdaftar dan terverifikasi pada proyek `segaloka-control-center`. Preview `*.vercel.app` memakai Vercel SSO Deployment Protection; jangan menghapus proteksi hanya untuk membuat halaman terlihat publik.
3. `filter_project_envs` untuk kedua proyek Vercel mengembalikan daftar kosong (tidak ada environment variable yang ditemukan).
4. `apps/control-center/bff.mjs` memakai `API_ORIGIN || 'http://127.0.0.1:4192'`. Tanpa API_ORIGIN, login cloud berisiko mengarah ke localhost runtime, bukan API Segaloka.
5. Pemeriksaan runtime errors Vercel mengembalikan 403 dari API observability; akar penyebab pesan gagal login belum dapat dikonfirmasi melalui log.
6. `deploy/cloud/compose.production.yaml`, `deploy/cloud/production.env.example`, dan `deploy/cloud/README.md` menyediakan rancangan PostgreSQL 17, API, tujuh dashboard, Nginx, secret, dan runner migrasi; README menyatakan belum dideploy.
7. `production.env.example` masih menggunakan `control.dashboard.segaloka.com` untuk Control Center, berbeda dari `admin.segaloka.com` yang sudah terpasang di Vercel.
8. Railway yang terhubung hanya menampilkan proyek `powerful-insight` dengan layanan `qiblatgo-backend`. Proyek ini bukan Segaloka; jangan digunakan atau diubah.

## Keputusan arsitektur yang perlu dikunci sebelum deploy
- Gunakan satu alamat kanonis Control Center: **`admin.segaloka.com`**, dengan satu target deployment yang jelas. Sebelum mengubah konfigurasi Docker atau DNS, tentukan apakah Control Center tetap di Vercel atau dipindahkan ke stack Nginx cloud; hindari split traffic dan konflik sertifikat.
- API kanonis: **`https://api.segaloka.com`**, setelah endpoint HTTPS benar-benar tersedia, sehat, dan dapat diautentikasi.
- Domain dashboard lainnya dapat mengikuti `<role>.dashboard.segaloka.com` setelah verifikasi DNS, TLS, konfigurasi sesi/cookie, CORS, dan handoff.
- Semua BFF wajib mengakses API cloud yang benar; `127.0.0.1` hanya untuk komunikasi di host/container yang memang menjalankan API, bukan default produksi Vercel.
- Kunci enkripsi data existing (TOTP, sertifikat, OAuth) tidak boleh diganti secara acak bila sudah digunakan.

## Gerbang wajib sebelum publikasi
1. **Hosting:** pilih dan verifikasi kapasitas/biaya platform untuk proses Node persisten, PostgreSQL 17, volume backup, TLS, dan tujuh dashboard. Jangan membuat layanan berbayar otomatis.
2. **Database:** backup dan uji restore; audit status `schema_migrations`, lalu uji migrasi pada database staging terisolasi. Tidak ada `apply` production tanpa persetujuan.
3. **API:** aktifkan HTTPS `api.segaloka.com`, health check, ingress signing, `TRUSTED_PROXY_IPS`, dan koneksi PostgreSQL; tidak ada secret di Git.
4. **Autentikasi:** uji login website → handoff dashboard, MFA opsional sesuai kebijakan akun, sesi/cookie, role, membership, tenant isolation, logout, dan revocation.
5. **Control Center:** perbaiki error login dengan log terverifikasi; audit domain kanonis dan proteksi akses sebelum menerima kredensial production.
6. **Tujuh dashboard:** uji masing-masing dengan akun nyata yang telah diotorisasi (tanpa membuat akun/transaksi uji di production); pastikan tanpa login mandiri di dashboard non-admin.
7. **Publikasi:** hanya setelah health, keamanan, dan uji akses lulus; perubahan DNS/deploy memerlukan persetujuan terpisah.

## Tidak dilakukan dalam audit ini
Tidak ada perubahan UI, API, RBAC, migrasi, environment secret, DNS, database, deploy, atau proyek Railway.
