export type RoomType = "quad" | "triple" | "double";

export type AccommodationPeriod = {
  id: string;
  startDate: string;
  endDate: string;
  bookingDeadline: string;
  quota: number;
  remainingQuota: number;
  status: "AVAILABLE" | "SOLD_OUT" | "CLOSED";
  rooms: Record<
    RoomType,
    {
      pricePerPax: number;
      availableRooms: number;
    }
  >;
};

export type AccommodationGalleryItem = {
  src: string;
  alt?: string;
};

export type AccommodationLocation = {
  label: string;
};

export type AccommodationHighlight = {
  label: string;
  tone?: "blue" | "green" | "orange";
};

export type AccommodationSummaryItem = {
  label: string;
  value: string;
};

export type AccommodationRoomCatalogItem = {
  id: string;
  label: string;
  capacity: number;
  priceFrom: number;
  badge?: string;
  bookingRoomType?: RoomType;
};

export type AccommodationImportantNote = {
  title?: string;
  description: string;
};
export type AccommodationProduct = {
  slug: string;
  title: string;
  city: string;
  country: string;
  duration: string;
  providerType: "Travel" | "Vendor";
  providerName: string;
  rating: number;
  reviews: number;
  price: number;
  image: string;

  subtitle?: string;
  badge?: string;

  route?: string;
  description?: string;
  includes: string[];
  excludes?: string[];
  facilities?: string[];
  itinerary?: {
    day: string;
    title: string;
    description: string;
  }[];

  gallery?: AccommodationGalleryItem[];
  locations?: AccommodationLocation[];
  highlights?: AccommodationHighlight[];
  summary?: AccommodationSummaryItem[];
  roomCatalog?: AccommodationRoomCatalogItem[];
  importantNotes?: AccommodationImportantNote[];
  photoCount?: number;
  verifiedProvider?: boolean;
  customOfferAvailable?: boolean;
  contactAvailable?: boolean;
  periods?: AccommodationPeriod[];
};

export const accommodationProducts: AccommodationProduct[] = [
  {
    slug: "makkah-madinah-9d",
    city: "Makkah & Madinah",
    country: "Arab Saudi",
    title: "Land Arrangement Makkah & Madinah",
    subtitle: "Akomodasi & Land Arrangement",
    duration: "9 Hari",
    providerType: "Vendor",
    providerName: "Penyedia LA",
    rating: 4.9,
    reviews: 128,
    price: 6450000,
    image: "/images/la/makkah-madinah.jpg",
    includes: ["Hotel", "Transportasi", "Visa", "Handling"],
    badge: "Pilihan",
  },
  {
    slug: "istanbul-7d",
    city: "Istanbul",
    country: "Turki",
    title: "Land Arrangement Istanbul",
    subtitle: "Akomodasi & Land Arrangement",
    duration: "7 Hari",
    providerType: "Vendor",
    providerName: "Penyedia LA",
    rating: 4.8,
    reviews: 86,
    price: 5750000,
    image: "/images/la/istanbul.jpg",
    includes: ["Hotel", "Transportasi", "Guide", "Makan"],
    badge: "Promo",
  },
  {
    slug: "dubai-5d",
    city: "Dubai",
    country: "Uni Emirat Arab",
    title: "Land Arrangement Dubai",
    subtitle: "Akomodasi & Land Arrangement",
    duration: "5 Hari",
    providerType: "Vendor",
    providerName: "Penyedia LA",
    rating: 4.8,
    reviews: 72,
    price: 4950000,
    image: "/images/la/dubai.jpg",
    includes: ["Hotel", "Transportasi", "Guide", "Handling"],
    badge: "Populer",
  },
  {
    slug: "cairo-6d",
    city: "Kairo",
    country: "Mesir",
    title: "Land Arrangement Kairo",
    subtitle: "Akomodasi & Land Arrangement",
    duration: "6 Hari",
    providerType: "Travel",
    providerName: "Travel",
    rating: 4.7,
    reviews: 61,
    price: 5250000,
    image: "/images/la/cairo.jpg",
    includes: ["Hotel", "Transportasi", "Guide", "Makan"],
  },
  {
    slug: "kuala-lumpur-4d",
    city: "Kuala Lumpur",
    country: "Malaysia",
    title: "Land Arrangement Kuala Lumpur",
    subtitle: "Akomodasi & Land Arrangement",
    duration: "4 Hari",
    providerType: "Vendor",
    providerName: "Penyedia LA",
    rating: 4.7,
    reviews: 54,
    price: 2850000,
    image: "/images/la/kuala-lumpur.jpg",
    includes: ["Hotel", "Transportasi", "Guide"],
  },
  {
    slug: "pulau-nusa",
    city: "Bali",
    country: "Indonesia",
    title: "Land Arrangement Pulau Nusa",
    subtitle: "Akomodasi & Land Arrangement Pulau Nusa",
    duration: "4 Hari",
    providerType: "Vendor",
    providerName: "Nusa Hospitality",
    rating: 4.7,
    reviews: 49,
    price: 2450000,
    image: "/images/la/pulau-nusa.jpg",
    includes: ["Hotel", "Transportasi", "Guide"],
  },
];

export function getAccommodationBySlug(
  slug: string,
): AccommodationProduct | undefined {
  return accommodationProducts.find(
    (product) => product.slug === slug,
  );
}