# Deploy cloud Segaloka (satu API, satu PostgreSQL, tujuh Dashboard V7)

Status: **konfigurasi siap uji, belum dideploy.** Tidak ada perubahan DNS, data, atau layanan berbayar. Jalankan pertama kali di server staging/QA dengan database terpisah dari production.

## Arsitektur
| Service | Isi | Jaringan |
|---|---|---|
| `postgres` | PostgreSQL 17, satu database utama, volume `segaloka-production-postgres` | `backend` (internal, tanpa port publik) |
| `api` | API Fastify bersama (`Dockerfile.api`) | `backend` + `edge` |
| `dashboards` | Ketujuh Dashboard V7 yang sudah ada: entry server + BFF masing-masing (`Dockerfile.dashboards`, `dashboards-supervisor.mjs`) | `backend` + `edge` |
| `nginx` | Satu-satunya port publik (80/443), satu host per dashboard + host API | `edge` |
| `migrate` | Runner migrasi, hanya dijalankan manual (`--profile migrate`) | `backend` |

| Dashboard | Port entry di container | BFF (hanya 127.0.0.1) | Host (variabel) |
|---|---|---|---|
| Control Center | 4202 | 4203 | `SEGALOKA_CONTROL_CENTER_HOST` |
| Travel | 4200 (build production) | 4201 | `SEGALOKA_TRAVEL_HOST` |
| Vendor | 4204 | 4211 | `SEGALOKA_VENDOR_HOST` |
| Affiliate | 4212 | 4221 | `SEGALOKA_AFFILIATE_HOST` |
| Agen | 4216 | 4231 | `SEGALOKA_AGEN_HOST` |
| Mitra | 4214 | 4241 | `SEGALOKA_MITRA_HOST` |
| Traveler | 4210 | 4251 | `SEGALOKA_TRAVELER_HOST` |

Setiap dashboard tetap memiliki URL, login, cookie sesi, dan kunci enkripsi sesi sendiri. Tidak ada perpindahan role atau dashboard. BFF menandatangani setiap request ke API (ingress identity), dan API menolak request tanpa tanda tangan kecuali rute publik (health, verifikasi sertifikat, Google OAuth start/callback, webhook Resend).

## Konfigurasi
### Non-secret: `production.env`
Salin `production.env.example` ke `production.env` (diabaikan Git), lalu isi hostname, origin publik (wajib `https://`), dan URL publik API. `NODE_ENV=production` mengaktifkan cookie `Secure`, mematikan seed data uji, dan mewajibkan origin HTTPS di supervisor dashboard.

### Secret: berkas di `secrets/` (Docker secrets)
Setiap secret adalah satu berkas teks di `deploy/cloud/secrets/<nama>` (folder diabaikan Git, `chmod 600`). Proses membacanya lewat variabel `<NAMA>_FILE`. Di platform dengan secret manager (Docker Swarm, Kubernetes, layanan cloud), mount secret sebagai berkas di path yang sama. Kalau tidak bisa, set variabel `<NAMA>` langsung.

| Berkas | Variabel | Dipakai oleh | Format |
|---|---|---|---|
| `db_password` | `DB_PASSWORD` / `POSTGRES_PASSWORD` | postgres, api, dashboards, migrate | teks acak kuat |
| `ingress_identity_secret` | `INGRESS_IDENTITY_SECRET` | api, dashboards | ≥ 32 karakter (hex 64) |
| `auth_ip_hash_secret` | `AUTH_IP_HASH_SECRET` | api | hex 64 |
| `auth_otp_hash_secret` | `AUTH_OTP_HASH_SECRET` | api | hex 64 |
| `certificate_encryption_key` | `CERTIFICATE_ENCRYPTION_KEY` | api | hex 64 (32 byte) |
| `oauth_config_encryption_key` | `OAUTH_CONFIG_ENCRYPTION_KEY` | api | hex 64 (32 byte) |
| `totp_encryption_key` | `SEGALOKA_TOTP_ENCRYPTION_KEY` | api | hex 64 (32 byte) |
| `password_reset_otp_secret` | `PASSWORD_RESET_OTP_SECRET` | api | hex 64 |
| `dashboard_handoff_secret` | `DASHBOARD_HANDOFF_SECRET` | api | hex 64 |
| `resend_api_key` | `RESEND_API_KEY` | api | dari akun Resend |
| `resend_webhook_signing_secret` | `RESEND_WEBHOOK_SIGNING_SECRET` | api | dari akun Resend |
| `<dashboard>_session_key` (7 berkas) | `SEGALOKA_<KEY>_BFF_SESSION_ENCRYPTION_KEY` | dashboards | 32 byte base64, berbeda per dashboard |

Contoh membuat secret acak (di server, bukan di repo):

```bash
umask 077 && mkdir -p secrets && for n in ingress_identity_secret auth_ip_hash_secret auth_otp_hash_secret password_reset_otp_secret dashboard_handoff_secret certificate_encryption_key oauth_config_encryption_key totp_encryption_key; do [ -e secrets/$n ] || openssl rand -hex 32 > secrets/$n; done
```

```bash
umask 077 && for n in control_center travel vendor affiliate agen mitra traveler; do openssl rand -base64 32 > secrets/${n}_session_key; done
```

Perintah di atas tidak menimpa berkas yang sudah ada. Kunci enkripsi yang sudah dipakai data existing (sertifikat, OAuth, TOTP) **harus** memakai nilai lama: kunci baru membuat data terenkripsi lama tidak bisa dibaca. `db_password`, `resend_api_key`, dan `resend_webhook_signing_secret` diisi manual.

