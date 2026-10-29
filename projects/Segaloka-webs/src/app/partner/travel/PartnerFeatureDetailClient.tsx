"use client";

import {
  ArrowLeft,
  BarChart3,
  Check,
  Network,
  Sparkles,
  Tag,
} from "lucide-react";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";

type FeatureType =
  | "corporate"
  | "voucher-promo"
  | "loyalty"
  | "partner-network";

type Props = {
  type: FeatureType;
};

const COPY = {
  ID: {
    back: "Kembali ke Partner Travel",
    eyebrow: "Solusi Bisnis Segaloka",
    benefitTitle: "Yang dapat Anda manfaatkan",
    cta: "Mulai Gratis",
    items: {
      corporate: {
        title: "Corporate",
        description:
          "Kelola kebutuhan perjalanan bisnis dan pelanggan korporasi melalui ekosistem Segaloka.",
        intro:
          "Solusi Corporate membantu Travel menangani kebutuhan perjalanan perusahaan secara lebih terstruktur, mulai dari penawaran produk hingga pengelolaan layanan.",
        benefits: [
          "Kelola kebutuhan perjalanan pelanggan korporasi.",
          "Tawarkan Paket Perjalanan dan Land Arrangement yang relevan.",
          "Kelola permintaan dan layanan secara lebih terstruktur.",
          "Perluas peluang penjualan ke segmen bisnis.",
        ],
      },
      "voucher-promo": {
        title: "Voucher & Promo",
        description:
          "Buat program promosi untuk membantu meningkatkan penjualan produk Travel.",
        intro:
          "Travel dapat memanfaatkan program voucher dan promo untuk memberikan penawaran yang lebih menarik pada produk yang dipasarkan melalui Segaloka.",
        benefits: [
          "Program promo untuk produk pilihan.",
          "Voucher untuk kampanye penjualan.",
          "Penawaran berdasarkan periode tertentu.",
          "Dukungan promosi untuk meningkatkan konversi.",
        ],
      },
      loyalty: {
        title: "Loyalty Points",
        description:
          "Bangun hubungan jangka panjang dengan pelanggan melalui program loyalitas.",
        intro:
          "Program Loyalty membantu Travel menciptakan pengalaman pelanggan yang lebih berkelanjutan melalui benefit dan mekanisme loyalitas.",
        benefits: [
          "Program loyalitas pelanggan.",
          "Benefit untuk transaksi yang memenuhi ketentuan.",
          "Mendorong pelanggan melakukan pemesanan kembali.",
          "Membangun retensi pelanggan Travel.",
        ],
      },
      "partner-network": {
        title: "Partner Network",
        description:
          "Kembangkan distribusi produk melalui jaringan partner di ekosistem Segaloka.",
        intro:
          "Partner Network membantu Travel memperluas jangkauan melalui jaringan penjualan dan mitra yang terhubung dengan ekosistem Segaloka.",
        benefits: [
          "Perluas jaringan distribusi Travel.",
          "Terhubung dengan jaringan partner Segaloka.",
          "Jangkau lebih banyak segmen pelanggan.",
          "Dukung pertumbuhan penjualan produk Travel.",
        ],
      },
    },
  },

  EN: {
    back: "Back to Travel Partner",
    eyebrow: "Segaloka Business Solutions",
    benefitTitle: "What you can use",
    cta: "Start Free",
    items: {
      corporate: {
        title: "Corporate",
        description:
          "Manage business travel and corporate customer needs through the Segaloka ecosystem.",
        intro:
          "Corporate solutions help Travel businesses manage company travel needs in a more structured way, from product offerings to service management.",
        benefits: [
          "Manage corporate customer travel requirements.",
          "Offer relevant Travel Packages and Land Arrangements.",
          "Manage requests and services more systematically.",
          "Expand sales opportunities into the business segment.",
        ],
      },
      "voucher-promo": {
        title: "Vouchers & Promotions",
        description:
          "Create promotional programs to help increase Travel product sales.",
        intro:
          "Travel businesses can use vouchers and promotions to create more compelling offers for products marketed through Segaloka.",
        benefits: [
          "Promotional programs for selected products.",
          "Vouchers for sales campaigns.",
          "Period-based promotional offers.",
          "Promotional support to improve conversion.",
        ],
      },
      loyalty: {
        title: "Loyalty Points",
        description:
          "Build long-term customer relationships through loyalty programs.",
        intro:
          "Loyalty programs help Travel businesses create a more sustainable customer experience through benefits and loyalty mechanisms.",
        benefits: [
          "Customer loyalty programs.",
          "Benefits for eligible transactions.",
          "Encourage repeat bookings.",
          "Improve Travel customer retention.",
        ],
      },
      "partner-network": {
        title: "Partner Network",
        description:
          "Expand product distribution through partners in the Segaloka ecosystem.",
        intro:
          "Partner Network helps Travel businesses expand their reach through sales networks and partners connected to Segaloka.",
        benefits: [
          "Expand Travel distribution networks.",
          "Connect with the Segaloka partner ecosystem.",
          "Reach more customer segments.",
          "Support Travel product sales growth.",
        ],
      },
    },
  },

  AR: {
    back: "العودة إلى شركاء السفر",
    eyebrow: "حلول أعمال Segaloka",
    benefitTitle: "المزايا التي يمكنك الاستفادة منها",
    cta: "ابدأ مجاناً",
    items: {
      corporate: {
        title: "الشركات",
        description:
          "إدارة احتياجات سفر الشركات والعملاء من خلال منظومة Segaloka.",
        intro:
          "تساعد حلول الشركات وكالات السفر على إدارة احتياجات سفر الشركات بصورة أكثر تنظيماً.",
        benefits: [
          "إدارة احتياجات سفر عملاء الشركات.",
          "تقديم باقات السفر وخدمات Land Arrangement.",
          "إدارة الطلبات والخدمات بصورة منظمة.",
          "توسيع فرص المبيعات في قطاع الأعمال.",
        ],
      },
      "voucher-promo": {
        title: "القسائم والعروض",
        description:
          "أنشئ برامج ترويجية للمساعدة في زيادة مبيعات منتجات السفر.",
        intro:
          "يمكن لوكالات السفر استخدام القسائم والعروض لتقديم عروض أكثر جاذبية عبر Segaloka.",
        benefits: [
          "برامج ترويجية للمنتجات المختارة.",
          "قسائم للحملات البيعية.",
          "عروض لفترات محددة.",
          "دعم ترويجي لتحسين التحويل.",
        ],
      },
      loyalty: {
        title: "نقاط الولاء",
        description:
          "ابنِ علاقات طويلة الأمد مع العملاء من خلال برامج الولاء.",
        intro:
          "تساعد برامج الولاء وكالات السفر على تعزيز تجربة العملاء وتشجيع الحجوزات المتكررة.",
        benefits: [
          "برامج ولاء للعملاء.",
          "مزايا للمعاملات المؤهلة.",
          "تشجيع الحجوزات المتكررة.",
          "تعزيز الاحتفاظ بالعملاء.",
        ],
      },
      "partner-network": {
        title: "شبكة الشركاء",
        description:
          "وسّع توزيع منتجاتك من خلال شبكة الشركاء في منظومة Segaloka.",
        intro:
          "تساعد شبكة الشركاء وكالات السفر على توسيع نطاق الوصول من خلال شبكة Segaloka.",
        benefits: [
          "توسيع شبكة توزيع السفر.",
          "الاتصال بشبكة شركاء Segaloka.",
          "الوصول إلى شرائح أكثر من العملاء.",
          "دعم نمو مبيعات منتجات السفر.",
        ],
      },
    },
  },
} as const;

