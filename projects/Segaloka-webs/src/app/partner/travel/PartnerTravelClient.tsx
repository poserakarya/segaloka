"use client";

import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  BusFront,
  ChevronDown,
  Globe2,
  Headphones,
  Hotel,
  Mail,
  Megaphone,
  Network,
  PackageCheck,
  Plane,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  Check,
  Gem,
  Rocket,
} from "lucide-react";
import { useState } from "react";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";
import type { LanguageCode } from "@/data/preferences";

type Copy = {
  nav: {
    about: string;
    benefits: string;
    solutions: string;
    join: string;
    faq: string;
    login: string;
    register: string;
  };
  hero: {
    eyebrow: string;
    beforeBrand: string;
    afterBrand: string;
    description: string;
    primary: string;
    secondary: string;
    marketTitle: string;
    marketText: string;
    systemTitle: string;
    systemText: string;
    supportTitle: string;
    supportText: string;
    ecosystem: string;
    operations: string;
    marketplace: string;
  };
  market: {
    title: string;
    description: string;
    package: string;
    packageDescription: string;
    landArrangement: string;
    landArrangementDescription: string;
    segaDeals: string;
    segaDealsDescription: string;
  };
  business: {
    title: string;
    description: string;
    corporate: string;
    corporateDescription: string;
    promo: string;
    promoDescription: string;
    loyalty: string;
    loyaltyDescription: string;
    network: string;
    networkDescription: string;
  };
  audience: {
    title: string;
    description: string;
    together: string;
    togetherDescription: string;
    exposure: string;
    exposureDescription: string;
    segments: string;
    segmentsDescription: string;
  };
  steps: {
    title: string;
    description: string;
    register: string;
    registerDescription: string;
    verify: string;
    verifyDescription: string;
    product: string;
    productDescription: string;
    sell: string;
    sellDescription: string;
    ready: string;
    ctaTitle: string;
    ctaDescription: string;
    cta: string;
  };
  pricing: {
    title: string;
    description: string;
    popular: string;
    perMonth: string;
    benefitLabel: string;
    plans: Array<{
      name: string;
      subtitle: string;
      price: string;
      features: string[];
      cta: string;
    }>;
  };
  faq: {
    title: string;
    description: string;
    items: Array<{ question: string; answer: string }>;
  };
  contact: {
    title: string;
    description: string;
  };
};

