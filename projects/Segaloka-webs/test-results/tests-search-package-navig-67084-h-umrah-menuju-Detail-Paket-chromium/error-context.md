# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\search-package-navigation.spec.cjs >> Search umrah menuju Detail Paket
- Location: tests\search-package-navigation.spec.cjs:11:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('a[href="/paket/umrah-premium-12d"]')
Expected: visible
Error: strict mode violation: locator('a[href="/paket/umrah-premium-12d"]') resolved to 2 elements:
    1) <a class="search-sponsored-card" href="/paket/umrah-premium-12d">…</a> aka getByRole('link', { name: 'Umrah Premium 12 Hari Paket' })
    2) <a href="/paket/umrah-premium-12d" class="product-card reference-package-card">…</a> aka getByRole('link', { name: 'Umrah Premium 12 Hari Umrah' })

Call log:
  - Expect "toBeVisible" locator('a[href="/paket/umrah-premium-12d"]') with timeout 15000ms
  - waiting for locator('a[href="/paket/umrah-premium-12d"]')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - banner [ref=e3]:
    - generic [ref=e4]:
      - link "Segaloka" [ref=e5] [cursor=pointer]:
        - /url: /
        - img "Segaloka" [ref=e6]
      - navigation "Navigasi utama" [ref=e7]:
        - link "% Promo" [ref=e8] [cursor=pointer]:
          - /url: "#promo"
          - generic [ref=e9]: "%"
          - text: Promo
        - link "↓ Unduh App" [ref=e10] [cursor=pointer]:
          - /url: "#aplikasi"
          - generic [ref=e11]: ↓
          - text: Unduh App
        - button "Bisnis" [ref=e13] [cursor=pointer]
        - button "Bantuan" [ref=e17] [cursor=pointer]
        - link "Pesanan" [ref=e20] [cursor=pointer]:
          - /url: /pesanan
      - generic [ref=e21]:
        - button "ID · IDR" [ref=e22] [cursor=pointer]
        - link "Masuk" [ref=e31] [cursor=pointer]:
          - /url: /masuk
        - button "Daftar" [ref=e32] [cursor=pointer]
  - main [ref=e34]:
    - generic [ref=e37]:
      - generic [ref=e38]: umrah
      - heading "Temukan Paket umrah Impian Anda" [level=1] [ref=e39]: Temukan Paket umrahImpian Anda
      - paragraph [ref=e40]: Pilih perjalanan terbaik sesuai kebutuhan Anda.
    - generic [ref=e42]:
      - button "Dari Jakarta" [ref=e44] [cursor=pointer]:
        - generic [ref=e48]:
          - generic [ref=e49]: Dari
          - strong [ref=e50]: Jakarta
      - button "Tujuan Pilih tujuan" [ref=e52] [cursor=pointer]:
        - generic [ref=e56]:
          - generic [ref=e57]: Tujuan
          - strong [ref=e58]: Pilih tujuan
      - button "Tanggal Pilih tanggal" [ref=e60] [cursor=pointer]:
        - generic [ref=e63]:
          - generic [ref=e64]: Tanggal
          - strong [ref=e65]: Pilih tanggal
      - button "Traveler 2 orang" [ref=e67] [cursor=pointer]:
        - generic [ref=e72]:
          - generic [ref=e73]: Traveler
          - strong [ref=e74]: 2 orang
      - button "Cari" [disabled] [ref=e75]
    - generic [ref=e79]:
      - complementary [ref=e80]:
        - generic [ref=e81]:
          - strong [ref=e82]: Filter Pencarian
          - button "Reset" [ref=e83] [cursor=pointer]
        - generic [ref=e84]:
          - heading "Tujuan umrah" [level=3] [ref=e85]
          - generic [ref=e86]:
            - checkbox "Semua Tujuan" [checked] [ref=e87] [cursor=pointer]
            - generic [ref=e88]: Semua Tujuan
          - generic [ref=e89]:
            - checkbox "Hemat" [ref=e90] [cursor=pointer]
            - generic [ref=e91]: Hemat
          - generic [ref=e92]:
            - checkbox "Regular" [ref=e93] [cursor=pointer]
            - generic [ref=e94]: Regular
          - generic [ref=e95]:
            - checkbox "Plus" [ref=e96] [cursor=pointer]
            - generic [ref=e97]: Plus
          - generic [ref=e98]:
            - checkbox "First" [ref=e99] [cursor=pointer]
            - generic [ref=e100]: First
        - generic [ref=e101]:
          - heading "Durasi" [level=3] [ref=e102]
          - generic [ref=e103]:
            - checkbox "Semua Durasi" [checked] [ref=e104] [cursor=pointer]
            - generic [ref=e105]: Semua Durasi
          - generic [ref=e106]:
            - checkbox "12 Hari" [ref=e107] [cursor=pointer]
            - generic [ref=e108]: 12 Hari
          - generic [ref=e109]:
            - checkbox "13 Hari" [ref=e110] [cursor=pointer]
            - generic [ref=e111]: 13 Hari
        - generic [ref=e112]:
          - heading "Harga Maksimal" [level=3] [ref=e113]
          - strong [ref=e114]: Rp75.000.000
          - slider [ref=e115]: "75000000"
          - generic [ref=e116]:
            - generic [ref=e117]: Rp 0
            - generic [ref=e118]: Rp75.000.000
        - generic [ref=e119]:
          - heading "Maskapai" [level=3] [ref=e120]
          - generic [ref=e121]:
            - checkbox "Semua Maskapai" [checked] [ref=e122] [cursor=pointer]
            - generic [ref=e123]: Semua Maskapai
          - generic [ref=e124]:
            - checkbox "Garuda Indonesia" [ref=e125] [cursor=pointer]
            - generic [ref=e126]: Garuda Indonesia
          - generic [ref=e127]:
            - checkbox "Saudia" [ref=e128] [cursor=pointer]
            - generic [ref=e129]: Saudia
          - generic [ref=e130]:
            - checkbox "Emirates" [ref=e131] [cursor=pointer]
            - generic [ref=e132]: Emirates
          - generic [ref=e133]:
            - checkbox "Qatar Airways" [ref=e134] [cursor=pointer]
            - generic [ref=e135]: Qatar Airways
          - generic [ref=e136]:
            - checkbox "Etihad Airways" [ref=e137] [cursor=pointer]
            - generic [ref=e138]: Etihad Airways
          - generic [ref=e139]:
            - checkbox "Turkish Airlines" [ref=e140] [cursor=pointer]
            - generic [ref=e141]: Turkish Airlines
          - generic [ref=e142]:
            - checkbox "Oman Air" [ref=e143] [cursor=pointer]
            - generic [ref=e144]: Oman Air
          - generic [ref=e145]:
            - checkbox "Malaysia Airlines" [ref=e146] [cursor=pointer]
            - generic [ref=e147]: Malaysia Airlines
          - generic [ref=e148]:
            - checkbox "AirAsia" [ref=e149] [cursor=pointer]
            - generic [ref=e150]: AirAsia
          - generic [ref=e151]:
            - checkbox "Scoot" [ref=e152] [cursor=pointer]
            - generic [ref=e153]: Scoot
          - generic [ref=e154]:
            - checkbox "Lion Air" [ref=e155] [cursor=pointer]
            - generic [ref=e156]: Lion Air
          - generic [ref=e157]:
            - checkbox "Hainan Airlines" [ref=e158] [cursor=pointer]
            - generic [ref=e159]: Hainan Airlines
          - generic [ref=e160]:
            - checkbox "IndiGo" [ref=e161] [cursor=pointer]
            - generic [ref=e162]: IndiGo
        - generic [ref=e163]:
          - heading "Rating Travel" [level=3] [ref=e164]
          - generic [ref=e165]:
            - radio "Semua Rating" [checked] [ref=e166] [cursor=pointer]
            - generic [ref=e167]: Semua Rating
          - generic [ref=e168]:
            - radio "★ 4.5 ke atas" [ref=e169] [cursor=pointer]
            - generic [ref=e170]: ★ 4.5 ke atas
          - generic [ref=e171]:
            - radio "★ 4.0 ke atas" [ref=e172] [cursor=pointer]
            - generic [ref=e173]: ★ 4.0 ke atas
          - generic [ref=e174]:
            - radio "★ 3.0 ke atas" [ref=e175] [cursor=pointer]
            - generic [ref=e176]: ★ 3.0 ke atas
      - generic [ref=e177]:
        - generic [ref=e179]:
          - generic [ref=e180]: BerandaumrahHasil Pencarian
          - heading "Paket umrah dari" [level=2] [ref=e185]
          - paragraph [ref=e186]: 2 paket ditemukan · · · orang
        - generic [ref=e187]:
          - strong [ref=e190]: Paket Pilihan dari Travel
          - generic [ref=e191]:
            - link "Umrah Premium 12 Hari Paket dipromosikan ★ 4.9 (128) Nuzultrip Umrah Premium 12 Hari Makkah · Madinah 12 Hari Diskon hingga Rp 2.500.000 Mulai dari Rp32.900.000 Lihat Paket" [ref=e192] [cursor=pointer]:
              - /url: /paket/umrah-premium-12d
              - generic [ref=e193]:
                - img "Umrah Premium 12 Hari" [ref=e194]
                - generic "Paket dipromosikan" [ref=e195]
                - generic [ref=e199]: ★ 4.9 (128)
              - generic [ref=e200]:
                - generic [ref=e201]: Nuzultrip
                - heading "Umrah Premium 12 Hari" [level=3] [ref=e202]
                - paragraph [ref=e203]: Makkah · Madinah
                - generic [ref=e204]:
                  - generic [ref=e205]: 12 Hari
                  - generic [ref=e206]: Diskon hingga Rp 2.500.000
                - generic [ref=e207]:
                  - generic [ref=e208]:
                    - generic [ref=e209]: Mulai dari
                    - strong [ref=e210]: Rp32.900.000
                  - generic [ref=e211]: Lihat Paket
            - link "Umrah Plus Turkiye Paket dipromosikan ★ 4.8 (84) Amanah Travel Umrah Plus Turkiye Istanbul · Makkah · Madinah 13 Hari Paket Umrah Plus pilihan Mulai dari Rp38.900.000 Lihat Paket" [ref=e214] [cursor=pointer]:
              - /url: /paket/umrah-plus-turkiye
              - generic [ref=e215]:
                - img "Umrah Plus Turkiye" [ref=e216]
                - generic "Paket dipromosikan" [ref=e217]
                - generic [ref=e221]: ★ 4.8 (84)
              - generic [ref=e222]:
                - generic [ref=e223]: Amanah Travel
                - heading "Umrah Plus Turkiye" [level=3] [ref=e224]
                - paragraph [ref=e225]: Istanbul · Makkah · Madinah
                - generic [ref=e226]:
                  - generic [ref=e227]: 13 Hari
                  - generic [ref=e228]: Paket Umrah Plus pilihan
                - generic [ref=e229]:
                  - generic [ref=e230]:
                    - generic [ref=e231]: Mulai dari
                    - strong [ref=e232]: Rp38.900.000
                  - generic [ref=e233]: Lihat Paket
        - generic [ref=e236]:
          - generic [ref=e237]:
            - generic [ref=e238]: PROMO SPESIAL
            - strong [ref=e239]: Paket perjalanan pilihan Segaloka
          - generic [ref=e240]: Diskon hingga 30%
        - generic [ref=e241]:
          - generic [ref=e242]:
            - button "Semua (2)" [ref=e243] [cursor=pointer]
            - button "Harga Terendah" [ref=e244] [cursor=pointer]
            - button "Harga Tertinggi" [ref=e245] [cursor=pointer]
            - button "Keberangkatan Terdekat" [ref=e246] [cursor=pointer]
          - generic [ref=e247]:
            - button "Grid" [ref=e248] [cursor=pointer]
            - button "List" [ref=e251] [cursor=pointer]
        - generic [ref=e253]:
          - link "Umrah Premium 12 Hari Umrah Nuzultrip 4.9 (128) Makkah · Madinah Umrah Premium 12 Hari 12 Hari· Makkah 12 Hari perjalanan Garuda Indonesia 10 Des 2026 HARGA Rp32.900.000" [ref=e254] [cursor=pointer]:
            - /url: /paket/umrah-premium-12d
            - generic [ref=e255]:
              - img "Umrah Premium 12 Hari" [ref=e256]
              - generic [ref=e258]: Umrah
              - img "Nuzultrip" [ref=e260]
              - generic [ref=e261]: 4.9 (128)
            - generic [ref=e264]:
              - generic [ref=e265]: Makkah · Madinah
              - heading "Umrah Premium 12 Hari" [level=3] [ref=e266]
              - generic [ref=e267]:
                - text: 12 Hari
                - generic [ref=e268]: · Makkah
              - generic [ref=e269]: 12 Hari perjalanan
              - generic [ref=e271]:
                - generic [ref=e272]: Garuda Indonesia
                - generic [ref=e273]: 10 Des 2026
              - generic [ref=e274]:
                - generic [ref=e275]: HARGA
                - strong [ref=e276]: Rp32.900.000
          - link "Umrah Plus Turkiye Umrah Nuzultrip 4.8 (84) Istanbul · Makkah · Madinah Umrah Plus Turkiye 13 Hari· Istanbul 13 Hari perjalanan Turkish Airlines 15 Des 2026 HARGA Rp38.900.000" [ref=e280] [cursor=pointer]:
            - /url: /paket/umrah-plus-turkiye
            - generic [ref=e281]:
              - img "Umrah Plus Turkiye" [ref=e282]
              - generic [ref=e284]: Umrah
              - img "Nuzultrip" [ref=e286]
              - generic [ref=e287]: 4.8 (84)
            - generic [ref=e290]:
              - generic [ref=e291]: Istanbul · Makkah · Madinah
              - heading "Umrah Plus Turkiye" [level=3] [ref=e292]
              - generic [ref=e293]:
                - text: 13 Hari
                - generic [ref=e294]: · Istanbul
              - generic [ref=e295]: 13 Hari perjalanan
              - generic [ref=e297]:
                - generic [ref=e298]: Turkish Airlines
                - generic [ref=e299]: 15 Des 2026
              - generic [ref=e300]:
                - generic [ref=e301]: HARGA
                - strong [ref=e302]: Rp38.900.000
  - contentinfo [ref=e306]:
    - generic [ref=e307]:
      - generic [ref=e308]:
        - generic [ref=e309]:
          - link "Segaloka" [ref=e310] [cursor=pointer]:
            - /url: /
            - img "Segaloka" [ref=e311]
          - paragraph [ref=e312]: Platform perjalanan yang menghubungkan traveler, travel, vendor, dan berbagai layanan perjalanan dalam satu ekosistem.
          - link "Jadi Partner Segaloka" [ref=e313] [cursor=pointer]:
            - /url: /partner/travel
            - generic [aria-hidden] [ref=e314]: ↗
          - generic [ref=e316]:
            - heading "Metode Pembayaran" [level=3] [ref=e317]
            - generic [ref=e318]:
              - generic "VISA" [ref=e319]:
                - img "VISA" [ref=e320]
              - generic "Mastercard" [ref=e321]:
                - img "Mastercard" [ref=e322]
              - generic "JCB" [ref=e323]
              - generic "BCA" [ref=e325]
              - generic "BRI" [ref=e327]
              - generic "BNI" [ref=e329]
              - generic "Mandiri" [ref=e331]
              - generic "BSI" [ref=e333]
              - generic "GoPay" [ref=e335]
              - generic "OVO" [ref=e337]
              - generic "QRIS" [ref=e339]
              - generic "Virtual Account" [ref=e341]
        - generic [ref=e343]:
          - heading "Tentang Segaloka" [level=3] [ref=e344]
          - link "Cara Pesan" [ref=e345] [cursor=pointer]:
            - /url: /cara-pesan
          - link "Hubungi Kami" [ref=e346] [cursor=pointer]:
            - /url: /bantuan
          - link "Pusat Bantuan" [ref=e347] [cursor=pointer]:
            - /url: /pusat-bantuan
          - link "Karier" [ref=e348] [cursor=pointer]:
            - /url: /karier
          - link "Tentang Kami" [ref=e349] [cursor=pointer]:
            - /url: /tentang-kami
          - generic [ref=e350]:
            - heading "Follow kami di" [level=3] [ref=e351]
            - generic [ref=e352]:
              - link "Facebook Segaloka" [ref=e353] [cursor=pointer]:
                - /url: "#"
                - generic [ref=e355]: Facebook
              - link "Instagram Segaloka" [ref=e356] [cursor=pointer]:
                - /url: "#"
                - generic [ref=e360]: Instagram
              - link "TikTok Segaloka" [ref=e361] [cursor=pointer]:
                - /url: "#"
                - generic [aria-hidden] [ref=e362]: ♪
                - generic [ref=e363]: TikTok
              - link "YouTube Segaloka" [ref=e364] [cursor=pointer]:
                - /url: "#"
                - generic [aria-hidden] [ref=e365]: ▶
                - generic [ref=e366]: YouTube
              - link "WhatsApp Segaloka" [ref=e367] [cursor=pointer]:
                - /url: "#"
                - generic [ref=e370]: WhatsApp
        - generic [ref=e371]:
          - heading "Produk" [level=3] [ref=e372]
          - link "Umrah" [ref=e373] [cursor=pointer]:
            - /url: /search?category=umrah
          - link "Haji" [ref=e374] [cursor=pointer]:
            - /url: /search?category=haji
          - link "Halal Tour" [ref=e375] [cursor=pointer]:
            - /url: /search?category=halal-tour
          - link "Domestic" [ref=e376] [cursor=pointer]:
            - /url: /search?category=domestic
          - link "International" [ref=e377] [cursor=pointer]:
            - /url: /search?category=international
          - link "SegaDeals" [ref=e378] [cursor=pointer]:
            - /url: /segadeals
          - link "Akomodasi & LA" [ref=e379] [cursor=pointer]:
            - /url: /akomodasi
          - link "Visa" [ref=e380] [cursor=pointer]:
            - /url: /search?category=visa
          - link "Destinasi & Atraksi" [ref=e381] [cursor=pointer]:
            - /url: /#destinasi-atraksi
        - generic [ref=e382]:
          - heading "Lainnya" [level=3] [ref=e383]
          - link "Segaloka Affiliate" [ref=e384] [cursor=pointer]:
            - /url: /affiliate
          - link "Mitra Travel" [ref=e385] [cursor=pointer]:
            - /url: /mitra
          - link "Daftarkan Travel" [ref=e386] [cursor=pointer]:
            - /url: /daftar-travel
          - link "Daftarkan Vendor" [ref=e387] [cursor=pointer]:
            - /url: /daftar-vendor
          - link "Syarat & Ketentuan" [ref=e388] [cursor=pointer]:
            - /url: /syarat-ketentuan
          - link "Kebijakan Privasi" [ref=e389] [cursor=pointer]:
            - /url: /kebijakan-privasi
          - link "Pusat Bantuan" [ref=e390] [cursor=pointer]:
            - /url: /bantuan
          - generic [ref=e391]:
            - heading "Aplikasi Segaloka" [level=3] [ref=e392]
            - generic [ref=e393]: Segera Hadir
      - generic [ref=e395]: © 2026 Segaloka. Seluruh hak dilindungi.
