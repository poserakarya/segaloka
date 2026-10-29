import type {
  VisaDetailData,
  VisaProduct,
  VisaProductGroup,
  VisaVendor,
} from "./visa-detail.types";

import {
  visaCountries,
  visaCountryNames,
} from "./visa-countries";

const vendors: Record<string, VisaVendor> = {
  abw: {
    id: "vendor-abw",
    slug: "abw-travel-service",
    name: "ABW Travel Service",
    verified: true,
    rating: 4.9,
    reviewCount: 126,
    location: "Makassar",
  },

  belanjaVisa: {
    id: "vendor-belanja-visa",
    slug: "belanja-visa",
    name: "Belanja Visa",
    verified: true,
    rating: 4.8,
    reviewCount: 94,
    location: "Jakarta",
  },

  visaGo: {
    id: "vendor-visa-go",
    slug: "visa-go",
    name: "Visa Go",
    verified: true,
    rating: 4.7,
    reviewCount: 81,
    location: "Surabaya",
  },
};

const chinaProducts: VisaProduct[] = [
  /*
   * Canonical UI products - China / ABW Travel Service.
   *
   * Satu kartu vendor = satu record produk nyata.
   * Layout detail tetap universal.
   *
   * Ketika Supabase aktif, data ini akan dipindahkan ke
   * katalog produk Visa milik Vendor.
   */
  {
    id: "china-single-entry-abw",
    slug: "single-entry",
    countrySlug: "china",
    category: "Single Entry",
    title: "Single Entry",
    visaType: "Single Entry Visa",
    description:
      "Visa untuk masuk ke China satu kali. Cocok untuk perjalanan wisata, bisnis, atau kunjungan dengan satu kali masuk.",
    suitableFor: [
      "Wisata",
      "Bisnis",
      "Kunjungan",
    ],
    validity: "3 bulan",
    stayDuration: "Maks. 30 hari",
    processTime: "7–14 hari kerja",
    entryType: "Single Entry",
    processingType: "Regular",
    purpose: "Wisata / Bisnis / Kunjungan",
    price: 1295000,
    priceUnit: "traveler",
    popular: true,
    vendor: vendors.abw,
    included: [
      "Pemeriksaan dokumen",
      "Pengajuan visa",
      "Update proses",
      "Konsultasi",
    ],
  },
  {
    id: "china-single-entry-express-abw",
    slug: "single-entry-express",
    countrySlug: "china",
    category: "Single Entry",
    title: "Single Entry Express",
    visaType: "Single Entry Visa",
    description:
      "Visa satu kali masuk dengan proses lebih cepat untuk kebutuhan perjalanan yang lebih mendesak.",
    suitableFor: [
      "Wisata",
      "Bisnis",
      "Kunjungan",
    ],
    validity: "3 bulan",
    stayDuration: "Maks. 30 hari",
    processTime: "Proses express",
    entryType: "Single Entry",
    processingType: "Express",
    purpose: "Wisata / Bisnis / Kunjungan",
    price: 1895000,
    priceUnit: "traveler",
    vendor: vendors.abw,
    included: [
      "Pemeriksaan dokumen",
      "Pengajuan visa",
      "Proses express",
      "Update proses",
      "Konsultasi",
    ],
  },
  {
    id: "china-double-entry-abw",
    slug: "double-entry",
    countrySlug: "china",
    category: "Double Entry",
    title: "Double Entry",
    visaType: "Double Entry Visa",
    description:
      "Visa untuk masuk ke China sebanyak dua kali selama masa berlaku visa.",
    suitableFor: [
      "Wisata",
      "Bisnis",
      "Kunjungan",
    ],
    validity: "6 bulan",
    stayDuration: "Maks. 30 hari/kunjungan",
    processTime: "7–14 hari kerja",
    entryType: "Double Entry",
    price: 1595000,
    priceUnit: "traveler",
    vendor: vendors.abw,
    included: [
      "Pemeriksaan dokumen",
      "Pengajuan visa",
      "Update proses",
      "Konsultasi",
    ],
  },
  {
    id: "china-double-entry-express-abw",
    slug: "double-entry-express",
    countrySlug: "china",
    category: "Double Entry",
    title: "Double Entry Express",
    visaType: "Double Entry Visa",
    description:
      "Visa dua kali masuk dengan proses dipercepat untuk kebutuhan perjalanan dengan jadwal lebih dekat.",
    suitableFor: [
      "Wisata",
      "Bisnis",
      "Kunjungan",
    ],
    validity: "6 bulan",
    stayDuration: "Maks. 30 hari/kunjungan",
    processTime: "Proses express",
    entryType: "Double Entry",
    price: 2195000,
    priceUnit: "traveler",
    vendor: vendors.abw,
    included: [
      "Pemeriksaan dokumen",
      "Pengajuan visa",
      "Proses express",
      "Update proses",
      "Konsultasi",
    ],
  },
  {
    id: "china-multiple-entry-6-abw",
    slug: "multiple-entry-6",
    countrySlug: "china",
    category: "Multiple Entry",
    title: "Multiple Entry (6 Bulan)",
    visaType: "Multiple Entry Visa",
    description:
      "Visa untuk perjalanan berkali-kali ke China dengan masa berlaku hingga 6 bulan.",
    suitableFor: [
      "Bisnis",
      "Kunjungan Berulang",
    ],
    validity: "6 bulan",
    stayDuration: "Sesuai visa",
    processTime: "Sesuai pemeriksaan",
    entryType: "Multiple Entry",
    price: 1895000,
    priceUnit: "traveler",
    vendor: vendors.abw,
    included: [
      "Pemeriksaan dokumen",
      "Pengajuan visa",
      "Pendampingan",
      "Update proses",
      "Konsultasi",
    ],
  },
  {
    id: "china-multiple-entry-12-abw",
    slug: "multiple-entry-12",
    countrySlug: "china",
    category: "Multiple Entry",
    title: "Multiple Entry (12 Bulan)",
    visaType: "Multiple Entry Visa",
    description:
      "Visa untuk perjalanan berkali-kali ke China dengan masa berlaku hingga 12 bulan.",
    suitableFor: [
      "Bisnis",
      "Kunjungan Berulang",
    ],
    validity: "12 bulan",
    stayDuration: "Sesuai visa",
    processTime: "Sesuai pemeriksaan",
    entryType: "Multiple Entry",
    price: 2395000,
    priceUnit: "traveler",
    vendor: vendors.abw,
    included: [
      "Pemeriksaan dokumen",
      "Pengajuan visa",
      "Pendampingan",
      "Update proses",
      "Konsultasi",
    ],
  },
];