const copy: Record<LanguageCode, Copy> = {
  ID: {
    nav: {
      about: "Tentang Kami",
      benefits: "Keunggulan",
      solutions: "Solusi Bisnis",
      join: "Cara Bergabung",
      faq: "FAQ",
      login: "Masuk",
      register: "Daftar",
    },
    hero: {
      eyebrow: "Partner Travel Segaloka",
      beforeBrand: "Bermitra dengan",
      afterBrand: "untuk Mengembangkan Bisnis Travel Anda.",
      description:
        "Platform travel terintegrasi untuk membantu Anda mengelola produk, memperluas pasar, meningkatkan penjualan, dan bertumbuh bersama ekosistem travel yang lebih besar.",
      primary: "Daftar Mitra Travel",
      secondary: "Lihat Keunggulan",
      marketTitle: "Jangkauan Pasar",
      marketText: "Lebih Luas",
      systemTitle: "Sistem Terintegrasi",
      systemText: "dan Mudah Digunakan",
      supportTitle: "Dukungan Tim",
      supportText: "Profesional",
      ecosystem: "Travel · Vendor · Traveler",
      operations: "Operasional",
      marketplace: "Marketplace",
    },
    market: {
      title: "Perluas Pasar Anda",
      description:
        "Pasarkan produk utama Travel Anda melalui marketplace Segaloka.",
      package: "Paket Perjalanan",
      packageDescription:
        "Jual paket Umrah, Haji, Halal Tour, Tour Domestic, dan Tour International.",
      landArrangement: "Land Arrangement",
      landArrangementDescription:
        "Jual paket LA lengkap dengan akomodasi, transportasi, visa, handling, makan, dan layanan darat.",
      segaDeals: "SegaDeals",
      segaDealsDescription:
        "Tawarkan produk pilihan Travel melalui program promo khusus SegaDeals.",
    },
    business: {
      title: "Berdayakan Bisnis Anda",
      description:
        "Dapatkan dukungan fitur untuk membantu pertumbuhan bisnis Travel Anda.",
      corporate: "Corporate",
      corporateDescription: "Kelola perjalanan bisnis dengan lebih mudah.",
      promo: "Voucher & Promo",
      promoDescription: "Hadirkan program spesial dan layanan pilihan.",
      loyalty: "Loyalty Points",
      loyaltyDescription: "Bangun program untuk pelanggan Anda.",
      network: "Partner Network",
      networkDescription: "Kembangkan bisnis melalui jaringan partner.",
    },
    audience: {
      title: "Jangkau Lebih Banyak Audiens",
      description:
        "Temukan audiens baru melalui marketplace, program khusus, dan berbagai channel pemasaran.",
      together: "Bersama Kami",
      togetherDescription: "Masuk ke pasar traveler yang terus bertumbuh.",
      exposure: "Prioritas Eksposur",
      exposureDescription: "Produk Travel Anda tampil di area yang relevan.",
      segments: "Akses ke Banyak Segmen",
      segmentsDescription:
        "Individu, keluarga, korporat, komunitas, agen, dan mitra.",
    },
    steps: {
      title: "Mulai Bermitra dengan 4 Langkah Mudah",
      description: "Proses pendaftaran yang sederhana dan terstruktur.",
      register: "Daftar Akun Mitra",
      registerDescription:
        "Isi data perusahaan dan lengkapi informasi yang diperlukan.",
      verify: "Aktivasi & Verifikasi",
      verifyDescription: "Tim kami akan memverifikasi data Travel Anda.",
      product: "Tambah Produk",
      productDescription:
        "Masukkan paket, harga, jadwal, kuota, dan ketersediaan.",
      sell: "Mulai Berjualan",
      sellDescription:
        "Produk Anda siap tampil di Segaloka dan dipesan pelanggan.",
      ready: "Siap bergabung?",
      ctaTitle: "Daftarkan Travel Anda di Segaloka",
      ctaDescription:
        "Mulai proses onboarding Travel dan siapkan bisnis Anda untuk terhubung dengan ekosistem Segaloka.",
      cta: "Mulai Gratis",
    },
    pricing: {
      title: "Pilih Paket Berlangganan",
      description:
        "Pilih paket yang sesuai dengan skala bisnis Anda dan nikmati berbagai fitur untuk mengembangkan bisnis Travel.",
      popular: "Paling Populer",
      perMonth: "/ bulan",
      benefitLabel: "Keuntungan berlangganan:",
      plans: [
        {
          name: "Starter",
          subtitle: "Cocok untuk Travel yang baru memulai",
          price: "Rp499.000",
          features: [
            "Profil Travel",
            "Hingga 25 paket aktif",
            "Manajemen booking dasar",
            "Dukungan email",
          ],
          cta: "Mulai Starter",
        },
        {
          name: "Growth",
          subtitle: "Pilihan terbaik untuk berkembang",
          price: "Rp1.499.000",
          features: [
            "Semua fitur Starter",
            "Website Travel Gratis",
            "Omnichannel",
            "Free Fitur SegaDeals",
            "Hingga 200 paket aktif",
            "Promo & voucher",
            "Laporan penjualan",
            "3 akun admin",
            "Prioritas listing",
          ],
          cta: "Pilih Growth",
        },
        {
          name: "Enterprise",
          subtitle: "Untuk kebutuhan bisnis skala besar",
          price: "Rp3.999.000",
          features: [
            "Semua fitur Growth",
            "Paket aktif tanpa batas",
            "Multi cabang",
            "Integrasi API",
            "Account manager",
            "Support prioritas",
          ],
          cta: "Hubungi Kami",
        },
      ],
    },
    faq: {
      title: "Frequently Asked Questions",
      description: "Informasi umum mengenai kemitraan Travel di Segaloka.",
      items: [
        {
          question: "Siapa yang dapat menjadi Mitra Travel Segaloka?",
          answer:
            "Badan usaha Travel yang memenuhi persyaratan Segaloka dapat mengajukan pendaftaran. Data perusahaan dan kelengkapan yang diperlukan akan diverifikasi dalam proses onboarding.",
        },
        {
          question: "Apa saja produk yang dapat ditawarkan?",
          answer:
            "Travel dapat mengelola produk perjalanan sesuai perizinan, layanan, dan entitlement yang berlaku pada akun Travel.",
        },
        {
          question: "Bagaimana proses verifikasi Travel?",
          answer:
            "Setelah pendaftaran dikirim, data perusahaan dan dokumen yang diperlukan akan ditinjau sebelum akun Travel diaktifkan.",
        },
        {
          question: "Apakah produk langsung tampil setelah Travel terdaftar?",
          answer:
            "Produk perlu dilengkapi dan dipublikasikan sesuai ketentuan marketplace sebelum dapat dipesan traveler.",
        },
        {
          question: "Bagaimana Travel mengelola pesanan?",
          answer:
            "Travel menggunakan workspace Travel Segaloka untuk mengelola produk, pesanan, traveler, operasional, pembayaran, dan laporan sesuai hak akses.",
        },
        {
          question: "Apakah Segaloka mendukung cabang Travel?",
          answer:
            "Ya. Struktur Travel Segaloka mendukung operasional pusat dan cabang sesuai paket dan entitlement yang berlaku.",
        },
        {
          question: "Bagaimana sistem pembayaran bekerja?",
          answer:
            "Metode dan routing pembayaran mengikuti konfigurasi produk, Travel, dan kebijakan pembayaran yang berlaku di Segaloka.",
        },
        {
          question: "Apakah tersedia dukungan untuk Travel?",
          answer:
            "Segaloka menyediakan dukungan onboarding dan pusat bantuan untuk membantu Travel menggunakan platform.",
        },
      ],
    },
    contact: {
      title: "Punya pertanyaan?",
      description:
        "Tim kami siap membantu Anda. Hubungi kami untuk informasi lebih lanjut mengenai kemitraan Segaloka.",
    },
  },

  EN: {
    nav: {
      about: "About Us",
      benefits: "Benefits",
      solutions: "Business Solutions",
      join: "How to Join",
      faq: "FAQ",
      login: "Log In",
      register: "Sign Up",
    },
    hero: {
      eyebrow: "Segaloka Travel Partner",
      beforeBrand: "Partner with",
      afterBrand: "to Grow Your Travel Business.",
      description:
        "An integrated travel platform that helps you manage products, expand your market, increase sales, and grow within a larger travel ecosystem.",
      primary: "Become a Travel Partner",
      secondary: "Explore Benefits",
      marketTitle: "Wider",
      marketText: "Market Reach",
      systemTitle: "Integrated System",
      systemText: "Simple to Operate",
      supportTitle: "Professional",
      supportText: "Team Support",
      ecosystem: "Travel · Vendor · Traveler",
      operations: "Operations",
      marketplace: "Marketplace",
    },
    market: {
      title: "Expand Your Market",
      description:
        "Sell your Travel's core products through the Segaloka marketplace.",
      package: "Travel Packages",
      packageDescription:
        "Sell Umrah, Hajj, Halal Tour, Domestic Tour, and International Tour packages.",
      landArrangement: "Land Arrangement",
      landArrangementDescription:
        "Sell LA packages with accommodation, transport, visas, handling, meals, and ground services.",
      segaDeals: "SegaDeals",
      segaDealsDescription:
        "Offer selected Travel products through Segaloka's special SegaDeals program.",
    },
    business: {
      title: "Empower Your Business",
      description:
        "Use Segaloka tools and support to help your travel business grow.",
      corporate: "Corporate",
      corporateDescription: "Manage business travel more efficiently.",
      promo: "Vouchers & Promotions",
      promoDescription: "Create special programs and selected offers.",
      loyalty: "Loyalty Points",
      loyaltyDescription: "Build rewarding programs for your customers.",
      network: "Partner Network",
      networkDescription: "Grow through an expanding partner network.",
    },
    audience: {
      title: "Reach More Audiences",
      description:
        "Find new audiences through the marketplace, dedicated programs, and multiple marketing channels.",
      together: "Grow With Us",
      togetherDescription: "Reach a growing market of travelers.",
      exposure: "Priority Exposure",
      exposureDescription: "Showcase your products in relevant marketplace areas.",
      segments: "Reach Multiple Segments",
      segmentsDescription:
        "Individuals, families, corporations, communities, agents, and partners.",
    },
    steps: {
      title: "Start Your Partnership in 4 Easy Steps",
      description: "A simple and structured onboarding process.",
      register: "Create Partner Account",
      registerDescription:
        "Enter your company details and complete the required information.",
      verify: "Activation & Verification",
      verifyDescription: "Our team reviews and verifies your Travel business.",
      product: "Add Products",
      productDescription:
        "Add packages, prices, schedules, quotas, and availability.",
      sell: "Start Selling",
      sellDescription:
        "Your products can be published on Segaloka and booked by customers.",
      ready: "Ready to join?",
      ctaTitle: "List Your Travel Business on Segaloka",
      ctaDescription:
        "Start your Travel onboarding process and connect your business with the Segaloka ecosystem.",
      cta: "Start Free",
    },
    pricing: {
      title: "Choose Your Subscription Plan",
      description:
        "Choose a plan that fits your business scale and access tools designed to help your Travel business grow.",
      popular: "Most Popular",
      perMonth: "/ month",
      benefitLabel: "Subscription benefits:",
      plans: [
        {
          name: "Starter",
          subtitle: "Ideal for Travel businesses getting started",
          price: "Rp499.000",
          features: [
            "Travel profile",
            "Up to 25 active packages",
            "Basic booking management",
            "Email support",
          ],
          cta: "Start with Starter",
        },
        {
          name: "Growth",
          subtitle: "The best choice for growing businesses",
          price: "Rp1.499.000",
          features: [
            "All Starter features",
            "Free Travel Website",
            "Omnichannel",
            "Free SegaDeals Features",
            "Up to 200 active packages",
            "Promotions & vouchers",
            "Sales reports",
            "3 admin accounts",
            "Priority listing",
          ],
          cta: "Choose Growth",
        },
        {
          name: "Enterprise",
          subtitle: "Built for larger Travel operations",
          price: "Rp3.999.000",
          features: [
            "All Growth features",
            "Unlimited active packages",
            "Multiple branches",
            "API integration",
            "Account manager",
            "Priority support",
          ],
          cta: "Contact Us",
        },
      ],
    },
    faq: {
      title: "Frequently Asked Questions",
      description: "General information about Travel partnerships on Segaloka.",
      items: [
        {
          question: "Who can become a Segaloka Travel Partner?",
          answer:
            "Eligible Travel businesses can apply to join Segaloka. Company information and required documentation are reviewed during onboarding.",
        },
        {
          question: "What products can a Travel business offer?",
          answer:
            "Travel businesses can manage products according to their licenses, services, and account entitlements.",
        },
        {
          question: "How does Travel verification work?",
          answer:
            "After registration is submitted, the required company information and documents are reviewed before the Travel account is activated.",
        },
        {
          question: "Are products published immediately after registration?",
          answer:
            "Products must be completed and published according to marketplace requirements before travelers can book them.",
        },
        {
          question: "How does a Travel business manage bookings?",
          answer:
            "The Segaloka Travel workspace is used to manage products, bookings, travelers, operations, payments, and reports according to assigned access.",
        },
        {
          question: "Does Segaloka support Travel branches?",
          answer:
            "Yes. Segaloka supports head-office and branch operations according to the applicable package and entitlements.",
        },
        {
          question: "How do payments work?",
          answer:
            "Payment methods and routing follow the product configuration, Travel settings, and applicable Segaloka payment policies.",
        },
        {
          question: "Is support available for Travel partners?",
          answer:
            "Segaloka provides onboarding support and help resources to assist Travel partners in using the platform.",
        },
      ],
    },
    contact: {
      title: "Have a question?",
      description:
        "Our team is ready to help. Contact us for more information about partnering with Segaloka.",
    },
  },

  AR: {
    nav: {
      about: "من نحن",
      benefits: "المزايا",
      solutions: "حلول الأعمال",
      join: "كيفية الانضمام",
      faq: "الأسئلة الشائعة",
      login: "تسجيل الدخول",
      register: "التسجيل",
    },
    hero: {
      eyebrow: "شريك السفر في Segaloka",
      beforeBrand: "شارك",
      afterBrand: "لتنمية أعمال السفر الخاصة بك.",
      description:
        "منصة سفر متكاملة تساعدك على إدارة المنتجات وتوسيع السوق وزيادة المبيعات والنمو ضمن منظومة سفر أكبر.",
      primary: "انضم كشريك سفر",
      secondary: "استكشف المزايا",
      marketTitle: "وصول أوسع",
      marketText: "إلى السوق",
      systemTitle: "نظام متكامل",
      systemText: "وسهل الاستخدام",
      supportTitle: "دعم فريق",
      supportText: "احترافي",
      ecosystem: "السفر · المورّد · المسافر",
      operations: "العمليات",
      marketplace: "السوق",
    },
    market: {
      title: "وسّع سوقك",
      description:
        "اعرض المنتجات الأساسية لشركة السفر الخاصة بك عبر سوق Segaloka.",
      package: "باقات السفر",
      packageDescription:
        "اعرض باقات العمرة والحج والجولات الحلال والجولات المحلية والدولية.",
      landArrangement: "Land Arrangement",
      landArrangementDescription:
        "اعرض باقات LA التي تشمل الإقامة والنقل والتأشيرات والخدمات الأرضية والوجبات.",
      segaDeals: "SegaDeals",
      segaDealsDescription:
        "اعرض منتجات السفر المختارة من خلال برنامج SegaDeals الخاص.",
    },    business: {
      title: "طوّر أعمالك",
      description:
        "استفد من أدوات Segaloka ودعمها للمساعدة في نمو أعمال السفر الخاصة بك.",
      corporate: "الشركات",
      corporateDescription: "إدارة رحلات الأعمال بصورة أكثر سهولة.",
      promo: "القسائم والعروض",
      promoDescription: "قدّم برامج خاصة وعروضاً مختارة.",
      loyalty: "نقاط الولاء",
      loyaltyDescription: "أنشئ برامج مكافآت لعملائك.",
      network: "شبكة الشركاء",
      networkDescription: "نمِّ أعمالك من خلال شبكة شركاء متنامية.",
    },
    audience: {
      title: "الوصول إلى شرائح أوسع",
      description:
        "اكتشف جماهير جديدة عبر السوق والبرامج المخصصة وقنوات التسويق المختلفة.",
      together: "انمُ معنا",
      togetherDescription: "ادخل إلى سوق متنامٍ من المسافرين.",
      exposure: "ظهور مميز",
      exposureDescription: "اعرض منتجات السفر في مساحات السوق المناسبة.",
      segments: "الوصول إلى شرائح متعددة",
      segmentsDescription:
        "الأفراد والعائلات والشركات والمجتمعات والوكلاء والشركاء.",
    },
    steps: {
      title: "ابدأ شراكتك في 4 خطوات سهلة",
      description: "عملية تسجيل بسيطة ومنظمة.",
      register: "إنشاء حساب شريك",
      registerDescription:
        "أدخل بيانات الشركة وأكمل المعلومات المطلوبة.",
      verify: "التفعيل والتحقق",
      verifyDescription: "يقوم فريقنا بمراجعة بيانات نشاط السفر والتحقق منها.",
      product: "إضافة المنتجات",
      productDescription:
        "أضف الباقات والأسعار والجداول والحصص والتوافر.",
      sell: "ابدأ البيع",
      sellDescription:
        "يمكن نشر منتجاتك على Segaloka لتصبح متاحة للحجز.",
      ready: "هل أنت مستعد للانضمام؟",
      ctaTitle: "سجّل نشاط السفر الخاص بك في Segaloka",
      ctaDescription:
        "ابدأ عملية الانضمام واربط أعمالك بمنظومة Segaloka.",
      cta: "ابدأ مجاناً",
    },
    pricing: {
      title: "اختر خطة الاشتراك",
      description:
        "اختر الخطة المناسبة لحجم أعمالك واستفد من الأدوات المصممة لدعم نمو نشاط السفر.",
      popular: "الأكثر شعبية",
      perMonth: "/ شهرياً",
      benefitLabel: "مزايا الاشتراك:",
      plans: [
        {
          name: "Starter",
          subtitle: "مناسبة لشركات السفر التي تبدأ أعمالها",
          price: "Rp499.000",
          features: [
            "ملف شركة السفر",
            "حتى 25 باقة نشطة",
            "إدارة أساسية للحجوزات",
            "دعم عبر البريد الإلكتروني",
          ],
          cta: "ابدأ مع Starter",
        },
        {
          name: "Growth",
          subtitle: "الخيار الأفضل للأعمال النامية",
          price: "Rp1.499.000",
          features: [
            "جميع مزايا Starter",
            "موقع سفر مجاني",
            "قنوات تواصل موحدة",
            "ميزات SegaDeals مجاناً",
            "حتى 200 باقة نشطة",
            "العروض والقسائم",
            "تقارير المبيعات",
            "3 حسابات إدارية",
            "أولوية الظهور",
          ],
          cta: "اختر Growth",
        },
        {
          name: "Enterprise",
          subtitle: "للعمليات الكبيرة",
          price: "Rp3.999.000",
          features: [
            "جميع مزايا Growth",
            "باقات نشطة غير محدودة",
            "فروع متعددة",
            "تكامل API",
            "مدير حساب",
            "دعم ذو أولوية",
          ],
          cta: "تواصل معنا",
        },
      ],
    },
    faq: {
      title: "الأسئلة الشائعة",
      description: "معلومات عامة حول شراكات السفر في Segaloka.",
      items: [
        {
          question: "من يمكنه أن يصبح شريك سفر في Segaloka؟",
          answer:
            "يمكن لمنشآت السفر المؤهلة التقدم للانضمام إلى Segaloka، وتتم مراجعة بيانات الشركة والمستندات المطلوبة أثناء عملية التسجيل.",
        },
        {
          question: "ما المنتجات التي يمكن تقديمها؟",
          answer:
            "يمكن لشركات السفر إدارة المنتجات وفقاً للتراخيص والخدمات والصلاحيات المتاحة في حسابها.",
        },
        {
          question: "كيف تتم عملية التحقق؟",
          answer:
            "بعد إرسال التسجيل تتم مراجعة بيانات الشركة والمستندات المطلوبة قبل تفعيل حساب السفر.",
        },
        {
          question: "هل تظهر المنتجات مباشرة بعد التسجيل؟",
          answer:
            "يجب استكمال بيانات المنتجات ونشرها وفق متطلبات السوق قبل أن تصبح متاحة للحجز.",
        },
        {
          question: "كيف تتم إدارة الحجوزات؟",
          answer:
            "تُستخدم مساحة عمل Travel في Segaloka لإدارة المنتجات والحجوزات والمسافرين والعمليات والمدفوعات والتقارير وفق الصلاحيات.",
        },
        {
          question: "هل تدعم Segaloka فروع شركات السفر؟",
          answer:
            "نعم. يدعم Segaloka عمليات المكتب الرئيسي والفروع وفق الباقة والصلاحيات المعمول بها.",
        },
        {
          question: "كيف تعمل المدفوعات؟",
          answer:
            "تتبع طرق الدفع ومساراتها إعدادات المنتج وشركة السفر وسياسات الدفع المعمول بها في Segaloka.",
        },
        {
          question: "هل يتوفر دعم لشركاء السفر؟",
          answer:
            "توفر Segaloka دعماً لعملية الانضمام ومركز مساعدة لدعم شركاء السفر في استخدام المنصة.",
        },
      ],
    },
    contact: {
      title: "هل لديك سؤال؟",
      description:
        "فريقنا جاهز للمساعدة. تواصل معنا لمزيد من المعلومات حول الشراكة مع Segaloka.",
    },
  },
};

