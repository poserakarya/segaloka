"use client";

import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  Globe2,
  Headphones,
  Hotel,
  Link2,
  Megaphone,
  MousePointerClick,
  PackageCheck,
  Plane,
  Share2,
  ShoppingBag,
  Sparkles,
  Tag,
  Users,
  Utensils,
  WalletCards,
} from "lucide-react";
import { useState } from "react";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";

type Lang = "ID" | "EN" | "AR";

const content = {
  ID: {
    badge: "Segaloka Affiliate",
    heroTitle1: "Segaloka",
    heroTitle2: "Affiliate Program",
    heroDescription:
      "Promosikan produk dan layanan perjalanan dari ekosistem Segaloka dan bangun penghasilan melalui transaksi yang valid.",

    heroBenefits: [
      "Gratis bergabung",
      "Fleksibel dipromosikan",
      "Dukungan dari tim Segaloka",
    ],

    workLabel: "Cara Kerja",
    workTitle: "3 Langkah Mudah Mulai di Segaloka Affiliate",
    workDescription:
      "Mulai membangun referral melalui proses yang sederhana.",

    work: [
      {
        title: "Daftar",
        description:
          "Buat akun Segaloka Affiliate dan lengkapi informasi yang dibutuhkan.",
      },
      {
        title: "Promosikan",
        description:
          "Bagikan link Affiliate melalui website, blog, media sosial, komunitas, atau kanal digital lainnya.",
      },
      {
        title: "Dapatkan Komisi",
        description:
          "Komisi mengikuti transaksi valid dan ketentuan program produk yang dipromosikan.",
      },
    ],

    productLabel: "Beragam Produk & Layanan",
    productTitle: "Pilihan Travel yang Bisa Anda Promosikan",
    productDescription:
      "Promosikan produk dan layanan yang tersedia untuk kanal Affiliate dari berbagai Travel dalam ekosistem Segaloka.",

    products: [
      {
        title: "Umrah",
        description: "Paket Umrah dari Travel yang membuka kanal Affiliate.",
        image: "/images/affiliate/umrah.jpg",
        icon: PackageCheck,
      },
      {
        title: "Haji",
        description: "Produk Haji yang tersedia dan memenuhi ketentuan program.",
        image: "/images/affiliate/haji.jpg",
        icon: Users,
      },
      {
        title: "Halal Tour",
        description: "Pilihan perjalanan Halal Tour dari berbagai Travel.",
        image: "/images/affiliate/halal-tour.jpg",
        icon: Globe2,
      },
      {
        title: "Tour Domestic",
        description: "Paket perjalanan dalam negeri dari berbagai destinasi.",
        image: "/images/affiliate/domestic.jpg",
        icon: Hotel,
      },
      {
        title: "Tour International",
        description: "Paket perjalanan internasional yang tersedia untuk Affiliate.",
        image: "/images/affiliate/international.jpg",
        icon: Plane,
      },
      {
        title: "SegaDeals",
        description: "Produk pilihan dalam program promo khusus SegaDeals.",
        image: "/images/affiliate/segadeals.jpg",
        icon: Tag,
      },
      {
        title: "Akomodasi & LA",
        description: "Produk Akomodasi dan Land Arrangement yang tersedia untuk promosi.",
        image: "/images/affiliate/accommodation.jpg",
        icon: ShoppingBag,
      },
      {
        title: "Produk & Layanan Lainnya",
        description: "Produk dan layanan Travel lain yang diaktifkan untuk kanal Affiliate.",
        image: "/images/affiliate/services.jpg",
        icon: Utensils,
      },
    ],

    whyLabel: "Keunggulan Segaloka Affiliate",
    whyTitle: "Mengapa Bergabung sebagai Segaloka Affiliate?",
    whyDescription:
      "Fitur yang dirancang agar aktivitas promosi lebih mudah dipantau dan dikelola.",

    why: [
      {
        title: "Program Komisi",
        description:
          "Komisi mengikuti nilai dan ketentuan yang ditetapkan pada masing-masing program.",
        icon: CircleDollarSign,
      },
      {
        title: "Materi Promosi",
        description:
          "Gunakan materi promosi yang tersedia untuk membantu aktivitas pemasaran.",
        icon: Megaphone,
      },
      {
        title: "Promo & Campaign",
        description:
          "Ikuti program promo dan campaign yang tersedia untuk Affiliate.",
        icon: Tag,
      },
      {
        title: "Dashboard Pelacakan",
        description:
          "Pantau klik, referral, transaksi, earnings, dan status komisi dari dashboard.",
        icon: BarChart3,
      },
    ],

    dashboardLabel: "Affiliate Dashboard",
    dashboardTitle: "Pantau Semua dari Satu Tempat",
    dashboardDescription:
      "Kelola link Affiliate, produk promosi, referral, transaksi, earnings, dan withdrawal melalui dashboard Segaloka.",

    tools: [
      "Link Affiliate",
      "Produk Promosi",
      "Klik & Referral",
      "Transaksi",
      "Earnings",
      "Withdrawal",
      "Riwayat",
      "Profil Affiliate",
    ],

    faqLabel: "FAQ",
    faqTitle: "Pertanyaan yang Sering Diajukan",
    faqDescription:
      "Informasi penting mengenai program Segaloka Affiliate.",

    faqs: [
      [
        "Apa itu Segaloka Affiliate?",
        "Segaloka Affiliate adalah kanal promosi yang memungkinkan Anda membagikan produk yang tersedia dari ekosistem Travel Segaloka menggunakan link referral yang dapat ditelusuri.",
      ],
      [
        "Apakah bergabung sebagai Affiliate gratis?",
        "Pendaftaran awal Segaloka Affiliate tidak dikenakan biaya pendaftaran.",
      ],
      [
        "Produk apa saja yang bisa saya promosikan?",
        "Anda dapat mempromosikan produk yang telah diaktifkan untuk kanal Affiliate oleh Travel atau program Segaloka terkait.",
      ],
      [
        "Apakah Affiliate hanya dapat mempromosikan satu Travel?",
        "Tidak. Affiliate dapat mempromosikan produk dari berbagai Travel selama produk tersebut tersedia untuk kanal Affiliate.",
      ],
      [
        "Kapan saya menerima komisi?",
        "Komisi mengikuti transaksi valid serta trigger dan ketentuan program yang berlaku. Komisi dapat melalui status pending, held, available, withdrawal pending, paid, atau reversed.",
      ],
      [
        "Bagaimana cara melakukan penarikan komisi?",
        "Earnings yang telah berstatus available dapat diajukan untuk withdrawal sesuai ketentuan pembayaran Segaloka.",
      ],
      [
        "Bagaimana saya memantau hasil promosi?",
        "Affiliate Dashboard menampilkan referral, transaksi, earnings, serta status aktivitas Affiliate yang tersedia.",
      ],
      [
        "Siapa yang bisa saya hubungi jika membutuhkan bantuan?",
        "Hubungi tim Segaloka Affiliate melalui affiliate@segaloka.com.",
      ],
    ],

    support: "Affiliate Support",
    supportText: "Hubungi tim Segaloka untuk bantuan program Affiliate.",
  },

  EN: {
    badge: "Segaloka Affiliate",
    heroTitle1: "Segaloka",
    heroTitle2: "Affiliate Program",
    heroDescription:
      "Promote travel products and services across the Segaloka ecosystem and earn from valid transactions.",

    heroBenefits: [
      "Free to join",
      "Flexible promotion",
      "Segaloka team support",
    ],

    workLabel: "How It Works",
    workTitle: "3 Easy Steps to Start with Segaloka Affiliate",
    workDescription:
      "Start building referrals through a simple process.",

    work: [
      {
        title: "Register",
        description:
          "Create your Segaloka Affiliate account and complete the required information.",
      },
      {
        title: "Promote",
        description:
          "Share Affiliate links through websites, blogs, social media, communities, or other digital channels.",
      },
      {
        title: "Earn Commission",
        description:
          "Commission follows valid transactions and the terms of each promoted product program.",
      },
    ],

    productLabel: "Products & Services",
    productTitle: "Travel Options You Can Promote",
    productDescription:
      "Promote eligible products and services from multiple Travel businesses across the Segaloka ecosystem.",

    products: [
      { title: "Umrah", description: "Umrah packages enabled for Affiliate distribution.", image: "/images/affiliate/umrah.jpg", icon: PackageCheck },
      { title: "Hajj", description: "Eligible Hajj products available within the program.", image: "/images/affiliate/haji.jpg", icon: Users },
      { title: "Halal Tour", description: "Halal Tour options from multiple Travel businesses.", image: "/images/affiliate/halal-tour.jpg", icon: Globe2 },
      { title: "Domestic Tour", description: "Domestic travel packages from multiple destinations.", image: "/images/affiliate/domestic.jpg", icon: Hotel },
      { title: "International Tour", description: "International packages available for Affiliate promotion.", image: "/images/affiliate/international.jpg", icon: Plane },
      { title: "SegaDeals", description: "Selected products available through SegaDeals promotional programs.", image: "/images/affiliate/segadeals.jpg", icon: Tag },
      { title: "Accommodation & LA", description: "Accommodation and Land Arrangement products available for promotion.", image: "/images/affiliate/accommodation.jpg", icon: ShoppingBag },
      { title: "Other Products & Services", description: "Other Travel products and services enabled for Affiliate distribution.", image: "/images/affiliate/services.jpg", icon: Utensils },
    ],

    whyLabel: "Segaloka Affiliate Benefits",
    whyTitle: "Why Join Segaloka Affiliate?",
    whyDescription:
      "Tools designed to make promotion easier to manage and monitor.",

    why: [
      { title: "Commission Programs", description: "Commission follows the value and terms configured for each program.", icon: CircleDollarSign },
      { title: "Promotional Materials", description: "Use available promotional materials to support your marketing activity.", icon: Megaphone },
      { title: "Promos & Campaigns", description: "Participate in promotional programs and campaigns available to Affiliates.", icon: Tag },
      { title: "Tracking Dashboard", description: "Monitor clicks, referrals, transactions, earnings, and commission status.", icon: BarChart3 },
    ],

    dashboardLabel: "Affiliate Dashboard",
    dashboardTitle: "Monitor Everything in One Place",
    dashboardDescription:
      "Manage Affiliate links, promoted products, referrals, transactions, earnings, and withdrawals through Segaloka.",

    tools: [
      "Affiliate Links",
      "Promoted Products",
      "Clicks & Referrals",
      "Transactions",
      "Earnings",
      "Withdrawal",
      "History",
      "Affiliate Profile",
    ],

    faqLabel: "FAQ",
    faqTitle: "Frequently Asked Questions",
    faqDescription:
      "Important information about the Segaloka Affiliate program.",

    faqs: [
      ["What is Segaloka Affiliate?", "Segaloka Affiliate is a promotional channel that lets you share eligible products from the Segaloka Travel ecosystem through trackable referral links."],
      ["Is it free to join?", "Initial Segaloka Affiliate registration does not carry a registration fee."],
      ["What products can I promote?", "You can promote products enabled for the Affiliate channel by Travel businesses or relevant Segaloka programs."],
      ["Can an Affiliate promote multiple Travel businesses?", "Yes. Affiliates may promote eligible products from multiple Travel businesses."],
      ["When do I receive commission?", "Commission follows valid transactions and applicable program triggers and terms."],
      ["How do withdrawals work?", "Earnings with available status can be submitted for withdrawal according to Segaloka payment rules."],
      ["How can I monitor performance?", "The Affiliate Dashboard provides available referral, transaction, earnings, and activity information."],
      ["Who can I contact for help?", "Contact the Segaloka Affiliate team at affiliate@segaloka.com."],
    ],

    support: "Affiliate Support",
    supportText: "Contact the Segaloka team for Affiliate program assistance.",
  },

  AR: {
    badge: "Segaloka Affiliate",
    heroTitle1: "Segaloka",
    heroTitle2: "Affiliate Program",
    heroDescription:
      "روّج لمنتجات وخدمات السفر في منظومة Segaloka واستفد من المعاملات الصحيحة.",

    heroBenefits: [
      "الانضمام مجاناً",
      "مرونة في الترويج",
      "دعم فريق Segaloka",
    ],

    workLabel: "كيف يعمل",
    workTitle: "3 خطوات سهلة للبدء مع Segaloka Affiliate",
    workDescription:
      "ابدأ ببناء الإحالات من خلال عملية بسيطة.",

    work: [
      { title: "التسجيل", description: "أنشئ حساب Segaloka Affiliate وأكمل المعلومات المطلوبة." },
      { title: "الترويج", description: "شارك روابط Affiliate عبر المواقع والمدونات ووسائل التواصل والقنوات الرقمية." },
      { title: "الحصول على العمولة", description: "تتبع العمولة المعاملات الصحيحة وشروط برنامج المنتج." },
    ],

    productLabel: "المنتجات والخدمات",
    productTitle: "خيارات السفر التي يمكنك الترويج لها",
    productDescription:
      "روّج للمنتجات والخدمات المؤهلة من شركات سفر متعددة ضمن منظومة Segaloka.",

    products: [
      { title: "العمرة", description: "باقات عمرة متاحة لقناة Affiliate.", image: "/images/affiliate/umrah.jpg", icon: PackageCheck },
      { title: "الحج", description: "منتجات حج مؤهلة ومتاحة ضمن البرنامج.", image: "/images/affiliate/haji.jpg", icon: Users },
      { title: "الجولات الحلال", description: "خيارات Halal Tour من شركات سفر متعددة.", image: "/images/affiliate/halal-tour.jpg", icon: Globe2 },
      { title: "الجولات المحلية", description: "باقات سفر محلية من وجهات متعددة.", image: "/images/affiliate/domestic.jpg", icon: Hotel },
      { title: "الجولات الدولية", description: "باقات دولية متاحة للترويج.", image: "/images/affiliate/international.jpg", icon: Plane },
      { title: "SegaDeals", description: "منتجات مختارة ضمن برامج SegaDeals.", image: "/images/affiliate/segadeals.jpg", icon: Tag },
      { title: "الإقامة وLand Arrangement", description: "منتجات الإقامة وLand Arrangement المتاحة للترويج.", image: "/images/affiliate/accommodation.jpg", icon: ShoppingBag },
      { title: "منتجات وخدمات أخرى", description: "منتجات وخدمات سفر أخرى مفعلة لقناة Affiliate.", image: "/images/affiliate/services.jpg", icon: Utensils },
    ],

    whyLabel: "مزايا Segaloka Affiliate",
    whyTitle: "لماذا تنضم إلى Segaloka Affiliate؟",
    whyDescription:
      "أدوات تساعدك على إدارة ومتابعة أنشطة الترويج.",

    why: [
      { title: "برامج العمولة", description: "تتبع العمولة القيمة والشروط المحددة لكل برنامج.", icon: CircleDollarSign },
      { title: "مواد ترويجية", description: "استخدم المواد المتاحة لدعم أنشطة التسويق.", icon: Megaphone },
      { title: "العروض والحملات", description: "شارك في العروض والحملات المتاحة لـ Affiliate.", icon: Tag },
      { title: "لوحة التتبع", description: "تابع النقرات والإحالات والمعاملات والأرباح وحالة العمولة.", icon: BarChart3 },
    ],

    dashboardLabel: "لوحة Affiliate",
    dashboardTitle: "تابع كل شيء من مكان واحد",
    dashboardDescription:
      "أدر الروابط والمنتجات والإحالات والمعاملات والأرباح والسحب من خلال Segaloka.",

    tools: [
      "روابط Affiliate",
      "المنتجات المروجة",
      "النقرات والإحالات",
      "المعاملات",
      "الأرباح",
      "السحب",
      "السجل",
      "ملف Affiliate",
    ],

    faqLabel: "الأسئلة الشائعة",
    faqTitle: "الأسئلة المتكررة",
    faqDescription:
      "معلومات مهمة حول برنامج Segaloka Affiliate.",

    faqs: [
      ["ما هو Segaloka Affiliate؟", "قناة ترويج تتيح مشاركة المنتجات المؤهلة من منظومة Segaloka عبر روابط إحالة قابلة للتتبع."],
      ["هل الانضمام مجاني؟", "لا توجد رسوم تسجيل أولية لبرنامج Segaloka Affiliate."],
      ["ما المنتجات التي يمكنني الترويج لها؟", "يمكنك الترويج للمنتجات المفعلة لقناة Affiliate."],
      ["هل يمكن الترويج لأكثر من شركة سفر؟", "نعم، يمكن الترويج للمنتجات المؤهلة من شركات سفر متعددة."],
      ["متى أحصل على العمولة؟", "تتبع العمولة المعاملات الصحيحة وشروط البرنامج المعمول بها."],
      ["كيف يعمل السحب؟", "يمكن طلب سحب الأرباح ذات الحالة available وفق قواعد الدفع في Segaloka."],
      ["كيف أتابع الأداء؟", "تعرض لوحة Affiliate معلومات الإحالات والمعاملات والأرباح المتاحة."],
      ["بمن أتواصل للمساعدة؟", "تواصل مع فريق Segaloka Affiliate عبر affiliate@segaloka.com."],
    ],

    support: "دعم Affiliate",
    supportText: "تواصل مع فريق Segaloka للمساعدة في برنامج Affiliate.",
  },
} as const;

