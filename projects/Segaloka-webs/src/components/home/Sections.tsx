import fs from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ChevronRight,
  CreditCard,
  Globe2,
  Headphones,
  Map,
  ShieldCheck,
  Star,
  TicketPercent,
} from "lucide-react";
import {
  articles,
  benefits,
  coupons,
  destinations,
  featuredPackages,
  sponsoredPackageRotation,
} from "@/data/home";
import { SponsoredPackageRail } from "@/components/home/SponsoredPackageRail";
import { MarketplacePrice } from "@/components/marketplace/MarketplacePrice";
import { MarketplaceText } from "@/components/marketplace/MarketplaceText";

import { CouponCopyButton } from "./CouponCopyButton";

import {
  TravelAdSlider,
  type TravelAdItem,
} from "./TravelAdSlider";
function renderCouponIcon(type: string) {
  switch (type) {
    case "umrah":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 7.5V6a2 2 0 0 1 2-2h7l5 5v8.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 4v5h5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 12h8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M8 9.5l4 2.5-4 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "tour":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M3 15.5h8l8.5-8.5a1.5 1.5 0 0 0-2.1-2.1L9 13.5V5.8a1.8 1.8 0 0 0-3.6 0v3.6L3.2 8.6a1.3 1.3 0 0 0-1.7 1.2v1.1L4 12.2l-1 1.1v2.2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14.5 17.5h5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );

    case "cashback":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M4 9h16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M12 12a2.5 2.5 0 1 0 0 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M11.5 13.5h1.2a1 1 0 0 1 0 2h-1.4a1 1 0 0 0 0 2h1.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case "attraction":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 7.5h12a2 2 0 0 1 2 2v1a2 2 0 0 0-2 2a2 2 0 0 0 2 2v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1a2 2 0 0 0 2-2a2 2 0 0 0-2-2v-1a2 2 0 0 1 2-2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.2 14.5 14.8 9.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="14" r="1" fill="currentColor" />
        </svg>
      );

    default:
      return <span>%</span>;
  }
}