### Login lewat Marketplace (enam dashboard non-admin)
Hanya Control Center (Super Admin) yang punya halaman login sendiri. Travel, Vendor, Affiliate, Agen, Mitra, dan Traveler tidak menerima login password (`/bff/login*` → 404); `/`, `/login`, dan dashboard tanpa sesi diarahkan ke `/bff/auth/handoff/start`:

1. BFF membuat verifier acak (cookie HttpOnly `Path=/bff/auth/handoff`, 5 menit, `Secure`) dan mengarahkan ke `SEGALOKA_MARKETPLACE_ORIGIN/api/auth/dashboard-handoff?dashboard=..&challenge=sha256(verifier)`.
2. Website memakai sesi Marketplace (cookie `segaloka_access`) atau mengarahkan ke login Marketplace existing, lalu meminta tiket ke API `POST /auth/dashboard-handoff/tickets` (ingress bertanda). API memeriksa role/tenant di database; akun dengan beberapa organisasi Travel/Vendor memilih workspace dulu.
3. Tiket sekali pakai (hash di tabel `dashboard_handoff_tickets`, migrasi 0042, 60 detik) dikirim lewat form POST ke `/bff/auth/handoff/callback`, tidak pernah lewat URL.
4. BFF menukar tiket + verifier di `POST /auth/dashboard-handoff/consume`: tiket dibakar pada percobaan pertama, akses diperiksa ulang, sesi API baru dibuat (status 2FA mengikuti sesi Marketplace), dan sesi BFF terikat ke workspace yang dipilih.

Variabel website (Vercel project segaloka.com): `SEGALOKA_API_BASE_URL`, `SEGALOKA_ORIGIN_AUTH_SECRET` (sama dengan `ingress_identity_secret` API), dan opsional `SEGALOKA_DASHBOARD_ORIGINS` (JSON `{"vendor":"https://vendor.dashboard.segaloka.com",…}`; default hostname resmi, wajib https `*.segaloka.com` di production).

## Migrasi database (`database/migrate.mjs`)
- Urutan: `database/migrations/*.sql` (tanpa `*.rollback.sql` dan `*.draft.sql`), lalu `database/postgres/migrations/*.sql`.
- Versi yang sudah diterapkan dicatat di tabel `public.schema_migrations` yang sudah ada (dibuat migrasi 0001) dan tidak dijalankan lagi, jadi runner aman dijalankan berulang.
- Berkas yang memuat `DROP TABLE/SCHEMA/DATABASE/COLUMN`, `TRUNCATE`, atau `DELETE FROM` ditolak sebelum apa pun dijalankan.
- Satu runner pada satu waktu (advisory lock). Kegagalan menghentikan proses tanpa mencatat versi yang gagal.
- Default hanya `status`. `apply` dan `baseline` wajib `--confirm-database <nama database>`.

```bash
# Jalankan dari direktori deploy/cloud, setelah production.env dan secrets tersedia.
docker compose --env-file production.env -f compose.production.yaml --profile migrate run --rm migrate status
```

```bash
# HANYA setelah backup, restore staging, audit baseline, dan persetujuan eksplisit.
docker compose --env-file production.env -f compose.production.yaml --profile migrate run --rm migrate apply --confirm-database segaloka_production
```

**Database yang sudah ada sebelum runner ini:** sebagian migrasi mencatat versinya sendiri, sebagian tidak. Jalankan `status` dulu, cocokkan versi tertunda dengan skema nyata, lalu tandai yang sudah diterapkan manual dengan `baseline --through <versi>` sebelum `apply`. Jangan `apply` ke production tanpa backup (`backup-postgres.sh`) dan tanpa mencobanya pada salinan staging.

## Menjalankan (setelah disetujui)
1. Siapkan server, `production.env`, `secrets/`, dan sertifikat TLS (SAN atau wildcard untuk semua host) di `tls/fullchain.pem` dan `tls/privkey.pem`.
2. Dari direktori `deploy/cloud`, jalankan `docker compose --env-file production.env -f compose.production.yaml up -d postgres`, lalu audit status migrasi seperti di atas.
3. Setelah staging dan otorisasi deployment lulus, jalankan `docker compose --env-file production.env -f compose.production.yaml up -d --build api dashboards nginx`.
4. Isi `TRUSTED_PROXY_IPS` dengan alamat nginx di jaringan `edge`.
5. Validasi runtime per host (login, 2FA, SSE) sebelum DNS production diarahkan.

**Penting:** perintah di atas adalah petunjuk operasional, **bukan** perintah untuk langsung dieksekusi di production. Compose menggunakan interpolasi `${POSTGRES_DB}` dan `${POSTGRES_USER}` dari `production.env`; opsi `--env-file` harus disertakan. Pastikan semua secret dan TLS tersedia, gunakan staging lebih dahulu, dan jangan menjalankan `apply` tanpa persetujuan. Untuk mengaudit hasil interpolasi sebelum start, gunakan `docker compose --env-file production.env -f compose.production.yaml config` di lingkungan terotorisasi; output konfigurasi dapat mengandung informasi sensitif dan tidak boleh dipublikasikan.

## Yang sengaja tidak dilakukan
- Tidak ada seed data uji: `POST /control-center/test-data/travel-demo` tidak didaftarkan bila `NODE_ENV=production`.
- Website dan mobile tidak termasuk compose ini.
- Supervisor menghapus semua flag mode uji (`SEGALOKA_TEST_DATABASE`, `SEGALOKA_CONTROL_TEST`, `SEGALOKA_ENABLE_TEST_DATA_SEED`, `SEGALOKA_LOCAL_DIAGNOSTICS`) dari environment dashboard.
