# Segaloka UI System

Folder ini adalah pusat pengelolaan UI/UX Segaloka.

## Perubahan global

Gunakan:

src/ui/tokens.css

Untuk mengubah:

- font
- ukuran font
- warna
- radius
- shadow
- spacing
- ukuran Search
- ukuran Package Card
- ukuran Detail Paket
- ukuran button
- ukuran form

## Search

src/ui/search/

Semua Search marketplace harus diarahkan ke komponen
canonical yang berada di folder ini.

## Cards

src/ui/cards/

Semua card umum dan Package Card dikelola di sini.

## Detail Paket

src/ui/package-detail/

Semua visual halaman Detail Paket dikelola di sini.

## Aturan

Jangan membuat versi Search, Package Card, Button,
Input, Modal, atau visual marketplace baru langsung
di halaman apabila sudah tersedia di src/ui.

Page bertugas menyusun komponen.

UI System bertugas menentukan visual komponen.

Business logic dan data tidak dipindahkan ke UI System.
