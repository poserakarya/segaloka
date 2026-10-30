# Lingkungan pratinjau tujuh dashboard (branch e2e-02)

Pratinjau interaktif untuk memeriksa UI/UX V7 dengan proses asli: API Fastify, BFF dan entry server tiap dashboard, serta PostgreSQL lokal baru. Ini **bukan** deployment production dan tidak terhubung ke database production.

## Isi
| Berkas | Fungsi |
|---|---|
| `start.sh` | Memasang dependensi bila belum ada, membuat PostgreSQL lokal `segaloka_preview_test`, menjalankan migrasi, API, 7 dashboard, data uji, dan gerbang akses |
| `seed.mjs` | Data uji berlabel `[DATA UJI]` lewat API asli (booking, peserta, konfirmasi, referral, cabang) |
| `gate.mjs` | Gerbang akses: HTTP Basic Auth di depan setiap dashboard, pemetaan Origin publik ke origin lokal, dukungan SSE dan WebSocket |

## Port publik (gerbang) → dashboard
| Port | Dashboard | Proses lokal |
|---|---|---|
| 8101 | Control Center | server 4902, BFF 4903 |
| 8102 | Travel | Vite 4900, BFF 4901 |
| 8103 | Vendor | entry 4204, BFF 4211 |
| 8104 | Affiliate | entry 4212, BFF 4221 |
| 8105 | Agen | entry 4216, BFF 4231 |
| 8106 | Mitra | entry 4214, BFF 4241 |
| 8107 | Traveler | entry 4210, BFF 4251 |

API (4990) dan PostgreSQL (55432) hanya mendengarkan `127.0.0.1` dan tidak diekspos.

## Menjalankan
Prasyarat: Node.js 24, biner PostgreSQL 16 (`initdb`, `pg_ctl`, `psql`), pengguna non-root, akses jaringan ke registry npm.

```bash
PG_BIN=/usr/lib/postgresql/16/bin tools/preview/start.sh
```

Setelah `PREVIEW_READY`, kredensial ada di `$PREVIEW_HOME/credentials.txt` (chmod 600) dan daftar akun uji di `$PREVIEW_HOME/accounts.json`. Hanya port 8101–8107 yang boleh diekspos ke internet (HTTPS dari platform hosting).

## Model keamanan
- Semua secret (ingress, kunci sesi BFF, hash IP, kata sandi gerbang, kata sandi akun uji) dibuat acak saat start, tidak masuk ke Git, dan tidak dimasukkan ke URL.
- Gerbang menolak request tanpa Basic Auth sebelum menyentuh aplikasi. Setelah 20 kegagalan dalam 15 menit per IP, gerbang mengembalikan 429.
- Origin publik yang tidak cocok ditolak oleh gerbang. Origin yang cocok dipetakan ke origin lokal, sehingga pemeriksaan origin/CSRF entry server dan BFF tetap berlaku.
- Login, sesi, RBAC, dan isolasi tenant tetap ditegakkan oleh BFF dan API seperti biasa. Akun uji tidak memakai 2FA; alur 2FA diuji terpisah.
- Database hanya berisi data uji (`seed.mjs` menolak database selain `*_test` di localhost dan database yang tidak kosong).

## Batasan
- Travel dijalankan dengan server dev Vite dan BFF mode uji (port production 4200/4201 ditolak mode uji).
- Preview bersifat sementara; data hilang saat mesin dihentikan.
