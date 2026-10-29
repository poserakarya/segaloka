"use client";

import {
  BadgePercent,
  Building2,
  ChevronRight,
  CircleUserRound,
  Crown,
  Handshake,
  HelpCircle,
  Landmark,
  LockKeyhole,
  MapPin,
  Plane,
  Search,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Ticket,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {FormEvent, useMemo, useState, useEffect} from "react";
import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";

type Language = "ID" | "EN" | "AR";

type CategoryId =
  | "umrah"
  | "haji"
  | "halal"
  | "domestic"
  | "international"
  | "segadeals"
  | "visa"
  | "account"
  | "booking"
  | "payment"
  | "changes"
  | "promo"
  | "loyalty"
  | "travel"
  | "affiliate"
  | "privacy"
  | "other";

type Localized = Record<Language, string>;

type Category = {
  id: CategoryId;
  label: Localized;
  description: Localized;
  Icon: typeof Plane;
};

type ArticleStep = {
  title: Localized;
  description: Localized;
  image?: string;
  imageAlt?: Localized;
};

type Article = {
  id: string;
  category: CategoryId;
  title: Localized;
  summary: Localized;
  content: Record<Language, string[]>;
  steps?: ArticleStep[];
};

const ui = {
  ID: {
    helpCenter: "Pusat Bantuan Segaloka",
    searchPlaceholder: "Ada yang bisa kami bantu?",
    breadcrumb: "Pusat Bantuan",
    lastUpdated: "Terakhir diperbarui 5 Okt 2026",
    mainServices: "Layanan utama Segaloka",
    mainServicesDescription:
      "Temukan informasi bantuan berdasarkan layanan perjalanan yang Anda gunakan.",
    searchResults: "Hasil Pencarian",
    resultFor: "Hasil untuk",
    articleFound: "artikel bantuan ditemukan di Segaloka.",
    clearSearch: "Hapus pencarian",
    noResult: "Topik belum ditemukan",
    noResultDescription:
      "Coba gunakan kata kunci lain seperti Umrah, pembayaran, promo, Affiliate, atau pemesanan.",
    needMore: "Butuh informasi lainnya?",
    needMoreDescription:
      "Gunakan pencarian Pusat Bantuan atau pilih kategori lain untuk menemukan informasi Segaloka.",
    platformEyebrow: "SEGALOKA",
    platformTitle: "Temukan perjalanan dalam satu ekosistem Segaloka",
    platformDescription:
      "Cari produk perjalanan, lihat detailnya, dan kelola kebutuhan perjalanan Anda melalui Segaloka.",
  },

  EN: {
    helpCenter: "Segaloka Help Center",
    searchPlaceholder: "How can we help you?",
    breadcrumb: "Help Center",
    lastUpdated: "Last updated 5 Oct 2026",
    mainServices: "Segaloka main services",
    mainServicesDescription:
      "Find help information based on the travel service you use.",
    searchResults: "SEARCH RESULTS",
    resultFor: "Results for",
    articleFound: "help articles found on Segaloka.",
    clearSearch: "Clear search",
    noResult: "No topic found",
    noResultDescription:
      "Try another keyword such as Umrah, payment, promo, Affiliate, or booking.",
    needMore: "Need more information?",
    needMoreDescription:
      "Use Help Center search or select another category to find Segaloka information.",
    platformEyebrow: "SEGALOKA",
    platformTitle: "Discover travel in one Segaloka ecosystem",
    platformDescription:
      "Find travel products, review the details, and manage your travel needs through Segaloka.",
  },

  AR: {
    helpCenter: "مركز مساعدة سيجالوكا",
    searchPlaceholder: "كيف يمكننا مساعدتك؟",
    breadcrumb: "مركز المساعدة",
    lastUpdated: "آخر تحديث 5 أكتوبر 2026",
    mainServices: "خدمات سيجالوكا الرئيسية",
    mainServicesDescription:
      "اعثر على معلومات المساعدة حسب خدمة السفر التي تستخدمها.",
    searchResults: "نتائج البحث",
    resultFor: "نتائج البحث عن",
    articleFound: "مقالة مساعدة متاحة في سيجالوكا.",
    clearSearch: "مسح البحث",
    noResult: "لم يتم العثور على الموضوع",
    noResultDescription:
      "جرّب كلمة أخرى مثل العمرة أو الدفع أو العروض أو الأفلييت أو الحجز.",
    needMore: "هل تحتاج إلى معلومات أخرى؟",
    needMoreDescription:
      "استخدم البحث في مركز المساعدة أو اختر فئة أخرى للعثور على معلومات سيجالوكا.",
    platformEyebrow: "SEGALOKA",
    platformTitle: "اكتشف رحلتك ضمن منظومة سيجالوكا",
    platformDescription:
      "ابحث عن منتجات السفر وراجع التفاصيل وأدر احتياجات رحلتك من خلال سيجالوكا.",
  },
} satisfies Record<Language, Record<string, string>>;

const topicUi = {
  ID: {
    topics: "Topik bantuan",
    chooseTopic: "Pilih topik yang ingin Anda pelajari.",
    articles: "Artikel",
    openArticle: "Buka artikel",
  },
  EN: {
    topics: "Help topics",
    chooseTopic: "Choose a topic you would like to learn about.",
    articles: "Articles",
    openArticle: "Open article",
  },
  AR: {
    topics: "مواضيع المساعدة",
    chooseTopic: "اختر الموضوع الذي ترغب في معرفة المزيد عنه.",
    articles: "المقالات",
    openArticle: "فتح المقال",
  },
} satisfies Record<Language, Record<string, string>>;

const categories: Category[] = [
  {
    id: "umrah",
    Icon: Building2,
    label: { ID: "Umrah", EN: "Umrah", AR: "العمرة" },
    description: {
      ID: "Paket dan informasi perjalanan Umrah.",
      EN: "Umrah packages and travel information.",
      AR: "باقات ومعلومات رحلات العمرة.",
    },
  },
  {
    id: "haji",
    Icon: Plane,
    label: { ID: "Haji", EN: "Hajj", AR: "الحج" },
    description: {
      ID: "Informasi dan layanan perjalanan Haji.",
      EN: "Hajj travel information and services.",
      AR: "معلومات وخدمات رحلات الحج.",
    },
  },
  {
    id: "halal",
    Icon: Landmark,
    label: { ID: "Halal Tour", EN: "Halal Tour", AR: "السياحة الحلال" },
    description: {
      ID: "Perjalanan Muslim-friendly ke berbagai destinasi.",
      EN: "Muslim-friendly trips to various destinations.",
      AR: "رحلات مناسبة للمسلمين إلى وجهات متنوعة.",
    },
  },
  {
    id: "domestic",
    Icon: MapPin,
    label: {
      ID: "Domestic",
      EN: "Domestic",
      AR: "الجولات المحلية",
    },
    description: {
      ID: "Paket perjalanan wisata dalam negeri.",
      EN: "Travel packages within Indonesia.",
      AR: "باقات السفر داخل إندونيسيا.",
    },
  },
  {
    id: "international",
    Icon: Plane,
    label: {
      ID: "International",
      EN: "International",
      AR: "الجولات الدولية",
    },
    description: {
      ID: "Paket perjalanan ke berbagai negara.",
      EN: "Travel packages to international destinations.",
      AR: "باقات السفر إلى وجهات دولية.",
    },
  },
  {
    id: "segadeals",
    Icon: Ticket,
    label: { ID: "SegaDeals", EN: "SegaDeals", AR: "SegaDeals" },
    description: {
      ID: "Request perjalanan dan terima penawaran dari Travel.",
      EN: "Request a trip and receive offers from Travel providers.",
      AR: "اطلب رحلة واستقبل عروضًا من شركات السفر.",
    },
  },
  {
    id: "visa",
    Icon: Landmark,
    label: {
      ID: "Visa",
      EN: "Visa",
      AR: "التأشيرات",
    },
    description: {
      ID: "Pengurusan visa perjalanan selain Visa Umrah.",
      EN: "Travel visa processing services excluding Umrah visas.",
      AR: "خدمات معالجة تأشيرات السفر باستثناء تأشيرات العمرة.",
    },
  },  {
    id: "account",
    Icon: CircleUserRound,
    label: {
      ID: "Akun & Keanggotaan",
      EN: "Account & Membership",
      AR: "الحساب والعضوية",
    },
    description: {
      ID: "Akun, profil, akses, dan keanggotaan.",
      EN: "Account, profile, access, and membership.",
      AR: "الحساب والملف الشخصي والوصول والعضوية.",
    },
  },
  {
    id: "booking",
    Icon: ShoppingBag,
    label: { ID: "Pemesanan", EN: "Bookings", AR: "الحجوزات" },
    description: {
      ID: "Informasi proses pemesanan di Segaloka.",
      EN: "Information about booking on Segaloka.",
      AR: "معلومات حول عملية الحجز في سيجالوكا.",
    },
  },
  {
    id: "payment",
    Icon: WalletCards,
    label: { ID: "Pembayaran", EN: "Payments", AR: "المدفوعات" },
    description: {
      ID: "Metode, transaksi, dan status pembayaran.",
      EN: "Payment methods, transactions, and statuses.",
      AR: "طرق الدفع والمعاملات وحالات الدفع.",
    },
  },
  {
    id: "changes",
    Icon: BadgePercent,
    label: {
      ID: "Perubahan & Pembatalan",
      EN: "Changes & Cancellations",
      AR: "التغيير والإلغاء",
    },
    description: {
      ID: "Pembatalan, refund, dan reschedule.",
      EN: "Cancellation, refund, and rescheduling.",
      AR: "الإلغاء والاسترداد وإعادة الجدولة.",
    },
  },
  {
    id: "promo",
    Icon: Tag,
    label: {
      ID: "Voucher & Promo",
      EN: "Vouchers & Promos",
      AR: "القسائم والعروض",
    },
    description: {
      ID: "Voucher, promo, dan ketentuan penggunaannya.",
      EN: "Vouchers, promotions, and their terms.",
      AR: "القسائم والعروض وشروط استخدامها.",
    },
  },
  {
    id: "loyalty",
    Icon: Crown,
    label: {
      ID: "Loyalty Points",
      EN: "Loyalty Points",
      AR: "نقاط الولاء",
    },
    description: {
      ID: "Informasi poin dan benefit pengguna.",
      EN: "Points and user benefits.",
      AR: "النقاط ومزايا المستخدم.",
    },
  },
  
  {
    id: "affiliate",
    Icon: UsersRound,
    label: {
      ID: "Program Affiliate",
      EN: "Affiliate Program",
      AR: "برنامج الأفلييت",
    },
    description: {
      ID: "Promosi produk dan komisi Affiliate Segaloka.",
      EN: "Promote products and earn Affiliate commissions.",
      AR: "روّج للمنتجات واحصل على عمولات الأفلييت.",
    },
  },
  {
    id: "privacy",
    Icon: ShieldCheck,
    label: {
      ID: "Keamanan & Privasi",
      EN: "Security & Privacy",
      AR: "الأمان والخصوصية",
    },
    description: {
      ID: "Perlindungan akun dan informasi pengguna.",
      EN: "Account and user information protection.",
      AR: "حماية الحساب ومعلومات المستخدم.",
    },
  },
  {
    id: "other",
    Icon: HelpCircle,
    label: { ID: "Lainnya", EN: "Others", AR: "أخرى" },
    description: {
      ID: "Informasi bantuan Segaloka lainnya.",
      EN: "Other Segaloka help information.",
      AR: "معلومات مساعدة أخرى من سيجالوكا.",
    },
  },
];

const articles: Article[] = [

  /* =====================================================
     VISA — TRAVELER HELP CENTER
     Visa Umrah tidak termasuk layanan Visa mandiri.
     ===================================================== */

  {
    id: "visa-tentang-layanan",
    category: "visa",
    title: {
      ID: "Tentang Layanan Visa Segaloka",
      EN: "About Segaloka Visa Services",
      AR: "حول خدمات التأشيرات في سيجالوكا",
    },
    summary: {
      ID: "Pahami layanan pengurusan visa perjalanan yang tersedia di Segaloka.",
      EN: "Understand the travel visa processing services available on Segaloka.",
      AR: "تعرّف على خدمات معالجة تأشيرات السفر المتاحة في سيجالوكا.",
    },
    content: {
      ID: [
        "Layanan Visa Segaloka membantu Traveler menemukan dan memesan layanan pengurusan visa perjalanan yang disediakan oleh penyedia di marketplace Segaloka.",
        "Jenis visa, negara tujuan, persyaratan, biaya, estimasi proses, masa berlaku, serta layanan yang tersedia mengikuti informasi dari penyedia untuk masing-masing produk Visa.",
        "Layanan Visa mandiri ini tidak mencakup Visa Umrah. Penanganan Visa Umrah mengikuti paket dan proses operasional Umrah dari Travel atau PPIU terkait.",
        "Ketersediaan layanan pengurusan Visa tidak berarti visa pasti diterbitkan. Keputusan akhir atas pengajuan tetap berada pada kedutaan, konsulat, imigrasi, atau otoritas terkait.",
      ],
      EN: [
        "Segaloka Visa Services help Travelers find and book travel visa processing services offered by providers on the Segaloka marketplace.",
        "Visa types, destination countries, requirements, fees, processing estimates, validity periods, and available services follow the information provided for each Visa product.",
        "This standalone Visa service does not include Umrah visas. Umrah visa processing follows the Umrah package and operational process of the relevant Travel provider or PPIU.",
        "The availability of a Visa processing service does not guarantee visa issuance. The final decision remains with the relevant embassy, consulate, immigration authority, or other competent authority.",
      ],
      AR: [
        "تساعد خدمات التأشيرات في سيجالوكا المسافرين على العثور على خدمات معالجة تأشيرات السفر وحجزها من مقدمي الخدمات في سوق سيجالوكا.",
        "تختلف أنواع التأشيرات والدول والمتطلبات والرسوم والمدة التقديرية للمعالجة وفترة الصلاحية والخدمات المتاحة وفق معلومات كل منتج تأشيرة.",
        "لا تشمل خدمة التأشيرات المستقلة هذه تأشيرات العمرة. تتم معالجة تأشيرة العمرة ضمن باقة العمرة والإجراءات التشغيلية لشركة السفر أو الجهة المرخصة ذات الصلة.",
        "توفر خدمة معالجة التأشيرة لا يعني ضمان إصدارها. يبقى القرار النهائي للسفارة أو القنصلية أو إدارة الهجرة أو الجهة المختصة.",
      ],
    },
  },

  {
    id: "visa-cara-memesan",
    category: "visa",
    title: {
      ID: "Cara Memesan Layanan Visa",
      EN: "How to Book a Visa Service",
      AR: "كيفية حجز خدمة التأشيرة",
    },
    summary: {
      ID: "Pilih negara dan jenis visa, periksa persyaratan, lalu lanjutkan pemesanan.",
      EN: "Choose the country and visa type, review the requirements, then continue with your booking.",
      AR: "اختر الدولة ونوع التأشيرة وراجع المتطلبات ثم تابع الحجز.",
    },
    content: {
      ID: [
        "Cari layanan Visa berdasarkan negara tujuan dan jenis visa yang Anda butuhkan.",
        "Buka detail layanan dan periksa persyaratan, estimasi proses, biaya, masa berlaku, ketentuan, serta cakupan layanan dari penyedia.",
        "Isi data pemohon sesuai dokumen resmi, unggah dokumen yang diminta, lalu periksa kembali informasi sebelum melanjutkan pembayaran.",
        "Setelah pemesanan dibuat, Anda dapat mengikuti status layanan dan permintaan dokumen melalui detail pesanan.",
      ],
      EN: [
        "Search for a Visa service based on your destination country and required visa type.",
        "Open the service details and review the requirements, estimated processing time, fees, validity period, terms, and provider service coverage.",
        "Enter the applicant's information according to official documents, upload the requested documents, and review everything before continuing to payment.",
        "After the order is created, you can follow the service status and document requests from the order details.",
      ],
      AR: [
        "ابحث عن خدمة التأشيرة حسب دولة الوجهة ونوع التأشيرة المطلوبة.",
        "افتح تفاصيل الخدمة وراجع المتطلبات والمدة التقديرية للمعالجة والرسوم وفترة الصلاحية والشروط ونطاق خدمة مقدم الخدمة.",
        "أدخل بيانات مقدم الطلب وفق الوثائق الرسمية وارفع المستندات المطلوبة ثم راجع المعلومات قبل متابعة الدفع.",
        "بعد إنشاء الطلب يمكنك متابعة حالة الخدمة وطلبات المستندات من تفاصيل الطلب.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Pilih negara dan jenis visa",
          EN: "Choose the country and visa type",
          AR: "اختر الدولة ونوع التأشيرة",
        },
        description: {
          ID: "Cari layanan berdasarkan tujuan perjalanan dan kebutuhan visa Anda.",
          EN: "Search for a service based on your destination and visa requirements.",
          AR: "ابحث عن الخدمة حسب وجهتك ومتطلبات التأشيرة.",
        },
        image: "/images/help-center/visa/cari-layanan-visa.webp",
        imageAlt: {
          ID: "Pencarian layanan Visa Segaloka",
          EN: "Segaloka Visa service search",
          AR: "البحث عن خدمة التأشيرة في سيجالوكا",
        },
      },
      {
        title: {
          ID: "Periksa detail dan persyaratan",
          EN: "Review details and requirements",
          AR: "راجع التفاصيل والمتطلبات",
        },
        description: {
          ID: "Periksa dokumen, biaya, estimasi proses, masa berlaku, dan ketentuan layanan.",
          EN: "Review documents, fees, estimated processing time, validity, and service terms.",
          AR: "راجع المستندات والرسوم ومدة المعالجة والصلاحية وشروط الخدمة.",
        },
        image: "/images/help-center/visa/detail-layanan-visa.webp",
        imageAlt: {
          ID: "Detail layanan Visa Segaloka",
          EN: "Segaloka Visa service details",
          AR: "تفاصيل خدمة التأشيرة في سيجالوكا",
        },
      },
      {
        title: {
          ID: "Isi data pemohon",
          EN: "Enter applicant details",
          AR: "أدخل بيانات مقدم الطلب",
        },
        description: {
          ID: "Isi data sesuai paspor atau dokumen perjalanan resmi.",
          EN: "Enter the information exactly as shown on the passport or official travel document.",
          AR: "أدخل البيانات كما تظهر في جواز السفر أو وثيقة السفر الرسمية.",
        },
        image: "/images/help-center/visa/data-pemohon.webp",
        imageAlt: {
          ID: "Form data pemohon Visa",
          EN: "Visa applicant form",
          AR: "نموذج بيانات مقدم طلب التأشيرة",
        },
      },
      {
        title: {
          ID: "Unggah dokumen",
          EN: "Upload documents",
          AR: "ارفع المستندات",
        },
        description: {
          ID: "Unggah dokumen sesuai daftar persyaratan produk Visa yang dipilih.",
          EN: "Upload the documents required for the selected Visa product.",
          AR: "ارفع المستندات المطلوبة لمنتج التأشيرة المختار.",
        },
        image: "/images/help-center/visa/upload-dokumen.webp",
        imageAlt: {
          ID: "Unggah dokumen pengajuan Visa",
          EN: "Upload Visa application documents",
          AR: "رفع مستندات طلب التأشيرة",
        },
      },
      {
        title: {
          ID: "Review dan pembayaran",
          EN: "Review and payment",
          AR: "المراجعة والدفع",
        },
        description: {
          ID: "Periksa kembali data dan layanan sebelum menyelesaikan pembayaran.",
          EN: "Review the applicant data and service before completing payment.",
          AR: "راجع بيانات مقدم الطلب والخدمة قبل إتمام الدفع.",
        },
        image: "/images/help-center/visa/review-pembayaran.webp",
        imageAlt: {
          ID: "Review dan pembayaran layanan Visa",
          EN: "Visa service review and payment",
          AR: "مراجعة ودفع خدمة التأشيرة",
        },
      },
    ],
  },

  {
    id: "visa-persyaratan-dokumen",
    category: "visa",
    title: {
      ID: "Persyaratan & Dokumen Visa",
      EN: "Visa Requirements & Documents",
      AR: "متطلبات ومستندات التأشيرة",
    },
    summary: {
      ID: "Dokumen yang dibutuhkan dapat berbeda menurut negara dan jenis visa.",
      EN: "Required documents may differ by country and visa type.",
      AR: "قد تختلف المستندات المطلوبة حسب الدولة ونوع التأشيرة.",
    },
    content: {
      ID: [
        "Persyaratan Visa mengikuti negara tujuan, jenis visa, profil pemohon, dan ketentuan dari otoritas terkait.",
        "Periksa daftar persyaratan pada detail produk sebelum membuat pesanan dan pastikan dokumen yang dikirim masih berlaku, jelas, dan sesuai dengan data pemohon.",
        "Penyedia dapat meminta dokumen tambahan apabila dibutuhkan dalam proses pemeriksaan atau pengajuan.",
        "Jangan menggunakan daftar persyaratan dari produk atau negara lain sebagai acuan karena kebutuhan dokumen dapat berbeda.",
      ],
      EN: [
        "Visa requirements depend on the destination country, visa type, applicant profile, and rules of the relevant authority.",
        "Review the requirements on the product detail page before ordering and make sure submitted documents are valid, clear, and consistent with the applicant's information.",
        "The provider may request additional documents when required during review or submission.",
        "Do not use the requirements of another product or country as a reference because document requirements may differ.",
      ],
      AR: [
        "تعتمد متطلبات التأشيرة على دولة الوجهة ونوع التأشيرة وبيانات مقدم الطلب وقواعد الجهة المختصة.",
        "راجع قائمة المتطلبات في تفاصيل المنتج قبل الحجز وتأكد من أن المستندات المرسلة سارية وواضحة ومتطابقة مع بيانات مقدم الطلب.",
        "قد يطلب مقدم الخدمة مستندات إضافية عند الحاجة أثناء المراجعة أو التقديم.",
        "لا تستخدم متطلبات منتج أو دولة أخرى كمرجع لأن المستندات المطلوبة قد تختلف.",
      ],
    },
  },

  {
    id: "visa-data-pemohon",
    category: "visa",
    title: {
      ID: "Mengisi Data Pemohon Visa",
      EN: "Entering Visa Applicant Information",
      AR: "إدخال بيانات مقدم طلب التأشيرة",
    },
    summary: {
      ID: "Pastikan data pemohon sesuai dengan paspor dan dokumen resmi.",
      EN: "Make sure applicant information matches the passport and official documents.",
      AR: "تأكد من تطابق بيانات مقدم الطلب مع جواز السفر والوثائق الرسمية.",
    },
    content: {
      ID: [
        "Isi nama dan data identitas sesuai dengan paspor atau dokumen perjalanan resmi tanpa mengubah ejaan.",
        "Periksa nomor paspor, tanggal lahir, kewarganegaraan, tanggal penerbitan, tanggal kedaluwarsa, dan informasi lain yang diminta.",
        "Kesalahan data dapat menyebabkan permintaan koreksi, keterlambatan proses, atau masalah pada pengajuan.",
        "Data dan dokumen pemohon merupakan informasi sensitif. Jangan membagikannya melalui saluran yang tidak ditentukan dalam proses layanan Segaloka.",
      ],
      EN: [
        "Enter the applicant's name and identity information exactly as shown on the passport or official travel document.",
        "Check the passport number, date of birth, nationality, issue date, expiry date, and any other required information.",
        "Incorrect information may result in correction requests, processing delays, or application issues.",
        "Applicant data and documents are sensitive information. Do not share them through channels that are not designated for the Segaloka service process.",
      ],
      AR: [
        "أدخل اسم مقدم الطلب وبيانات الهوية تمامًا كما تظهر في جواز السفر أو وثيقة السفر الرسمية.",
        "تحقق من رقم جواز السفر وتاريخ الميلاد والجنسية وتاريخ الإصدار وتاريخ الانتهاء وأي معلومات أخرى مطلوبة.",
        "قد تؤدي البيانات غير الصحيحة إلى طلبات تصحيح أو تأخير في المعالجة أو مشكلات في الطلب.",
        "بيانات ومستندات مقدم الطلب معلومات حساسة. لا تشاركها عبر قنوات غير مخصصة لعملية الخدمة في سيجالوكا.",
      ],
    },
  },

  {
    id: "visa-status-pengajuan",
    category: "visa",
    title: {
      ID: "Melihat Status Pengajuan Visa",
      EN: "Checking Visa Application Status",
      AR: "متابعة حالة طلب التأشيرة",
    },
    summary: {
      ID: "Pantau perkembangan layanan Visa melalui detail pesanan.",
      EN: "Track Visa service progress from your order details.",
      AR: "تابع تقدم خدمة التأشيرة من تفاصيل الطلب.",
    },
    content: {
      ID: [
        "Status layanan menunjukkan tahapan pemrosesan pesanan Visa berdasarkan pembaruan yang tersedia dari penyedia.",
        "Status dapat mencakup pemeriksaan data, menunggu dokumen, proses pengajuan, pembaruan dari penyedia, hingga proses selesai.",
        "Waktu perubahan status tidak selalu sama untuk setiap negara atau jenis visa.",
        "Jika terdapat tindakan yang perlu dilakukan oleh Traveler, periksa instruksi pada detail pesanan sebelum mengirim data atau dokumen tambahan.",
      ],
      EN: [
        "The service status shows the Visa order processing stage based on updates available from the provider.",
        "Statuses may include data review, waiting for documents, application processing, provider updates, and completion.",
        "Status update timing is not necessarily the same for every country or visa type.",
        "If action is required from the Traveler, review the instructions in the order details before submitting additional information or documents.",
      ],
      AR: [
        "توضح حالة الخدمة مرحلة معالجة طلب التأشيرة وفق التحديثات المتاحة من مقدم الخدمة.",
        "قد تشمل الحالات مراجعة البيانات وانتظار المستندات ومعالجة الطلب وتحديثات مقدم الخدمة واكتمال العملية.",
        "قد يختلف توقيت تحديث الحالة حسب الدولة أو نوع التأشيرة.",
        "إذا كان هناك إجراء مطلوب من المسافر فراجع التعليمات في تفاصيل الطلب قبل إرسال معلومات أو مستندات إضافية.",
      ],
    },
  },

  {
    id: "visa-dokumen-tambahan",
    category: "visa",
    title: {
      ID: "Permintaan Dokumen Tambahan",
      EN: "Additional Document Requests",
      AR: "طلبات المستندات الإضافية",
    },
    summary: {
      ID: "Penyedia dapat meminta dokumen tambahan selama proses layanan Visa.",
      EN: "The provider may request additional documents during Visa processing.",
      AR: "قد يطلب مقدم الخدمة مستندات إضافية أثناء معالجة التأشيرة.",
    },
    content: {
      ID: [
        "Dalam proses pemeriksaan atau pengajuan, penyedia dapat meminta dokumen tambahan atau perbaikan dokumen yang sebelumnya dikirim.",
        "Periksa jenis dokumen, catatan, dan batas waktu yang tercantum pada permintaan sebelum mengunggah pembaruan.",
        "Kirim dokumen yang sesuai dengan permintaan agar proses dapat dilanjutkan.",
        "Permintaan dokumen tambahan tidak berarti pengajuan telah disetujui atau ditolak.",
      ],
      EN: [
        "During review or submission, the provider may request additional documents or corrections to previously submitted documents.",
        "Check the requested document type, notes, and deadline before uploading an update.",
        "Submit the requested documents so processing can continue.",
        "A request for additional documents does not mean the application has been approved or rejected.",
      ],
      AR: [
        "أثناء المراجعة أو التقديم قد يطلب مقدم الخدمة مستندات إضافية أو تصحيح مستندات سبق إرسالها.",
        "راجع نوع المستند المطلوب والملاحظات والموعد المحدد قبل رفع التحديث.",
        "أرسل المستندات المطلوبة حتى تستمر المعالجة.",
        "طلب مستندات إضافية لا يعني أن الطلب تمت الموافقة عليه أو رفضه.",
      ],
    },
  },

  {
    id: "visa-estimasi-proses",
    category: "visa",
    title: {
      ID: "Estimasi Proses Visa",
      EN: "Visa Processing Estimate",
      AR: "المدة التقديرية لمعالجة التأشيرة",
    },
    summary: {
      ID: "Estimasi proses mengikuti jenis visa, negara, penyedia, dan otoritas terkait.",
      EN: "Processing estimates depend on the visa type, country, provider, and relevant authority.",
      AR: "تعتمد المدة التقديرية على نوع التأشيرة والدولة ومقدم الخدمة والجهة المختصة.",
    },
    content: {
      ID: [
        "Estimasi proses yang ditampilkan pada produk merupakan perkiraan berdasarkan informasi layanan yang tersedia.",
        "Waktu aktual dapat berubah karena kelengkapan dokumen, pemeriksaan tambahan, kebijakan otoritas, hari kerja, musim perjalanan, atau faktor operasional lainnya.",
        "Sebaiknya ajukan layanan Visa dengan waktu yang cukup sebelum rencana keberangkatan.",
        "Jangan membeli layanan perjalanan yang tidak dapat diubah hanya dengan mengandalkan estimasi Visa, kecuali Anda telah memahami risiko dan ketentuannya.",
      ],
      EN: [
        "The processing estimate shown on a product is an approximation based on available service information.",
        "Actual timing may change due to document completeness, additional review, authority policies, working days, travel seasons, or other operational factors.",
        "It is recommended to apply for a Visa service with sufficient time before the planned departure.",
        "Do not purchase non-changeable travel services solely based on a Visa estimate unless you understand the associated risks and terms.",
      ],
      AR: [
        "المدة المعروضة في المنتج هي تقدير مبني على معلومات الخدمة المتاحة.",
        "قد تتغير المدة الفعلية بسبب اكتمال المستندات أو المراجعات الإضافية أو سياسات الجهات المختصة أو أيام العمل أو مواسم السفر أو عوامل تشغيلية أخرى.",
        "يُنصح بطلب خدمة التأشيرة بوقت كافٍ قبل موعد المغادرة المخطط.",
        "لا تشتر خدمات سفر غير قابلة للتعديل اعتمادًا فقط على تقدير مدة التأشيرة ما لم تكن مدركًا للمخاطر والشروط.",
      ],
    },
  },

  {
    id: "visa-hasil-pengajuan",
    category: "visa",
    title: {
      ID: "Hasil Pengajuan Visa",
      EN: "Visa Application Result",
      AR: "نتيجة طلب التأشيرة",
    },
    summary: {
      ID: "Persetujuan atau penolakan Visa merupakan keputusan otoritas terkait.",
      EN: "Visa approval or refusal is determined by the relevant authority.",
      AR: "تحدد الجهة المختصة الموافقة على التأشيرة أو رفضها.",
    },
    content: {
      ID: [
        "Hasil pengajuan Visa mengikuti keputusan kedutaan, konsulat, imigrasi, atau otoritas yang berwenang.",
        "Segaloka dan penyedia layanan membantu proses sesuai cakupan layanan yang dipesan, tetapi tidak dapat menjamin bahwa Visa akan disetujui.",
        "Apabila Visa diterbitkan, periksa nama, nomor paspor, jenis visa, masa berlaku, jumlah izin masuk, dan informasi penting lainnya segera setelah dokumen diterima.",
        "Apabila pengajuan tidak disetujui, informasi tindak lanjut dan ketentuan biaya mengikuti kondisi pengajuan, kebijakan otoritas, serta ketentuan produk dan penyedia yang berlaku.",
      ],
      EN: [
        "The Visa application result follows the decision of the embassy, consulate, immigration authority, or other competent authority.",
        "Segaloka and the service provider assist with the process according to the purchased service scope but cannot guarantee Visa approval.",
        "If the Visa is issued, immediately check the name, passport number, visa type, validity period, number of permitted entries, and other important information.",
        "If the application is not approved, follow-up information and fee conditions depend on the application circumstances, authority policy, and applicable product and provider terms.",
      ],
      AR: [
        "تخضع نتيجة طلب التأشيرة لقرار السفارة أو القنصلية أو إدارة الهجرة أو الجهة المختصة.",
        "تساعد سيجالوكا ومقدم الخدمة في العملية وفق نطاق الخدمة المحجوزة ولكن لا يمكنهما ضمان الموافقة على التأشيرة.",
        "إذا صدرت التأشيرة فتحقق فورًا من الاسم ورقم جواز السفر ونوع التأشيرة وفترة الصلاحية وعدد مرات الدخول والمعلومات المهمة الأخرى.",
        "إذا لم تتم الموافقة على الطلب فإن معلومات المتابعة وشروط الرسوم تعتمد على ظروف الطلب وسياسة الجهة المختصة وشروط المنتج ومقدم الخدمة السارية.",
      ],
    },
  },

  {
    id: "umrah-tipe-kamar",
    category: "umrah",
    title: {
      ID: "Apa perbedaan kamar Quad, Triple, dan Double?",
      EN: "What is the difference between Quad, Triple, and Double rooms?",
      AR: "ما الفرق بين الغرف الرباعية والثلاثية والمزدوجة؟",
    },
    summary: {
      ID: "Pahami tipe kamar yang tersedia pada paket Umrah.",
      EN: "Understand the room types available in Umrah packages.",
      AR: "تعرّف على أنواع الغرف المتاحة في باقات العمرة.",
    },
    content: {
      ID: [
        "Tipe kamar menunjukkan jumlah Traveler yang menempati satu kamar. Quad umumnya digunakan untuk empat orang, Triple untuk tiga orang, dan Double untuk dua orang.",
        "Harga paket dapat berbeda berdasarkan tipe kamar. Harga yang tampil pada marketplace mengikuti konfigurasi paket yang diterbitkan oleh Travel.",
        "Periksa tipe kamar, harga per Traveler, fasilitas hotel, dan ketentuan paket pada halaman detail sebelum melakukan pemesanan.",
      ],
      EN: [
        "Room type indicates how many Travelers occupy one room. Quad generally accommodates four people, Triple three people, and Double two people.",
        "Package prices may vary by room type. Prices shown on the marketplace follow the package configuration published by the Travel provider.",
        "Review the room type, price per Traveler, hotel facilities, and package terms on the detail page before booking.",
      ],
      AR: [
        "يشير نوع الغرفة إلى عدد المسافرين المقيمين في الغرفة الواحدة. الغرفة الرباعية لأربعة أشخاص عادةً، والثلاثية لثلاثة، والمزدوجة لشخصين.",
        "قد يختلف سعر الباقة حسب نوع الغرفة. ويعتمد السعر المعروض في السوق على إعدادات الباقة المنشورة من شركة السفر.",
        "راجع نوع الغرفة والسعر لكل مسافر ومرافق الفندق وشروط الباقة في صفحة التفاصيل قبل الحجز.",
      ],
    },
  },

  {
    id: "umrah-data-traveler",
    category: "umrah",
    title: {
      ID: "Kapan data Traveler harus dilengkapi?",
      EN: "When must Traveler information be completed?",
      AR: "متى يجب استكمال بيانات المسافر؟",
    },
    summary: {
      ID: "Ketahui kapan data perjalanan dan paspor perlu diselesaikan.",
      EN: "Know when travel and passport information must be completed.",
      AR: "اعرف موعد استكمال بيانات السفر وجواز السفر.",
    },
    content: {
      ID: [
        "Data Traveler mengikuti ketentuan paket dan batas waktu yang ditetapkan untuk keberangkatan terkait.",
        "Pastikan nama Traveler sesuai paspor serta periksa tanggal lahir, kewarganegaraan, nomor paspor, tanggal penerbitan, dan tanggal kedaluwarsa sebelum mengirim data.",
        "Informasi batas waktu pengisian akan ditampilkan pada pesanan jika diwajibkan oleh produk yang dibeli.",
      ],
      EN: [
        "Traveler information follows the package requirements and the deadline configured for the relevant departure.",
        "Make sure each Traveler's name matches the passport and verify date of birth, nationality, passport number, issue date, and expiry date before submission.",
        "The completion deadline will be shown on the order when required by the purchased product.",
      ],
      AR: [
        "تخضع بيانات المسافر لمتطلبات الباقة والموعد النهائي المحدد للرحلة المعنية.",
        "تأكد من مطابقة اسم كل مسافر لجواز السفر، وراجع تاريخ الميلاد والجنسية ورقم الجواز وتاريخ الإصدار وتاريخ الانتهاء قبل الإرسال.",
        "سيظهر الموعد النهائي لاستكمال البيانات في الطلب عندما يكون ذلك مطلوباً للمنتج الذي تم شراؤه.",
      ],
    },
  },

  {
    id: "haji-tahun-keberangkatan",
    category: "haji",
    title: {
      ID: "Bagaimana memilih tahun keberangkatan Haji?",
      EN: "How do I select a Hajj departure year?",
      AR: "كيف أختار سنة رحلة الحج؟",
    },
    summary: {
      ID: "Pilih tahun perjalanan berdasarkan periode yang tersedia.",
      EN: "Choose a travel year based on available periods.",
      AR: "اختر سنة السفر وفق الفترات المتاحة.",
    },
    content: {
      ID: [
        "Pada pencarian Haji, pilih kota keberangkatan, tujuan, jumlah Traveler, dan tahun perjalanan.",
        "Tahun yang sudah tidak tersedia tidak dapat digunakan untuk pencarian baru.",
        "Ketersediaan produk tetap mengikuti paket dan periode yang diterbitkan oleh Travel di Segaloka.",
      ],
      EN: [
        "For Hajj search, select the departure city, destination, number of Travelers, and travel year.",
        "Years that are no longer available cannot be selected for a new search.",
        "Product availability continues to follow packages and periods published by Travel providers on Segaloka.",
      ],
      AR: [
        "عند البحث عن الحج، اختر مدينة المغادرة والوجهة وعدد المسافرين وسنة السفر.",
        "لا يمكن اختيار السنوات التي لم تعد متاحة لعملية بحث جديدة.",
        "يبقى توفر المنتجات وفق الباقات والفترات التي تنشرها شركات السفر على سيجالوكا.",
      ],
    },
  },

  {
    id: "halal-tour-fasilitas",
    category: "halal",
    title: {
      ID: "Apa saja yang perlu diperiksa pada paket Halal Tour?",
      EN: "What should I check in a Halal Tour package?",
      AR: "ما الذي يجب مراجعته في باقة السياحة الحلال؟",
    },
    summary: {
      ID: "Periksa fasilitas dan ketentuan sebelum memilih perjalanan.",
      EN: "Review facilities and terms before choosing a trip.",
      AR: "راجع المرافق والشروط قبل اختيار الرحلة.",
    },
    content: {
      ID: [
        "Periksa destinasi, tanggal keberangkatan, durasi, akomodasi, transportasi, makanan, aktivitas, serta fasilitas yang termasuk dan tidak termasuk.",
        "Informasi layanan Muslim-friendly mengikuti detail paket yang diterbitkan oleh Travel.",
        "Gunakan halaman detail paket sebagai referensi utama sebelum melanjutkan pemesanan.",
      ],
      EN: [
        "Review the destination, departure date, duration, accommodation, transportation, meals, activities, and included or excluded facilities.",
        "Muslim-friendly service information follows the package details published by the Travel provider.",
        "Use the package detail page as the primary reference before continuing to booking.",
      ],
      AR: [
        "راجع الوجهة وتاريخ المغادرة والمدة والإقامة والنقل والوجبات والأنشطة والخدمات المشمولة وغير المشمولة.",
        "تعتمد معلومات الخدمات المناسبة للمسلمين على تفاصيل الباقة التي تنشرها شركة السفر.",
        "استخدم صفحة تفاصيل الباقة كمرجع أساسي قبل متابعة الحجز.",
      ],
    },
  },

  {
    id: "domestic-detail-paket",
    category: "domestic",
    title: {
      ID: "Apa yang perlu diperiksa sebelum memesan Tour Domestic?",
      EN: "What should I check before booking a Domestic Tour?",
      AR: "ما الذي يجب مراجعته قبل حجز جولة محلية؟",
    },
    summary: {
      ID: "Periksa detail perjalanan domestik sebelum membuat pesanan.",
      EN: "Review domestic trip details before placing an order.",
      AR: "راجع تفاصيل الرحلة المحلية قبل إنشاء الطلب.",
    },
    content: {
      ID: [
        "Periksa kota keberangkatan, destinasi, tanggal perjalanan, durasi, fasilitas, harga, dan ketentuan paket.",
        "Pastikan jumlah Traveler yang dipilih sesuai dengan peserta yang akan berangkat.",
        "Ketentuan perubahan atau pembatalan dapat berbeda pada setiap paket.",
      ],
      EN: [
        "Review the departure city, destination, travel date, duration, facilities, price, and package terms.",
        "Make sure the selected number of Travelers matches the participants who will travel.",
        "Change or cancellation terms may vary between packages.",
      ],
      AR: [
        "راجع مدينة المغادرة والوجهة وتاريخ السفر والمدة والمرافق والسعر وشروط الباقة.",
        "تأكد من أن عدد المسافرين المختار يطابق عدد المشاركين في الرحلة.",
        "قد تختلف شروط التغيير أو الإلغاء بين الباقات.",
      ],
    },
  },

  {
    id: "international-dokumen",
    category: "international",
    title: {
      ID: "Dokumen apa yang perlu diperhatikan untuk Tour International?",
      EN: "What documents should I check for an International Tour?",
      AR: "ما الوثائق التي يجب مراجعتها للجولة الدولية؟",
    },
    summary: {
      ID: "Periksa persyaratan perjalanan sesuai paket dan destinasi.",
      EN: "Review travel requirements for the package and destination.",
      AR: "راجع متطلبات السفر حسب الباقة والوجهة.",
    },
    content: {
      ID: [
        "Persyaratan dokumen perjalanan dapat berbeda berdasarkan destinasi, paket, dan ketentuan perjalanan yang berlaku.",
        "Periksa informasi paspor, visa jika termasuk atau diperlukan, serta persyaratan lain yang dicantumkan pada detail paket.",
        "Pastikan data Traveler sesuai dengan dokumen perjalanan yang digunakan.",
      ],
      EN: [
        "Travel document requirements may vary depending on the destination, package, and applicable travel requirements.",
        "Review passport information, visa requirements when included or required, and other requirements stated in the package details.",
        "Make sure Traveler information matches the travel documents being used.",
      ],
      AR: [
        "قد تختلف متطلبات وثائق السفر حسب الوجهة والباقة ومتطلبات السفر المعمول بها.",
        "راجع معلومات جواز السفر ومتطلبات التأشيرة إذا كانت مشمولة أو مطلوبة وأي متطلبات أخرى مذكورة في تفاصيل الباقة.",
        "تأكد من مطابقة بيانات المسافر لوثائق السفر المستخدمة.",
      ],
    },
  },

  {
    id: "segadeals-cara-kerja",
    category: "segadeals",
    title: {
      ID: "Bagaimana SegaDeals bekerja?",
      EN: "How does SegaDeals work?",
      AR: "كيف تعمل SegaDeals؟",
    },
    summary: {
      ID: "Kirim kebutuhan perjalanan Anda, terima penawaran dari Travel, lalu pilih yang paling sesuai.",
      EN: "Send your travel requirements, receive offers from Travel providers, then choose the best match.",
      AR: "أرسل متطلبات رحلتك واستقبل عروضًا من شركات السفر ثم اختر العرض الأنسب.",
    },
    content: {
      ID: [
        "SegaDeals adalah fitur request perjalanan yang membantu Traveler mendapatkan penawaran dari Travel berdasarkan kebutuhan dan budget.",
        "Traveler menentukan jenis perjalanan atau tujuan, tanggal atau bulan keberangkatan, jumlah pax, serta budget yang disiapkan.",
        "Setelah request dikirim, sistem meneruskan kebutuhan tersebut kepada Travel yang relevan, menyediakan jenis perjalanan yang dipilih, dan mengaktifkan fitur SegaDeals.",
        "Travel dapat merespons request dengan penawaran. Setiap penawaran dapat memiliki harga, jadwal, fasilitas, layanan, dan ketentuan yang berbeda.",
        "Traveler dapat melihat dan membandingkan penawaran yang diterima sebelum menentukan pilihan.",
        "Request SegaDeals belum merupakan pesanan. Proses pemesanan dimulai setelah Traveler memilih penawaran yang sesuai dan melanjutkan transaksi.",
      ],
      EN: [
        "SegaDeals is a travel request feature that helps Travelers receive offers from Travel providers based on their requirements and budget.",
        "The Traveler specifies the travel type or destination, departure date or month, passenger count, and preferred budget.",
        "After the request is submitted, the system distributes it to relevant Travel providers that offer the selected travel type and have SegaDeals enabled.",
        "Travel providers can respond with offers. Each offer may have different prices, schedules, facilities, services, and terms.",
        "The Traveler can review and compare the received offers before making a selection.",
        "A SegaDeals request is not yet an order. The booking process starts after the Traveler selects a suitable offer and continues the transaction.",
      ],
      AR: [
        "SegaDeals هي ميزة لطلب عروض السفر تساعد المسافر على تلقي عروض من شركات السفر بناءً على احتياجاته وميزانيته.",
        "يحدد المسافر نوع الرحلة أو الوجهة وتاريخ أو شهر المغادرة وعدد المسافرين والميزانية المطلوبة.",
        "بعد إرسال الطلب، يوزعه النظام على شركات السفر المناسبة التي تقدم نوع الرحلة المختار وفعّلت ميزة SegaDeals.",
        "يمكن لشركات السفر الرد بعروض مختلفة في السعر والجدول والمرافق والخدمات والشروط.",
        "يمكن للمسافر عرض العروض المستلمة ومقارنتها قبل تحديد اختياره.",
        "طلب SegaDeals ليس حجزًا بعد. تبدأ عملية الحجز بعد اختيار المسافر للعرض المناسب ومتابعة المعاملة.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Buat request perjalanan",
          EN: "Create a travel request",
          AR: "أنشئ طلب سفر",
        },
        description: {
          ID: "Pilih jenis perjalanan atau tujuan yang Anda butuhkan.",
          EN: "Choose the travel type or destination you need.",
          AR: "اختر نوع الرحلة أو الوجهة التي تحتاج إليها.",
        },
        image: "/images/help-center/segadeals/buat-request.webp",
        imageAlt: {
          ID: "Form membuat request SegaDeals",
          EN: "SegaDeals travel request form",
          AR: "نموذج إنشاء طلب SegaDeals",
        },
      },
      {
        title: {
          ID: "Isi kebutuhan dan budget",
          EN: "Enter your requirements and budget",
          AR: "أدخل احتياجاتك وميزانيتك",
        },
        description: {
          ID: "Tentukan tanggal atau bulan keberangkatan, jumlah pax, dan budget yang Anda siapkan.",
          EN: "Set the departure date or month, passenger count, and preferred budget.",
          AR: "حدد تاريخ أو شهر المغادرة وعدد المسافرين والميزانية المطلوبة.",
        },
        image: "/images/help-center/segadeals/isi-kebutuhan-budget.webp",
        imageAlt: {
          ID: "Form kebutuhan, jumlah pax, dan budget SegaDeals",
          EN: "SegaDeals requirements, passenger count, and budget form",
          AR: "نموذج متطلبات SegaDeals وعدد المسافرين والميزانية",
        },
      },
      {
        title: {
          ID: "Kirim request",
          EN: "Submit the request",
          AR: "أرسل الطلب",
        },
        description: {
          ID: "Setelah dikirim, request diteruskan kepada Travel yang relevan dan mengaktifkan SegaDeals.",
          EN: "Once submitted, the request is distributed to relevant Travel providers with SegaDeals enabled.",
          AR: "بعد الإرسال، يتم توجيه الطلب إلى شركات السفر المناسبة التي فعّلت SegaDeals.",
        },
        image: "/images/help-center/segadeals/request-terkirim.webp",
        imageAlt: {
          ID: "Konfirmasi request SegaDeals berhasil dikirim",
          EN: "SegaDeals request submitted confirmation",
          AR: "تأكيد إرسال طلب SegaDeals",
        },
      },
      {
        title: {
          ID: "Terima penawaran dari Travel",
          EN: "Receive offers from Travel providers",
          AR: "استقبل عروض شركات السفر",
        },
        description: {
          ID: "Travel yang sesuai dapat merespons kebutuhan Anda dengan penawaran perjalanan.",
          EN: "Matching Travel providers can respond to your requirements with travel offers.",
          AR: "يمكن لشركات السفر المناسبة الرد على احتياجاتك بعروض سفر.",
        },
        image: "/images/help-center/segadeals/daftar-penawaran.webp",
        imageAlt: {
          ID: "Daftar penawaran Travel pada SegaDeals",
          EN: "Travel provider offers in SegaDeals",
          AR: "قائمة عروض شركات السفر في SegaDeals",
        },
      },
      {
        title: {
          ID: "Bandingkan penawaran",
          EN: "Compare the offers",
          AR: "قارن العروض",
        },
        description: {
          ID: "Periksa harga, jadwal, fasilitas, layanan, dan ketentuan setiap penawaran.",
          EN: "Review the price, schedule, facilities, services, and terms of each offer.",
          AR: "راجع السعر والجدول والمرافق والخدمات وشروط كل عرض.",
        },
        image: "/images/help-center/segadeals/detail-penawaran.webp",
        imageAlt: {
          ID: "Detail dan perbandingan penawaran SegaDeals",
          EN: "SegaDeals offer details and comparison",
          AR: "تفاصيل ومقارنة عروض SegaDeals",
        },
      },
      {
        title: {
          ID: "Pilih penawaran yang sesuai",
          EN: "Choose the right offer",
          AR: "اختر العرض المناسب",
        },
        description: {
          ID: "Pilih penawaran yang paling sesuai dengan kebutuhan dan budget, lalu lanjutkan proses pemesanan.",
          EN: "Select the offer that best matches your requirements and budget, then continue to booking.",
          AR: "اختر العرض الأنسب لاحتياجاتك وميزانيتك ثم تابع عملية الحجز.",
        },
        image: "/images/help-center/segadeals/pilih-penawaran.webp",
        imageAlt: {
          ID: "Memilih penawaran SegaDeals",
          EN: "Selecting a SegaDeals offer",
          AR: "اختيار عرض SegaDeals",
        },
      },
    ],
  },

  {
    id: "account-ubah-profil",
    category: "account",
    title: {
      ID: "Bagaimana mengelola profil akun?",
      EN: "How do I manage my account profile?",
      AR: "كيف أدير الملف الشخصي لحسابي؟",
    },
    summary: {
      ID: "Kelola informasi akun dan data profil Segaloka.",
      EN: "Manage your Segaloka account and profile information.",
      AR: "أدر معلومات حسابك وملفك الشخصي في سيجالوكا.",
    },
    content: {
      ID: [
        "Informasi profil digunakan untuk membantu pengelolaan akun dan transaksi pada Segaloka.",
        "Pastikan informasi kontak yang digunakan tetap aktif agar informasi penting terkait akun dan pesanan dapat diterima.",
        "Data Traveler untuk perjalanan dapat memiliki informasi yang berbeda dari data pemilik akun dan harus diisi sesuai dokumen perjalanan.",
      ],
      EN: [
        "Profile information helps manage your account and transactions on Segaloka.",
        "Keep your contact information active so important account and order information can be received.",
        "Traveler information may differ from the account owner's information and must match the relevant travel documents.",
      ],
      AR: [
        "تُستخدم معلومات الملف الشخصي للمساعدة في إدارة الحساب والمعاملات على سيجالوكا.",
        "حافظ على تحديث معلومات الاتصال حتى تتمكن من استلام المعلومات المهمة المتعلقة بالحساب والطلبات.",
        "قد تختلف بيانات المسافر عن بيانات صاحب الحساب ويجب أن تطابق وثائق السفر ذات الصلة.",
      ],
    },
  },

  {
    id: "booking-alur-pemesanan",
    category: "booking",
    title: {
      ID: "Cara Memesan di Segaloka",
      EN: "How to Book on Segaloka",
      AR: "كيفية الحجز في سيجالوكا",
    },
    summary: {
      ID: "Panduan lengkap mencari produk perjalanan, memilih paket, mengisi data, melakukan pembayaran, hingga pesanan berhasil.",
      EN: "A complete guide to finding travel products, choosing a package, entering your details, making payment, and completing your booking.",
      AR: "دليل كامل للبحث عن منتجات السفر واختيار الباقة وإدخال البيانات وإجراء الدفع حتى اكتمال الحجز.",
    },
    content: {
      ID: [
        "Pemesanan di Segaloka dirancang agar seluruh proses perjalanan dapat dilakukan dalam satu alur yang jelas.",
        "Ikuti langkah berikut dari pencarian produk sampai pesanan berhasil. Informasi yang tersedia dapat berbeda sesuai jenis produk, Travel, Vendor, jadwal, dan ketentuan layanan yang Anda pilih.",
      ],
      EN: [
        "Booking on Segaloka is designed so the travel process can be completed through one clear flow.",
        "Follow the steps below from product search until your booking is completed. Available information may vary depending on the product, Travel, Vendor, schedule, and service terms you select.",
      ],
      AR: [
        "تم تصميم الحجز في سيجالوكا بحيث يمكن إكمال إجراءات السفر ضمن مسار واحد واضح.",
        "اتبع الخطوات التالية من البحث عن المنتج حتى اكتمال الحجز. قد تختلف المعلومات المتاحة حسب المنتج وشركة السفر أو المورّد والجدول وشروط الخدمة التي تختارها.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Cari produk perjalanan",
          EN: "Search for a travel product",
          AR: "ابحث عن منتج السفر",
        },
        description: {
          ID: "Pilih layanan yang Anda butuhkan seperti Umrah, Haji, Halal Tour, Tour Domestic, Tour International, SegaDeals, atau Akomodasi & Land Arrangement. Isi asal, tujuan, traveler, dan jadwal jika tersedia, lalu mulai pencarian.",
          EN: "Choose the service you need such as Umrah, Hajj, Halal Tour, Domestic Tour, International Tour, SegaDeals, or Accommodation & Land Arrangement. Enter the origin, destination, travelers, and schedule when available, then start searching.",
          AR: "اختر الخدمة التي تحتاجها مثل العمرة أو الحج أو الجولات الحلال أو الجولات المحلية أو الدولية أو SegaDeals أو الإقامة والترتيبات الأرضية. أدخل نقطة الانطلاق والوجهة والمسافرين والموعد عند توفره ثم ابدأ البحث.",
        },
        image: "/images/help-center/booking/cara-pesan-01-cari-produk.webp",
        imageAlt: {
          ID: "Tampilan pencarian produk perjalanan Segaloka",
          EN: "Segaloka travel product search screen",
          AR: "شاشة البحث عن منتجات السفر في سيجالوكا",
        },
      },
      {
        title: {
          ID: "Pilih paket yang sesuai",
          EN: "Choose the right package",
          AR: "اختر الباقة المناسبة",
        },
        description: {
          ID: "Bandingkan paket berdasarkan harga, penyedia, fasilitas, durasi, jadwal, rating, serta informasi lain yang tersedia. Buka detail paket sebelum melanjutkan.",
          EN: "Compare packages by price, provider, facilities, duration, schedule, rating, and other available information. Open the package details before continuing.",
          AR: "قارن الباقات حسب السعر والمزوّد والمرافق والمدة والجدول والتقييم والمعلومات الأخرى المتاحة. افتح تفاصيل الباقة قبل المتابعة.",
        },
        image: "/images/help-center/booking/cara-pesan-02-pilih-paket.webp",
        imageAlt: {
          ID: "Daftar paket perjalanan di Segaloka",
          EN: "Travel package list on Segaloka",
          AR: "قائمة باقات السفر في سيجالوكا",
        },
      },
      {
        title: {
          ID: "Pilih jadwal keberangkatan",
          EN: "Select your departure schedule",
          AR: "اختر موعد المغادرة",
        },
        description: {
          ID: "Pilih periode atau tanggal keberangkatan yang masih tersedia. Untuk produk dengan jadwal tetap, gunakan periode yang disediakan oleh Travel atau Vendor.",
          EN: "Select an available departure period or date. For fixed-schedule products, choose one of the periods provided by the Travel or Vendor.",
          AR: "اختر فترة أو تاريخ مغادرة متاحاً. بالنسبة للمنتجات ذات المواعيد الثابتة، اختر إحدى الفترات التي توفرها شركة السفر أو المورّد.",
        },
        image: "/images/help-center/booking/cara-pesan-03-pilih-jadwal.webp",
        imageAlt: {
          ID: "Pemilihan jadwal keberangkatan Segaloka",
          EN: "Segaloka departure schedule selection",
          AR: "اختيار موعد المغادرة في سيجالوكا",
        },
      },
      {
        title: {
          ID: "Tentukan jumlah traveler",
          EN: "Set the number of travelers",
          AR: "حدد عدد المسافرين",
        },
        description: {
          ID: "Masukkan jumlah traveler sesuai kategori yang tersedia pada produk. Untuk produk berbasis kamar, pilih tipe kamar dan jumlah kamar sesuai kebutuhan.",
          EN: "Enter the number of travelers according to the categories available for the product. For room-based products, select the room type and number of rooms you need.",
          AR: "أدخل عدد المسافرين وفق الفئات المتاحة للمنتج. وبالنسبة للمنتجات المرتبطة بالغرف، اختر نوع الغرفة وعدد الغرف المطلوبة.",
        },
        image: "/images/help-center/booking/cara-pesan-04-pilih-traveler.webp",
        imageAlt: {
          ID: "Pengaturan jumlah traveler Segaloka",
          EN: "Segaloka traveler quantity selection",
          AR: "تحديد عدد المسافرين في سيجالوكا",
        },
      },
      {
        title: {
          ID: "Isi data pemesan",
          EN: "Enter the booker's details",
          AR: "أدخل بيانات صاحب الحجز",
        },
        description: {
          ID: "Lengkapi data pemesan yang diminta. Pastikan nama, nomor kontak, email, dan informasi lain yang dimasukkan benar agar informasi transaksi dapat diterima dengan baik.",
          EN: "Complete the required booker information. Make sure the name, contact number, email, and other details are correct so transaction information can be delivered properly.",
          AR: "أكمل بيانات صاحب الحجز المطلوبة. تأكد من صحة الاسم ورقم الاتصال والبريد الإلكتروني والمعلومات الأخرى حتى تصلك معلومات المعاملة بشكل صحيح.",
        },
        image: "/images/help-center/booking/cara-pesan-05-data-pemesan.webp",
        imageAlt: {
          ID: "Form data pemesan Segaloka",
          EN: "Segaloka booker information form",
          AR: "نموذج بيانات صاحب الحجز في سيجالوكا",
        },
      },
      {
        title: {
          ID: "Periksa kembali pesanan",
          EN: "Review your booking",
          AR: "راجع الحجز",
        },
        description: {
          ID: "Periksa produk, jadwal, traveler, tipe kamar jika ada, fasilitas, harga, dan total pembayaran. Pastikan seluruh informasi sesuai sebelum melanjutkan ke pembayaran.",
          EN: "Review the product, schedule, travelers, room type when applicable, facilities, price, and total payment. Make sure everything is correct before proceeding to payment.",
          AR: "راجع المنتج والموعد والمسافرين ونوع الغرفة إن وجد والمرافق والسعر وإجمالي الدفع. تأكد من صحة جميع المعلومات قبل الانتقال إلى الدفع.",
        },
        image: "/images/help-center/booking/cara-pesan-06-review-pesanan.webp",
        imageAlt: {
          ID: "Halaman review pesanan Segaloka",
          EN: "Segaloka booking review screen",
          AR: "شاشة مراجعة الحجز في سيجالوكا",
        },
      },
      {
        title: {
          ID: "Lakukan pembayaran",
          EN: "Make your payment",
          AR: "قم بالدفع",
        },
        description: {
          ID: "Pilih metode dan skema pembayaran yang tersedia pada transaksi. Jumlah yang harus dibayar, batas waktu pembayaran, serta status pembayaran akan mengikuti ketentuan produk dan transaksi Anda.",
          EN: "Choose an available payment method and payment scheme. The amount due, payment deadline, and payment status will follow the terms of your selected product and transaction.",
          AR: "اختر طريقة ونظام الدفع المتاحين للمعاملة. يتبع المبلغ المستحق وموعد الدفع وحالة الدفع شروط المنتج والمعاملة التي اخترتها.",
        },
        image: "/images/help-center/booking/cara-pesan-07-pembayaran.webp",
        imageAlt: {
          ID: "Halaman pembayaran Segaloka",
          EN: "Segaloka payment screen",
          AR: "شاشة الدفع في سيجالوكا",
        },
      },
      {
        title: {
          ID: "Pesanan berhasil",
          EN: "Booking completed",
          AR: "اكتمل الحجز",
        },
        description: {
          ID: "Setelah proses transaksi berhasil sesuai status pembayaran, pesanan dapat dilihat kembali melalui menu Pesanan. Simpan nomor pesanan dan periksa informasi lanjutan yang tersedia untuk perjalanan Anda.",
          EN: "After the transaction is successfully processed according to its payment status, you can review it from the Orders menu. Keep your booking number and check any follow-up information available for your trip.",
          AR: "بعد نجاح معالجة المعاملة وفق حالة الدفع، يمكنك مراجعة الحجز من قائمة الطلبات. احتفظ برقم الحجز وتحقق من أي معلومات لاحقة متاحة لرحلتك.",
        },
        image: "/images/help-center/booking/cara-pesan-08-pesanan-berhasil.webp",
        imageAlt: {
          ID: "Konfirmasi pesanan berhasil Segaloka",
          EN: "Segaloka successful booking confirmation",
          AR: "تأكيد نجاح الحجز في سيجالوكا",
        },
      },
    ],
  },

  {
    id: "booking-invoice",
    category: "booking",
    title: {
      ID: "Di mana saya melihat invoice pesanan?",
      EN: "Where can I view my order invoice?",
      AR: "أين يمكنني عرض فاتورة الطلب؟",
    },
    summary: {
      ID: "Lihat invoice dan informasi transaksi langsung dari detail pesanan.",
      EN: "View your invoice and transaction information directly from the order details.",
      AR: "اعرض الفاتورة ومعلومات المعاملة مباشرة من تفاصيل الطلب.",
    },
    content: {
      ID: [
        "Invoice merupakan bagian dari informasi transaksi pesanan Segaloka.",
        "Buka Pesanan, pilih transaksi yang ingin diperiksa, lalu buka bagian invoice atau informasi pembayaran yang tersedia pada pesanan tersebut.",
        "Periksa kode pesanan, produk atau layanan, nama pemesan, rincian nominal, dan status pembayaran agar sesuai dengan transaksi Anda.",
        "Jika pembayaran masih diproses atau belum terkonfirmasi, informasi pada invoice dapat mengikuti status transaksi yang sedang berjalan.",
      ],
      EN: [
        "The invoice is part of your Segaloka order transaction information.",
        "Open Orders, select the transaction you want to review, then open the invoice or payment information available for that order.",
        "Check the booking code, product or service, buyer name, amount details, and payment status to ensure they match your transaction.",
        "If payment is still being processed or has not been confirmed, the invoice information may follow the current transaction status.",
      ],
      AR: [
        "تعد الفاتورة جزءًا من معلومات معاملة الطلب في سيجالوكا.",
        "افتح الطلبات، واختر المعاملة التي تريد مراجعتها، ثم افتح الفاتورة أو معلومات الدفع المتاحة لذلك الطلب.",
        "تحقق من رمز الحجز والمنتج أو الخدمة واسم صاحب الطلب وتفاصيل المبلغ وحالة الدفع للتأكد من مطابقتها للمعاملة.",
        "إذا كان الدفع لا يزال قيد المعالجة أو لم يتم تأكيده بعد، فقد تتبع معلومات الفاتورة حالة المعاملة الحالية.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Buka detail pesanan",
          EN: "Open the order details",
          AR: "افتح تفاصيل الطلب",
        },
        description: {
          ID: "Pilih pesanan yang ingin Anda periksa dari halaman Pesanan.",
          EN: "Select the order you want to review from the Orders page.",
          AR: "اختر الطلب الذي تريد مراجعته من صفحة الطلبات.",
        },
        image: "/images/help-center/booking/lihat-invoice.webp",
        imageAlt: {
          ID: "Tampilan invoice pesanan Segaloka",
          EN: "Segaloka order invoice screen",
          AR: "شاشة فاتورة الطلب في سيجالوكا",
        },
      },
    ],
  },
  {
    id: "booking-status-pesanan",
    category: "booking",
    title: {
      ID: "Cara melihat status pesanan",
      EN: "How to view your order status",
      AR: "كيفية عرض حالة الطلب",
    },
    summary: {
      ID: "Pantau perkembangan pesanan dari halaman Pesanan Segaloka.",
      EN: "Track the progress of your order from the Segaloka Orders page.",
      AR: "تابع تقدم طلبك من صفحة الطلبات في سيجالوكا.",
    },
    content: {
      ID: [
        "Status pesanan membantu Anda mengetahui tahap transaksi dan proses layanan yang sedang berjalan.",
        "Buka menu Pesanan, pilih transaksi yang ingin diperiksa, lalu lihat status utama dan informasi terbaru pada detail pesanan.",
        "Status yang ditampilkan dapat berbeda sesuai jenis produk, tahap pembayaran, dan proses operasional layanan.",
        "Jika terdapat tindakan yang perlu Anda selesaikan, ikuti petunjuk yang muncul pada detail pesanan.",
      ],
      EN: [
        "Order status helps you understand the current transaction and service stage.",
        "Open Orders, select the transaction you want to review, then check the main status and latest information in the order details.",
        "The displayed status may vary depending on the product type, payment stage, and operational service process.",
        "If an action is required from you, follow the instructions shown in the order details.",
      ],
      AR: [
        "تساعدك حالة الطلب على معرفة مرحلة المعاملة والخدمة الحالية.",
        "افتح الطلبات، واختر المعاملة التي تريد مراجعتها، ثم تحقق من الحالة الرئيسية وأحدث المعلومات في تفاصيل الطلب.",
        "قد تختلف الحالة المعروضة حسب نوع المنتج ومرحلة الدفع والإجراءات التشغيلية للخدمة.",
        "إذا كان هناك إجراء مطلوب منك، فاتبع التعليمات الظاهرة في تفاصيل الطلب.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Buka Pesanan",
          EN: "Open Orders",
          AR: "افتح الطلبات",
        },
        description: {
          ID: "Pilih pesanan untuk melihat status transaksi dan perkembangan layanan.",
          EN: "Select an order to view its transaction status and service progress.",
          AR: "اختر طلبًا لعرض حالة المعاملة وتقدم الخدمة.",
        },
        image: "/images/help-center/booking/lihat-status-pesanan.webp",
        imageAlt: {
          ID: "Tampilan status pesanan Segaloka",
          EN: "Segaloka order status screen",
          AR: "شاشة حالة الطلب في سيجالوكا",
        },
      },
    ],
  },

  {
    id: "booking-data-pemesan-traveler",
    category: "booking",
    title: {
      ID: "Data Pemesan dan Traveler",
      EN: "Buyer and Traveler Information",
      AR: "بيانات صاحب الطلب والمسافر",
    },
    summary: {
      ID: "Pahami perbedaan data pemesan dan data Traveler pada proses pemesanan.",
      EN: "Understand the difference between buyer and Traveler information during booking.",
      AR: "تعرف على الفرق بين بيانات صاحب الطلب وبيانات المسافر أثناء الحجز.",
    },
    content: {
      ID: [
        "Data Pemesan adalah informasi pihak yang membuat atau bertanggung jawab atas pesanan.",
        "Data Traveler adalah informasi orang yang menggunakan layanan perjalanan. Satu pemesan dapat membuat pesanan untuk dirinya sendiri maupun Traveler lain sesuai ketentuan produk.",
        "Informasi Traveler yang diminta mengikuti jenis layanan. Beberapa produk dapat meminta identitas atau dokumen perjalanan tambahan pada tahap setelah pemesanan.",
        "Pastikan nama dan data Traveler sesuai dokumen perjalanan yang akan digunakan.",
      ],
      EN: [
        "Buyer Information identifies the person creating or responsible for the order.",
        "Traveler Information identifies the people using the travel service. A buyer may book for themselves or other Travelers according to the product terms.",
        "Required Traveler information depends on the service type. Some products may request additional identity or travel documents after booking.",
        "Make sure each Traveler's name and information match the travel documents that will be used.",
      ],
      AR: [
        "بيانات صاحب الطلب هي معلومات الشخص الذي ينشئ الطلب أو يتحمل مسؤوليته.",
        "بيانات المسافر هي معلومات الأشخاص الذين سيستخدمون خدمة السفر. ويمكن لصاحب الطلب الحجز لنفسه أو لمسافرين آخرين وفق شروط المنتج.",
        "تختلف بيانات المسافر المطلوبة حسب نوع الخدمة. وقد تتطلب بعض المنتجات هوية أو وثائق سفر إضافية بعد الحجز.",
        "تأكد من مطابقة اسم وبيانات كل مسافر لوثائق السفر التي سيتم استخدامها.",
      ],
    },
  },

  {
    id: "booking-akomodasi-la",
    category: "booking",
    title: {
      ID: "Cara pemesanan Akomodasi & Land Arrangement",
      EN: "How to book Accommodation & Land Arrangement",
      AR: "كيفية حجز الإقامة والترتيبات الأرضية",
    },
    summary: {
      ID: "Alur pemesanan LA dari periode keberangkatan hingga data Traveler dan paspor.",
      EN: "The LA booking flow from fixed departure period to Traveler and passport information.",
      AR: "مسار حجز الترتيبات الأرضية من فترة المغادرة المحددة حتى بيانات المسافر وجواز السفر.",
    },
    content: {
      ID: [
        "Paket Akomodasi & Land Arrangement dapat menggunakan periode keberangkatan yang telah ditentukan oleh penyedia.",
        "Pada detail paket, pilih periode yang tersedia, tipe kamar, jumlah kamar, dan jumlah Traveler sesuai kebutuhan.",
        "Lanjutkan dengan mengisi Data Pemesan, periksa ringkasan transaksi, lalu selesaikan tahap pembayaran sesuai ketentuan pesanan.",
        "Setelah pesanan dibuat, invoice dan status pesanan dapat dilihat dari detail transaksi.",
        "Data Traveler dan informasi paspor dilengkapi sesuai batas waktu yang ditentukan untuk periode tersebut. Batas waktu dapat ditetapkan H-30 atau H-21 sebelum keberangkatan sesuai konfigurasi produk atau penyedia.",
        "Data perjalanan yang telah tersedia kemudian digunakan dalam proses operasional Paket Info dan persiapan layanan oleh penyedia.",
      ],
      EN: [
        "Accommodation & Land Arrangement packages may use departure periods predefined by the provider.",
        "On the package details page, select an available period, room type, number of rooms, and number of Travelers.",
        "Continue by entering Buyer Information, review the transaction summary, then complete the payment stage according to the order terms.",
        "After the order is created, the invoice and order status can be viewed from the transaction details.",
        "Traveler and passport information must be completed by the deadline set for that departure period. The deadline may be H-30 or H-21 before departure according to the product or provider configuration.",
        "Available travel information is then used for Paket Info and operational service preparation by the provider.",
      ],
      AR: [
        "قد تستخدم باقات الإقامة والترتيبات الأرضية فترات مغادرة محددة مسبقًا من مقدم الخدمة.",
        "في صفحة تفاصيل الباقة، اختر الفترة المتاحة ونوع الغرفة وعدد الغرف وعدد المسافرين.",
        "تابع بإدخال بيانات صاحب الطلب، وراجع ملخص المعاملة، ثم أكمل مرحلة الدفع وفق شروط الطلب.",
        "بعد إنشاء الطلب، يمكن عرض الفاتورة وحالة الطلب من تفاصيل المعاملة.",
        "يجب استكمال بيانات المسافر ومعلومات جواز السفر ضمن المهلة المحددة لفترة المغادرة. وقد تكون المهلة قبل 30 أو 21 يومًا من المغادرة وفق إعدادات المنتج أو مقدم الخدمة.",
        "تستخدم معلومات السفر المتاحة بعد ذلك في Paket Info وفي التحضير التشغيلي للخدمة من قبل مقدم الخدمة.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Isi Data Pemesan",
          EN: "Enter Buyer Information",
          AR: "أدخل بيانات صاحب الطلب",
        },
        description: {
          ID: "Data Pemesan diisi terlebih dahulu untuk membentuk transaksi Akomodasi & LA.",
          EN: "Buyer Information is entered first to create the Accommodation & LA transaction.",
          AR: "يتم إدخال بيانات صاحب الطلب أولًا لإنشاء معاملة الإقامة والترتيبات الأرضية.",
        },
        image: "/images/help-center/akomodasi/isi-data-pemesan.webp",
        imageAlt: {
          ID: "Form Data Pemesan Akomodasi dan Land Arrangement",
          EN: "Accommodation and Land Arrangement buyer information form",
          AR: "نموذج بيانات صاحب طلب الإقامة والترتيبات الأرضية",
        },
      },
      {
        title: {
          ID: "Lengkapi Traveler dan paspor",
          EN: "Complete Traveler and passport information",
          AR: "أكمل بيانات المسافر وجواز السفر",
        },
        description: {
          ID: "Lengkapi data sesuai batas waktu keberangkatan yang ditetapkan pada pesanan.",
          EN: "Complete the information by the departure deadline specified for the order.",
          AR: "أكمل البيانات ضمن مهلة المغادرة المحددة للطلب.",
        },
        image: "/images/help-center/akomodasi/traveler-passport.webp",
        imageAlt: {
          ID: "Data Traveler dan paspor Akomodasi dan Land Arrangement",
          EN: "Accommodation and Land Arrangement Traveler and passport information",
          AR: "بيانات المسافر وجواز السفر للإقامة والترتيبات الأرضية",
        },
      },
    ],
  },

  {
    id: "booking-paket-info-cl",
    category: "booking",
    title: {
      ID: "Paket Info dan Confirmation Letter (CL)",
      EN: "Paket Info and Confirmation Letter (CL)",
      AR: "معلومات الباقة وخطاب التأكيد (CL)",
    },
    summary: {
      ID: "Informasi operasional perjalanan LA dan Confirmation Letter tersedia melalui pesanan.",
      EN: "LA operational travel information and the Confirmation Letter are available through the order.",
      AR: "تتوفر معلومات التشغيل للترتيبات الأرضية وخطاب التأكيد من خلال الطلب.",
    },
    content: {
      ID: [
        "Paket Info merupakan informasi operasional perjalanan yang terhubung dengan pesanan Akomodasi & Land Arrangement.",
        "Informasi dapat mencakup hotel, periode menginap, tipe kamar, reservasi, transport dan transfer, city tour, Masyair, handling, mutawif, serta kontak lokal sesuai layanan yang dibeli.",
        "Sebagian informasi berasal dari data transaksi, sedangkan detail operasional dilengkapi atau diperbarui oleh penyedia sesuai proses persiapan layanan.",
        "Perubahan material pada informasi utama layanan mengikuti proses persetujuan yang berlaku, sedangkan pembaruan operasional dapat tercatat dalam riwayat pembaruan pesanan.",
        "Confirmation Letter (CL) tersedia sesuai proses dan kesiapan operasional penyedia. Periksa detail pesanan untuk melihat status dokumen dan informasi terbaru.",
      ],
      EN: [
        "Paket Info contains operational travel information linked to an Accommodation & Land Arrangement order.",
        "It may include hotels, stay periods, room types, reservations, transport and transfers, city tours, Masyair, handling, mutawif, and local contacts according to the purchased service.",
        "Some information comes from the transaction, while operational details are completed or updated by the provider as service preparation progresses.",
        "Material changes to key service information follow the applicable approval process, while operational updates may be recorded in the order update history.",
        "The Confirmation Letter (CL) becomes available according to the provider's operational process and readiness. Check the order details for the latest document status and information.",
      ],
      AR: [
        "تتضمن Paket Info معلومات السفر التشغيلية المرتبطة بطلب الإقامة والترتيبات الأرضية.",
        "وقد تشمل الفنادق وفترات الإقامة وأنواع الغرف والحجوزات والنقل والتحويلات والجولات داخل المدينة والمشاعر وخدمات الاستقبال والمطوف وجهات الاتصال المحلية وفق الخدمة المشتراة.",
        "تأتي بعض المعلومات من بيانات المعاملة، بينما يستكمل مقدم الخدمة التفاصيل التشغيلية أو يحدثها أثناء تقدم التحضير للخدمة.",
        "تخضع التغييرات الجوهرية في معلومات الخدمة الأساسية لعملية الموافقة المعمول بها، بينما يمكن تسجيل التحديثات التشغيلية في سجل تحديثات الطلب.",
        "يتوفر خطاب التأكيد (CL) وفق العملية التشغيلية وجاهزية مقدم الخدمة. تحقق من تفاصيل الطلب لمعرفة أحدث حالة للمستند والمعلومات.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Periksa Paket Info",
          EN: "Review Paket Info",
          AR: "راجع معلومات الباقة",
        },
        description: {
          ID: "Pantau hotel, transport, layanan operasional, dan pembaruan lainnya dari pesanan.",
          EN: "Track hotels, transport, operational services, and other updates from the order.",
          AR: "تابع الفنادق والنقل والخدمات التشغيلية والتحديثات الأخرى من الطلب.",
        },
        image: "/images/help-center/akomodasi/paket-info.webp",
        imageAlt: {
          ID: "Paket Info Land Arrangement Segaloka",
          EN: "Segaloka Land Arrangement Paket Info",
          AR: "معلومات باقة الترتيبات الأرضية في سيجالوكا",
        },
      },
      {
        title: {
          ID: "Lihat Confirmation Letter",
          EN: "View the Confirmation Letter",
          AR: "اعرض خطاب التأكيد",
        },
        description: {
          ID: "CL ditampilkan sesuai status kesiapan operasional penyedia.",
          EN: "The CL is shown according to the provider's operational readiness status.",
          AR: "يظهر خطاب التأكيد وفق حالة الجاهزية التشغيلية لمقدم الخدمة.",
        },
        image: "/images/help-center/akomodasi/confirmation-letter.webp",
        imageAlt: {
          ID: "Confirmation Letter Land Arrangement Segaloka",
          EN: "Segaloka Land Arrangement Confirmation Letter",
          AR: "خطاب تأكيد الترتيبات الأرضية في سيجالوكا",
        },
      },
    ],
  },

  {
    id: "payment-metode",
    category: "payment",
    title: {
      ID: "Metode Pembayaran di Segaloka",
      EN: "Payment Methods on Segaloka",
      AR: "طرق الدفع في سيجالوكا",
    },
    summary: {
      ID: "Lihat metode pembayaran yang tersedia untuk pesanan Anda.",
      EN: "View the payment methods available for your order.",
      AR: "اطلع على طرق الدفع المتاحة لطلبك.",
    },
    content: {
      ID: [
        "Metode pembayaran yang tersedia ditampilkan pada tahap pembayaran sesuai produk, nilai transaksi, penyedia layanan pembayaran, dan konfigurasi transaksi.",
        "Pilih metode yang tersedia pada halaman pembayaran dan ikuti instruksi yang ditampilkan untuk transaksi tersebut.",
        "Metode yang tersedia dapat berbeda antar pesanan. Jangan mengirim pembayaran ke rekening atau tujuan pembayaran yang tidak ditampilkan pada proses transaksi Segaloka.",
        "Pesanan baru dianggap memiliki pembayaran yang berhasil setelah transaksi memperoleh konfirmasi pembayaran pada sistem. Tampilan atau bukti dari sisi pengguna saja tidak mengubah status transaksi menjadi berhasil.",
      ],
      EN: [
        "Available payment methods are shown during payment according to the product, transaction value, payment service provider, and transaction configuration.",
        "Choose an available method on the payment page and follow the instructions shown for that transaction.",
        "Available methods may differ between orders. Do not send payment to an account or payment destination that is not shown during the Segaloka transaction process.",
        "An order is considered successfully paid only after the transaction receives payment confirmation in the system. A user-side screen or receipt alone does not change the transaction status to successful.",
      ],
      AR: [
        "تظهر طرق الدفع المتاحة أثناء مرحلة الدفع وفق المنتج وقيمة المعاملة ومقدم خدمة الدفع وإعدادات المعاملة.",
        "اختر إحدى الطرق المتاحة في صفحة الدفع واتبع التعليمات المعروضة لتلك المعاملة.",
        "قد تختلف طرق الدفع بين الطلبات. لا ترسل أي دفعة إلى حساب أو وجهة دفع غير معروضة ضمن عملية المعاملة في سيجالوكا.",
        "يُعتبر الطلب مدفوعًا بنجاح فقط بعد استلام تأكيد الدفع في النظام. ولا تكفي شاشة المستخدم أو إيصال من جانبه وحده لتغيير حالة المعاملة إلى ناجحة.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Pilih metode pembayaran",
          EN: "Choose a payment method",
          AR: "اختر طريقة الدفع",
        },
        description: {
          ID: "Pilih salah satu metode yang tersedia pada transaksi Anda.",
          EN: "Choose one of the methods available for your transaction.",
          AR: "اختر إحدى طرق الدفع المتاحة لمعاملتك.",
        },
        image: "/images/help-center/payment/pilih-metode-pembayaran.webp",
        imageAlt: {
          ID: "Pilihan metode pembayaran Segaloka",
          EN: "Segaloka payment method selection",
          AR: "اختيار طريقة الدفع في سيجالوكا",
        },
      },
    ],
  },

  {
    id: "payment-dp-cicilan-lunas",
    category: "payment",
    title: {
      ID: "DP, Cicilan & Pelunasan",
      EN: "Deposit, Installments & Full Payment",
      AR: "الدفعة المقدمة والأقساط والسداد الكامل",
    },
    summary: {
      ID: "Pahami skema pembayaran yang tersedia pada pesanan Anda.",
      EN: "Understand the payment scheme available for your order.",
      AR: "تعرّف على خطة الدفع المتاحة لطلبك.",
    },
    content: {
      ID: [
        "DP adalah pembayaran awal sesuai nominal atau persentase minimum yang ditetapkan pada produk atau transaksi.",
        "Cicilan adalah pembayaran bertahap sesuai tahapan, nominal, persentase, dan jatuh tempo yang berlaku pada pesanan.",
        "Pelunasan adalah pembayaran untuk menyelesaikan sisa tagihan pesanan.",
        "Tidak semua produk menyediakan DP atau cicilan. Skema yang tersedia mengikuti ketentuan produk dan transaksi.",
        "Periksa total tagihan, pembayaran yang sudah dikonfirmasi, sisa tagihan, dan jatuh tempo pada detail pesanan sebelum melakukan pembayaran berikutnya.",
      ],
      EN: [
        "A deposit is an initial payment based on the minimum amount or percentage defined for the product or transaction.",
        "Installments are staged payments based on the applicable stages, amounts, percentages, and due dates for the order.",
        "Full payment settles the remaining balance of the order.",
        "Not every product offers deposits or installments. Available schemes follow the product and transaction terms.",
        "Review the total bill, confirmed payments, remaining balance, and due dates in the order details before making another payment.",
      ],
      AR: [
        "الدفعة المقدمة هي دفعة أولية وفق المبلغ أو النسبة الدنيا المحددة للمنتج أو المعاملة.",
        "الأقساط هي دفعات مرحلية وفق المراحل والمبالغ والنسب ومواعيد الاستحقاق المطبقة على الطلب.",
        "السداد الكامل هو دفع الرصيد المتبقي من الطلب.",
        "لا توفر جميع المنتجات الدفعة المقدمة أو الأقساط. وتعتمد الخطط المتاحة على شروط المنتج والمعاملة.",
        "راجع إجمالي الفاتورة والمدفوعات المؤكدة والرصيد المتبقي ومواعيد الاستحقاق في تفاصيل الطلب قبل إجراء دفعة أخرى.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Pembayaran DP",
          EN: "Deposit payment",
          AR: "دفع الدفعة المقدمة",
        },
        description: {
          ID: "Bayar nominal minimum sesuai ketentuan pesanan.",
          EN: "Pay the minimum amount required by the order terms.",
          AR: "ادفع الحد الأدنى المطلوب وفق شروط الطلب.",
        },
        image: "/images/help-center/payment/pembayaran-dp.webp",
        imageAlt: {
          ID: "Pembayaran DP Segaloka",
          EN: "Segaloka deposit payment",
          AR: "دفع الدفعة المقدمة في سيجالوكا",
        },
      },
      {
        title: {
          ID: "Pembayaran cicilan",
          EN: "Installment payment",
          AR: "دفع القسط",
        },
        description: {
          ID: "Lanjutkan pembayaran sesuai tahapan dan jatuh tempo transaksi.",
          EN: "Continue payments according to the transaction stages and due dates.",
          AR: "تابع الدفع وفق مراحل المعاملة ومواعيد الاستحقاق.",
        },
        image: "/images/help-center/payment/pembayaran-cicilan.webp",
        imageAlt: {
          ID: "Pembayaran cicilan Segaloka",
          EN: "Segaloka installment payment",
          AR: "دفع الأقساط في سيجالوكا",
        },
      },
      {
        title: {
          ID: "Pelunasan",
          EN: "Full payment",
          AR: "السداد الكامل",
        },
        description: {
          ID: "Selesaikan sisa tagihan sesuai nilai yang tercantum pada pesanan.",
          EN: "Settle the remaining balance shown on the order.",
          AR: "سدّد الرصيد المتبقي الظاهر في الطلب.",
        },
        image: "/images/help-center/payment/pembayaran-lunas.webp",
        imageAlt: {
          ID: "Pelunasan pesanan Segaloka",
          EN: "Segaloka order full payment",
          AR: "السداد الكامل لطلب سيجالوكا",
        },
      },
    ],
  },

  {
    id: "payment-status",
    category: "payment",
    title: {
      ID: "Status Pembayaran",
      EN: "Payment Status",
      AR: "حالة الدفع",
    },
    summary: {
      ID: "Pahami kapan pembayaran masih diproses dan kapan sudah dikonfirmasi.",
      EN: "Understand when a payment is still processing and when it has been confirmed.",
      AR: "تعرّف على وقت معالجة الدفع ووقت تأكيده.",
    },
    content: {
      ID: [
        "Status pembayaran mengikuti proses transaksi dan konfirmasi dari metode pembayaran yang digunakan.",
        "Pembayaran yang baru dilakukan dapat membutuhkan waktu sebelum memperoleh status akhir.",
        "Jangan melakukan pembayaran kedua untuk transaksi yang sama hanya karena status belum berubah, kecuali sistem memang meminta transaksi baru.",
        "Gunakan detail pesanan sebagai referensi status. Pesanan hanya boleh dianggap telah dibayar setelah pembayaran dikonfirmasi pada sistem.",
      ],
      EN: [
        "Payment status follows transaction processing and confirmation from the payment method used.",
        "A newly made payment may require time before receiving its final status.",
        "Do not make a second payment for the same transaction only because the status has not changed, unless the system explicitly requires a new transaction.",
        "Use the order details as the status reference. An order should only be considered paid after payment has been confirmed in the system.",
      ],
      AR: [
        "تتبع حالة الدفع معالجة المعاملة والتأكيد من طريقة الدفع المستخدمة.",
        "قد تحتاج الدفعة الجديدة إلى بعض الوقت قبل ظهور حالتها النهائية.",
        "لا تقم بدفعة ثانية للمعاملة نفسها لمجرد أن الحالة لم تتغير إلا إذا طلب النظام إنشاء معاملة جديدة صراحة.",
        "استخدم تفاصيل الطلب كمرجع للحالة. ولا يُعتبر الطلب مدفوعًا إلا بعد تأكيد الدفع في النظام.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Periksa status pembayaran",
          EN: "Check payment status",
          AR: "تحقق من حالة الدفع",
        },
        description: {
          ID: "Lihat status transaksi pada detail pesanan sebelum melakukan tindakan berikutnya.",
          EN: "Review the transaction status in the order details before taking further action.",
          AR: "راجع حالة المعاملة في تفاصيل الطلب قبل اتخاذ أي إجراء آخر.",
        },
        image: "/images/help-center/payment/status-pembayaran.webp",
        imageAlt: {
          ID: "Status pembayaran Segaloka",
          EN: "Segaloka payment status",
          AR: "حالة الدفع في سيجالوكا",
        },
      },
    ],
  },

  {
    id: "payment-invoice",
    category: "payment",
    title: {
      ID: "Invoice & Riwayat Pembayaran",
      EN: "Invoice & Payment History",
      AR: "الفاتورة وسجل المدفوعات",
    },
    summary: {
      ID: "Lihat invoice, pembayaran yang telah dikonfirmasi, dan sisa tagihan pesanan.",
      EN: "View the invoice, confirmed payments, and remaining order balance.",
      AR: "اطلع على الفاتورة والمدفوعات المؤكدة والرصيد المتبقي للطلب.",
    },
    content: {
      ID: [
        "Invoice menampilkan informasi tagihan untuk pesanan sesuai data transaksi yang tercatat.",
        "Jika pesanan menggunakan DP atau cicilan, riwayat pembayaran membantu Anda melihat pembayaran yang telah dikonfirmasi dan sisa tagihan.",
        "Periksa nomor pesanan, rincian transaksi, total tagihan, pembayaran, dan sisa tagihan sebelum melakukan pembayaran lanjutan.",
        "Bukti atau tampilan pembayaran dari sisi pengguna tidak menggantikan status konfirmasi transaksi pada sistem.",
      ],
      EN: [
        "The invoice displays billing information for the order based on the recorded transaction data.",
        "If the order uses a deposit or installments, payment history helps you review confirmed payments and the remaining balance.",
        "Check the order number, transaction details, total bill, payments, and remaining balance before making a further payment.",
        "A user-side payment receipt or screen does not replace the transaction confirmation status in the system.",
      ],
      AR: [
        "تعرض الفاتورة معلومات المبلغ المستحق للطلب وفق بيانات المعاملة المسجلة.",
        "إذا كان الطلب يستخدم دفعة مقدمة أو أقساطًا فإن سجل المدفوعات يساعدك على مراجعة المدفوعات المؤكدة والرصيد المتبقي.",
        "تحقق من رقم الطلب وتفاصيل المعاملة وإجمالي الفاتورة والمدفوعات والرصيد المتبقي قبل إجراء دفعة إضافية.",
        "لا يحل إيصال أو شاشة الدفع من جانب المستخدم محل حالة تأكيد المعاملة في النظام.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Lihat invoice",
          EN: "View invoice",
          AR: "عرض الفاتورة",
        },
        description: {
          ID: "Buka invoice untuk melihat rincian tagihan dan informasi transaksi pesanan.",
          EN: "Open the invoice to review billing details and order transaction information.",
          AR: "افتح الفاتورة لمراجعة تفاصيل المبلغ ومعلومات معاملة الطلب.",
        },
        image: "/images/help-center/payment/invoice.webp",
        imageAlt: {
          ID: "Invoice pembayaran Segaloka",
          EN: "Segaloka payment invoice",
          AR: "فاتورة الدفع في سيجالوكا",
        },
      },
    ],
  },

  {
    id: "payment-gagal-tertunda",
    category: "payment",
    title: {
      ID: "Pembayaran Gagal atau Tertunda",
      EN: "Failed or Pending Payments",
      AR: "المدفوعات الفاشلة أو المعلقة",
    },
    summary: {
      ID: "Langkah yang perlu dilakukan ketika pembayaran belum berhasil atau masih diproses.",
      EN: "What to do when a payment has not succeeded or is still being processed.",
      AR: "ما يجب فعله عندما لا تنجح الدفعة أو لا تزال قيد المعالجة.",
    },
    content: {
      ID: [
        "Jika pembayaran berstatus tertunda atau masih diproses, tunggu pembaruan status transaksi dan periksa kembali detail pesanan.",
        "Jangan mengulangi pembayaran pada transaksi yang sama hanya karena konfirmasi belum muncul.",
        "Jika transaksi dinyatakan gagal dan sistem menyediakan pilihan untuk mencoba kembali, ikuti instruksi pembayaran baru yang ditampilkan.",
        "Apabila dana terlihat terpotong tetapi status belum terkonfirmasi, simpan referensi transaksi dan gunakan kanal bantuan Segaloka apabila status tidak memperoleh pembaruan sesuai informasi transaksi.",
      ],
      EN: [
        "If a payment is pending or still processing, wait for the transaction status update and check the order details again.",
        "Do not repeat payment on the same transaction only because confirmation has not appeared.",
        "If the transaction is marked failed and the system provides an option to retry, follow the new payment instructions shown.",
        "If funds appear to have been deducted but the status remains unconfirmed, keep the transaction reference and use Segaloka support if the status does not update according to the transaction information.",
      ],
      AR: [
        "إذا كانت الدفعة معلقة أو لا تزال قيد المعالجة فانتظر تحديث حالة المعاملة وراجع تفاصيل الطلب مرة أخرى.",
        "لا تكرر الدفع للمعاملة نفسها لمجرد أن التأكيد لم يظهر بعد.",
        "إذا تم تحديد المعاملة كفاشلة وأتاح النظام إعادة المحاولة فاتبع تعليمات الدفع الجديدة المعروضة.",
        "إذا ظهر خصم المبلغ بينما لم يتم تأكيد الحالة فاحتفظ بمرجع المعاملة واستخدم دعم سيجالوكا إذا لم تتحدث الحالة وفق معلومات المعاملة.",
      ],
    },
  },

  {
    id: "payment-keamanan",
    category: "payment",
    title: {
      ID: "Keamanan Pembayaran",
      EN: "Payment Security",
      AR: "أمان الدفع",
    },
    summary: {
      ID: "Kenali informasi pembayaran yang aman saat bertransaksi di Segaloka.",
      EN: "Know how to handle payment information safely when transacting on Segaloka.",
      AR: "تعرّف على كيفية التعامل الآمن مع معلومات الدفع عند استخدام سيجالوكا.",
    },
    content: {
      ID: [
        "Gunakan instruksi pembayaran yang ditampilkan pada transaksi Segaloka dan periksa kembali detail pesanan sebelum membayar.",
        "Jangan membagikan kata sandi, kode OTP, PIN, atau informasi autentikasi pembayaran kepada pihak lain.",
        "Jangan memindahkan pembayaran ke rekening atau tujuan lain hanya berdasarkan pesan yang tidak sesuai dengan informasi pada transaksi.",
        "Jika menemukan instruksi pembayaran yang mencurigakan atau berbeda dari detail pesanan, jangan lanjutkan pembayaran dan gunakan kanal bantuan Segaloka.",
      ],
      EN: [
        "Use the payment instructions shown in the Segaloka transaction and review the order details before paying.",
        "Never share passwords, OTP codes, PINs, or payment authentication information with another party.",
        "Do not redirect payment to another account or destination based only on a message that does not match the transaction information.",
        "If you find suspicious payment instructions or information that differs from the order details, do not continue payment and use Segaloka support.",
      ],
      AR: [
        "استخدم تعليمات الدفع المعروضة في معاملة سيجالوكا وراجع تفاصيل الطلب قبل الدفع.",
        "لا تشارك كلمات المرور أو رموز التحقق لمرة واحدة أو أرقام التعريف الشخصية أو معلومات مصادقة الدفع مع أي طرف آخر.",
        "لا تحول الدفع إلى حساب أو وجهة أخرى اعتمادًا فقط على رسالة لا تتطابق مع معلومات المعاملة.",
        "إذا وجدت تعليمات دفع مشبوهة أو مختلفة عن تفاصيل الطلب فلا تتابع الدفع واستخدم دعم سيجالوكا.",
      ],
    },
  },

  {
    id: "changes-cancel-refund",
    category: "changes",
    title: {
      ID: "Pembatalan & Refund",
      EN: "Cancellation & Refund",
      AR: "الإلغاء والاسترداد",
    },
    summary: {
      ID: "Pelajari cara mengajukan pembatalan dan refund pada pesanan yang memenuhi ketentuan.",
      EN: "Learn how to request cancellation and a refund for an eligible order.",
      AR: "تعرّف على كيفية طلب إلغاء واسترداد الأموال للطلب المؤهل.",
    },
    content: {
      ID: [
        "Pembatalan dan refund diajukan melalui pesanan terkait apabila opsi tersebut tersedia.",
        "Kelayakan pembatalan, komponen yang dapat dikembalikan, potongan atau biaya, tenggat pengajuan, dan nilai refund mengikuti kebijakan yang berlaku pada transaksi Anda.",
        "Mengirim pengajuan tidak berarti pembatalan atau refund otomatis disetujui. Pengajuan akan mengikuti proses review sesuai kebijakan dan pihak yang terkait dengan layanan.",
        "Jangan menganggap refund telah selesai sebelum status pengajuan menunjukkan hasil final dan, apabila disetujui, proses pengembalian dana telah tercatat.",
      ],
      EN: [
        "Cancellation and refund requests are submitted from the relevant order when the option is available.",
        "Cancellation eligibility, refundable components, deductions or fees, submission deadlines, and refund amount follow the policy applicable to your transaction.",
        "Submitting a request does not mean cancellation or refund is automatically approved. The request follows the review process under the applicable policy and parties involved in the service.",
        "Do not consider a refund completed until the request has a final status and, when approved, the refund process has been recorded.",
      ],
      AR: [
        "يتم تقديم طلب الإلغاء والاسترداد من الطلب المعني عندما يكون الخيار متاحًا.",
        "تعتمد أهلية الإلغاء والعناصر القابلة للاسترداد والخصومات أو الرسوم ومهلة التقديم وقيمة الاسترداد على السياسة المطبقة على معاملتك.",
        "لا يعني إرسال الطلب الموافقة التلقائية على الإلغاء أو الاسترداد، بل يخضع الطلب للمراجعة وفق السياسة المعمول بها والأطراف المرتبطة بالخدمة.",
        "لا تعتبر الاسترداد مكتملاً قبل ظهور الحالة النهائية للطلب وتسجيل عملية إعادة الأموال عند الموافقة.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Ajukan pembatalan",
          EN: "Submit a cancellation request",
          AR: "قدّم طلب الإلغاء",
        },
        description: {
          ID: "Buka detail pesanan dan gunakan opsi pembatalan jika tersedia untuk transaksi tersebut.",
          EN: "Open the order details and use the cancellation option when it is available for the transaction.",
          AR: "افتح تفاصيل الطلب واستخدم خيار الإلغاء إذا كان متاحًا للمعاملة.",
        },
        image: "/images/help-center/changes/ajukan-pembatalan.webp",
        imageAlt: {
          ID: "Pengajuan pembatalan pesanan Segaloka",
          EN: "Segaloka order cancellation request",
          AR: "طلب إلغاء الطلب في سيجالوكا",
        },
      },
      {
        title: {
          ID: "Ajukan refund",
          EN: "Submit a refund request",
          AR: "قدّم طلب الاسترداد",
        },
        description: {
          ID: "Periksa rincian kebijakan dan nilai yang ditampilkan sebelum mengirim pengajuan refund.",
          EN: "Review the displayed policy details and amount before submitting the refund request.",
          AR: "راجع تفاصيل السياسة والمبلغ المعروض قبل إرسال طلب الاسترداد.",
        },
        image: "/images/help-center/changes/ajukan-refund.webp",
        imageAlt: {
          ID: "Pengajuan refund Segaloka",
          EN: "Segaloka refund request",
          AR: "طلب الاسترداد في سيجالوكا",
        },
      },
    ],
  },

  {
    id: "changes-status-refund",
    category: "changes",
    title: {
      ID: "Status Refund",
      EN: "Refund Status",
      AR: "حالة الاسترداد",
    },
    summary: {
      ID: "Pantau perkembangan pengajuan refund dari detail pesanan Anda.",
      EN: "Track the progress of your refund request from your order details.",
      AR: "تابع تقدم طلب الاسترداد من تفاصيل طلبك.",
    },
    content: {
      ID: [
        "Status refund menunjukkan tahap pengajuan dan proses pengembalian dana pada transaksi terkait.",
        "Pengajuan dapat berada dalam proses review sebelum memperoleh keputusan final.",
        "Jika refund disetujui, proses pengembalian dana dapat memiliki tahap pemrosesan tersendiri sesuai metode dan jalur pembayaran transaksi.",
        "Gunakan status pada detail pesanan sebagai referensi. Jangan menganggap dana telah dikembalikan hanya berdasarkan persetujuan pengajuan apabila proses pengembalian dana belum selesai.",
      ],
      EN: [
        "Refund status shows the stage of the request and the fund-return process for the relevant transaction.",
        "A request may remain under review before receiving a final decision.",
        "If a refund is approved, returning the funds may have a separate processing stage depending on the transaction's payment method and route.",
        "Use the status in the order details as your reference. Do not consider the funds returned solely because the request was approved if the refund process is not yet complete.",
      ],
      AR: [
        "توضح حالة الاسترداد مرحلة الطلب وعملية إعادة الأموال للمعاملة المعنية.",
        "قد يبقى الطلب قيد المراجعة قبل صدور القرار النهائي.",
        "عند الموافقة على الاسترداد قد تمر إعادة الأموال بمرحلة معالجة منفصلة وفق طريقة ومسار الدفع في المعاملة.",
        "استخدم الحالة في تفاصيل الطلب كمرجع، ولا تعتبر الأموال قد أُعيدت لمجرد الموافقة على الطلب إذا لم تكتمل عملية الاسترداد.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Pantau status refund",
          EN: "Track refund status",
          AR: "تابع حالة الاسترداد",
        },
        description: {
          ID: "Buka detail pesanan untuk melihat status terbaru pengajuan dan proses refund.",
          EN: "Open the order details to view the latest request and refund-processing status.",
          AR: "افتح تفاصيل الطلب للاطلاع على أحدث حالة للطلب ومعالجة الاسترداد.",
        },
        image: "/images/help-center/changes/status-refund.webp",
        imageAlt: {
          ID: "Status refund Segaloka",
          EN: "Segaloka refund status",
          AR: "حالة الاسترداد في سيجالوكا",
        },
      },
    ],
  },

  {
    id: "changes-reschedule",
    category: "changes",
    title: {
      ID: "Reschedule Pesanan",
      EN: "Reschedule an Order",
      AR: "إعادة جدولة الطلب",
    },
    summary: {
      ID: "Ajukan perubahan jadwal apabila pesanan dan kebijakannya memungkinkan reschedule.",
      EN: "Request a schedule change when the order and its policy allow rescheduling.",
      AR: "اطلب تغيير الموعد عندما يسمح الطلب وسياسته بإعادة الجدولة.",
    },
    content: {
      ID: [
        "Reschedule hanya dapat diajukan apabila produk, jadwal, dan kebijakan transaksi menyediakan opsi tersebut.",
        "Tanggal atau jadwal pengganti bergantung pada ketersediaan dan ketentuan yang berlaku.",
        "Perubahan dapat menimbulkan selisih harga atau biaya sesuai kebijakan transaksi. Informasi yang berlaku harus ditampilkan sebelum perubahan dikonfirmasi.",
        "Mengirim pengajuan reschedule tidak langsung mengubah jadwal aktif. Jadwal lama tetap menjadi referensi sampai perubahan memperoleh hasil sesuai proses transaksi.",
      ],
      EN: [
        "Rescheduling can only be requested when the product, schedule, and transaction policy provide that option.",
        "Alternative dates or schedules depend on availability and applicable terms.",
        "A change may result in a price difference or fee according to the transaction policy. Applicable information should be shown before the change is confirmed.",
        "Submitting a reschedule request does not immediately change the active schedule. The existing schedule remains the reference until the change receives an outcome through the transaction process.",
      ],
      AR: [
        "يمكن طلب إعادة الجدولة فقط عندما يتيح المنتج والجدول وسياسة المعاملة هذا الخيار.",
        "تعتمد المواعيد أو الجداول البديلة على التوفر والشروط المطبقة.",
        "قد يؤدي التغيير إلى فرق في السعر أو رسوم وفق سياسة المعاملة، ويجب عرض المعلومات المطبقة قبل تأكيد التغيير.",
        "لا يؤدي إرسال طلب إعادة الجدولة إلى تغيير الجدول النشط فورًا، ويظل الجدول الحالي هو المرجع حتى صدور نتيجة الطلب عبر عملية المعاملة.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Ajukan reschedule",
          EN: "Submit a reschedule request",
          AR: "قدّم طلب إعادة الجدولة",
        },
        description: {
          ID: "Pilih opsi reschedule pada pesanan jika tersedia, lalu periksa pilihan jadwal dan ketentuannya.",
          EN: "Choose the reschedule option when available, then review the alternative schedule and its terms.",
          AR: "اختر خيار إعادة الجدولة إذا كان متاحًا ثم راجع الجدول البديل وشروطه.",
        },
        image: "/images/help-center/changes/ajukan-reschedule.webp",
        imageAlt: {
          ID: "Pengajuan reschedule Segaloka",
          EN: "Segaloka reschedule request",
          AR: "طلب إعادة الجدولة في سيجالوكا",
        },
      },
    ],
  },

  {
    id: "changes-status-reschedule",
    category: "changes",
    title: {
      ID: "Status Reschedule",
      EN: "Reschedule Status",
      AR: "حالة إعادة الجدولة",
    },
    summary: {
      ID: "Periksa apakah pengajuan perubahan jadwal masih ditinjau atau telah memperoleh hasil.",
      EN: "Check whether your schedule-change request is still under review or has received an outcome.",
      AR: "تحقق مما إذا كان طلب تغيير الموعد لا يزال قيد المراجعة أو صدرت نتيجته.",
    },
    content: {
      ID: [
        "Pantau status reschedule melalui detail pesanan.",
        "Selama perubahan belum dikonfirmasi, gunakan jadwal aktif yang tercatat pada pesanan sebagai referensi.",
        "Jika perubahan disetujui dan dikonfirmasi, detail pesanan akan menjadi referensi jadwal terbaru.",
        "Jika pengajuan tidak disetujui, jadwal sebelumnya tetap berlaku sesuai status transaksi.",
      ],
      EN: [
        "Track the reschedule status from the order details.",
        "Until the change is confirmed, use the active schedule recorded on the order as the reference.",
        "If the change is approved and confirmed, the order details become the reference for the updated schedule.",
        "If the request is not approved, the previous schedule remains applicable according to the transaction status.",
      ],
      AR: [
        "تابع حالة إعادة الجدولة من تفاصيل الطلب.",
        "حتى يتم تأكيد التغيير استخدم الجدول النشط المسجل في الطلب كمرجع.",
        "إذا تمت الموافقة على التغيير وتأكيده تصبح تفاصيل الطلب مرجعًا للجدول المحدث.",
        "إذا لم تتم الموافقة على الطلب يظل الجدول السابق ساريًا وفق حالة المعاملة.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Lihat status reschedule",
          EN: "View reschedule status",
          AR: "عرض حالة إعادة الجدولة",
        },
        description: {
          ID: "Buka detail pesanan untuk melihat perkembangan pengajuan perubahan jadwal.",
          EN: "Open the order details to view the progress of the schedule-change request.",
          AR: "افتح تفاصيل الطلب لمتابعة تقدم طلب تغيير الموعد.",
        },
        image: "/images/help-center/changes/status-reschedule.webp",
        imageAlt: {
          ID: "Status reschedule Segaloka",
          EN: "Segaloka reschedule status",
          AR: "حالة إعادة الجدولة في سيجالوكا",
        },
      },
    ],
  },

  {
    id: "changes-perubahan-pesanan",
    category: "changes",
    title: {
      ID: "Perubahan Pesanan",
      EN: "Order Changes",
      AR: "تغييرات الطلب",
    },
    summary: {
      ID: "Pahami perubahan data atau layanan pada pesanan setelah transaksi dibuat.",
      EN: "Understand changes to order data or services after a transaction has been created.",
      AR: "تعرّف على تغييرات بيانات أو خدمات الطلب بعد إنشاء المعاملة.",
    },
    content: {
      ID: [
        "Jenis perubahan yang dapat diajukan bergantung pada produk, status pesanan, waktu keberangkatan atau layanan, dan kebijakan transaksi.",
        "Perubahan dapat mencakup data atau komponen pesanan yang memang diizinkan untuk diubah. Tidak semua informasi dapat diubah setelah transaksi dibuat.",
        "Jika perubahan memengaruhi harga, layanan, jadwal, atau komitmen utama transaksi, periksa rincian perubahan sebelum memberikan konfirmasi.",
        "Gunakan data terbaru yang tercatat pada detail pesanan setelah perubahan dikonfirmasi sebagai referensi transaksi.",
      ],
      EN: [
        "The types of changes that can be requested depend on the product, order status, departure or service timing, and transaction policy.",
        "Changes may cover order data or components that are permitted to be modified. Not all information can be changed after a transaction is created.",
        "If a change affects price, services, schedule, or a material transaction commitment, review the change details before confirming.",
        "Use the latest information recorded in the order details after the change is confirmed as the transaction reference.",
      ],
      AR: [
        "تعتمد أنواع التغييرات التي يمكن طلبها على المنتج وحالة الطلب وموعد المغادرة أو الخدمة وسياسة المعاملة.",
        "قد تشمل التغييرات بيانات أو مكونات الطلب المسموح بتعديلها، ولا يمكن تغيير جميع المعلومات بعد إنشاء المعاملة.",
        "إذا أثر التغيير في السعر أو الخدمات أو الجدول أو التزام جوهري في المعاملة فراجع تفاصيل التغيير قبل التأكيد.",
        "استخدم أحدث البيانات المسجلة في تفاصيل الطلب بعد تأكيد التغيير كمرجع للمعاملة.",
      ],
    },
  },

  {
    id: "changes-ketentuan",
    category: "changes",
    title: {
      ID: "Ketentuan Perubahan & Pembatalan",
      EN: "Change & Cancellation Terms",
      AR: "شروط التغيير والإلغاء",
    },
    summary: {
      ID: "Mengapa ketentuan perubahan, pembatalan, refund, dan reschedule dapat berbeda pada setiap pesanan.",
      EN: "Why change, cancellation, refund, and reschedule terms may differ for each order.",
      AR: "لماذا قد تختلف شروط التغيير والإلغاء والاسترداد وإعادة الجدولة لكل طلب.",
    },
    content: {
      ID: [
        "Ketentuan yang berlaku mengikuti kebijakan yang terkait dengan produk dan transaksi pada saat pemesanan.",
        "Karena produk dapat melibatkan Travel, Vendor, maskapai, hotel, transportasi, atau penyedia lain, ketentuan perubahan dan pembatalan dapat berbeda antar transaksi.",
        "Informasi seperti batas waktu pengajuan, komponen refundable atau non-refundable, biaya, selisih harga, dan syarat reschedule mengikuti ketentuan transaksi yang berlaku.",
        "Periksa kebijakan pada detail pesanan sebelum mengajukan perubahan. Kebijakan transaksi yang sudah tercatat menjadi referensi untuk memproses permintaan terkait pesanan tersebut.",
      ],
      EN: [
        "Applicable terms follow the policy associated with the product and transaction at the time of booking.",
        "Because a product may involve a Travel provider, Vendor, airline, hotel, transportation provider, or another supplier, change and cancellation terms may differ between transactions.",
        "Information such as submission deadlines, refundable or non-refundable components, fees, price differences, and rescheduling requirements follows the applicable transaction terms.",
        "Review the policy in the order details before requesting a change. The transaction policy recorded for the order becomes the reference for processing requests related to that order.",
      ],
      AR: [
        "تتبع الشروط المطبقة السياسة المرتبطة بالمنتج والمعاملة وقت الحجز.",
        "نظرًا إلى أن المنتج قد يشمل شركة سفر أو موردًا أو شركة طيران أو فندقًا أو مزود نقل أو مزودًا آخر فقد تختلف شروط التغيير والإلغاء بين المعاملات.",
        "تتبع معلومات مثل مهلة التقديم والعناصر القابلة أو غير القابلة للاسترداد والرسوم وفروق الأسعار ومتطلبات إعادة الجدولة شروط المعاملة المطبقة.",
        "راجع السياسة في تفاصيل الطلب قبل طلب أي تغيير، وتصبح سياسة المعاملة المسجلة للطلب مرجعًا لمعالجة الطلبات المتعلقة به.",
      ],
    },
  },

  {
    id: "promo-cara-pakai",
    category: "promo",
    title: {
      ID: "Cara Menggunakan Voucher & Promo",
      EN: "How to Use Vouchers & Promos",
      AR: "كيفية استخدام القسائم والعروض",
    },
    summary: {
      ID: "Gunakan voucher atau promo yang memenuhi ketentuan pada transaksi Anda.",
      EN: "Apply an eligible voucher or promotion to your transaction.",
      AR: "استخدم قسيمة أو عرضًا مؤهلًا لمعاملتك.",
    },
    content: {
      ID: [
        "Voucher atau promo yang tersedia dapat digunakan pada transaksi yang memenuhi ketentuan masing-masing penawaran.",
        "Periksa produk yang memenuhi syarat, periode penggunaan, minimum transaksi, kuota, batas penggunaan, dan ketentuan lain yang ditampilkan.",
        "Jika voucher menggunakan kode, masukkan kode pada bagian voucher atau promo sebelum menyelesaikan pembayaran. Promo tertentu dapat diterapkan melalui mekanisme yang ditampilkan pada transaksi tanpa memasukkan kode secara manual.",
        "Pastikan potongan atau manfaat promo sudah terlihat pada ringkasan harga sebelum melanjutkan pembayaran.",
        "Jika manfaat promo tidak tampil pada ringkasan transaksi, jangan menganggap promo sudah diterapkan.",
      ],
      EN: [
        "Available vouchers or promotions can be used on transactions that meet the terms of each offer.",
        "Review eligible products, usage period, minimum transaction, quota, usage limits, and any other displayed conditions.",
        "If a voucher uses a code, enter it in the voucher or promotion section before completing payment. Certain promotions may be applied through the mechanism shown in the transaction without manually entering a code.",
        "Make sure the discount or promotional benefit appears in the price summary before continuing to payment.",
        "If the promotional benefit is not shown in the transaction summary, do not assume that the promotion has been applied.",
      ],
      AR: [
        "يمكن استخدام القسائم أو العروض المتاحة في المعاملات التي تستوفي شروط كل عرض.",
        "راجع المنتجات المؤهلة وفترة الاستخدام والحد الأدنى للمعاملة والحصة وحدود الاستخدام وأي شروط أخرى معروضة.",
        "إذا كانت القسيمة تستخدم رمزًا فأدخله في قسم القسيمة أو العرض قبل إكمال الدفع. وقد يتم تطبيق بعض العروض من خلال الآلية المعروضة في المعاملة دون إدخال رمز يدويًا.",
        "تأكد من ظهور الخصم أو ميزة العرض في ملخص السعر قبل متابعة الدفع.",
        "إذا لم تظهر ميزة العرض في ملخص المعاملة فلا تفترض أن العرض قد تم تطبيقه.",
      ],
    },
    steps: [
      {
        title: {
          ID: "Gunakan voucher",
          EN: "Use a voucher",
          AR: "استخدم قسيمة",
        },
        description: {
          ID: "Masukkan atau pilih voucher yang tersedia, lalu pastikan transaksi memenuhi ketentuannya.",
          EN: "Enter or select an available voucher and make sure the transaction meets its terms.",
          AR: "أدخل أو اختر قسيمة متاحة وتأكد من أن المعاملة تستوفي شروطها.",
        },
        image: "/images/help-center/promo/gunakan-voucher.webp",
        imageAlt: {
          ID: "Menggunakan voucher di Segaloka",
          EN: "Using a voucher on Segaloka",
          AR: "استخدام قسيمة في سيجالوكا",
        },
      },
      {
        title: {
          ID: "Periksa promo pada ringkasan harga",
          EN: "Check the promotion in the price summary",
          AR: "تحقق من العرض في ملخص السعر",
        },
        description: {
          ID: "Pastikan manfaat promo sudah tercermin pada ringkasan transaksi sebelum membayar.",
          EN: "Make sure the promotional benefit is reflected in the transaction summary before paying.",
          AR: "تأكد من ظهور ميزة العرض في ملخص المعاملة قبل الدفع.",
        },
        image: "/images/help-center/promo/gunakan-promo.webp",
        imageAlt: {
          ID: "Promo pada ringkasan transaksi Segaloka",
          EN: "Promotion in the Segaloka transaction summary",
          AR: "العرض في ملخص معاملة سيجالوكا",
        },
      },
    ],
  },

  {
    id: "promo-syarat-ketentuan",
    category: "promo",
    title: {
      ID: "Syarat & Ketentuan Voucher dan Promo",
      EN: "Voucher & Promotion Terms",
      AR: "شروط القسائم والعروض",
    },
    summary: {
      ID: "Pahami ketentuan yang menentukan apakah voucher atau promo dapat digunakan.",
      EN: "Understand the conditions that determine whether a voucher or promotion can be used.",
      AR: "تعرّف على الشروط التي تحدد إمكانية استخدام القسيمة أو العرض.",
    },
    content: {
      ID: [
        "Setiap voucher atau promo dapat memiliki ketentuan yang berbeda.",
        "Ketentuan dapat mencakup periode berlaku, produk atau layanan yang memenuhi syarat, minimum transaksi, kuota, batas penggunaan per akun atau transaksi, metode pembayaran tertentu, dan persyaratan lain yang dikonfigurasi untuk penawaran tersebut.",
        "Nilai dan bentuk manfaat mengikuti informasi promo yang ditampilkan pada saat transaksi. Segaloka tidak menggunakan satu nilai diskon yang sama untuk seluruh voucher atau promo.",
        "Periksa ketentuan yang ditampilkan sebelum menggunakan voucher atau promo karena ketersediaan dan kelayakannya dapat berbeda antar transaksi.",
      ],
      EN: [
        "Each voucher or promotion may have different terms.",
        "Terms may include validity period, eligible products or services, minimum transaction, quota, usage limits per account or transaction, specific payment methods, and other requirements configured for the offer.",
        "The value and form of the benefit follow the promotion information shown during the transaction. Segaloka does not use one universal discount value for every voucher or promotion.",
        "Review the displayed terms before using a voucher or promotion because availability and eligibility may differ between transactions.",
      ],
      AR: [
        "قد تكون لكل قسيمة أو عرض شروط مختلفة.",
        "قد تشمل الشروط فترة الصلاحية والمنتجات أو الخدمات المؤهلة والحد الأدنى للمعاملة والحصة وحدود الاستخدام لكل حساب أو معاملة وطرق دفع محددة ومتطلبات أخرى تم إعدادها للعرض.",
        "تتبع قيمة وشكل الميزة معلومات العرض المعروضة أثناء المعاملة، ولا تستخدم سيجالوكا قيمة خصم موحدة لجميع القسائم أو العروض.",
        "راجع الشروط المعروضة قبل استخدام القسيمة أو العرض لأن التوفر والأهلية قد يختلفان بين المعاملات.",
      ],
    },
  },

  {
    id: "promo-tidak-bisa-digunakan",
    category: "promo",
    title: {
      ID: "Voucher atau Promo Tidak Bisa Digunakan",
      EN: "Voucher or Promotion Cannot Be Used",
      AR: "تعذر استخدام القسيمة أو العرض",
    },
    summary: {
      ID: "Periksa penyebab voucher atau promo tidak dapat diterapkan pada transaksi.",
      EN: "Check why a voucher or promotion cannot be applied to a transaction.",
      AR: "تحقق من سبب تعذر تطبيق القسيمة أو العرض على المعاملة.",
    },
    content: {
      ID: [
        "Voucher atau promo dapat ditolak apabila transaksi tidak memenuhi salah satu ketentuan yang berlaku.",
        "Periksa kembali masa berlaku, produk atau layanan yang dipilih, minimum transaksi, kuota, batas penggunaan, kode voucher, akun pengguna, dan ketentuan metode pembayaran apabila ada.",
        "Pastikan kode dimasukkan sesuai informasi voucher apabila promo membutuhkan kode.",
        "Jika voucher atau promo sudah tidak tersedia, melewati masa berlaku, mencapai kuota, atau tidak memenuhi ketentuan transaksi, manfaat promo tidak akan diterapkan.",
        "Gunakan ringkasan harga sebagai konfirmasi bahwa potongan atau manfaat benar-benar telah diterapkan sebelum melakukan pembayaran.",
      ],
      EN: [
        "A voucher or promotion may be rejected when the transaction does not meet one or more applicable conditions.",
        "Check the validity period, selected product or service, minimum transaction, quota, usage limit, voucher code, user account, and payment-method requirements when applicable.",
        "Make sure the code is entered according to the voucher information when the promotion requires a code.",
        "If a voucher or promotion is unavailable, expired, has reached its quota, or does not meet transaction requirements, the promotional benefit will not be applied.",
        "Use the price summary as confirmation that the discount or benefit has actually been applied before making payment.",
      ],
      AR: [
        "قد يتم رفض القسيمة أو العرض عندما لا تستوفي المعاملة شرطًا أو أكثر من الشروط المطبقة.",
        "تحقق من فترة الصلاحية والمنتج أو الخدمة المختارة والحد الأدنى للمعاملة والحصة وحد الاستخدام ورمز القسيمة وحساب المستخدم ومتطلبات طريقة الدفع عند وجودها.",
        "تأكد من إدخال الرمز وفق معلومات القسيمة إذا كان العرض يتطلب رمزًا.",
        "إذا لم تعد القسيمة أو العرض متاحًا أو انتهت صلاحيته أو اكتملت حصته أو لم تستوف المعاملة الشروط فلن يتم تطبيق ميزة العرض.",
        "استخدم ملخص السعر للتأكد من تطبيق الخصم أو الميزة فعليًا قبل إجراء الدفع.",
      ],
    },
  },

  {
    id: "promo-setelah-pembatalan",
    category: "promo",
    title: {
      ID: "Voucher & Promo Setelah Pembatalan atau Refund",
      EN: "Vouchers & Promos After Cancellation or Refund",
      AR: "القسائم والعروض بعد الإلغاء أو الاسترداد",
    },
    summary: {
      ID: "Ketahui apa yang terjadi pada voucher atau promo ketika pesanan dibatalkan atau direfund.",
      EN: "Understand what happens to a voucher or promotion when an order is cancelled or refunded.",
      AR: "تعرّف على ما يحدث للقسيمة أو العرض عند إلغاء الطلب أو استرداده.",
    },
    content: {
      ID: [
        "Pembatalan atau refund tidak otomatis membuat voucher atau promo dapat digunakan kembali.",
        "Status voucher setelah pembatalan atau refund mengikuti ketentuan promo dan kebijakan transaksi yang berlaku pada pesanan tersebut.",
        "Promo dapat memiliki aturan berbeda terkait pengembalian manfaat, pemakaian ulang, masa berlaku, atau kuota.",
        "Nilai refund juga mengikuti kebijakan transaksi dan komponen pembayaran yang berlaku. Jangan menganggap nilai promo sebagai dana tunai yang otomatis dikembalikan.",
        "Periksa detail hasil pembatalan atau refund serta status voucher atau promo yang tercatat pada transaksi.",
      ],
      EN: [
        "Cancellation or refund does not automatically make a voucher or promotion reusable.",
        "Voucher status after cancellation or refund follows the promotion terms and transaction policy applicable to the order.",
        "Promotions may have different rules regarding restoration of benefits, reuse, validity periods, or quota.",
        "The refund amount also follows the transaction policy and applicable payment components. Do not treat a promotional value as cash that is automatically returned.",
        "Review the cancellation or refund outcome and the voucher or promotion status recorded for the transaction.",
      ],
      AR: [
        "لا يجعل الإلغاء أو الاسترداد القسيمة أو العرض قابلاً لإعادة الاستخدام تلقائيًا.",
        "تتبع حالة القسيمة بعد الإلغاء أو الاسترداد شروط العرض وسياسة المعاملة المطبقة على الطلب.",
        "قد تكون للعروض قواعد مختلفة بشأن إعادة الميزة أو إعادة الاستخدام أو فترة الصلاحية أو الحصة.",
        "كما تتبع قيمة الاسترداد سياسة المعاملة ومكونات الدفع المطبقة، ولا تعتبر قيمة العرض مبلغًا نقديًا يعاد تلقائيًا.",
        "راجع نتيجة الإلغاء أو الاسترداد وحالة القسيمة أو العرض المسجلة للمعاملة.",
      ],
    },
  },

  {
    id: "promo-perbedaan-voucher-promo",
    category: "promo",
    title: {
      ID: "Perbedaan Voucher dan Promo",
      EN: "Difference Between Vouchers and Promos",
      AR: "الفرق بين القسائم والعروض",
    },
    summary: {
      ID: "Kenali cara voucher dan promo diterapkan pada transaksi Segaloka.",
      EN: "Understand how vouchers and promotions are applied to Segaloka transactions.",
      AR: "تعرّف على كيفية تطبيق القسائم والعروض على معاملات سيجالوكا.",
    },
    content: {
      ID: [
        "Voucher adalah manfaat promosi yang dapat memiliki kode atau pilihan voucher tertentu untuk diterapkan pada transaksi yang memenuhi syarat.",
        "Promo adalah penawaran promosi yang dapat diterapkan sesuai mekanisme dan ketentuan yang ditampilkan pada produk atau transaksi.",
        "Baik voucher maupun promo dapat memiliki periode, kuota, produk yang memenuhi syarat, minimum transaksi, batas penggunaan, serta ketentuan lainnya.",
        "Selalu gunakan informasi yang tampil pada transaksi sebagai referensi untuk mengetahui manfaat dan ketentuan yang benar-benar berlaku.",
      ],
      EN: [
        "A voucher is a promotional benefit that may use a code or a specific voucher selection to be applied to an eligible transaction.",
        "A promotion is an offer that may be applied according to the mechanism and terms shown on the product or transaction.",
        "Both vouchers and promotions may have validity periods, quotas, eligible products, minimum transactions, usage limits, and other terms.",
        "Always use the information shown in the transaction as the reference for the benefit and terms that actually apply.",
      ],
      AR: [
        "القسيمة هي ميزة ترويجية قد تستخدم رمزًا أو اختيار قسيمة محددة لتطبيقها على معاملة مؤهلة.",
        "العرض هو عرض ترويجي يمكن تطبيقه وفق الآلية والشروط المعروضة على المنتج أو المعاملة.",
        "يمكن أن تكون لكل من القسائم والعروض فترات صلاحية وحصص ومنتجات مؤهلة وحد أدنى للمعاملة وحدود استخدام وشروط أخرى.",
        "استخدم دائمًا المعلومات المعروضة في المعاملة كمرجع للميزة والشروط المطبقة فعليًا.",
      ],
    },
  },

  {
    id: "loyalty",
    category: "loyalty",
    title: {
      ID: "Tentang Loyalty Points",
      EN: "About Loyalty Points",
      AR: "حول نقاط الولاء",
    },
    summary: {
      ID: "Poin dan benefit pengguna Segaloka.",
      EN: "Segaloka points and user benefits.",
      AR: "نقاط سيجالوكا ومزايا المستخدم.",
    },
    content: {
      ID: [
        "Loyalty Points merupakan bagian dari benefit pengguna Segaloka sesuai program dan ketentuan yang berlaku.",
        "Saldo, penggunaan, dan masa berlaku poin akan mengikuti informasi pada akun pengguna.",
      ],
      EN: [
        "Loyalty Points are part of Segaloka user benefits according to the applicable program and terms.",
        "Point balances, usage, and validity follow the information shown in the user's account.",
      ],
      AR: [
        "تعد نقاط الولاء جزءاً من مزايا مستخدمي سيجالوكا وفق البرنامج والشروط المعمول بها.",
        "يتم عرض الرصيد والاستخدام ومدة الصلاحية ضمن حساب المستخدم.",
      ],
    },
  },

  

  {
    id: "affiliate",
    category: "affiliate",
    title: {
      ID: "Program Affiliate Segaloka",
      EN: "Segaloka Affiliate Program",
      AR: "برنامج سيجالوكا للأفلييت",
    },
    summary: {
      ID: "Promosikan produk dan kelola komisi Affiliate.",
      EN: "Promote products and manage Affiliate commissions.",
      AR: "روّج للمنتجات وأدر عمولات الأفلييت.",
    },
    content: {
      ID: [
        "Affiliate dapat mempromosikan produk yang tersedia melalui link Affiliate dan memperoleh komisi sesuai ketentuan.",
        "Dashboard Affiliate digunakan untuk mengelola link, referral, transaksi, earnings, withdrawal, riwayat, dan profil Affiliate.",
      ],
      EN: [
        "Affiliates can promote eligible products through Affiliate links and earn commissions according to program terms.",
        "The Affiliate dashboard manages links, referrals, transactions, earnings, withdrawals, history, and Affiliate profiles.",
      ],
      AR: [
        "يمكن للأفلييت الترويج للمنتجات المؤهلة من خلال روابط الأفلييت والحصول على عمولة وفق شروط البرنامج.",
        "تُستخدم لوحة الأفلييت لإدارة الروابط والإحالات والمعاملات والأرباح والسحب والسجل والملف الشخصي.",
      ],
    },
  },

  {
    id: "privacy",
    category: "privacy",
    title: {
      ID: "Keamanan & Privasi",
      EN: "Security & Privacy",
      AR: "الأمان والخصوصية",
    },
    summary: {
      ID: "Jaga akun dan informasi pribadi Anda.",
      EN: "Protect your account and personal information.",
      AR: "احمِ حسابك ومعلوماتك الشخصية.",
    },
    content: {
      ID: [
        "Jangan membagikan kata sandi atau informasi autentikasi kepada pihak lain.",
        "Periksa aktivitas akun apabila menemukan akses atau transaksi yang tidak dikenali.",
      ],
      EN: [
        "Never share passwords or authentication information with another party.",
        "Review account activity if you notice an unrecognized access attempt or transaction.",
      ],
      AR: [
        "لا تشارك كلمة المرور أو معلومات المصادقة مع أي طرف آخر.",
        "راجع نشاط الحساب إذا لاحظت وصولاً أو معاملة لا تعرفها.",
      ],
    },
  },

  {
    id: "other-hubungi-kami",
    category: "other",
    title: {
      ID: "Hubungi Kami",
      EN: "Contact Us",
      AR: "تواصل معنا",
    },
    summary: {
      ID: "Temukan cara mendapatkan bantuan terkait akun, pesanan, pembayaran, dan layanan Segaloka.",
      EN: "Find out how to get help with your account, orders, payments, and Segaloka services.",
      AR: "تعرف على كيفية الحصول على المساعدة بشأن حسابك وطلباتك ومدفوعاتك وخدمات سيجالوكا.",
    },
    content: {
      ID: [
        "Jika Anda membutuhkan bantuan terkait akun, pemesanan, pembayaran, perubahan pesanan, atau layanan Segaloka lainnya, periksa terlebih dahulu informasi yang tersedia di Pusat Bantuan.",
        "Untuk kendala yang berkaitan dengan transaksi, siapkan informasi pesanan atau referensi transaksi yang relevan agar proses penelusuran dapat dilakukan dengan lebih tepat.",
        "Jangan membagikan kata sandi, PIN, kode OTP, atau informasi autentikasi lainnya kepada pihak mana pun saat meminta bantuan.",
        "Gunakan hanya kanal bantuan resmi yang ditampilkan oleh Segaloka. Informasi kontak resmi dapat diperbarui melalui sistem Segaloka tanpa mengubah ketentuan transaksi Anda.",
      ],
      EN: [
        "If you need help with your account, booking, payment, order changes, or other Segaloka services, first check the information available in the Help Center.",
        "For transaction-related issues, prepare the relevant order information or transaction reference so the issue can be reviewed more accurately.",
        "Never share your password, PIN, OTP code, or other authentication information with anyone when requesting assistance.",
        "Use only official support channels displayed by Segaloka. Official contact information may be updated through the Segaloka system without changing your transaction terms.",
      ],
      AR: [
        "إذا كنت بحاجة إلى مساعدة بشأن حسابك أو الحجز أو الدفع أو تعديل الطلب أو أي خدمة أخرى من سيجالوكا، فتحقق أولاً من المعلومات المتاحة في مركز المساعدة.",
        "بالنسبة للمشكلات المتعلقة بالمعاملات، جهز معلومات الطلب أو مرجع المعاملة ذي الصلة حتى يمكن مراجعة المشكلة بدقة أكبر.",
        "لا تشارك كلمة المرور أو رقم التعريف الشخصي أو رمز التحقق لمرة واحدة أو أي معلومات مصادقة أخرى مع أي شخص عند طلب المساعدة.",
        "استخدم فقط قنوات الدعم الرسمية التي تعرضها سيجالوكا. ويمكن تحديث معلومات الاتصال الرسمية من خلال نظام سيجالوكا دون تغيير شروط معاملتك.",
      ],
    },
  },
  {
    id: "other",
    category: "other",
    title: {
      ID: "Bantuan lainnya",
      EN: "Other help topics",
      AR: "مواضيع مساعدة أخرى",
    },
    summary: {
      ID: "Temukan informasi Segaloka lainnya.",
      EN: "Find other Segaloka information.",
      AR: "اعثر على معلومات أخرى حول سيجالوكا.",
    },
    content: {
      ID: [
        "Gunakan kolom pencarian untuk menemukan informasi berdasarkan kata kunci.",
        "Pusat Bantuan akan terus dilengkapi mengikuti layanan dan fitur Segaloka.",
      ],
      EN: [
        "Use the search field to find information by keyword.",
        "The Help Center will continue to expand alongside Segaloka services and features.",
      ],
      AR: [
        "استخدم حقل البحث للعثور على المعلومات باستخدام الكلمات المفتاحية.",
        "سيستمر مركز المساعدة في التوسع مع خدمات وميزات سيجالوكا.",
      ],
    },
  },
];

