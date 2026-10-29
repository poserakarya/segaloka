import type { LanguageCode } from "@/data/preferences";

export const visaDetailCopy = {
  ID: {
    flagAlt: (country: string) => `Bendera ${country}`,
    title: (country: string) => `Visa untuk ${country}`,
    heroDescription: (country: string) =>
      `Temukan vendor terpercaya untuk pengurusan Visa ${country}.`,
    heroDescriptionSecond:
      "Pilih vendor yang sesuai dengan kebutuhan perjalanan Anda.",

    trustedVendor: "Vendor Terpercaya",
    trustedVendorDescription:
      "Terverifikasi & berpengalaman",
    easyProcess: "Proses Mudah",
    easyProcessDescription:
      "Online & dibantu tim profesional",
    support: "Dukungan",
    supportDescription:
      "Selama proses pengurusan",
    manyChoices: "Banyak Pilihan",
    manyChoicesDescription:
      "Bandingkan Vendor & harga",

    vendorChoices: (country: string) =>
      `Pilihan Vendor Visa ${country}`,
    vendorChoicesDescription:
      "Bandingkan layanan dari berbagai vendor terpercaya Segaloka.",

    sortVendor: "Urutkan vendor",
    recommended: "Paling Sesuai",
    lowestPrice: "Harga Terendah",
    highestRating: "Rating Tertinggi",

    mostPopular: "Paling Populer",
    saveVendor: (vendor: string) =>
      `Simpan ${vendor}`,
    newVendor: "Baru",
    reviews: "ulasan",
    verified: "Terverifikasi",
    visaChoices: "Pilihan Visa",

    vendorDescription: (
      vendor: string,
      country: string,
    ) =>
      `${vendor} menyediakan layanan pengurusan Visa ${country} dengan pilihan produk yang dapat disesuaikan dengan kebutuhan perjalanan Anda.`,

    startingFrom: "Mulai dari",
    contactVendor: "Hubungi Vendor",
    viewVendor: "Lihat Vendor",

    vendorUnavailable:
      "Vendor Visa belum tersedia",
    vendorUnavailableDescription:
      "Saat vendor Visa tersedia, pilihan vendor akan ditampilkan di halaman ini.",

    chooseService:
      "Pilih layanan sesuai kebutuhan Anda",
    chooseServiceDescription:
      "Harga, estimasi proses, persyaratan, dan layanan dapat berbeda pada setiap Vendor Visa.",

    faq: "Pertanyaan Umum",
    otherPopularCountries:
      "Negara Populer Lainnya",
    viewVisa: "Lihat Visa",
  },

  EN: {
    flagAlt: (country: string) =>
      `${country} flag`,
    title: (country: string) =>
      `Visa for ${country}`,
    heroDescription: (country: string) =>
      `Find trusted vendors for your ${country} Visa application.`,
    heroDescriptionSecond:
      "Choose the vendor that best fits your travel needs.",

    trustedVendor: "Trusted Vendors",
    trustedVendorDescription:
      "Verified & experienced",
    easyProcess: "Easy Process",
    easyProcessDescription:
      "Online with professional assistance",
    support: "Support",
    supportDescription:
      "Throughout the application process",
    manyChoices: "More Choices",
    manyChoicesDescription:
      "Compare vendors & prices",

    vendorChoices: (country: string) =>
      `${country} Visa Vendors`,
    vendorChoicesDescription:
      "Compare services from trusted Segaloka vendors.",

    sortVendor: "Sort vendors",
    recommended: "Recommended",
    lowestPrice: "Lowest Price",
    highestRating: "Highest Rating",

    mostPopular: "Most Popular",
    saveVendor: (vendor: string) =>
      `Save ${vendor}`,
    newVendor: "New",
    reviews: "reviews",
    verified: "Verified",
    visaChoices: "Visa Options",

    vendorDescription: (
      vendor: string,
      country: string,
    ) =>
      `${vendor} provides ${country} Visa services with product options tailored to your travel needs.`,

    startingFrom: "Starting from",
    contactVendor: "Contact Vendor",
    viewVendor: "View Vendor",

    vendorUnavailable:
      "Visa vendors are not available yet",
    vendorUnavailableDescription:
      "Available Visa vendors will be displayed on this page.",

    chooseService:
      "Choose the service that fits your needs",
    chooseServiceDescription:
      "Prices, processing estimates, requirements, and services may vary by Visa Vendor.",

    faq: "Frequently Asked Questions",
    otherPopularCountries:
      "Other Popular Countries",
    viewVisa: "View Visa",
  },

  AR: {
    flagAlt: (country: string) =>
      `علم ${country}`,
    title: (country: string) =>
      `تأشيرة ${country}`,
    heroDescription: (country: string) =>
      `اعثر على مزودين موثوقين لخدمات تأشيرة ${country}.`,
    heroDescriptionSecond:
      "اختر المزود الأنسب لاحتياجات رحلتك.",

    trustedVendor: "مزودون موثوقون",
    trustedVendorDescription:
      "موثقون وذوو خبرة",
    easyProcess: "إجراءات سهلة",
    easyProcessDescription:
      "عبر الإنترنت وبمساعدة فريق متخصص",
    support: "الدعم",
    supportDescription:
      "طوال إجراءات الطلب",
    manyChoices: "خيارات متعددة",
    manyChoicesDescription:
      "قارن بين المزودين والأسعار",

    vendorChoices: (country: string) =>
      `مزودو تأشيرة ${country}`,
    vendorChoicesDescription:
      "قارن الخدمات المقدمة من مزودي Segaloka الموثوقين.",

    sortVendor: "ترتيب المزودين",
    recommended: "الأكثر ملاءمة",
    lowestPrice: "الأقل سعراً",
    highestRating: "الأعلى تقييماً",

    mostPopular: "الأكثر شعبية",
    saveVendor: (vendor: string) =>
      `حفظ ${vendor}`,
    newVendor: "جديد",
    reviews: "مراجعات",
    verified: "موثق",
    visaChoices: "خيارات التأشيرة",

    vendorDescription: (
      vendor: string,
      country: string,
    ) =>
      `يوفر ${vendor} خدمات تأشيرة ${country} مع خيارات منتجات تناسب احتياجات رحلتك.`,

    startingFrom: "ابتداءً من",
    contactVendor: "تواصل مع المزود",
    viewVendor: "عرض المزود",

    vendorUnavailable:
      "لا يتوفر مزودو تأشيرات حالياً",
    vendorUnavailableDescription:
      "سيتم عرض مزودي التأشيرات على هذه الصفحة عند توفرهم.",

    chooseService:
      "اختر الخدمة المناسبة لاحتياجاتك",
    chooseServiceDescription:
      "قد تختلف الأسعار ومدة المعالجة والمتطلبات والخدمات بين مزودي التأشيرات.",

    faq: "الأسئلة الشائعة",
    otherPopularCountries:
      "دول شائعة أخرى",
    viewVisa: "عرض التأشيرة",
  },
} satisfies Record<
  LanguageCode,
  Record<string, unknown>
>;