export function AffiliateClient() {
  const { language } = useMarketplacePreferences();

  const lang: Lang =
    language === "AR" ? "AR" : language === "EN" ? "EN" : "ID";

  const t = content[lang];

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const workIcons = [Link2, Share2, CircleDollarSign];

  const toolIcons = [
    Link2,
    Megaphone,
    MousePointerClick,
    PackageCheck,
    CircleDollarSign,
    WalletCards,
    BarChart3,
    Users,
  ];

  return (
    <main className="affiliate-page affiliate-v2">
      <section className="aff2-hero">
        <div className="aff2-hero-photo" />

        <div className="affiliate-shell aff2-hero-inner">
          <div className="aff2-hero-panel">
            <div className="aff2-eyebrow">
              <Sparkles size={14} />
              {t.badge}
            </div>

            <h1>
              <span>{t.heroTitle1}</span>
              <strong>{t.heroTitle2}</strong>
            </h1>

            <p>{t.heroDescription}</p>

            <div className="aff2-hero-benefits">
              {t.heroBenefits.map((item, index) => (
                <div key={item}>
                  <span className={`is-${index + 1}`}>
                    {index === 0 ? (
                      <Users size={16} />
                    ) : index === 1 ? (
                      <Sparkles size={16} />
                    ) : (
                      <Headphones size={16} />
                    )}
                  </span>
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="aff2-section aff2-work">
        <div className="affiliate-shell">
          <div className="aff2-heading">
            <span>{t.workLabel}</span>
            <h2>{t.workTitle}</h2>
            <p>{t.workDescription}</p>
          </div>

          <div className="aff2-work-grid">
            {t.work.map((item, index) => {
              const Icon = workIcons[index];

              return (
                <article key={item.title}>
                  <div className={`aff2-work-icon is-${index + 1}`}>
                    <Icon size={27} />
                    <b>{index + 1}</b>
                  </div>

                  <h3>{item.title}</h3>
                  <p>{item.description}</p>

                  {index < 2 ? (
                    <ArrowRight className="aff2-step-arrow" size={23} />
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="aff2-section aff2-products">
        <div className="affiliate-shell">
          <div className="aff2-heading">
            <span>{t.productLabel}</span>
            <h2>{t.productTitle}</h2>
            <p>{t.productDescription}</p>
          </div>

          <div className="aff2-product-grid">
            {t.products.map((product, index) => {
              const Icon = product.icon;

              return (
                <article key={product.title}>
                  <div
                    className={`aff2-product-photo is-${index + 1}`}
                    style={{ backgroundImage: `url("${product.image}")` }}
                  >
                    <span>
                      <Icon size={20} />
                    </span>
                  </div>

                  <div className="aff2-product-body">
                    <h3>{product.title}</h3>
                    <p>{product.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="aff2-section aff2-benefits">
        <div className="affiliate-shell">
          <div className="aff2-heading">
            <span>{t.whyLabel}</span>
            <h2>{t.whyTitle}</h2>
            <p>{t.whyDescription}</p>
          </div>

          <div className="aff2-benefit-grid">
            {t.why.map((item, index) => {
              const Icon = item.icon;

              return (
                <article key={item.title}>
                  <span className={`is-${index + 1}`}>
                    <Icon size={25} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="aff2-section aff2-dashboard">
        <div className="affiliate-shell aff2-dashboard-grid">
          <div>
            <div className="aff2-heading aff2-heading-left">
              <span>{t.dashboardLabel}</span>
              <h2>{t.dashboardTitle}</h2>
              <p>{t.dashboardDescription}</p>
            </div>

            <div className="aff2-tools">
              {t.tools.map((tool, index) => {
                const Icon = toolIcons[index];

                return (
                  <div key={tool}>
                    <span>
                      <Icon size={16} />
                    </span>
                    <strong>{tool}</strong>
                    <ArrowRight size={15} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="aff2-dashboard-card">
            <header>
              <div>
                <span>S</span>
                <strong>segaloka</strong>
              </div>
              <em>Affiliate Dashboard</em>
            </header>

            <div className="aff2-dashboard-body">
              <aside>
                <b>Dashboard</b>
                <span>Links</span>
                <span>Products</span>
                <span>Referrals</span>
                <span>Transactions</span>
                <span>Earnings</span>
              </aside>

              <section>
                <small>Affiliate Overview</small>
                <h3>Performance</h3>

                <div className="aff2-stats">
                  <div>
                    <span>Clicks</span>
                    <strong>—</strong>
                  </div>
                  <div>
                    <span>Orders</span>
                    <strong>—</strong>
                  </div>
                  <div>
                    <span>Earnings</span>
                    <strong>—</strong>
                  </div>
                </div>

                <div className="aff2-chart">
                  <header>
                    <strong>Referral Performance</strong>
                    <span>Overview</span>
                  </header>

                  <div>
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>

                <div className="aff2-link-preview">
                  <Link2 size={15} />
                  <span>segaloka.com/ref/affiliate</span>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <section className="aff2-section aff2-faq">
        <div className="affiliate-shell">
          <div className="aff2-heading">
            <span>{t.faqLabel}</span>
            <h2>{t.faqTitle}</h2>
            <p>{t.faqDescription}</p>
          </div>

          <div className="aff2-faq-grid">
            <div className="aff2-support-side">
              <div className="aff2-travel-art" aria-hidden="true">
                <div className="aff2-suitcase" />
                <div className="aff2-hat" />
                <Plane size={34} />
              </div>

              <a
                href="mailto:affiliate@segaloka.com"
                className="aff2-support-card"
              >
                <span>
                  <Headphones size={20} />
                </span>

                <div>
                  <strong>{t.support}</strong>
                  <em>affiliate@segaloka.com</em>
                  <small>{t.supportText}</small>
                </div>

                <ArrowRight size={16} />
              </a>
            </div>

            <div className="aff2-faq-list">
              {t.faqs.map(([question, answer], index) => {
                const open = openFaq === index;

                return (
                  <article
                    className={open ? "is-open" : ""}
                    key={question}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : index)}
                      aria-expanded={open}
                    >
                      <span>{question}</span>
                      <ChevronDown size={16} />
                    </button>

                    {open ? <p>{answer}</p> : null}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