const ICONS = {
  corporate: BarChart3,
  "voucher-promo": Tag,
  loyalty: Sparkles,
  "partner-network": Network,
};

export default function PartnerFeatureDetailClient({ type }: Props) {
  const { language } = useMarketplacePreferences();

  const lang =
    language === "EN" || language === "AR" ? language : "ID";

  const t = COPY[lang];
  const item = t.items[type];
  const Icon = ICONS[type];

  return (
    <main className="partner-feature-detail">
      <div className="partner-feature-detail-shell">
        <a
          href="/partner/travel"
          className="partner-feature-back"
        >
          <ArrowLeft size={17} />
          <span>{t.back}</span>
        </a>

        <section className="partner-feature-hero">
          <div className="partner-feature-hero-icon">
            <Icon size={30} />
          </div>

          <div>
            <span className="partner-feature-eyebrow">
              {t.eyebrow}
            </span>

            <h1>{item.title}</h1>

            <p className="partner-feature-lead">
              {item.description}
            </p>
          </div>
        </section>

        <section className="partner-feature-content">
          <p>{item.intro}</p>

          <h2>{t.benefitTitle}</h2>

          <div className="partner-feature-benefits">
            {item.benefits.map((benefit) => (
              <div
                className="partner-feature-benefit"
                key={benefit}
              >
                <span>
                  <Check size={16} />
                </span>

                <p>{benefit}</p>
              </div>
            ))}
          </div>

          <a
            className="partner-feature-cta"
            href="/partner/travel/daftar"
          >
            {t.cta}
          </a>
        </section>
      </div>
    </main>
  );
}