function localAssetExists(src: string) {
  const relative = src.replace(/^\/+/, "");

  return fs.existsSync(
    path.join(process.cwd(), "public", relative),
  );
}
export function BenefitSection() {
  const icons = [BadgeCheck, CreditCard, ShieldCheck, Headphones];
  const benefitMessages = [
    {
      title: "benefit.bestPrice",
      description: "benefit.bestPriceDescription",
    },
    {
      title: "benefit.securePayment",
      description: "benefit.securePaymentDescription",
    },
    {
      title: "benefit.trustedService",
      description: "benefit.trustedServiceDescription",
    },
    {
      title: "benefit.customerSupport",
      description: "benefit.customerSupportDescription",
    },
  ] as const;

  return (
    <section className="section compact-section">
      <div className="container">
        <div className="benefit-grid">
          {benefitMessages.map((benefit, index) => {
            const Icon = icons[index];

            return (
              <article className="benefit-item" key={benefit.title}>
                <div className="benefit-icon">
                  <Icon size={24} />
                </div>
                <div>
                  <h3>
                    <MarketplaceText messageKey={benefit.title} />
                  </h3>
                  <p>
                    <MarketplaceText messageKey={benefit.description} />
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CouponSection() {
  const coupons = [
    {
      eyebrow: "Diskon hingga",
      valueIdr: 2500000,
      label: "untuk Paket Umrah",
      code: "UMRAH2500",
      tone: "purple",
      iconType: "umrah",
    },
    {
      eyebrow: "Diskon",
      valueIdr: 1000000,
      label: "Tour Internasional",
      code: "TOUR1000",
      tone: "blue",
      iconType: "tour",
    },
    {
      eyebrow: "Cashback",
      valueIdr: 500000,
      label: "Hotel & Akomodasi",
      code: "HOTEL500",
      tone: "green",
      iconType: "cashback",
    },
    {
      eyebrow: "Diskon hingga",
      value: "20%",
      label: "Tiket Atraksi",
      code: "ATRAKSI20",
      tone: "pink",
      iconType: "attraction",
    },
  ];

  return (
    <section
      className="reference-coupon"
      id="promo"
    >
      <div className="reference-coupon-shell">

        <div className="reference-coupon-title">
          <h2>
            <MarketplaceText messageKey="home.couponSpecialPromo" />
          </h2>

          <p>
            <MarketplaceText messageKey="home.dreamTrip" />
          </p>
        </div>


        <div className="reference-coupon-track">
          {coupons.map((coupon) => (
            <article
              key={coupon.code}
              className={[
                "reference-coupon-card",
                `reference-coupon-${coupon.tone}`,
              ].join(" ")}
            >
              <div
                className={[
                  "reference-coupon-icon",
                  coupon.tone,
                ].join(" ")}
                aria-hidden="true"
              >
                {renderCouponIcon(coupon.iconType)}
              </div>


              <div className="reference-coupon-content">
                <small>
                  {coupon.eyebrow}
                </small>

                <strong>
                  {coupon.value}
                </strong>

                <span>
                  {coupon.label}
                </span>


                <div className="reference-coupon-code-row">
                  <div className="reference-coupon-code">
                    <small>
                      Kode
                    </small>

                    <strong>
                      {coupon.code}
                    </strong>
                  </div>

                  <CouponCopyButton
                    code={coupon.code}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}

export function CampaignBanners() {
  const bannerSrc =
    "/images/banners/banner-promo-utama.png";

  const promoItems = [
    {
      image: "/images/promo/promo-umrah.png",
      badge: "SPESIAL UMRAH",
      title: "Umrah Lebih Bermakna",
      label: "Diskon hingga",
      valueIdr: 2500000,
      theme: "red",
    },
    {
      image: "/images/promo/promo-halal-tour-japan.png",
      badge: "HALAL TOUR",
      title: "Jelajahi Jepang Musim Dingin",
      label: "Diskon",
      value: "20%",
      theme: "green",
    },
    {
      image: "/images/promo/promo-tour-domestic.png",
      badge: "TOUR DOMESTIC",
      title: "Liburan Seru di Indonesia",
      label: "Mulai dari",
      valueIdr: 1900000,
      theme: "cyan",
    },
    {
      image: "/images/promo/promo-tour-international.png",
      badge: "TOUR INTERNASIONAL",
      title: "Eksplor Eropa Lebih Hemat",
      label: "Diskon hingga",
      value: "30%",
      theme: "orange",
    },
  ];

  const bannerAvailable =
    localAssetExists(bannerSrc);

  const visiblePromos =
    promoItems.filter((item) =>
      localAssetExists(item.image),
    );

  return (
    <>
      {bannerAvailable && (() => {
        /*
         * FALLBACK UI DATA.
         *
         * Nanti array ini tidak hardcode.
         * Data berasal realtime dari Travel Ads
         * yang sudah disetujui/aktif.
         *
         * destinationType menentukan:
         * TRAVEL  -> profil Travel
         * PACKAGE -> detail Paket
         */
        const travelAds: TravelAdItem[] = [
          {
            id: "current-travel-ad",
            image: bannerSrc,
            alt: "Promo perjalanan Segaloka",

            /*
             * Untuk banner lama sementara
             * diarahkan ke Travel.
             *
             * Ganti dengan nilai realtime
             * ketika modul Travel Ads tersambung.
             */
            destinationType: "TRAVEL",

            /*
             * Placeholder routing.
             * Tidak akan dipakai sebagai
             * konfigurasi final.
             */
            travelSlug: "segaloka",
          },
        ];

        return (
          <TravelAdSlider
            ads={travelAds}
          />
        );
      })()}

      {visiblePromos.length > 0 && (
        <section className="reference-running-promo">
          <div className="reference-running-shell">
            <div className="reference-section-heading">
              <div>
                <h2>Promo Sedang Berlangsung</h2>

                <p>
                  Dapatkan penawaran terbaik untuk berbagai
                  pilihan perjalanan
                </p>
              </div>

              <a href="#">
                <MarketplaceText messageKey="home.viewAllPromo" />
                <ChevronRight size={14} />
              </a>
            </div>

            <div className="reference-promo-grid">
              {visiblePromos.map((promo) => (
                <article
                  key={promo.title}
                  className="reference-promo-card"
                >
                  <img
                    src={promo.image}
                    alt={promo.title}
                  />

                  <div className="reference-promo-overlay" />

                  <div className="reference-promo-content">
                    <span
                      className={`reference-promo-badge ${promo.theme}`}
                    >
                      {promo.badge}
                    </span>

                    <h3>{promo.title}</h3>

                    <small>{promo.label}</small>

                    <strong>
  {"valueIdr" in promo &&
  typeof promo.valueIdr === "number" ? (
    <MarketplacePrice amountInIdr={promo.valueIdr} />
  ) : (
    promo.value
  )}
</strong>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
export function PackageSection() {
  const categoryIcon = (item: (typeof featuredPackages)[number]) => {
    if (item.title.toLowerCase().includes("haji")) return Map;
    if (item.title.toLowerCase().includes("halal")) return Globe2;
    return Building2;
  };

  return (
    <section className="section" id="paket">
      <div className="container">
        <SectionHeading
          eyebrow="Rekomendasi"
          title={<MarketplaceText messageKey="home.nextTripPackages" />}
          description={<MarketplaceText messageKey="home.nextTripDescription" />}
          action={<MarketplaceText messageKey="common.viewAll" />}
        />

        <div className="product-grid">
          {featuredPackages.map((item) => (
            <a
              href={`/paket/${item.id}`}
              className="product-card reference-package-card"
              key={item.id}
            >
              <div className="reference-package-visual">
                <img src={item.image} alt={item.title} className="product-image" />
                <div className="reference-package-visual-overlay" />
                <span className="reference-package-category">
                  {item.title.toLowerCase().includes("haji") ? (
                      <MarketplaceText messageKey="category.hajj" />
                    ) : item.title.toLowerCase().includes("halal") ? (
                      <MarketplaceText messageKey="category.halalTour" />
                    ) : (
                      <MarketplaceText messageKey="category.umrah" />
                    )}
                </span>
                <span
  className="reference-package-travel-logo"
  title={item.travelName || "Travel"}
>
  {item.travelLogo ? (
    <img
      src={item.travelLogo}
      alt={`Logo ${item.travelName || "Travel"}`}
      loading="lazy"
    />
  ) : null}
</span>
                <span className="reference-package-rating">
                  <Star size={12} fill="currentColor" /> {item.rating} ({item.reviews})
                </span>
              </div>

              <div className="product-body reference-package-body">
                <span className="product-location">{item.location}</span>
                <h3>{item.title}</h3>

                <div className="reference-package-meta">
                  <span>{item.duration ?? <MarketplaceText messageKey="package.durationAvailable" />}</span>
                  <span>· {item.location.split(" · ")[0]}</span>
                </div>

                <div className="product-price">
                  <small><MarketplaceText messageKey="common.price" /></small>
                  <strong><MarketplacePrice amountInIdr={item.price} /></strong>
                  <span className="reference-package-arrow"><ArrowRight size={15} /></span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AccommodationSection() {
  return (
    <section className="section soft-section">
      <div className="container">
        <SectionHeading
          eyebrow=""
          title={<MarketplaceText messageKey="home.yourTripPackages" />}
          action={<MarketplaceText messageKey="common.viewMore" />}
        />

        <SponsoredPackageRail
          packages={featuredPackages}
          rotationIntervalMs={sponsoredPackageRotation.intervalMs}
        />
      </div>
    </section>
  );
}

export function DestinationSection() {
  const accommodationPromos = [
    {
      id: "la-makkah-7",
      duration: "7 Hari",
      title: "Makkah",
      subtitle: "Land Arrangement Makkah",
      providerType: "Travel",
      vendorName: "Nuzultrip",
      rating: 4.9,
      reviewCount: 128,
      price: 2350000,
      image: "/images/la/makkah.jpg",
    },
    {
      id: "la-madinah-12",
      duration: "12 Hari",
      title: "Madinah",
      subtitle: "Land Arrangement Madinah",
      providerType: "Travel",
      vendorName: "Nuzultrip",
      rating: 4.8,
      reviewCount: 84,
      price: 2150000,
      image: "/images/la/madinah.jpg",
    },
    {
      id: "la-bali-9",
      duration: "9 Hari",
      title: "Bali",
      subtitle: "Akomodasi & Land Arrangement Bali",
      providerType: "Vendor",
      vendorName: "Bali Hospitality Group",
      rating: 4.8,
      reviewCount: 61,
      price: 1850000,
      image: "/images/la/bali.jpg",
    },
    {
      id: "la-pulau-nusa-15",
      duration: "15 Hari",
      title: "Pulau Nusa",
      subtitle: "Akomodasi & Land Arrangement Pulau Nusa",
      providerType: "Vendor",
      vendorName: "Nusa Hospitality",
      rating: 4.7,
      reviewCount: 49,
      price: 2450000,
      image: "/images/la/pulau-nusa.jpg",
    },
  ];

  return (
    <>
    <section
      className="home-la-section"
      id="akomodasi"
    >
      <div className="container">

        <div className="home-compact-heading">
          <div>
            <h2><MarketplaceText messageKey="home.accommodationPromoLa" /></h2>

            <p>
              <MarketplaceText messageKey="home.accommodationDescription" />
            </p>
          </div>

          <a href="/akomodasi">
            Lihat Semua
            <ChevronRight size={15} />
          </a>
        </div>


        <div className="home-la-grid">
          {accommodationPromos.map((item) => (
            <a
              key={item.id}
              href="/akomodasi"
              className="home-la-card"
            >
              <div className="home-la-image">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.title}
                  />
                )}

                <span className="home-la-duration">
                  {item.duration}
                </span>
              </div>

              <div className="home-la-body">
                <strong>
                  {item.title}
                </strong>

                <small>
                  {item.subtitle}
                </small>

                <div className="home-la-provider-block">
                  <div className="home-la-provider-topline">
                    <span className="home-la-provider-type">
                      {item.providerType}
                    </span>

                    <div className="home-la-rating-inline">
                      <span className="home-la-rating-star">★</span>
                      <strong>{item.rating}</strong>
                      <span>({item.reviewCount})</span>
                    </div>
                  </div>

                  <strong className="home-la-vendor">
                    {item.vendorName}
                  </strong>
                </div>

                <div className="home-la-price">
                  <small><MarketplaceText messageKey="common.startFrom" /></small>
                  <strong><MarketplacePrice amountInIdr={item.price} /></strong>
                </div>

                <span className="home-la-link">
                  Lihat pilihan
                  <ChevronRight size={14} />
                </span>
              </div>
            </a>
          ))}
        </div>

      </div>
    </section>

    <section className="home-accommodation-special-promo">
    
            <div className="home-accommodation-special-promo__heading">
              <div>
                <h2>
                  <MarketplaceText messageKey="home.specialAccommodationPromo" />
                </h2>
    
                <p>
                  Penawaran pilihan dari Travel dan Vendor
                  untuk hotel, penginapan, dan land arrangement.
                </p>
              </div>
    
              
            </div>
    
    
            <div className="home-accommodation-special-promo__rail">
    
              {accommodationSpecialPromos.map(
                (promo) => (
                  <a
                    key={promo.id}
                    href={promo.href}
                    className="home-accommodation-special-promo__card"
                  >
                    <div
                      className="home-accommodation-special-promo__media"
                      style={{
                        backgroundImage:
                          `linear-gradient(
                            90deg,
                            rgba(5, 30, 65, .82),
                            rgba(5, 30, 65, .20)
                          ),
                          url(${promo.image})`,
                      }}
                    >
    
                      <div className="home-accommodation-special-promo__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path
                            d="M5 4h10l4 4v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M15 4v5h5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="m8.5 15.5 7-7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                          <circle cx="15" cy="15" r="1.2" fill="currentColor" />
                        </svg>
                      </div>
                      <div className="home-accommodation-special-promo__provider">
                        <span>
                          {promo.providerType}
                        </span>
    
                        <strong>
                          {promo.providerName}
                        </strong>
                      </div>
    
    
                      <div className="home-accommodation-special-promo__content">
                        <h3>
                          {promo.title}
                        </h3>
    
                        <strong>
                          {"offerAmountIdr" in promo &&
                          typeof promo.offerAmountIdr === "number" ? (
                            <MarketplacePrice
                              amountInIdr={promo.offerAmountIdr}
                            />
                          ) : (
                            promo.offer
                          )}
                        </strong>
    
                        <p>
                          {promo.subtitle}
                        </p>
    
                        <span className="home-accommodation-special-promo__cta">
                          <MarketplaceText messageKey="home.seePromo" />
                        </span>
                      </div>
                    </div>
                  </a>
                ),
              )}
    
            </div>
    
          </section>
    </>
  );
}
export function InspirationSection() {
  const popularPlaces = [
    {
      id: "ragunan-jakarta",
      title: "Taman Margasatwa Ragunan",
      location: "Jakarta Selatan, Indonesia",
      rating: 4.6,
      reviewCount: 320,
      price: 4000,
      image: "/images/attractions/ragunan-jakarta.jpg",
    },
    {
      id: "universal-studios-japan",
      title: "Universal Studios Japan",
      location: "Osaka, Jepang",
      rating: 4.9,
      reviewCount: 540,
      price: 1200000,
      image: "/images/attractions/universal-studios-japan.jpg",
    },
    {
      id: "tokyo-disneyland",
      title: "Tokyo Disneyland",
      location: "Chiba, Jepang",
      rating: 4.9,
      reviewCount: 612,
      price: 1350000,
      image: "/images/attractions/tokyo-disneyland.jpg",
    },
    {
      id: "bali-zoo",
      title: "Bali Zoo",
      location: "Gianyar, Bali",
      rating: 4.7,
      reviewCount: 275,
      price: 125000,
      image: "/images/la/bali.jpg",
    },
  ];

  const travelTips = articles.slice(0, 3);

  return (
    <section
      className="home-explore-inspiration"
      id="inspirasi"
    >
      <div className="container">

        <div className="home-split-grid">

          {/* ==============================================
              DESTINASI & ATRAKSI
             ============================================== */}

          <div className="home-split-column">

            <div className="home-mini-heading">
              <h2>
                <MarketplaceText messageKey="home.popularDestinationsAttractions" />
              </h2>

              <a href="/destinasi">
                Lihat Semua
                <ChevronRight size={14} />
              </a>
            </div>


            <div className="home-attraction-grid">
              {popularPlaces.map((item) => (
                <a
                  key={item.id}
                  className="home-attraction-card"
                  href="/atraksi"
                >
                  <div className="home-attraction-image">
                    <img
                      src={item.image}
                      alt={item.title}
                    />
                  
                    <div className="home-attraction-rating-overlay">
                      <span className="home-card-rating-star">★</span>
                      <strong>{item.rating}</strong>
                      <span>({item.reviewCount})</span>
                    </div>
                  </div>

                  <div className="home-attraction-body">
                    <strong>
                      {item.title}
                    </strong>

                    <small className="home-attraction-location">
                      {item.location}
                    </small>

                    <div className="home-attraction-price-block">
                      <small><MarketplaceText messageKey="common.startFrom" /></small>

                      <strong>
                        <MarketplacePrice amountInIdr={item.price} />
                      </strong>
                    </div>
                  </div>
                </a>
              ))}
            </div>

          </div>


          {/* ==============================================
              TIPS & INSPIRASI
             ============================================== */}

          <div className="home-split-column">

            <div className="home-mini-heading">
              <h2>
                <MarketplaceText messageKey="home.tipsInspiration" />
              </h2>

              <a href="/inspirasi">
                Lihat Semua
                <ChevronRight size={14} />
              </a>
            </div>


            <div className="home-tips-grid">
              {travelTips.map((article) => (
                <a
                  key={article.title}
                  href="/inspirasi"
                  className="home-tip-card"
                >
                  <div className="home-tip-image">
                    <img
                      src={article.image}
                      alt={article.title}
                    />
                  </div>

                  <div className="home-tip-body">
                    <span>
                      {article.category}
                    </span>

                    <strong>
                      {article.title}
                    </strong>
                  </div>
                </a>
              ))}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}


const accommodationSpecialPromos = [
  {
    id: "promo-acc-makkah",
    providerType: "Travel",
    providerName: "Nuzultrip",
    title: "Promo Spesial Hotel Makkah",
    offer: "Diskon hingga 25%",
    subtitle: "Hotel dan land arrangement pilihan untuk perjalanan Umrah.",
    image:
      "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1400&q=80",
    href: "#",
  },
  {
    id: "promo-acc-bali",
    providerType: "Vendor",
    providerName: "Bali Hospitality Group",
    title: "Bali Stay Special",
    offerAmountIdr: 750000,
    subtitle: "Pilihan hotel dan resort untuk keluarga maupun grup.",
    image:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=80",
    href: "#",
  },
  {
    id: "promo-acc-nusa",
    providerType: "Vendor",
    providerName: "Nusa Hospitality",
    title: "Pulau Nusa Getaway",
    offer: "Diskon hingga 30%",
    subtitle: "Promo penginapan dan land arrangement Pulau Nusa.",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
    href: "#",
  },
];
export function AppSection() {
  return (
    <>


    <section className="app-section">
      <div className="container app-card">
        <div className="app-copy">
          <span className="section-eyebrow light">SEGERA HADIR</span>
          <h2><MarketplaceText messageKey="home.allTripsOneApp" /></h2>
          <p>
            <MarketplaceText messageKey="home.appDescription" />
          </p>

          <div className="store-buttons">
            <button type="button">
              <small>Download di</small>
              <strong>App Store</strong>
            </button>
            <button type="button">
              <small>Dapatkan di</small>
              <strong>Google Play</strong>
            </button>
          </div>
        </div>

        <div className="phone-preview">
          <div className="phone-shell">
            <div className="phone-island" />
            <div className="phone-screen">
              <div className="mini-brand">segaloka</div>
              <div className="mini-hero" />
              <div className="mini-search" />
              <div className="mini-row">
                <span />
                <span />
              </div>
              <div className="mini-row">
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>

      {action && (
        <a href="#">
          {action}
          <ChevronRight size={18} />
        </a>
      )}
    </div>
  
    
  );
}

