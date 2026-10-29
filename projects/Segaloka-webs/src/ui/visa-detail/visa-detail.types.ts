import type {
  VisaServiceRequirements,
} from "@/lib/visa/visa-document-requirements";
export type VisaDetailCountry = {
  slug: string;
  name: string;
  description: string;
  flag: string;
  image: string;
};

export type VisaVendor = {
  id: string;
  slug: string;
  name: string;
  verified: boolean;
  rating?: number;
  reviewCount?: number;
  location?: string;
};

export type VisaProduct = {
  id: string;
  slug: string;

  countrySlug: string;

  category: string;
  title: string;
  visaType: string;

  description: string;
  suitableFor: string[];

  validity: string;
  stayDuration: string;
  processTime: string;

  entryType?: string;

  price: number;
  priceUnit: "traveler";

  popular?: boolean;

  vendor: VisaVendor;

  included: string[];

  processingType?: string;
  purpose?: string;
  /**
   * Konten ringkas untuk presentasi produk.
   * Bukan sumber workflow dokumen transaksi.
   */
  requirements?: string[];
  documents?: string[];

  /**
   * Requirement operasional yang dikonfigurasi Vendor.
   *
   * Menjadi sumber untuk:
   * - upload dokumen per pemohon;
   * - pemeriksaan dan revisi;
   * - pengiriman dokumen asli;
   * - wawancara/biometrik/foto/kehadiran fisik.
   *
   * Optional agar produk lama tetap kompatibel.
   */
  serviceRequirements?: VisaServiceRequirements;

  depositPolicy?: {
    enabled: boolean;
    type: "fixed" | "percentage";
    value: number;
  };
};

export type VisaProductGroup = {
  slug: string;
  countrySlug: string;

  /*
   * Identitas kelompok Visa untuk negara terkait.
   * Tidak boleh dianggap berlaku global untuk negara lain.
   */
  category: string;
  title: string;
  visaType: string;
  description: string;
  suitableFor: string[];

  /*
   * Ringkasan marketplace yang dihitung dari Vendor Offer.
   */
  startingPrice: number | null;
  vendorCount: number;
  popular: boolean;

  /*
   * Seluruh penawaran Vendor untuk kelompok Visa ini.
   * Harga, entry type, proses, validity, syarat, DP,
   * dan atribut operasional lainnya tetap milik offer.
   */
  offers: VisaProduct[];
};
export type VisaRequirement = {
  label: string;
};

export type VisaFaq = {
  question: string;
  answer: string;
};

export type VisaPopularCountry = {
  slug: string;
  name: string;
  image: string;
  flag: string;
};

export type VisaDetailData = {
  country: VisaDetailCountry;

  products: VisaProduct[];

  requirements: VisaRequirement[];

  processEstimate: string;

  services: string[];

  faqs: VisaFaq[];

  popularCountries: VisaPopularCountry[];
};