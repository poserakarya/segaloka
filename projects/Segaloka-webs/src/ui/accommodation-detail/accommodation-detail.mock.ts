export type AccommodationDetailGalleryItem = {
  src: string;
  alt: string;
};

export type AccommodationDetailHighlight = {
  label: string;
  tone: "orange" | "green" | "blue";
};

export type AccommodationDetailSummary = {
  label: string;
  value: string;
  description: string;
  icon:
    | "calendar"
    | "location"
    | "hotel"
    | "transport"
    | "service"
    | "program";
};

export type AccommodationDetailRoom = {
  id: "quad" | "triple" | "double" | "single";
  label: string;
  capacity: number;
  price: number;
  badge?: string;
};

export type AccommodationDetailItinerary = {
  day: string;
  description: string;
};

export type AccommodationDetailMock = {
  category: string;
  title: string;
  rating: number;
  reviews: number;
  locations: string[];
  highlights: AccommodationDetailHighlight[];
  gallery: AccommodationDetailGalleryItem[];
  photoCount: number;

  provider: {
    type: "Travel" | "Vendor";
    name: string;
    verified: boolean;

    /*
     * UI contract.
     * Backend nanti mengisi dari provider canonical:
     * provider_id -> Travel/Vendor -> public contact.
     */
    contactUrl?: string;
    profileUrl?: string;
  };

  notice: {
    title: string;
    description: string;
  };

  summary: AccommodationDetailSummary[];
  rooms: AccommodationDetailRoom[];
  facilities: string[];
  itinerary: AccommodationDetailItinerary[];
  included: string[];
  excluded: string[];
  policies: string[];
  importantNotes: string[];

  customOffer: {
    enabled: boolean;
    title: string;
    description: string;
  };
};

export const makkahMadinahAccommodationMock: AccommodationDetailMock = {
  category: "Land Arrangement",
  title: "Land Arrangement Makkah & Madinah",
  rating: 4.9,
  reviews: 128,

  locations: [
    "Makkah, Arab Saudi",
    "Madinah, Arab Saudi",
  ],

  highlights: [
    {
      label: "Terlaris",
      tone: "orange",
    },
    {
      label: "Bisa Custom",
      tone: "green",
    },
    {
      label: "Harga Terbaik",
      tone: "blue",
    },
  ],

  /*
   * PRESENTATION MOCK
   *
   * Untuk sementara aset existing digunakan sebagai fallback agar
   * halaman tidak bergantung pada Supabase.
   *
   * Ketika aset gallery final tersedia, cukup ganti src di sini.
   */
  gallery: [
    {
      src: "/images/la/makkah-madinah.jpg",
      alt: "Land Arrangement Makkah dan Madinah",
    },
    {
      src: "/images/la/makkah-madinah.jpg",
      alt: "Makkah",
    },
    {
      src: "/images/la/makkah-madinah.jpg",
      alt: "Madinah",
    },
    {
      src: "/images/la/makkah-madinah.jpg",
      alt: "Hotel",
    },
    {
      src: "/images/la/makkah-madinah.jpg",
      alt: "Restoran",
    },
    {
      src: "/images/la/makkah-madinah.jpg",
      alt: "Transportasi",
    },
  ],

  photoCount: 12,

  provider: {
    type: "Vendor",
    name: "Penyedia LA",
    verified: true,

    /*
     * Sengaja belum diisi.
     * Jangan hardcode nomor/URL provider palsu.
     */
    contactUrl: undefined,
    profileUrl: undefined,
  },

  notice: {
    title: "Land Arrangement",
    description:
      "Harga ini khusus untuk layanan di tanah suci (tidak termasuk tiket pesawat). Layanan dapat disesuaikan sesuai kebutuhan jamaah.",
  },

  summary: [
    {
      label: "9 Hari",
      value: "Durasi program",
      description: "",
      icon: "calendar",
    },
    {
      label: "Makkah & Madinah",
      value: "2 kota utama",
      description: "",
      icon: "location",
    },
    {
      label: "Akomodasi",
      value: "Hotel pilihan",
      description: "",
      icon: "hotel",
    },
    {
      label: "Transportasi",
      value: "Bus eksekutif",
      description: "",
      icon: "transport",
    },
    {
      label: "Layanan",
      value: "Handling perjalanan",
      description: "",
      icon: "service",
    },
    {
      label: "Program",
      value: "Sesuai paket LA",
      description: "",
      icon: "program",
    },
  ],

  rooms: [
    {
      id: "quad",
      label: "Quad",
      capacity: 4,
      price: 6450000,
      badge: "Paling Hemat",
    },
    {
      id: "triple",
      label: "Triple",
      capacity: 3,
      price: 6850000,
    },
    {
      id: "double",
      label: "Double",
      capacity: 2,
      price: 7650000,
    },
    {
      id: "single",
      label: "Single",
      capacity: 1,
      price: 10950000,
    },
  ],

  facilities: [
    "Akomodasi hotel di Makkah & Madinah (sesuai paket)",
    "Transportasi darat AC",
    "Visa (jika termasuk dalam paket)",
    "Handling perjalanan",
    "Air zamzam (sesuai ketentuan)",
  ],

  itinerary: [
    {
      day: "Hari 1",
      description: "Tiba di Madinah & check-in hotel",
    },
    {
      day: "Hari 2",
      description: "Ziarah Madinah",
    },
    {
      day: "Hari 3",
      description: "Perjalanan ke Makkah",
    },
    {
      day: "Hari 4–8",
      description: "Ibadah & kegiatan mandiri",
    },
    {
      day: "Hari 9",
      description: "Kembali / program selesai",
    },
  ],

  included: [
    "Hotel sesuai paket di Makkah & Madinah",
    "Transportasi darat selama program",
    "Visa (jika termasuk dalam paket)",
    "Handling & pendampingan",
    "Air zamzam (sesuai ketentuan)",
  ],

  excluded: [
    "Tiket pesawat internasional kecuali dinyatakan termasuk",
    "Pengeluaran pribadi",
    "Layanan tambahan di luar paket",
  ],

  policies: [
    "Ketentuan perubahan jadwal mengikuti kebijakan Travel atau Vendor.",
    "Harga final mengikuti konfigurasi kamar dan periode perjalanan.",
    "Ketentuan pembayaran ditampilkan sebelum proses pemesanan dilanjutkan.",
  ],

  importantNotes: [
    "Detail hotel, transportasi, dan layanan dapat menyesuaikan ketersediaan.",
    "Jadwal perjalanan dapat berubah mengikuti kondisi operasional.",
  ],

  customOffer: {
    enabled: true,
    title: "Butuh penawaran khusus?",
    description:
      "Hubungi tim kami untuk request paket sesuai kebutuhan.",
  },
};