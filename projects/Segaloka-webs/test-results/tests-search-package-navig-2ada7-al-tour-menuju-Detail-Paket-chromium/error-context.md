# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\search-package-navigation.spec.cjs >> Search halal-tour menuju Detail Paket
- Location: tests\search-package-navigation.spec.cjs:11:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('a[href="/paket/halal-tour-japan"]')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('a[href="/paket/halal-tour-japan"]') with timeout 15000ms
  - waiting for locator('a[href="/paket/halal-tour-japan"]')

```

```yaml
- banner:
  - link "Segaloka":
    - /url: /
    - img "Segaloka"
  - navigation "Navigasi utama":
    - link "% Promo":
      - /url: "#promo"
    - link "↓ Unduh App":
      - /url: "#aplikasi"
    - button "Bisnis"
    - button "Bantuan"
    - link "Pesanan":
      - /url: /pesanan
  - button "ID · IDR"
  - link "Masuk":
    - /url: /masuk
  - button "Daftar"
- main:
  - text: halal-tour
  - heading "Temukan Paket halal-tour Impian Anda" [level=1]
  - paragraph: Pilih perjalanan terbaik sesuai kebutuhan Anda.
  - button "Dari Jakarta":
    - text: Dari
    - strong: Jakarta
  - button "Tujuan Pilih tujuan":
    - text: Tujuan
    - strong: Pilih tujuan
  - button "Tanggal Pilih tanggal":
    - text: Tanggal
    - strong: Pilih tanggal
  - button "Traveler 2 orang":
    - text: Traveler
    - strong: 2 orang
  - button "Cari" [disabled]
  - complementary:
    - strong: Filter Pencarian
    - button "Reset"
    - heading "Tujuan halal-tour" [level=3]
    - checkbox "Semua Tujuan" [checked]
    - text: Semua Tujuan
    - heading "Durasi" [level=3]
    - checkbox "Semua Durasi" [checked]
    - text: Semua Durasi
    - heading "Harga Maksimal" [level=3]
    - strong: Rp75.000.000
    - slider: "75000000"
    - text: Rp 0 Rp75.000.000
    - heading "Maskapai" [level=3]
    - checkbox "Semua Maskapai" [checked]
    - text: Semua Maskapai
    - checkbox "Garuda Indonesia"
    - text: Garuda Indonesia
    - checkbox "Saudia"
    - text: Saudia
    - checkbox "Emirates"
    - text: Emirates
    - checkbox "Qatar Airways"
    - text: Qatar Airways
    - checkbox "Etihad Airways"
    - text: Etihad Airways
    - checkbox "Turkish Airlines"
    - text: Turkish Airlines
    - checkbox "Oman Air"
    - text: Oman Air
    - checkbox "Malaysia Airlines"
    - text: Malaysia Airlines
    - checkbox "AirAsia"
    - text: AirAsia
    - checkbox "Scoot"
    - text: Scoot
    - checkbox "Lion Air"
    - text: Lion Air
    - checkbox "Hainan Airlines"
    - text: Hainan Airlines
    - checkbox "IndiGo"
    - text: IndiGo
    - heading "Rating Travel" [level=3]
    - radio "Semua Rating" [checked]
    - text: Semua Rating
    - radio "★ 4.5 ke atas"
    - text: ★ 4.5 ke atas
    - radio "★ 4.0 ke atas"
    - text: ★ 4.0 ke atas
    - radio "★ 3.0 ke atas"
    - text: ★ 3.0 ke atas
  - text: Berandahalal-tourHasil Pencarian
  - heading "Paket halal-tour dari" [level=2]
  - paragraph: 0 paket ditemukan · · · orang
  - text: PROMO SPESIAL
  - strong: Paket perjalanan pilihan Segaloka
  - text: Diskon hingga 30%
  - button "Semua (0)"
  - button "Harga Terendah"
  - button "Harga Tertinggi"
  - button "Keberangkatan Terdekat"
  - button "Grid"
  - button "List"
  - heading "Belum ada paket halal-tour yang tersedia" [level=3]
  - paragraph: Paket untuk kategori halal-tour belum tersedia saat ini. Silakan cek kembali nanti.
- contentinfo:
  - link "Segaloka":
    - /url: /
    - img "Segaloka"
  - paragraph: Platform perjalanan yang menghubungkan traveler, travel, vendor, dan berbagai layanan perjalanan dalam satu ekosistem.
  - link "Jadi Partner Segaloka":
    - /url: /partner/travel
  - heading "Metode Pembayaran" [level=3]
  - img "VISA"
  - img "Mastercard"
  - text: JCB BCA BRI BNI Mandiri BSI GoPay OVO QRIS Virtual Account
  - heading "Tentang Segaloka" [level=3]
  - link "Cara Pesan":
    - /url: /cara-pesan
  - link "Hubungi Kami":
    - /url: /bantuan
  - link "Pusat Bantuan":
    - /url: /pusat-bantuan
  - link "Karier":
    - /url: /karier
  - link "Tentang Kami":
    - /url: /tentang-kami
  - heading "Follow kami di" [level=3]
  - link "Facebook Segaloka":
    - /url: "#"
    - text: Facebook
  - link "Instagram Segaloka":
    - /url: "#"
    - text: Instagram
  - link "TikTok Segaloka":
    - /url: "#"
    - text: TikTok
  - link "YouTube Segaloka":
    - /url: "#"
    - text: YouTube
  - link "WhatsApp Segaloka":
    - /url: "#"
    - text: WhatsApp
  - heading "Produk" [level=3]
  - link "Umrah":
    - /url: /search?category=umrah
  - link "Haji":
    - /url: /search?category=haji
  - link "Halal Tour":
    - /url: /search?category=halal-tour
  - link "Domestic":
    - /url: /search?category=domestic
  - link "International":
    - /url: /search?category=international
  - link "SegaDeals":
    - /url: /segadeals
  - link "Akomodasi & LA":
    - /url: /akomodasi
  - link "Visa":
    - /url: /search?category=visa
  - link "Destinasi & Atraksi":
    - /url: /#destinasi-atraksi
  - heading "Lainnya" [level=3]
  - link "Segaloka Affiliate":
    - /url: /affiliate
  - link "Mitra Travel":
    - /url: /mitra
  - link "Daftarkan Travel":
    - /url: /daftar-travel
  - link "Daftarkan Vendor":
    - /url: /daftar-vendor
  - link "Syarat & Ketentuan":
    - /url: /syarat-ketentuan
  - link "Kebijakan Privasi":
    - /url: /kebijakan-privasi
  - link "Pusat Bantuan":
    - /url: /bantuan
  - heading "Aplikasi Segaloka" [level=3]
  - text: Segera Hadir © 2026 Segaloka. Seluruh hak dilindungi.
- alert
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