function getVisaGroupSlug(
  product: VisaProduct,
): string {
  const countrySlug =
    product.countrySlug
      .trim()
      .toLowerCase();

  const categorySlug =
    product.category
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  if (!countrySlug || !categorySlug) {
    return product.id;
  }

  /*
   * Jenis Visa bersifat country-scoped.
   *
   * Contoh:
   * china:single-entry
   * china:double-entry
   * japan:visa-waiver
   *
   * Jangan mengasumsikan jenis Visa suatu negara
   * tersedia atau memiliki aturan yang sama
   * dengan negara lain.
   */
  return `${countrySlug}:${categorySlug}`;
}
export function getVisaProductGroupsByCountry(
  countrySlug: string,
): VisaProductGroup[] {
  const products =
    getVisaProductsByCountry(
      countrySlug,
    );

  const grouped =
    new Map<
      string,
      VisaProduct[]
    >();

  for (const product of products) {
    const groupSlug =
      getVisaGroupSlug(product);

    const existing =
      grouped.get(groupSlug) ?? [];

    existing.push(product);

    grouped.set(
      groupSlug,
      existing,
    );
  }

  return Array.from(
    grouped.entries(),
  ).map(
    ([slug, offers]) => {
      const first =
        offers[0];

      const validPrices =
        offers
          .map(
            (offer) =>
              offer.price,
          )
          .filter(
            (price) =>
              price > 0,
          );

      const startingPrice =
        validPrices.length > 0
          ? Math.min(
              ...validPrices,
            )
          : null;

      return {
        slug,
        countrySlug,
        category:
          first.category,
        title:
          first.title,
        visaType:
          first.visaType,
        description:
          first.description,
        suitableFor:
          first.suitableFor,

        startingPrice,
        vendorCount:
          new Set(
            offers.map(
              (offer) =>
                offer.vendor.id,
            ),
          ).size,
        popular:
          offers.some(
            (offer) =>
              offer.popular,
          ),
        offers:
          [...offers].sort(
            (a, b) => {
              if (
                a.price <= 0 &&
                b.price <= 0
              ) {
                return 0;
              }

              if (a.price <= 0) {
                return 1;
              }

              if (b.price <= 0) {
                return -1;
              }

              return (
                a.price -
                b.price
              );
            },
          ),
      };
    },
  );
}

