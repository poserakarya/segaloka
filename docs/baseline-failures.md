# Evaluasi 13 kegagalan baseline (Node 24)

Semua kegagalan di bawah juga terjadi di commit `3034776` (Fase A), dan yang diperiksa lebih jauh juga di commit awal `5995e86`. Tidak ada yang disebabkan perubahan E2E-02, Fase A, maupun Fase B. File tes ini **tidak diubah**; dokumen ini hanya mencatat penyebab dan rekomendasinya.

| # | File | Gagal | Penyebab (diverifikasi) | Status | Rekomendasi |
|---|---|---:|---|---|---|
| 1 | `services/api/src/auth/email-verification.test.js` | 1 | Butuh `DB_*`. Tanpa env, koneksi ke `127.0.0.1:5432` ditolak. | **Lolos** dengan `DB_*` mengarah ke PostgreSQL `_test` | Masukkan ke runner integrasi dengan env DB tes |
| 2 | `services/api/src/travel/certificate-transaction-safety.test.js` | 1 | Idem (`MISSING_CONFIGURATION_DB_HOST`) | **Lolos** dengan `DB_*` tes | Idem |
| 3 | `services/api/src/auth/google-oauth-exchange.integration.test.js` | 1 | Port DB di-hardcode `5432` (baris ±57), tidak memakai `DB_PORT` | Tidak bisa dijalankan pada DB tes di port lain | Ganti ke `process.env.DB_PORT` (perubahan tes, butuh persetujuan) |
| 4 | `services/api/src/travel/certificate-encrypted-e2e.test.js` | 1 | Dengan `DB_*` tes, penerbitan sertifikat ditolak `403 TRAVEL_ACCESS_DENIED`. Sama persis di `5995e86`. Data seed tes tidak memenuhi syarat otorisasi rute sertifikat saat ini. Tes juga mengandalkan API di `localhost:4190`. | Gagal baseline | Tinjau seed tes vs aturan `certificate-routes.js` |
| 5 | `services/api/test/session-auth-access-token.test.js` | 1 | `request.auth` `undefined` pada kasus "token valid". Mock pool tes tidak cocok dengan query `session-auth.js` saat ini (cek `two_factor_enabled`/`mfa_verified_at`). | Gagal baseline | Perbarui mock tes mengikuti query sesi saat ini |
| 6 | `services/api/tests/google-oauth-cors-isolated.test.mjs` | 2 | Ekspektasi header CORS (`Access-Control-Allow-Credentials`) berbeda dari konfigurasi CORS saat ini | Gagal baseline | Putuskan kebijakan CORS OAuth yang benar, lalu samakan tes atau kode |
| 7 | `services/api/tests/google-oauth-exchange-response-security.test.mjs` | 1 | Pemeriksaan statis: rute exchange Google mengirim payload sesi langsung | **Selesai** (commit keamanan Prioritas 1): respons kini hanya `authenticated`, `user.id`, dan token, dengan schema ketat; request dari browser (Origin) ditolak. File tes tidak diubah | — |
| 8 | `apps/control-center/control-center-api-status.test.mjs` | 1 | Mengharapkan skrip V7 inline di `control-center.html`; sekarang V7 dimuat dari `control-center.bundle.js` | Tes usang | Arahkan tes ke bundle |
| 9 | `apps/control-center/control-center-login.test.mjs` | 4 | Menguji `public/index.html` (gerbang lama yang tidak memiliki form login). Harness DOM tidak cocok (`classList` undefined). Halaman ini tidak lagi disajikan (Fase A: `/` → `/login`). | Tes usang | Pengganti yang aktif: `control-center-login-totp.test.mjs` (lolos) |

Total awal: 13 kegagalan di 9 file. Setelah perbaikan keamanan Prioritas 1: **12 kegagalan di 8 file** (#7 lolos). Dua di antaranya (#1, #2) lolos bila DB tes dikonfigurasi. `traveler-certificate-download.test.js`, yang gagal di Node 22, lolos di Node 24.