```

# Test source

```ts
  1  | ﻿const { test, expect } = require('@playwright/test');
  2  | 
  3  | const baseURL = 'http://127.0.0.1:3100';
  4  | 
  5  | const cases = [
  6  |   { category: 'umrah', expected: 'umrah-premium-12d' },
  7  |   { category: 'halal-tour', expected: 'halal-tour-japan' },
  8  | ];
  9  | 
  10 | for (const item of cases) {
  11 |   test(`Search ${item.category} menuju Detail Paket`, async ({ page }) => {
  12 |     const errors = [];
  13 | 
  14 |     page.on('pageerror', error => {
  15 |       errors.push(error.message);
  16 |     });
  17 | 
  18 |     const searchResponse = await page.goto(
  19 |       `${baseURL}/search?category=${item.category}`,
  20 |       { waitUntil: 'domcontentloaded' }
  21 |     );
  22 | 
  23 |     expect(searchResponse.status()).toBe(200);
  24 | 
  25 |     const packageLink = page.locator(
  26 |       `a[href="/paket/${item.expected}"]`
  27 |     );
  28 | 
> 29 |     await expect(packageLink).toBeVisible({ timeout: 15000 });
     |                               ^ Error: expect(locator).toBeVisible() failed
  30 | 
  31 |     await packageLink.click();
  32 | 
  33 |     await expect(page).toHaveURL(
  34 |       new RegExp(`/paket/${item.expected}(?:[/?#]|$)`)
  35 |     );
  36 | 
  37 |     const heading = page.locator('h1').first();
  38 | 
  39 |     await expect(heading).toBeVisible();
  40 | 
  41 |     expect(errors).toEqual([]);
  42 |   });
  43 | }
  44 | 
```