export function getVisaProductGroup(
  countrySlug: string,
  groupSlug: string,
): VisaProductGroup | null {
  return (
    getVisaProductGroupsByCountry(
      countrySlug,
    ).find(
      (group) =>
        group.slug ===
        groupSlug,
    ) ?? null
  );
}
export function getVisaVendorBySlug(
  vendorSlug: string,
): VisaVendor | null {
  const normalizedVendorSlug =
    vendorSlug.trim().toLowerCase();

  return (
    Object.values(vendors).find(
      (vendor) =>
        vendor.slug.toLowerCase() ===
        normalizedVendorSlug,
    ) ?? null
  );
}

export function getVisaProductsByVendor(
  countrySlug: string,
  vendorSlug: string,
): VisaProduct[] {
  const normalizedCountrySlug =
    countrySlug.trim().toLowerCase();

  const normalizedVendorSlug =
    vendorSlug.trim().toLowerCase();

  return getVisaProductsByCountry(
    normalizedCountrySlug,
  ).filter(
    (product) =>
      product.vendor.slug.toLowerCase() ===
      normalizedVendorSlug,
  );
}
export function getVisaProductsByCountry(
  slug: string,
): VisaProduct[] {
  const normalizedSlug = slug.trim().toLowerCase();

  if (normalizedSlug === "china") {
    return chinaProducts;
  }

  // Tidak membuat produk dummy/fallback.
  // Negara tanpa Vendor Offer yang tersedia menghasilkan array kosong.
  return [];
}
export function getVisaProductBySlug(
  productSlug: string,
): VisaProduct | null {
  const normalizedProductSlug =
    productSlug.trim().toLowerCase();

  return (
    chinaProducts.find(
      (product) =>
        product.slug.toLowerCase() ===
        normalizedProductSlug,
    ) ?? null
  );
}
export function getVisaDetailMock(
  slug: string,
): VisaDetailData | null {
  const normalizedSlug =
    slug.trim().toLowerCase();

  const name =
    visaCountryNames[normalizedSlug];

  if (!name) {
    return null;
  }

  const alternatives =
    visaCountries
      .filter(
        (country) =>
          country.slug !== normalizedSlug,
      )
      .slice(0, 5)
      .map((country) => ({
        slug: country.slug,
        name: country.name,
        image: country.image,
        flag:
          `/images/visa/flags/${country.slug}.jpg`,
      }));

  return {
    country: {
      slug: normalizedSlug,

      name,

      description:
        `Butuh visa ke ${name}? Bandingkan pilihan visa dari berbagai Vendor Segaloka dan pilih layanan yang paling sesuai dengan perjalanan Anda.`,

      flag:
        `/images/visa/flags/${normalizedSlug}.jpg`,

      image:
        `/images/visa/countries/${normalizedSlug}.jpg`,
    },

    products:
      getVisaProductsByCountry(normalizedSlug),

    requirements: [
      {
        label:
          "Paspor masih berlaku minimal 6 bulan",
      },

      {
        label:
          "Foto berwarna terbaru",
      },

      {
        label:
          "Dokumen pendukung sesuai jenis visa",
      },

      {
        label:
          "Formulir aplikasi yang telah diisi",
      },
    ],

    processEstimate:
      "Tergantung produk dan Vendor",

    services: [
      "Bandingkan harga berbagai Vendor",
      "Pengecekan dokumen",
      "Update status pengajuan",
      "Dukungan selama proses",
    ],

    faqs: [
      {
        question:
          `Berapa lama proses pembuatan visa ${name}?`,

        answer:
          "Estimasi proses berbeda untuk setiap produk dan Vendor. Estimasi yang berlaku ditampilkan pada masing-masing penawaran.",
      },

      {
        question:
          "Apakah harga setiap Vendor sama?",

        answer:
          "Tidak. Setiap Vendor dapat menawarkan harga, estimasi proses, dan layanan yang berbeda.",
      },

      {
        question:
          "Apakah bisa mengajukan visa untuk anak?",

        answer:
          "Ketersediaan pengajuan untuk anak mengikuti jenis visa dan ketentuan produk yang dipilih.",
      },

      {
        question:
          "Dokumen apa saja yang diperlukan?",

        answer:
          "Persyaratan lengkap mengikuti jenis visa dan Vendor yang dipilih.",
      },
    ],

    popularCountries:
      alternatives,
  };
}