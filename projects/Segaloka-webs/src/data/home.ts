export type ProductCategory = {
  label: string;
  href: string;
  icon: string;
};

export type TravelPackageCategory =
  | "Umrah"
  | "Haji"
  | "Halal Tour"
  | "Tour Domestic"
  | "Tour International";

export type TravelProduct = {
  category: TravelPackageCategory;
  id: string;
  title: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  badge?: string;
  duration?: string;
  travelName?: string;
  travelLogo?: string;
};

export const productCategories: ProductCategory[] = [
  { label: "Umrah", href: "/search?category=umrah", icon: "kaaba" },
  { label: "Haji", href: "/search?category=haji", icon: "moon" },
  { label: "Halal Tour", href: "/search?category=halal-tour", icon: "globe" },
  { label: "Tour Domestic", href: "/search?category=tour-domestic", icon: "map" },
  { label: "Tour International", href: "/search?category=tour-international", icon: "plane" },
  { label: "SegaDeals", href: "/segadeals", icon: "tag" },
];

export const benefits = [
  {
    title: "Harga Terbaik",
    description: "Pilihan paket dengan harga kompetitif",
  },
  {
    title: "Pembayaran Aman",
    description: "Transaksi aman dan terpercaya",
  },
  {
    title: "Pilihan Lengkap",
    description: "Berbagai destinasi di seluruh dunia",
  },
  {
    title: "Layanan 24/7",
    description: "Siap membantu perjalanan Anda",
  },
];

export const coupons = [
  {
    code: "UMRAH2500",
    title: "Diskon hingga Rp2.500.000",
    subtitle: "Untuk Paket Umrah",
  },
  {
    code: "TOUR1000",
    title: "Diskon Rp1.000.000",
    subtitle: "Tour Internasional",
  },
  {
    code: "HOTEL500",
    title: "Cashback Rp500.000",
    subtitle: "Hotel & Akomodasi",
  },
  {
    code: "ATRAKSI20",
    title: "Diskon hingga 20%",
    subtitle: "Tiket Atraksi",
  },
];

export const featuredPackages: TravelProduct[] = [
  {
    id: "umrah-premium-12d",
    category: "Umrah",
    title: "Umrah Premium 12 Hari",
    travelName: "Nuzultrip",
    travelLogo: "/images/travel/nuzultrip.png",
    location: "Makkah · Madinah",
    price: 32900000,
    rating: 4.9,
    reviews: 128,
    duration: "12 Hari",
    badge: "Pilihan",
    image:
      "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "umrah-plus-turkiye",
    category: "Umrah",
    title: "Umrah Plus Turkiye",
    travelName: "Nuzultrip",
    travelLogo: "/images/travel/nuzultrip.png",
    location: "Istanbul · Makkah · Madinah",
    price: 38900000,
    rating: 4.8,
    reviews: 84,
    duration: "13 Hari",
    badge: "Favorit",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "halal-tour-japan",
    category: "Halal Tour",
    title: "Halal Tour Japan",
    travelName: "Segaloka Travel Partner",
    travelLogo: "/images/travel/travel-placeholder.png",
    location: "Tokyo · Fuji · Osaka",
    price: 24750000,
    rating: 4.8,
    reviews: 61,
    duration: "7 Hari",
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "halal-tour-korea",
    category: "Halal Tour",
    title: "Halal Tour Korea",
    travelName: "Segaloka Travel Partner",
    travelLogo: "/images/travel/travel-placeholder.png",
    location: "Seoul · Nami · Busan",
    price: 21900000,
    rating: 4.7,
    reviews: 49,
    duration: "7 Hari",
    image:
      "https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1200&q=85",
  },
];

export const sponsoredPackageRotation = {
  intervalMs: 15_000,
};

export const accommodations = [
  {
    title: "Hotel di Makkah",
    subtitle: "Dekat Masjidil Haram",
    image:
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Hotel di Madinah",
    subtitle: "Nyaman untuk jamaah",
    image:
      "https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Hotel Istanbul",
    subtitle: "Pilihan Halal Tour",
    image:
      "https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=1200&q=85",
  },
];

export const destinations = [
  {
    title: "Makkah",
    image:
      "https://images.unsplash.com/photo-1591604466107-ec97de577aff?auto=format&fit=crop&w=900&q=85",
  },
  {
    title: "Madinah",
    image:
      "https://images.unsplash.com/photo-1591004272853-146867e8f7c8?auto=format&fit=crop&w=900&q=85",
  },
  {
    title: "Istanbul",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=900&q=85",
  },
  {
    title: "Tokyo",
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=85",
  },
  {
    title: "Dubai",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=85",
  },
];

export const articles = [
  {
    title: "Persiapan Penting Sebelum Perjalanan Umrah",
    category: "Panduan Umrah",
    image:
      "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Tips Menentukan Paket Halal Tour yang Sesuai",
    category: "Inspirasi",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Checklist Dokumen Perjalanan Internasional",
    category: "Travel Tips",
    image:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=85",
  },
];

