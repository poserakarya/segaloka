"use client";

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Heart,
  MapPin,
  ShieldCheck,
  Star,
} from "lucide-react";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";
import "./visa-vendor-results.css";

export type VisaVendorProduct = {
  id: string;
  name: string;
  price: number;
};

export type VisaVendor = {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviews: number;
  description: {
    ID: string;
    EN: string;
    AR: string;
  };
  logo?: string;
  cover?: string;
  verified?: boolean;
  popular?: boolean;
  products: VisaVendorProduct[];
};

type VisaVendorResultsProps = {
  country: string;
  countrySlug: string;
  destination?: string;
  travelers?: string;
  departureDate?: string;
  returnDate?: string;
};

/*
 * UI PRESENTATION DATA ONLY.
 *
 * Fase sekarang belum Supabase.
 * Nanti array ini diganti hasil query Vendor + Visa Product.
 *
 * Harga pada card TIDAK ditulis terpisah.
 * startingPrice selalu dihitung dari harga produk termurah vendor.
 */
const VISA_VENDOR_UI: VisaVendor[] = [
  {
    id: "abw-travel-service",
    name: "ABW Travel Service",
    location: "Makassar",
    rating: 4.9,
    reviews: 326,
    description: {
      ID: "Layanan pengurusan Visa China dengan pilihan proses dan jenis visa sesuai kebutuhan perjalanan.",
      EN: "China visa processing with multiple processing options and visa types for your travel needs.",
      AR: "خدمة معالجة تأشيرة الصين مع خيارات متعددة للإجراءات وأنواع التأشيرات وفق احتياجات سفرك.",
    },
    logo: undefined,
    cover: undefined,
    verified: true,
    popular: true,
    products: [
      {
        id: "tourist",
        name: "Visa Turis China",
        price: 1295000,
      },
      {
        id: "business",
        name: "Visa Bisnis China",
        price: 1750000,
      },
      {
        id: "multiple-entry",
        name: "Visa Multiple Entry China",
        price: 2450000,
      },
    ],
  },
  {
    id: "belanja-visa",
    name: "Belanja Visa",
    location: "Jakarta",
    rating: 4.8,
    reviews: 241,
    description: {
      ID: "Pengurusan visa untuk wisata dan perjalanan bisnis dengan beberapa pilihan waktu proses.",
      EN: "Visa processing for tourism and business travel with several processing-time options.",
      AR: "خدمة معالجة التأشيرات للسياحة ورحلات الأعمال مع عدة خيارات لمدة المعالجة.",
    },
    logo: undefined,
    cover: undefined,
    verified: true,
    products: [
      {
        id: "tourist",
        name: "Visa Turis China",
        price: 1350000,
      },
      {
        id: "business",
        name: "Visa Bisnis China",
        price: 1695000,
      },
      {
        id: "express",
        name: "Visa China Express",
        price: 2250000,
      },
    ],
  },
  {
    id: "visa-go",
    name: "Visa Go",
    location: "Surabaya",
    rating: 4.8,
    reviews: 198,
    description: {
      ID: "Pilihan layanan Visa China untuk perjalanan wisata, bisnis, dan kebutuhan perjalanan lainnya.",
      EN: "China visa services for tourism, business, and other travel requirements.",
      AR: "خيارات لخدمات تأشيرة الصين للسياحة والأعمال واحتياجات السفر الأخرى.",
    },
    logo: undefined,
    cover: undefined,
    verified: true,
    products: [
      {
        id: "tourist",
        name: "Visa Turis China",
        price: 1275000,
      },
      {
        id: "business",
        name: "Visa Bisnis China",
        price: 1825000,
      },
    ],
  },
  {
    id: "global-visa-service",
    name: "Global Visa Service",
    location: "Jakarta",
    rating: 4.7,
    reviews: 174,
    description: {
      ID: "Layanan pengajuan Visa China dengan pendampingan dokumen dan pilihan proses perjalanan.",
      EN: "China visa application service with document assistance and multiple processing options.",
      AR: "خدمة تقديم طلب تأشيرة الصين مع المساعدة في المستندات وخيارات متعددة للمعالجة.",
    },
    verified: true,
    products: [
      {
        id: "tourist",
        name: "Visa Turis China",
        price: 1395000,
      },
      {
        id: "business",
        name: "Visa Bisnis China",
        price: 1895000,
      },
    ],
  },
];



