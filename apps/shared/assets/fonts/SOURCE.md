# Sumber font

Font di folder ini di-host sendiri oleh Segaloka. Tidak ada request ke Google Fonts saat runtime.

| Font | Paket npm | Versi | Integritas paket (registry npm) | Lisensi |
|---|---|---|---|---|
| Plus Jakarta Sans (variable, wght 200–800, normal & italic, subset latin + latin-ext) | `@fontsource-variable/plus-jakarta-sans` | 5.3.0 | `sha512-/l/4r0yyWK9JzAlmA0LiYgGgmJe/Gswt4jTJEzr5QhJfwMbvJZDmYWyW0M4X7yCK69BajMVlV/Lx8g7WDc1+sw==` | SIL OFL 1.1, `OFL-PlusJakartaSans.txt` (© The Plus Jakarta Sans Project Authors, https://github.com/tokotype/PlusJakartaSans) |
| IBM Plex Sans Arabic (400, 500, 600, 700, subset arabic) | `@fontsource/ibm-plex-sans-arabic` | 5.3.0 | `sha512-ZZ4g+JDgQY0NqSh4o0MNWU1sHQmtcee1g++aKAwyJvZxnT5y51JXsN1cIXnaQaMd40dcbK6QFYa+Z1LbaiNuqA==` | SIL OFL 1.1, `OFL-IBMPlexSansArabic.txt` (© IBM Corp.) |

Kedua paket diterbitkan oleh proyek Fontsource (https://github.com/fontsource/font-files) dari berkas Google Fonts. Tarball diunduh lewat `npm pack`, lalu hash sha512 dicocokkan dengan `dist.integrity` di registry. `unicode-range` disalin dari CSS paket. Nama family dibuat sama dengan yang dipakai V7 (`Plus Jakarta Sans`, `IBM Plex Sans Arabic`).

SHA-256 tiap berkas:

```
6010e7fd0dce5d527583951750728cbe3c895efbd16aa0f809ab8c824878c9d8  ibm-plex-sans-arabic-arabic-400-normal.woff2
90aef64fea9794f232332e907d45810ab268d1a11721340025eba2a2cdb36d5c  ibm-plex-sans-arabic-arabic-500-normal.woff2
16734a5adb27b0f363e566cbbeacec480da0dc0baa19c8f0053251c2e2bc0eac  ibm-plex-sans-arabic-arabic-600-normal.woff2
04c730b4292731ccedadd5bd80756124364ae4923895145d9cd7b1f28e443de1  ibm-plex-sans-arabic-arabic-700-normal.woff2
7524d4b5f829201192882f775b90d78dbd9f9b3014ea729cfb7a47f5261ec7cb  plus-jakarta-sans-latin-ext-wght-italic.woff2
38e3b8fd8045048eb311d90170a4429ed2c8f405852dc3d91b5af8452758703f  plus-jakarta-sans-latin-ext-wght-normal.woff2
bb113d8f5be89636a9a31ffa0966762126546b98be171d6fa81115abb2cd5352  plus-jakarta-sans-latin-wght-italic.woff2
153fc85b70298beeb1d61a5f723331649e7f23bb77302a66e61cb3e2fbdb5e79  plus-jakarta-sans-latin-wght-normal.woff2
```
