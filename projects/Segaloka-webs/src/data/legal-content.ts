import { legalTermsAR } from "@/data/legal-content-ar";
import { legalTermsEN } from "@/data/legal-content-en";
import type { LanguageCode } from "@/data/preferences";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  slug: "syarat-ketentuan" | "kebijakan-privasi";
  title: string;
  eyebrow: string;
  summary: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export const legalDocumentsID: Record<
  LegalDocument["slug"],
  LegalDocument
> = {
  "syarat-ketentuan": {
    slug: "syarat-ketentuan",
    eyebrow: "LEGAL SEGALOKA",
    title: "Syarat & Ketentuan Segaloka",
    summary:
      "Ketentuan penggunaan platform dan layanan Segaloka bagi Traveler, Travel, Vendor, Affiliate, Agen, Mitra, dan pengguna layanan terkait.",
    version: "1.1",
    effectiveDate: "4 Oktober 2026",
    lastUpdated: "5 Oktober 2026",
    sections: [
      {
        id: "pendahuluan",
        title: "1. Pendahuluan & Persetujuan",
        paragraphs: [
          "Syarat & Ketentuan ini mengatur akses dan penggunaan ekosistem Segaloka, termasuk website, aplikasi, marketplace, fitur pemesanan, pembayaran, pengelolaan perjalanan, serta fitur atau layanan lain yang tersedia dari waktu ke waktu.",
          "Dengan mengakses, membuat akun, melakukan pemesanan, menggunakan fitur, atau melanjutkan transaksi melalui Segaloka, Pengguna menyatakan telah membaca dan memahami ketentuan yang relevan dengan layanan yang digunakan.",
          "Ketentuan khusus yang ditampilkan pada suatu produk, layanan, promo, transaksi, atau halaman tertentu merupakan bagian dari ketentuan penggunaan layanan tersebut.",
        ],
      },
      {
        id: "definisi",
        title: "2. Definisi",
        bullets: [
          "Segaloka adalah platform teknologi yang menghubungkan Traveler dengan Travel, Vendor, Affiliate, Agen, Mitra, dan penyedia layanan lain dalam ekosistem perjalanan.",
          "Traveler atau Pengguna adalah pihak yang mengakses atau menggunakan Segaloka, termasuk pihak yang melakukan pemesanan untuk dirinya sendiri maupun traveler lain.",
          "Travel adalah badan usaha atau penyelenggara perjalanan yang menawarkan produk atau layanan melalui Segaloka.",
          "Vendor adalah penyedia produk, inventori, fasilitas, atau layanan pendukung perjalanan yang terhubung dengan Segaloka.",
          "Produk atau Layanan adalah penawaran yang tersedia melalui Segaloka, termasuk Umrah, Haji, Halal Tour, Domestic, International, SegaDeals, Akomodasi, Land Arrangement, Visa, serta layanan pendukung lainnya.",
          "Pesanan adalah permintaan transaksi yang dibuat melalui Segaloka dan tunduk pada status, ketersediaan, pembayaran, serta konfirmasi yang berlaku.",
        ],
      },
      {
        id: "kedudukan-platform",
        title: "3. Ruang Lingkup & Kedudukan Segaloka",
        paragraphs: [
          "Segaloka menyediakan infrastruktur teknologi untuk pencarian, perbandingan, distribusi, pemesanan, pembayaran, pengelolaan transaksi, komunikasi, dan fungsi lain yang mendukung ekosistem perjalanan.",
          "Untuk produk yang disediakan oleh Travel atau Vendor, rincian dan pelaksanaan layanan dapat menjadi tanggung jawab penyedia terkait sesuai ruang lingkup layanan yang ditawarkan.",
          "Pada layanan tertentu Segaloka dapat menjalankan fungsi tambahan, termasuk pengelolaan pembayaran, settlement, administrasi transaksi, dukungan pelanggan, atau fungsi operasional lain sebagaimana ditampilkan pada layanan tersebut.",
        ],
      },
      {
        id: "akun-keamanan",
        title: "4. Akun, Registrasi & Keamanan",
        paragraphs: [
          "Sebagian fitur dapat digunakan tanpa akun, sedangkan fitur seperti pengelolaan pesanan, pembayaran, dokumen perjalanan, riwayat transaksi, program tertentu, atau dashboard dapat memerlukan akun.",
        ],
        bullets: [
          "Pengguna wajib memberikan informasi yang benar, akurat, terkini, dan dapat dipertanggungjawabkan.",
          "Pengguna bertanggung jawab menjaga kerahasiaan kata sandi, PIN, OTP, serta kredensial akun lainnya.",
          "Pengguna tidak diperkenankan memberikan akses akun kepada pihak yang tidak berwenang.",
          "Pengguna wajib segera mengambil tindakan pengamanan apabila mengetahui atau menduga adanya akses tanpa izin.",
        ],
      },
      {
        id: "kelayakan-pengguna",
        title: "5. Kelayakan Pengguna",
        paragraphs: [
          "Pengguna harus memiliki kewenangan hukum yang diperlukan untuk menggunakan layanan dan melakukan transaksi.",
          "Apabila pemesanan dilakukan untuk pihak lain, Pengguna bertanggung jawab memastikan bahwa data yang diberikan benar serta memiliki dasar yang sah untuk memberikan informasi traveler tersebut kepada pihak yang memerlukan untuk pelaksanaan layanan.",
        ],
      },
      {
        id: "produk-layanan",
        title: "6. Produk & Layanan",
        paragraphs: [
          "Segaloka dapat menampilkan Umrah, Haji, Halal Tour, Domestic, International, SegaDeals, Akomodasi & Land Arrangement, Visa, serta produk atau layanan perjalanan dan pendukung lainnya.",
          "Produk dan layanan dapat disediakan oleh Travel, Vendor, Segaloka, atau pihak lain yang terhubung dengan ekosistem sesuai karakteristik masing-masing layanan.",
          "Ketersediaan suatu kategori tidak berarti seluruh produk selalu tersedia pada semua kota, negara, tanggal, atau pengguna.",
        ],
      },
      {
        id: "informasi-produk",
        title: "7. Informasi Produk, Harga & Ketersediaan",
        paragraphs: [
          "Informasi produk dapat mencakup nama produk, penyedia, jadwal, destinasi, itinerary, tipe kamar, fasilitas, kuota, harga, kebijakan pembayaran, dokumen, syarat khusus, dan informasi relevan lainnya.",
          "Ketersediaan dan harga dapat berubah sebelum transaksi dikonfirmasi. Pengguna wajib memeriksa kembali ringkasan transaksi sebelum melakukan pembayaran.",
          "Apabila terdapat koreksi terhadap kesalahan informasi yang bersifat material, penanganannya dilakukan berdasarkan kondisi transaksi, status pesanan, dan hak para pihak yang berlaku.",
        ],
      },
      {
        id: "pemesanan",
        title: "8. Pemesanan & Konfirmasi",
        paragraphs: [
          "Pengguna wajib memeriksa produk, penyedia, jadwal, jumlah traveler, tipe layanan, fasilitas, harga, serta syarat transaksi sebelum menyelesaikan pemesanan.",
          "Pembuatan permintaan atau checkout tidak selalu berarti layanan telah terkonfirmasi. Status pesanan mengikuti status yang ditampilkan sistem dan/atau konfirmasi penyedia sesuai jenis layanan.",
          "Pengguna bertanggung jawab memastikan data yang dimasukkan pada saat pemesanan sesuai dengan dokumen perjalanan dan kebutuhan layanan.",
        ],
      },
      {
        id: "data-traveler",
        title: "9. Data Pemesan & Traveler",
        paragraphs: [
          "Segaloka dapat meminta data Pemesan dan data setiap Traveler sejauh diperlukan untuk memproses layanan.",
          "Untuk layanan tertentu, data traveler dapat mencakup nama sesuai paspor atau identitas, tanggal lahir, kewarganegaraan, nomor paspor, masa berlaku paspor, serta dokumen lain yang relevan.",
          "Keterlambatan, kesalahan, atau ketidaklengkapan data dapat memengaruhi proses layanan. Pengguna bertanggung jawab memberikan data yang benar sebelum batas waktu yang ditentukan.",
        ],
      },
      {
        id: "harga-biaya",
        title: "10. Harga, Biaya, Pajak & Mata Uang",
        paragraphs: [
          "Harga yang ditampilkan dapat terdiri atas harga produk, biaya layanan, biaya platform, pajak, biaya pembayaran, atau komponen lain yang relevan dan akan ditampilkan sesuai konteks transaksi.",
          "Jika pengguna memilih mata uang tampilan yang berbeda dari mata uang dasar transaksi, nilai konversi yang ditampilkan dapat digunakan sebagai informasi sesuai mekanisme nilai tukar yang berlaku pada sistem.",
          "Nilai akhir yang wajib dibayar adalah nilai yang tercantum pada ringkasan transaksi sebelum pengguna mengonfirmasi pembayaran.",
        ],
      },
      {
        id: "pembayaran",
        title: "11. Pembayaran, DP, Cicilan & Pelunasan",
        paragraphs: [
          "Metode pembayaran yang tersedia dapat berbeda menurut produk, penyedia, nilai transaksi, atau kondisi lainnya.",
          "Produk tertentu dapat mendukung pembayaran DP, cicilan, atau pelunasan sesuai ketentuan yang ditampilkan pada transaksi.",
          "Pengguna wajib memenuhi nominal minimum dan batas waktu pembayaran yang ditentukan. Keterlambatan dapat memengaruhi status pesanan sesuai ketentuan transaksi.",
          "Status pembayaran dianggap berhasil setelah pembayaran tercatat atau terkonfirmasi melalui mekanisme sistem yang berlaku.",
        ],
      },
      {
        id: "invoice",
        title: "12. Invoice & Status Transaksi",
        paragraphs: [
          "Segaloka dapat menyediakan invoice, ringkasan pembayaran, riwayat transaksi, atau dokumen transaksi lain sesuai jenis layanan.",
          "Pengguna wajib memeriksa status transaksi melalui sistem. Bukti transfer atau tangkapan layar dari sisi pengguna tidak dengan sendirinya mengubah status transaksi sebelum pembayaran terkonfirmasi.",
          "Apabila pembayaran masih berstatus menunggu, pengguna disarankan tidak melakukan pembayaran ulang sebelum memeriksa status atau instruksi yang tersedia.",
        ],
      },
      {
        id: "perubahan-pesanan",
        title: "13. Pembatalan, Refund, Reschedule & Perubahan",
        paragraphs: [
          "Permintaan pembatalan, refund, reschedule, atau perubahan pesanan mengikuti ketentuan produk, penyedia, dan transaksi yang berlaku ketika pesanan dibuat.",
          "Pengajuan permintaan tidak berarti permintaan otomatis disetujui.",
          "Kelayakan, nilai refund, biaya pembatalan, selisih harga, batas waktu, serta syarat perubahan dapat berbeda untuk setiap transaksi.",
          "Jadwal atau layanan sebelumnya tetap menjadi referensi sampai perubahan atau reschedule dinyatakan terkonfirmasi.",
        ],
      },
      {
        id: "umrah-haji",
        title: "14. Umrah & Haji",
        paragraphs: [
          "Produk Umrah dan Haji dapat memiliki ketentuan khusus mengenai jadwal keberangkatan, kuota, visa, dokumen, akomodasi, penerbangan, transportasi, pembimbing, serta persyaratan lain sesuai produk dan penyelenggara.",
          "Pengguna wajib memenuhi persyaratan dokumen dan ketentuan perjalanan yang ditampilkan pada produk atau diinformasikan dalam proses layanan.",
          "Perubahan yang dipengaruhi regulasi, otoritas, maskapai, penyedia akomodasi, atau kondisi operasional akan ditangani sesuai ketentuan transaksi dan ketentuan yang berlaku.",
        ],
      },
      {
        id: "tour",
        title: "15. Halal Tour, Domestic & International",
        paragraphs: [
          "Paket perjalanan dapat memiliki itinerary, jadwal, transportasi, akomodasi, fasilitas, aktivitas, dan ketentuan dokumen yang berbeda.",
          "Untuk perjalanan internasional, Traveler bertanggung jawab memastikan dokumen perjalanan yang menjadi kewajibannya memenuhi persyaratan negara tujuan atau transit.",
          "Itinerary dapat mengalami penyesuaian apabila diperlukan karena kondisi operasional, regulasi, keselamatan, cuaca, atau keadaan lain dengan memperhatikan substansi layanan dan ketentuan transaksi.",
        ],
      },
      {
        id: "akomodasi-la",
        title: "16. Akomodasi & Land Arrangement",
        paragraphs: [
          "Produk Akomodasi dan Land Arrangement dapat disediakan untuk periode keberangkatan tertentu dengan tipe kamar, jumlah traveler, hotel, transportasi, visa, handling, konsumsi, atau komponen layanan lainnya.",
          "Informasi Pemesan dapat diminta pada tahap transaksi, sedangkan data Traveler dan paspor dapat memiliki batas waktu pengisian sesuai produk atau periode keberangkatan.",
          "Informasi operasional dapat disusun melalui Paket Info, termasuk hotel, reservasi, transportasi, transfer, city tour, Masyair, handling, local contact, dan informasi terkait.",
          "Perubahan material terhadap komponen yang telah disepakati ditangani sesuai mekanisme perubahan yang berlaku pada transaksi. Pembaruan operasional yang tidak mengubah substansi transaksi dapat disampaikan melalui sistem atau kanal informasi yang tersedia.",
          "Confirmation Letter atau dokumen operasional lain tersedia sesuai status dan kesiapan layanan terkait.",
        ],
      },
      {
        id: "segadeals",
        title: "17. SegaDeals",
        paragraphs: [
          "SegaDeals memungkinkan Traveler menyampaikan kebutuhan perjalanan, termasuk jenis perjalanan, destinasi, waktu keberangkatan, jumlah traveler, dan anggaran.",
          "Permintaan dapat didistribusikan kepada Travel yang relevan dan mengaktifkan layanan SegaDeals untuk memberikan penawaran.",
          "Permintaan SegaDeals bukan merupakan pesanan yang terkonfirmasi. Transaksi dimulai setelah Traveler memilih penawaran dan melanjutkan proses pemesanan sesuai ketentuan yang ditampilkan.",
        ],
      },
      {
        id: "visa",
        title: "18. Visa & Dokumen Perjalanan",
        paragraphs: [
          "Layanan Visa dapat tersedia sebagai layanan tersendiri untuk jenis visa tertentu selain pengurusan visa yang menjadi bagian dari paket perjalanan.",
          "Persyaratan, biaya, estimasi proses, dokumen, dan ketersediaan layanan ditentukan berdasarkan jenis visa dan penyedia layanan.",
          "Keputusan penerbitan visa berada pada kewenangan otoritas terkait. Penggunaan layanan pengurusan visa tidak merupakan jaminan bahwa permohonan akan disetujui.",
        ],
      },
      {
        id: "travel-vendor",
        title: "19. Travel, Vendor & Penyedia Layanan",
        paragraphs: [
          "Travel dan Vendor bertanggung jawab atas informasi produk atau layanan yang mereka kelola, termasuk ketersediaan, harga, fasilitas, dokumen, dan pelaksanaan kewajiban operasional dalam ruang lingkupnya.",
          "Travel dan Vendor wajib memberikan informasi yang benar serta memperbarui informasi apabila terjadi perubahan yang relevan.",
          "Segaloka dapat menyediakan mekanisme administrasi, komunikasi, pembayaran, settlement, dokumentasi, dan pengelolaan transaksi untuk mendukung hubungan antara pihak terkait.",
        ],
      },
      {
        id: "jaringan-penjualan",
        title: "20. Affiliate, Agen & Mitra",
        paragraphs: [
          "Segaloka dapat menyediakan program Affiliate, Agen, Mitra, atau jaringan penjualan lain sesuai ketentuan program masing-masing.",
          "Hak penjualan, komisi, fee, wilayah, target, kuota, produk yang dapat dipasarkan, dan waktu pengakuan penghasilan mengikuti pengaturan program atau transaksi terkait.",
          "Peserta program tidak diperkenankan membuat pernyataan, janji, harga, manfaat, atau representasi yang bertentangan dengan informasi resmi produk.",
        ],
      },
      {
        id: "promo-loyalty",
        title: "21. Voucher, Promo & Loyalty Points",
        paragraphs: [
          "Voucher, promo, atau Loyalty Points dapat memiliki syarat mengenai produk yang memenuhi kriteria, periode berlaku, nilai minimum transaksi, kuota, batas penggunaan, metode pembayaran, atau ketentuan lain yang ditampilkan.",
          "Pengguna wajib memastikan manfaat voucher, promo, atau points telah tercermin pada ringkasan transaksi sebelum pembayaran.",
          "Pembatalan atau refund tidak otomatis mengembalikan voucher, promo, atau points. Penanganannya mengikuti ketentuan program dan transaksi yang berlaku.",
        ],
      },
      {
        id: "penggunaan-platform",
        title: "22. Kewajiban & Larangan Pengguna",
        bullets: [
          "Menggunakan Segaloka hanya untuk tujuan yang sah.",
          "Tidak memberikan informasi palsu atau menggunakan identitas dan dokumen pihak lain tanpa hak.",
          "Tidak mencoba mengakses sistem, akun, data, API, atau bagian platform yang bukan menjadi haknya.",
          "Tidak melakukan penipuan, penyalahgunaan pembayaran, manipulasi transaksi, spam, scraping yang tidak diizinkan, atau tindakan yang mengganggu sistem.",
          "Tidak menggunakan platform untuk melanggar hak pihak lain atau peraturan yang berlaku.",
        ],
      },
      {
        id: "kekayaan-intelektual",
        title: "23. Hak Kekayaan Intelektual",
        paragraphs: [
          "Hak atas merek, desain, antarmuka, perangkat lunak, materi, dan aset Segaloka tetap berada pada pemegang haknya masing-masing.",
          "Konten yang berasal dari Travel, Vendor, atau pihak lain tetap tunduk pada hak dan izin dari pemilik atau pihak yang berwenang.",
          "Penggunaan platform tidak memberikan hak kepada Pengguna untuk menyalin, menjual, mendistribusikan, memodifikasi, atau menggunakan aset tersebut di luar penggunaan yang diizinkan.",
        ],
      },
      {
        id: "gangguan-tanggung-jawab",
        title: "24. Gangguan, Keadaan Kahar & Tanggung Jawab",
        paragraphs: [
          "Layanan digital dapat mengalami pemeliharaan, gangguan teknis, gangguan jaringan, kegagalan penyedia pihak ketiga, atau kondisi lain di luar kendali yang wajar.",
          "Perjalanan juga dapat dipengaruhi cuaca, bencana, perubahan regulasi, tindakan otoritas, gangguan transportasi, keadaan keamanan, wabah, atau keadaan kahar lainnya.",
          "Tanggung jawab masing-masing pihak ditentukan berdasarkan perannya, ketentuan transaksi, dan peraturan yang berlaku. Tidak ada ketentuan dalam dokumen ini yang dimaksudkan untuk menghapus hak Pengguna yang tidak dapat dikesampingkan berdasarkan hukum yang berlaku.",
        ],
      },
      {
        id: "ketentuan-akhir",
        title: "25. Privasi, Perubahan Ketentuan & Bantuan",
        paragraphs: [
          "Pengelolaan informasi pribadi mengikuti Kebijakan Privasi Segaloka yang berlaku dan menjadi dokumen terpisah dari Syarat & Ketentuan ini.",
          "Segaloka dapat memperbarui Syarat & Ketentuan untuk menyesuaikan perkembangan layanan, teknologi, operasional, kebijakan, atau ketentuan yang berlaku. Versi dan tanggal pembaruan akan ditampilkan pada halaman ini.",
          "Apabila suatu ketentuan dinyatakan tidak dapat diberlakukan, bagian lainnya tetap berlaku sejauh diperbolehkan.",
          "Syarat & Ketentuan ini ditafsirkan sesuai hukum Republik Indonesia dengan tetap memperhatikan ketentuan perlindungan konsumen dan ketentuan wajib lainnya yang berlaku.",
          "Pertanyaan mengenai layanan, transaksi, atau ketentuan penggunaan dapat disampaikan melalui Pusat Bantuan Segaloka dan kanal bantuan resmi yang tersedia.",
        ],
      },
    ],
  },
  "kebijakan-privasi": {
    slug: "kebijakan-privasi",
    eyebrow: "PRIVASI SEGALOKA",
    title: "Kebijakan Privasi Segaloka",
    summary:
      "Penjelasan mengenai bagaimana Segaloka mengelola informasi dan data dalam penggunaan platform.",
    version: "1.0",
    effectiveDate: "4 Oktober 2026",
    lastUpdated: "4 Oktober 2026",
    sections: [
      {
        id: "pendahuluan",
        title: "1. Pendahuluan",
        paragraphs: [
          "Kebijakan Privasi ini menjelaskan jenis informasi yang dapat diproses ketika pengguna menggunakan website, aplikasi, layanan pemesanan, pembayaran, dan layanan lain di dalam ekosistem Segaloka.",
        ],
      },
      {
        id: "data",
        title: "2. Informasi yang Dapat Diproses",
        bullets: [
          "Informasi akun seperti nama, nomor telepon, dan alamat email.",
          "Informasi traveler yang diperlukan untuk pemesanan perjalanan.",
          "Informasi transaksi dan pembayaran.",
          "Informasi perangkat, aktivitas penggunaan, dan keamanan sistem.",
          "Informasi yang diberikan ketika pengguna menghubungi layanan bantuan.",
        ],
      },
      {
        id: "tujuan",
        title: "3. Tujuan Penggunaan Informasi",
        bullets: [
          "Memproses dan mengelola pemesanan.",
          "Memproses pembayaran dan transaksi.",
          "Memberikan layanan pelanggan dan bantuan.",
          "Menjaga keamanan platform dan mencegah penyalahgunaan.",
          "Mengembangkan dan meningkatkan layanan Segaloka.",
          "Memberikan informasi layanan dan komunikasi yang relevan sesuai pengaturan pengguna.",
        ],
      },
      {
        id: "penyedia",
        title: "4. Travel, Vendor, dan Penyedia Layanan",
        paragraphs: [
          "Informasi tertentu dapat diteruskan kepada travel, vendor, penyedia pembayaran, atau pihak lain sejauh diperlukan untuk memproses layanan yang dipilih pengguna.",
        ],
      },
      {
        id: "keamanan",
        title: "5. Keamanan Informasi",
        paragraphs: [
          "Segaloka menerapkan langkah pengamanan yang sesuai untuk membantu melindungi informasi dari akses, penggunaan, perubahan, atau pengungkapan yang tidak sah.",
        ],
      },
      {
        id: "penyimpanan",
        title: "6. Penyimpanan dan Retensi",
        paragraphs: [
          "Informasi disimpan selama diperlukan untuk memberikan layanan, memenuhi kewajiban transaksi, keamanan, audit, dan kewajiban lain yang berlaku.",
        ],
      },
      {
        id: "hak",
        title: "7. Hak Pengguna",
        paragraphs: [
          "Pengguna dapat meminta pembaruan atau koreksi informasi tertentu sesuai fitur yang tersedia dan ketentuan yang berlaku.",
        ],
      },
      {
        id: "cookies",
        title: "8. Cookies dan Teknologi Serupa",
        paragraphs: [
          "Website Segaloka dapat menggunakan cookies atau teknologi serupa untuk fungsi platform, keamanan, preferensi, analitik, dan peningkatan pengalaman pengguna.",
        ],
      },
      {
        id: "perubahan",
        title: "9. Perubahan Kebijakan Privasi",
        paragraphs: [
          "Segaloka dapat memperbarui Kebijakan Privasi dari waktu ke waktu. Versi terbaru akan ditampilkan pada halaman ini beserta tanggal pembaruannya.",
        ],
      },
      {
        id: "kontak",
        title: "10. Pertanyaan Privasi",
        paragraphs: [
          "Pertanyaan terkait privasi dan penggunaan informasi dapat disampaikan melalui Pusat Bantuan Segaloka.",
        ],
      },
    ],
  },
};

export type LegalLanguage = LanguageCode;

export const legalDocuments: Record<
  LegalLanguage,
  Record<LegalDocument["slug"], LegalDocument>
> = {
  ID: legalDocumentsID,
  EN: {
    ...legalDocumentsID,
    "syarat-ketentuan": legalTermsEN,
  },
  AR: {
    ...legalDocumentsID,
    "syarat-ketentuan": legalTermsAR,
  },
};

export function getLegalDocument(
  slug: LegalDocument["slug"],
  language: LegalLanguage = "ID",
) {
  return (
    legalDocuments[language]?.[slug] ??
    legalDocuments.ID[slug]
  );
}