const featured: CategoryId[] = [
  "umrah",
  "haji",
  "halal",
  "domestic",
  "international",
  "segadeals",
  "visa",
];

function getHelpImageFallbackSource(
  source: string,
): string | null {
  if (!source.endsWith(".webp")) {
    return null;
  }

  return source.slice(0, -5) + ".png";
}

function applyHelpImageFallback(
  event: React.SyntheticEvent<HTMLImageElement>,
  source: string,
): void {
  const image = event.currentTarget;

  /*
   * Tahap 1:
   * canonical WebP -> PNG sementara.
   */
  if (image.dataset.helpFallback !== "png") {
    const pngFallback = getHelpImageFallbackSource(source);

    if (pngFallback) {
      image.dataset.helpFallback = "png";
      image.src = pngFallback;
      return;
    }
  }

  /*
   * Tahap 2:
   * jika PNG juga tidak tersedia,
   * gunakan visual Segaloka dan hentikan error loop.
   */
  image.onerror = null;
  image.dataset.helpFallback = "default";
  image.src = "/images/hero/hero-segaloka.png";
}
export default function HelpCenterClient() {
  const preferences = useMarketplacePreferences();

  const language = (
    preferences.language === "EN" || preferences.language === "AR"
      ? preferences.language
      : "ID"
  ) as Language;

  const t = ui[language];

  const [activeCategory, setActiveCategory] =
    useState<CategoryId>("umrah");
  const [activeArticleId, setActiveArticleId] =
    useState(() => {
      const firstUmrahArticle = articles.find(
        (item) => item.category === "umrah",
      );

      return firstUmrahArticle?.id ?? articles[0].id;
    });
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const activeCategoryData =
    categories.find((item) => item.id === activeCategory) ?? categories[0];

  const activeArticle =
    articles.find((item) => item.id === activeArticleId) ??
    articles.find((item) => item.category === activeCategory) ??
    articles[0];

  const isContactArticle =
    activeArticle.id === "other-hubungi-kami";

  const categoryArticles = useMemo(
    () => articles.filter((item) => item.category === activeCategory),
    [activeCategory],
  );

  const topicText = topicUi[language];

  function syncArticleUrl(articleId: string) {
    const url = new URL(window.location.href);

    url.searchParams.set("artikel", articleId);

    const nextUrl =
      `${url.pathname}${url.search}${url.hash}`;

    const currentArticle =
      new URL(window.location.href)
        .searchParams
        .get("artikel");

    if (currentArticle === articleId) {
      return;
    }

    window.history.pushState(
      { articleId },
      "",
      nextUrl,
    );
  }

  function applyArticleFromUrl() {
    const url = new URL(window.location.href);
    const articleId = url.searchParams.get("artikel");

    if (!articleId) {
      const defaultArticle = articles.find(
        (item) => item.category === "umrah",
      );

      if (defaultArticle) {
        setActiveCategory(defaultArticle.category);
        setActiveArticleId(defaultArticle.id);
      }

      return;
    }

    const article = articles.find(
      (item) => item.id === articleId,
    );

    if (!article) return;

    setActiveCategory(article.category);
    setActiveArticleId(article.id);
    setSubmittedQuery("");
    setQuery("");
  }

  useEffect(() => {
    applyArticleFromUrl();

    function handlePopState() {
      applyArticleFromUrl();
    }

    window.addEventListener(
      "popstate",
      handlePopState,
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState,
      );
    };
  }, []);

  const results = useMemo(() => {
    const term = submittedQuery.trim().toLocaleLowerCase();

    if (!term) return [];

    return articles.filter((article) => {
      const category = categories.find(
        (item) => item.id === article.category,
      );

      const searchable = [
        article.title[language],
        article.summary[language],
        ...article.content[language],
        ...(article.steps?.flatMap((step) => [
          step.title[language],
          step.description[language],
        ]) ?? []),
        category?.label[language] ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase();

      return searchable.includes(term);
    });
  }, [submittedQuery, language]);

  function selectCategory(id: CategoryId) {
    setActiveCategory(id);

    const article = articles.find(
      (item) => item.category === id,
    );

    if (article) {
      setActiveArticleId(article.id);
      syncArticleUrl(article.id);
    }

    setSubmittedQuery("");
    setQuery("");
  }

  function selectArticle(article: Article) {
    setActiveCategory(article.category);
    setActiveArticleId(article.id);
    setSubmittedQuery("");
    setQuery("");

    syncArticleUrl(article.id);

    window.requestAnimationFrame(() => {
      document
        .getElementById("help-article")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      setSubmittedQuery("");
      return;
    }

    setSubmittedQuery(query.trim());
  }

  return (
    <main
      className="help-page"
      dir={language === "AR" ? "rtl" : "ltr"}
    >
      <section className="help-hero">
        <div className="help-hero-overlay" />

        <div className="help-container help-hero-inner">
          <form className="help-search" onSubmit={handleSearch}>
            <Search size={22} />

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
            />

            {query ? (
              <button
                type="button"
                className="help-search-clear"
                onClick={() => {
                  setQuery("");
                  setSubmittedQuery("");
                }}
                aria-label={t.clearSearch}
              >
                <X size={18} />
              </button>
            ) : null}
          </form>

          <nav className="help-featured-nav">
            {featured.map((id) => {
              const item = categories.find(
                (category) => category.id === id,
              )!;
              const Icon = item.Icon;

              return (
                <button
                  type="button"
                  key={id}
                  className={
                    activeCategory === id ? "is-active" : ""
                  }
                  onClick={() => selectCategory(id)}
                >
                  <span className="help-featured-icon">
                    <Icon size={20} />
                  </span>

                  <span>{item.label[language]}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </section>

      <section className="help-main">
        <div className="help-container help-layout">
          <aside className="help-sidebar">
            <h2>{t.helpCenter}</h2>

            <nav>
              {categories.map((item, index) => {
                const Icon = item.Icon;

                return (
                  <div
                    key={item.id}
                    className={
                      index === 7
                        ? "help-sidebar-group-start"
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      className={
                        activeCategory === item.id
                          ? "is-active"
                          : ""
                      }
                      onClick={() => selectCategory(item.id)}
                    >
                      <span className="help-sidebar-icon">
                        <Icon size={20} />
                      </span>

                      <span>{item.label[language]}</span>

                      <ChevronRight
                        size={17}
                        className="help-sidebar-chevron"
                      />
                    </button>
                  </div>
                );
              })}
            </nav>
          </aside>

          <div className="help-content">
            {submittedQuery ? (
              <section className="help-search-results">
                <div className="help-breadcrumb">
                  <span>{t.breadcrumb}</span>
                  <ChevronRight size={14} />
                  <strong>{t.searchResults}</strong>
                </div>

                <div className="help-results-heading">
                  <div>
                    <span className="help-overline">
                      {t.searchResults}
                    </span>

                    <h1>
                      {t.resultFor} “{submittedQuery}”
                    </h1>

                    <p>
                      {results.length} {t.articleFound}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSubmittedQuery("");
                    }}
                  >
                    {t.clearSearch}
                  </button>
                </div>

                {results.length > 0 ? (
                  <div className="help-result-list">
                    {results.map((article) => {
                      const category = categories.find(
                        (item) =>
                          item.id === article.category,
                      );

                      return (
                        <button
                          type="button"
                          key={article.id}
                          onClick={() =>
                            selectArticle(article)
                          }
                        >
                          <span>
                            <small>
                              {category?.label[language]}
                            </small>

                            <strong>
                              {article.title[language]}
                            </strong>

                            <p>
                              {article.summary[language]}
                            </p>
                          </span>

                          <ChevronRight size={19} />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="help-empty">
                    <Search size={30} />
                    <h2>{t.noResult}</h2>
                    <p>{t.noResultDescription}</p>
                  </div>
                )}
              </section>
            ) : (
              <article
                className="help-article"
                id="help-article"
              >
                <div className="help-breadcrumb">
                  <span>{t.breadcrumb}</span>
                  <ChevronRight size={14} />

                  <span>
                    {activeCategoryData.label[language]}
                  </span>

                  <ChevronRight size={14} />

                  <strong>
                    {activeArticle.title[language]}
                  </strong>
                </div>

                <header className="help-article-header">
                  <h1>
                    {activeArticle.title[language]}
                  </h1>
                  <p>{t.lastUpdated}</p>
                </header>

                {isContactArticle ? (
                  <section
                    className="help-contact-center"
                    aria-label={activeArticle.title[language]}
                  >
                    <p className="help-contact-intro">
                      {language === "ID"
                        ? "Pilih kanal bantuan yang paling sesuai dengan kebutuhan Anda."
                        : language === "EN"
                          ? "Choose the support channel that best fits your needs."
                          : "اختر قناة الدعم الأنسب لاحتياجاتك."}
                    </p>

                    <div className="help-contact-grid">
                      <article className="help-contact-card">
                        <div
                          className="help-contact-icon"
                          aria-hidden="true"
                        >
                          <span>WA</span>
                        </div>

                        <div className="help-contact-card-copy">
                          <h2>WhatsApp</h2>

                          <p>
                            {language === "ID"
                              ? "Gunakan WhatsApp untuk bantuan cepat terkait layanan, pesanan, atau transaksi Segaloka."
                              : language === "EN"
                                ? "Use WhatsApp for quick assistance with Segaloka services, bookings, or transactions."
                                : "استخدم واتساب للحصول على مساعدة سريعة بشأن خدمات سيجالوكا أو الحجوزات أو المعاملات."}
                          </p>

                          <span className="help-contact-status">
                            {language === "ID"
                              ? "Segera tersedia"
                              : language === "EN"
                                ? "Coming soon"
                                : "قريباً"}
                          </span>
                        </div>
                      </article>

                      <article className="help-contact-card">
                        <div
                          className="help-contact-icon"
                          aria-hidden="true"
                        >
                          <span>@</span>
                        </div>

                        <div className="help-contact-card-copy">
                          <h2>Email</h2>

                          <p>
                            {language === "ID"
                              ? "Gunakan email untuk pertanyaan yang membutuhkan penjelasan atau dokumen pendukung."
                              : language === "EN"
                                ? "Use email for questions that require detailed information or supporting documents."
                                : "استخدم البريد الإلكتروني للاستفسارات التي تتطلب تفاصيل أو مستندات داعمة."}
                          </p>

                          <span className="help-contact-status">
                            {language === "ID"
                              ? "Segera tersedia"
                              : language === "EN"
                                ? "Coming soon"
                                : "قريباً"}
                          </span>
                        </div>
                      </article>

                      <a
                        href="/pusat-bantuan"
                        className="help-contact-card help-contact-card-link"
                      >
                        <div
                          className="help-contact-icon"
                          aria-hidden="true"
                        >
                          <span>?</span>
                        </div>

                        <div className="help-contact-card-copy">
                          <h2>
                            {language === "ID"
                              ? "Pusat Bantuan"
                              : language === "EN"
                                ? "Help Center"
                                : "مركز المساعدة"}
                          </h2>

                          <p>
                            {language === "ID"
                              ? "Cari panduan berdasarkan layanan atau topik sebelum menghubungi tim bantuan."
                              : language === "EN"
                                ? "Find guidance by service or topic before contacting the support team."
                                : "ابحث عن الإرشادات حسب الخدمة أو الموضوع قبل التواصل مع فريق الدعم."}
                          </p>

                          <span className="help-contact-status">
                            {language === "ID"
                              ? "Buka Pusat Bantuan →"
                              : language === "EN"
                                ? "Open Help Center →"
                                : "فتح مركز المساعدة ←"}
                          </span>
                        </div>
                      </a>
                    </div>

                    <div className="help-contact-note">
                      <strong>
                        {language === "ID"
                          ? "Sebelum menghubungi bantuan"
                          : language === "EN"
                            ? "Before contacting support"
                            : "قبل التواصل مع الدعم"}
                      </strong>

                      <p>
                        {language === "ID"
                          ? "Untuk kendala pesanan atau transaksi, siapkan nomor pesanan dan informasi yang relevan agar proses pengecekan lebih mudah."
                          : language === "EN"
                            ? "For booking or transaction issues, prepare your booking number and relevant information to make the review process easier."
                            : "عند وجود مشكلة في حجز أو معاملة، جهّز رقم الحجز والمعلومات ذات الصلة لتسهيل عملية التحقق."}
                      </p>
                    </div>
                  </section>
                ) : (
                  <div className="help-article-copy">
                    {activeArticle.content[language].map(
                      (paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ),
                    )}
                  </div>
                )}

                {activeArticle.steps?.length ? (
                  <section
                    className="help-article-steps"
                    aria-label={activeArticle.title[language]}
                  >
                    {activeArticle.steps.map((step, index) => (
                      <article
                        className="help-article-step"
                        key={`${activeArticle.id}-${index}`}
                      >
                        <div className="help-article-step-copy">
                          <span className="help-article-step-number">
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          <div>
                            <h2>{step.title[language]}</h2>
                            <p>{step.description[language]}</p>
                          </div>
                        </div>

                        {step.image ? (
                          <figure className="help-article-step-visual">
                            <img
                              src={step.image}
                              alt={step.imageAlt?.[language] ?? ""}
                              onError={(event) =>
                                applyHelpImageFallback(
                                  event,
                                  step.image!,
                                )
                              }
                              loading={index === 0 ? "eager" : "lazy"}
                            />
                          </figure>
                        ) : null}
                      </article>
                    ))}
                  </section>
                ) : null}

                {categoryArticles.length > 1 ? (
                  <section className="help-category-topics">
                    <div className="help-category-topics-heading">
                      <div>
                        <span className="help-overline">
                          {topicText.articles}
                        </span>

                        <h2>{topicText.topics}</h2>

                        <p>{topicText.chooseTopic}</p>
                      </div>

                      <span className="help-topic-count">
                        {categoryArticles.length}
                      </span>
                    </div>

                    <div className="help-topic-list">
                      {categoryArticles.map((article) => (
                        <button
                          type="button"
                          key={article.id}
                          className={
                            article.id === activeArticle.id
                              ? "is-active"
                              : ""
                          }
                          onClick={() => selectArticle(article)}
                        >
                          <span className="help-topic-main">
                            <strong>
                              {article.title[language]}
                            </strong>

                            <p>
                              {article.summary[language]}
                            </p>
                          </span>

                          <span className="help-topic-action">
                            <span>{topicText.openArticle}</span>
                            <ChevronRight size={17} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}

                {activeArticle.id ===
                "apa-itu-segaloka" ? (
                  <>
                    <div className="help-platform-visual">
                      <div className="help-platform-copy">
                        <span>
                          {t.platformEyebrow}
                        </span>

                        <strong>
                          {t.platformTitle}
                        </strong>

                        <p>
                          {t.platformDescription}
                        </p>
                      </div>

                      <div className="help-device help-device-laptop">
                        <div className="help-device-screen">
                          <img
                            src="/images/hero/hero-segaloka.png"
                            alt="Segaloka"
                          />

                          <div className="help-screen-ui">
                            <span />
                            <span />
                            <span />
                          </div>
                        </div>
                      </div>

                      <div className="help-device help-device-phone">
                        <div className="help-phone-notch" />

                        <div className="help-phone-screen">
                          <strong>Segaloka</strong>
                          <div className="help-phone-search" />

                          <div className="help-phone-icons">
                            <span />
                            <span />
                            <span />
                          </div>

                          <div className="help-phone-card" />
                          <div className="help-phone-card short" />
                        </div>
                      </div>
                    </div>

                    <section className="help-services">
                      <div className="help-section-heading">
                        <h2>{t.mainServices}</h2>
                        <p>
                          {t.mainServicesDescription}
                        </p>
                      </div>

                      <div className="help-service-grid">
                        {featured.map((id, index) => {
                          const item = categories.find(
                            (category) =>
                              category.id === id,
                          )!;
                          const Icon = item.Icon;

                          return (
                            <button
                              type="button"
                              key={id}
                              onClick={() =>
                                selectCategory(id)
                              }
                              className={`help-service-card help-service-${index + 1}`}
                            >
                              <div className="help-service-image">
                                <img
                                  src="/images/hero/hero-segaloka.png"
                                  alt=""
                                />
                              </div>

                              <div className="help-service-body">
                                <span className="help-service-icon">
                                  <Icon size={20} />
                                </span>

                                <span className="help-service-copy">
                                  <strong>
                                    {
                                      item.label[
                                        language
                                      ]
                                    }
                                  </strong>

                                  <small>
                                    {
                                      item.description[
                                        language
                                      ]
                                    }
                                  </small>
                                </span>

                                <span className="help-service-arrow">
                                  <ChevronRight
                                    size={18}
                                  />
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </>
                ) : (
                  <section className="help-related">
                    <div>
                      <span className="help-overline">
                        {
                          activeCategoryData.label[
                            language
                          ]
                        }
                      </span>

                      <h2>{t.needMore}</h2>
                      <p>
                        {t.needMoreDescription}
                      </p>
                    </div>

                    <Search size={30} />
                  </section>
                )}
              </article>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}