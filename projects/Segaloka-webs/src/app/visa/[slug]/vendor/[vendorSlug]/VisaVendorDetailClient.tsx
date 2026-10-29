"use client";

import {
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Clock3,
  FileCheck2,
  Headphones,
  ShieldCheck,
  Star,
} from "lucide-react";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";
import type {
  VisaProduct,
  VisaVendor,
} from "@/ui/visa-detail";

import "./vendor-detail.css";
import { translateVisaValue } from "@/ui/visa-detail/visa-detail.presentation";

type Props = {
  countrySlug: string;
  countryName: string;
  vendor: VisaVendor;
  products: VisaProduct[];
  travelers: string;
  departureDate: string;
  returnDate: string;
};

type Lang = "ID" | "EN" | "AR";

function normalizeCategory(
  product: VisaProduct,
) {
  return (
    product.category?.trim() ||
    product.visaType?.trim() ||
    "Visa"
  );
}

export default function VisaVendorDetailClient({
  countrySlug,
  countryName,
  vendor,
  products,
  travelers,
  departureDate,
  returnDate,
}: Props) {
  const router = useRouter();

  const { language, formatCurrency } =
    useMarketplacePreferences();

  const lang: Lang =
    language === "EN"
      ? "EN"
      : language === "AR"
        ? "AR"
        : "ID";

  const [activeCategory, setActiveCategory] =
    useState<string>("all");

  const copy = useMemo(
    () => ({
      ID: {
        back: "Kembali",
        verified: "Vendor Visa Terverifikasi",
        title: `Pilihan Visa ${countryName}`,
        subtitle:
          "Pilih jenis visa yang sesuai dengan kebutuhan perjalanan Anda.",
        easy: "Proses Mudah",
        easySub: "Pengajuan praktis",
        support: "Dukungan Tim",
        supportSub: "Pendampingan profesional",
        secure: "Pembayaran Aman",
        secureSub: "Transaksi terlindungi",
        all: "Semua Visa",
        popular: "Paling Populer",
        suitable: "Cocok untuk",
        validity: "Masa berlaku",
        stay: "Masa tinggal",
        process: "Estimasi proses",
        starting: "Mulai dari",
        select: "Pilih Visa",
      },

      EN: {
        back: "Back",
        verified: "Verified Visa Vendor",
        title: `${countryName} Visa Options`,
        subtitle:
          "Choose the visa type that best fits your travel needs.",
        easy: "Easy Process",
        easySub: "Simple application",
        support: "Team Support",
        supportSub: "Professional assistance",
        secure: "Secure Payment",
        secureSub: "Protected transaction",
        all: "All Visas",
        popular: "Most Popular",
        suitable: "Suitable for",
        validity: "Validity",
        stay: "Length of stay",
        process: "Processing estimate",
        starting: "Starting from",
        select: "Choose Visa",
      },

      AR: {
        back: "رجوع",
        verified: "مزود تأشيرات موثّق",
        title: `خيارات تأشيرة ${countryName}`,
        subtitle:
          "اختر نوع التأشيرة الأنسب لاحتياجات سفرك.",
        easy: "إجراءات سهلة",
        easySub: "تقديم عملي",
        support: "دعم الفريق",
        supportSub: "مساعدة احترافية",
        secure: "دفع آمن",
        secureSub: "معاملة محمية",
        all: "جميع التأشيرات",
        popular: "الأكثر شعبية",
        suitable: "مناسب لـ",
        validity: "مدة الصلاحية",
        stay: "مدة الإقامة",
        process: "مدة المعالجة",
        starting: "يبدأ من",
        select: "اختر التأشيرة",
      },
    }),
    [countryName],
  );

  const t = copy[lang];

  /*
   * Tidak ada daftar tipe Visa global.
   *
   * Tab dibentuk berdasarkan produk nyata milik vendor
   * untuk negara yang sedang dibuka.
   */
  const categories = useMemo(() => {
    const counts =
      new Map<string, number>();

    for (const product of products) {
      const category =
        normalizeCategory(product);

      counts.set(
        category,
        (counts.get(category) ?? 0) + 1,
      );
    }

    return Array.from(
      counts.entries(),
    ).map(([name, count]) => ({
      name,
      count,
    }));
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (activeCategory === "all") {
      return products;
    }

    return products.filter(
      (product) =>
        normalizeCategory(product) ===
        activeCategory,
    );
  }, [
    activeCategory,
    products,
  ]);

  const handleProduct = (
    productSlug: string,
  ) => {
    const query =
      new URLSearchParams();

    query.set(
      "vendor",
      vendor.slug,
    );

    if (travelers) {
      query.set("travelers", travelers);
    }

    if (departureDate) {
      query.set("departureDate", departureDate);
    }

    if (returnDate) {
      query.set("returnDate", returnDate);
    }
    router.push(
      `/visa/${encodeURIComponent(
        countrySlug,
      )}/${encodeURIComponent(
        productSlug,
      )}?${query.toString()}`,
    );
  };

  return (
    <main
      className="visa-vendor-detail"
      dir={lang === "AR" ? "rtl" : "ltr"}
    >
      <section className="visa-vendor-detail-hero">
        <div className="visa-vendor-detail-hero-overlay" />

        <div className="visa-vendor-detail-shell visa-vendor-detail-hero-content">
          <button
            type="button"
            className="visa-vendor-back"
            onClick={() => router.back()}
          >
            <ArrowLeft size={17} />
            <span>{t.back}</span>
          </button>

          <div className="visa-vendor-identity">
            {vendor.verified ? (
              <span className="visa-vendor-verified-label">
                <BadgeCheck size={16} />
                {t.verified}
              </span>
            ) : null}

            <h1>{vendor.name}</h1>

            <div className="visa-vendor-detail-rating">
              {typeof vendor.rating ===
              "number" ? (
                <>
                  <Star
                    size={16}
                    fill="currentColor"
                  />

                  <strong>
                    {vendor.rating}
                  </strong>

                  {typeof vendor.reviewCount ===
                  "number" ? (
                    <span>
                      ({vendor.reviewCount})
                    </span>
                  ) : null}
                </>
              ) : null}

              {vendor.location ? (
                <>
                  <span>·</span>
                  <span>
                    {vendor.location}
                  </span>
                </>
              ) : null}
            </div>

            <h2>{t.title}</h2>
            <p>{t.subtitle}</p>
          </div>

          <div className="visa-vendor-benefits">
            <div>
              <FileCheck2 size={20} />
              <span>
                <strong>{t.easy}</strong>
                <small>{t.easySub}</small>
              </span>
            </div>

            <div>
              <Headphones size={20} />
              <span>
                <strong>
                  {t.support}
                </strong>
                <small>
                  {t.supportSub}
                </small>
              </span>
            </div>

            <div>
              <ShieldCheck size={20} />
              <span>
                <strong>
                  {t.secure}
                </strong>
                <small>
                  {t.secureSub}
                </small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="visa-vendor-products">
        <div className="visa-vendor-detail-shell">
          <div className="visa-product-tabs">
            <button
              type="button"
              className={
                activeCategory === "all"
                  ? "is-active"
                  : undefined
              }
              onClick={() =>
                setActiveCategory("all")
              }
            >
              {t.all} ({products.length})
            </button>

            {categories.map(
              (category) => (
                <button
                  key={category.name}
                  type="button"
                  className={
                    activeCategory ===
                    category.name
                      ? "is-active"
                      : undefined
                  }
                  onClick={() =>
                    setActiveCategory(
                      category.name,
                    )
                  }
                >
                  {category.name} (
                  {category.count})
                </button>
              ),
            )}
          </div>

          <div className="visa-product-grid">
            {visibleProducts.map(
              (product) => (
                <article
                  key={product.id}
                  className="visa-product-card"
                >
                  <div className="visa-product-card-top">
                    <span className="visa-product-country">
                      {countryName}
                    </span>

                    {product.popular ? (
                      <span className="visa-product-popular">
                        {t.popular}
                      </span>
                    ) : null}
                  </div>

                  <h3>
                    {translateVisaValue(product.title, language)}
                  </h3>

                  <p className="visa-product-description">
                    {translateVisaValue(product.description, language)}
                  </p>

                  <p className="visa-product-suitable">
                    <strong>
                      {t.suitable}:
                    </strong>{" "}
                    {product.suitableFor.map((value) => translateVisaValue(value, language)).join(
                      ", ",
                    )}
                  </p>

                  <div className="visa-product-facts">
                    <div>
                      <CalendarDays
                        size={18}
                      />
                      <span>
                        <small>
                          {t.validity}
                        </small>
                        <strong>
                          {
                            translateVisaValue(product.validity, language)
                          }
                        </strong>
                      </span>
                    </div>

                    <div>
                      <Clock3 size={18} />
                      <span>
                        <small>
                          {t.stay}
                        </small>
                        <strong>
                          {
                            translateVisaValue(product.stayDuration, language)
                          }
                        </strong>
                      </span>
                    </div>

                    <div>
                      <FileCheck2
                        size={18}
                      />
                      <span>
                        <small>
                          {t.process}
                        </small>
                        <strong>
                          {
                            translateVisaValue(product.processTime, language)
                          }
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="visa-product-footer">
                    <div className="visa-product-price">
                      <small>
                        {t.starting}
                      </small>

                      <strong>
                        {formatCurrency(
                          product.price,
                        )}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleProduct(
                          product.slug,
                        )
                      }
                    >
                      {t.select}
                      <ArrowRight
                        size={17}
                      />
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        </div>
      </section>
    </main>
  );
}