function getStartingPrice(vendor: VisaVendor) {
  if (!vendor.products.length) {
    return 0;
  }

  return Math.min(
    ...vendor.products.map((product) => product.price),
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export function VisaVendorResults({
  country,
  countrySlug,
  travelers,
  departureDate,
  returnDate,
}: VisaVendorResultsProps) {
  const {
    language,
    formatCurrency,
  } = useMarketplacePreferences();

  const copy = {
    ID: {
      verified: "Vendor terverifikasi Segaloka",
      sort: "Urutkan",
      recommended: "Rekomendasi",
      lowest: "Harga Terendah",
      rating: "Rating Tertinggi",
      trusted: "Terpercaya",
      visaChoices: "pilihan visa",
      reviews: "ulasan",
      startingFrom: "Mulai dari",
      perApplication: "per pengajuan",
      viewVendor: "Detail",
      saveVendor: "Simpan",
      popular: "Populer",
    },
    EN: {
      verified: "Segaloka verified vendors",
      sort: "Sort",
      recommended: "Recommended",
      lowest: "Lowest Price",
      rating: "Highest Rating",
      trusted: "Trusted",
      visaChoices: "visa options",
      reviews: "reviews",
      startingFrom: "Starting from",
      perApplication: "per application",
      viewVendor: "Details",
      saveVendor: "Save",
      popular: "Most Popular",
    },
    AR: {
      verified: "بائعون موثقون من سيجالوكا",
      sort: "ترتيب",
      recommended: "موصى به",
      lowest: "الأقل سعراً",
      rating: "الأعلى تقييماً",
      trusted: "موثوق",
      visaChoices: "خيارات التأشيرة",
      reviews: "مراجعة",
      startingFrom: "يبدأ من",
      perApplication: "لكل طلب",
      viewVendor: "التفاصيل",
      saveVendor: "حفظ",
      popular: "الأكثر شعبية",
    },
  }[
    language === "EN"
      ? "EN"
      : language === "AR"
        ? "AR"
        : "ID"
  ];

  const vendors = VISA_VENDOR_UI;

  const handleVendor = (vendor: VisaVendor) => {
    const query = new URLSearchParams();

    if (travelers) {
      query.set("travelers", travelers);
    }

    if (departureDate) {
      query.set("departureDate", departureDate);
    }

    if (returnDate) {
      query.set("returnDate", returnDate);
    }

    const qs = query.toString();

    window.location.assign(
      `/visa/${countrySlug}/vendor/${vendor.id}${qs ? `?${qs}` : ""}`
    );
  };

  return (
    <section className="visa-vendor-results" dir={language === "AR" ? "rtl" : "ltr"}>
      <div className="visa-vendor-toolbar">
        <div className="visa-vendor-toolbar-status">
          <ShieldCheck size={17} />
          <span>{copy.verified}</span>
        </div>

        <label className="visa-vendor-sort">
          <span>{copy.sort}</span>

          <select defaultValue="recommended">
            <option value="recommended">
              {copy.recommended}
            </option>
            <option value="lowest">
              {copy.lowest}
            </option>
            <option value="rating">
              {copy.rating}
            </option>
          </select>
        </label>
      </div>

      <div className="visa-vendor-grid">
        {vendors.map((vendor) => {
          const startingPrice =
            getStartingPrice(vendor);

          return (
            <article
              key={vendor.id}
              className="visa-vendor-card"
            >
              <div className="visa-vendor-cover">
                {vendor.cover ? (
                  <img
                    src={vendor.cover}
                    alt=""
                    className="visa-vendor-cover-image"
                  />
                ) : (
                  <div className="visa-vendor-cover-placeholder">
                    <Building2 size={34} />
                  </div>
                )}

                {vendor.popular && (
                  <span className="visa-vendor-popular">
                    {copy.popular}
                  </span>
                )}

                <button
                  type="button"
                  className="visa-vendor-favorite"
                  aria-label={`${copy.saveVendor} ${vendor.name}`}
                >
                  <Heart size={18} />
                </button>

                <div className="visa-vendor-logo">
                  {vendor.logo ? (
                    <img
                      src={vendor.logo}
                      alt={`Logo ${vendor.name}`}
                    />
                  ) : (
                    <span>
                      {getInitials(vendor.name)}
                    </span>
                  )}
                </div>
              </div>

              <div className="visa-vendor-card-body">
                <div className="visa-vendor-name-row">
                  <h3>{vendor.name}</h3>

                  {vendor.verified && (
                    <BadgeCheck
                      size={18}
                      className="visa-vendor-verified"
                      aria-label="Terverifikasi"
                    />
                  )}
                </div>

                <div className="visa-vendor-meta">
                  <span className="visa-vendor-rating">
                    <Star
                      size={15}
                      fill="currentColor"
                    />
                    <strong>{vendor.rating}</strong>
                    <span>
                      ({vendor.reviews} {copy.reviews})
                    </span>
                  </span>

                  <span className="visa-vendor-location">
                    <MapPin size={15} />
                    {vendor.location}
                  </span>
                </div>

                <div className="visa-vendor-badges">
                  <span>
                    <ShieldCheck size={14} />
                    {copy.trusted}
                  </span>

                  <span>
                    {vendor.products.length} {copy.visaChoices}
                  </span>
                </div>

                <p className="visa-vendor-description">
                  {vendor.description[
                    language === "EN"
                      ? "EN"
                      : language === "AR"
                        ? "AR"
                        : "ID"
                  ]}
                </p>

                <div className="visa-vendor-card-footer">
                  <div className="visa-vendor-price">
                    <span>{copy.startingFrom}</span>

                    <strong>
                      {formatCurrency(startingPrice)}
                    </strong>

                    <small>{copy.perApplication}</small>
                  </div>

                  <button
                    type="button"
                    className="visa-vendor-action"
                    onClick={() =>
                      handleVendor(vendor)
                    }
                  >
                    {copy.viewVendor}
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default VisaVendorResults;