const marketImages = [
  "/images/la/makkah.jpg",
  "/images/la/makkah-madinah.jpg",
  "/images/hero/hero-segaloka.png",
  "/images/banners/banner-promo-utama.png",
];

export function PartnerTravelClient() {
  const { language } = useMarketplacePreferences();
  const t = copy[language];
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const marketCards = [
    {
      title: t.market.package,
      description: t.market.packageDescription,
      icon: Plane,
      image: "/images/la/makkah-madinah.jpg",
      tone: "blue",
    },
    {
      title: t.market.landArrangement,
      description: t.market.landArrangementDescription,
      icon: PackageCheck,
      image: "/images/la/madinah.jpg",
      tone: "green",
    },
    {
      title: t.market.segaDeals,
      description: t.market.segaDealsDescription,
      icon: Tag,
      image: "/images/hero/hero-segaloka.png",
      tone: "purple",
    },
  ];

  const businessCards = [
    {
      title: t.business.corporate,
      description: t.business.corporateDescription,
      icon: BarChart3,
      href: "/partner/travel/corporate",
    },
    {
      title: t.business.promo,
      description: t.business.promoDescription,
      icon: Tag,
      href: "/partner/travel/voucher-promo",
    },
    {
      title: t.business.loyalty,
      description: t.business.loyaltyDescription,
      icon: Sparkles,
      href: "/partner/travel/loyalty",
    },
    {
      title: t.business.network,
      description: t.business.networkDescription,
      icon: Network,
      href: "/partner/travel/partner-network",
    },
  ];

  const audienceCards = [
    {
      title: t.audience.together,
      description: t.audience.togetherDescription,
      icon: Megaphone,
    },
    {
      title: t.audience.exposure,
      description: t.audience.exposureDescription,
      icon: Globe2,
    },
    {
      title: t.audience.segments,
      description: t.audience.segmentsDescription,
      icon: Users,
    },
  ];

  const steps = [
    {
      number: "1",
      title: t.steps.register,
      description: t.steps.registerDescription,
      icon: BriefcaseBusiness,
    },
    {
      number: "2",
      title: t.steps.verify,
      description: t.steps.verifyDescription,
      icon: ShieldCheck,
    },
    {
      number: "3",
      title: t.steps.product,
      description: t.steps.productDescription,
      icon: PackageCheck,
    },
    {
      number: "4",
      title: t.steps.sell,
      description: t.steps.sellDescription,
      icon: BarChart3,
    },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main className="partner-travel-page">
      

      <section className="partner-hero" id="partner-about">
        <div className="partner-shell partner-hero-grid">
          <div className="partner-hero-copy">
            <span className="partner-kicker">
              <Globe2 size={15} />
              {t.hero.eyebrow}
            </span>

            <h1>
              {t.hero.beforeBrand}{" "}
              <strong>Segaloka</strong>{" "}
              {t.hero.afterBrand}
            </h1>

            <p>{t.hero.description}</p>
            <div className="partner-hero-benefits">
              <div>
                <span className="partner-benefit-icon">
                  <Globe2 size={18} />
                </span>
                <span>
                  <strong>{t.hero.marketTitle}</strong>
                  {t.hero.marketText}
                </span>
              </div>

              <div>
                <span className="partner-benefit-icon">
                  <PackageCheck size={18} />
                </span>
                <span>
                  <strong>{t.hero.systemTitle}</strong>
                  {t.hero.systemText}
                </span>
              </div>

              <div>
                <span className="partner-benefit-icon">
                  <Headphones size={18} />
                </span>
                <span>
                  <strong>{t.hero.supportTitle}</strong>
                  {t.hero.supportText}
                </span>
              </div>
            </div>
          </div>

          <div className="partner-hero-visual" aria-hidden="true">
            <div className="partner-map-dots" />

            <img
              className="partner-hero-photo"
              src="/images/hero/hero-segaloka.png"
              alt=""
            />

            <div className="partner-hero-fade" />

            <Plane className="partner-plane partner-plane-one" size={52} />
            <Plane className="partner-plane partner-plane-two" size={37} />

            <span className="partner-map-pin partner-pin-one" />
            <span className="partner-map-pin partner-pin-two" />
            <span className="partner-map-pin partner-pin-three" />

            <div className="partner-country partner-country-id">ID</div>
            <div className="partner-country partner-country-sa">SA</div>
            <div className="partner-country partner-country-my">MY</div>
            <div className="partner-country partner-country-tr">TR</div>

            <div className="partner-network-card">
              <span className="partner-network-icon">
                <Plane size={20} />
              </span>
              <div>
                <small>Segaloka</small>
                <strong>{t.hero.ecosystem}</strong>
              </div>
            </div>

            <div className="partner-floating-badge partner-floating-badge-a">
              <ShieldCheck size={16} />
              {t.hero.operations}
            </div>

            <div className="partner-floating-badge partner-floating-badge-b">
              <Globe2 size={16} />
              {t.hero.marketplace}
            </div>
          </div>
        </div>
      </section>

      <section className="partner-section" id="partner-keunggulan">
        <div className="partner-shell">
          <SectionTitle
            title={t.market.title}
            description={t.market.description}
          />

          <div className="partner-card-grid partner-card-grid-four">
            {marketCards.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  className={`partner-image-card partner-image-card-${item.tone}`}
                  key={item.title}
                >
                  <div className="partner-image-card-media">
                    <img src={item.image} alt="" />
                  </div>

                  <div className="partner-image-card-body">
                    <span className="partner-card-icon">
                      <Icon size={19} />
                    </span>

                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>

                    <ArrowRight
                      size={16}
                      className="partner-card-arrow"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="partner-section partner-section-soft"
        id="partner-solusi"
      >
        <div className="partner-shell">
          <SectionTitle
            title={t.business.title}
            description={t.business.description}
          />

          <div className="partner-card-grid partner-card-grid-four">
            {businessCards.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  className="partner-feature-card"
                  key={item.title}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="partner-feature-icon">
                    <Icon size={22} />
                  </span>

                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>

                  <ArrowRight
                    size={16}
                    className="partner-card-arrow"
                  />
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="partner-section">
        <div className="partner-shell">
          <SectionTitle
            title={t.audience.title}
            description={t.audience.description}
          />

          <div className="partner-card-grid partner-card-grid-three">
            {audienceCards.map((item) => {
              const Icon = item.icon;

              return (
                <article className="partner-audience-card" key={item.title}>
                  <div className="partner-audience-visual">
                    <Icon size={42} />
                  </div>

                  <div className="partner-audience-body">
                    <span className="partner-feature-icon">
                      <Icon size={20} />
                    </span>

                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="partner-section partner-section-soft"
        id="partner-daftar"
      >
        <div className="partner-shell">
          <SectionTitle
            title={t.steps.title}
            description={t.steps.description}
          />

          <div className="partner-steps">
            <div className="partner-step-line" />

            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <article className="partner-step" key={step.number}>
                  <span className="partner-step-number">
                    {step.number}
                  </span>

                  <div className="partner-step-icon">
                    <Icon size={21} />
                  </div>

                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              );
            })}
          </div>

          <div className="partner-registration-cta">
            <div>
              <span>{t.steps.ready}</span>
              <h3>{t.steps.ctaTitle}</h3>
              <p>{t.steps.ctaDescription}</p>
            </div>

            <a
              className="partner-primary-button"
              href="/partner/travel/perjalanan?type=free"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.steps.cta}
              <ArrowRight size={17} />
            </a>
          </div>
        </div>
      </section>

      <section
        className="partner-section partner-pricing-section"
        id="partner-pricing"
      >
        <div className="partner-shell">
          <SectionTitle
            title={t.pricing.title}
            description={t.pricing.description}
          />

          <div className="partner-pricing-grid">
            {t.pricing.plans.map((plan, index) => {
              const isPopular = index === 1;
              const PlanIcon =
                index === 0 ? Rocket : index === 1 ? BarChart3 : Building2;

              return (
                <article
                  className={`partner-pricing-card ${
                    isPopular ? "is-popular" : ""
                  }`}
                  key={plan.name}
                >
                  {isPopular && (
                    <span className="partner-pricing-popular">
                      {t.pricing.popular}
                    </span>
                  )}

                  <div className="partner-pricing-heading">
                    <PlanIcon size={27} />
                    <div>
                      <h3>{plan.name}</h3>
                      <p>{plan.subtitle}</p>
                    </div>
                  </div>

                  <div className="partner-pricing-price">
                    <strong>{plan.price}</strong>
                    <span>{t.pricing.perMonth}</span>
                  </div>

                  {isPopular && (
                    <div className="partner-growth-highlights">
                      <span>
                        <Check size={13} />
                        {language === "ID"
                          ? "Website Gratis"
                          : language === "EN"
                            ? "Free Website"
                            : "موقع مجاني"}
                      </span>

                      <span>
                        <Check size={13} />
                        Omnichannel
                      </span>

                      <span>
                        <Check size={13} />
                        SegaDeals
                      </span>
                    </div>
                  )}

                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <Check size={16} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    className={
                      isPopular
                        ? "partner-pricing-button primary"
                        : "partner-pricing-button"
                    }
                    href={
                      index === 0
                        ? "/partner/travel/perjalanan?type=starter"
                        : index === 1
                          ? "/partner/travel/perjalanan?type=growth"
                          : "/partner/travel/perjalanan?type=enterprise"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {plan.cta}
                  </a>
                </article>
              );
            })}
          </div>

          <div className="partner-subscription-benefit">
            <Gem size={19} />
            <p>
              <strong>{t.pricing.benefitLabel}</strong>{" "}
              {language === "ID"
                ? "sistem pemesanan terintegrasi, pengelolaan produk lebih mudah, jangkauan pasar lebih luas, dan dukungan tim Segaloka."
                : language === "EN"
                  ? "integrated booking tools, easier product management, broader market reach, and support from the Segaloka team."
                  : "أدوات حجز متكاملة وإدارة أسهل للمنتجات ووصول أوسع إلى السوق ودعم من فريق Segaloka."}
            </p>
          </div>
        </div>
      </section>

      <section className="partner-section" id="partner-faq">
        <div className="partner-shell">
          <SectionTitle
            title={t.faq.title}
            description={t.faq.description}
          />

          <div className="partner-faq-list">
            {t.faq.items.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <article
                  className={`partner-faq ${isOpen ? "is-open" : ""}`}
                  key={faq.question}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenFaq(isOpen ? null : index)
                    }
                  >
                    <span>{faq.question}</span>
                    <ChevronDown size={17} />
                  </button>

                  {isOpen && (
                    <div className="partner-faq-answer">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="partner-contact-section">
        <div className="partner-shell partner-contact-grid">
          <div>
            <SectionTitle
              title={t.contact.title}
              description={t.contact.description}
            />

            <a
              className="partner-contact-link"
              href="mailto:partnership@segaloka.com"
            >
              <Mail size={19} />
              partnership@segaloka.com
            </a>
          </div>

          <div className="partner-contact-visual" aria-hidden="true">
            <div className="partner-contact-circle">
              <Globe2 size={72} />
              <Plane size={39} />
            </div>
          </div>
        </div>
      </section>
    
      <section
        className="partner-bottom-nav"
        aria-label={language === "ID"
          ? "Navigasi Partner Travel"
          : language === "EN"
            ? "Travel Partner navigation"
            : "التنقل لشركاء السفر"}
      >
        <div className="partner-shell">
          
        </div>
      </section>
    </main>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="partner-section-heading">
      <span className="partner-section-marker" />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}