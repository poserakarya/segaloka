export type VendorRegistrationLanguage = "ID" | "EN" | "AR";

export const VENDOR_REGISTRATION_COPY = {
  ID: {
    back: "Kembali ke Vendor Partner",
    badge: "SEGALOKA VENDOR PARTNER",
    heroTitle: "Bergabung sebagai Vendor Segaloka",
    heroDescription:
      "Perluas jangkauan bisnis Anda dan hubungkan produk maupun layanan perjalanan dengan ekosistem Travel Segaloka.",

    benefits: [
      {
        title: "Jangkauan Travel Lebih Luas",
        description:
          "Tawarkan produk dan layanan kepada Travel dalam ekosistem Segaloka.",
      },
      {
        title: "Kelola Produk & Layanan",
        description:
          "Siapkan katalog, harga, ketersediaan, dan kebutuhan operasional.",
      },
      {
        title: "Transaksi Lebih Terstruktur",
        description:
          "Kelola permintaan, pesanan, pembayaran, dan settlement dalam satu alur.",
      },
      {
        title: "Ekosistem Terintegrasi",
        description:
          "Bangun hubungan bisnis berkelanjutan dengan jaringan Travel Segaloka.",
      },
    ],

    footerVerified: "Vendor terverifikasi",
    footerEcosystem: "Ekosistem Travel",

    steps: [
      "Data Vendor",
      "Produk & Layanan",
      "Dokumen",
      "Review",
    ],

    step1Eyebrow: "Tahap 1 dari 4",
    step1Title: "Data Vendor",
    step1Description:
      "Lengkapi identitas bisnis dan penanggung jawab utama Vendor.",

    step2Eyebrow: "Tahap 2 dari 4",
    step2Title: "Produk & Layanan",
    step2Description:
      "Tuliskan produk atau layanan yang disediakan oleh bisnis Anda.",

    step3Eyebrow: "Tahap 3 dari 4",
    step3Title: "Dokumen Legalitas",
    step3Description:
      "Pilih dokumen yang akan digunakan dalam proses verifikasi Vendor.",

    step4Eyebrow: "Tahap 4 dari 4",
    step4Title: "Review Pendaftaran",
    step4Description:
      "Periksa kembali data Vendor sebelum proses verifikasi dilanjutkan.",

    businessSection: "Informasi Bisnis",
    businessSectionDescription:
      "Identitas utama bisnis yang akan terdaftar sebagai Vendor Segaloka.",

    businessName: "Nama Bisnis / Vendor",
    businessNamePlaceholder: "Contoh: ABW Travel Service",

    legalName: "Nama Legal Perusahaan",
    legalNamePlaceholder: "PT / CV / badan usaha",

    businessType: "Bentuk Badan Usaha",
    businessTypePlaceholder: "Pilih badan usaha",

    businessTypeSole: "Usaha Perorangan",
    businessTypeFirm: "Firma",
    businessTypeCooperative: "Koperasi",
    businessTypeOther: "Lainnya",

    registrationNumber: "Nomor NIB / Registrasi",
    registrationNumberPlaceholder: "Nomor registrasi usaha",

    taxNumber: "NPWP",
    taxNumberPlaceholder: "Nomor NPWP",

    establishedYear: "Tahun Berdiri",
    establishedYearPlaceholder: "Contoh: 2024",

    businessEmail: "Email Bisnis",
    businessEmailPlaceholder: "vendor@perusahaan.com",

    website: "Website",
    websitePlaceholder: "https://",

    businessDescription: "Deskripsi Singkat Bisnis",
    businessDescriptionPlaceholder:
      "Jelaskan produk, layanan, wilayah operasional, dan profil singkat bisnis Anda.",

    picSection: "Penanggung Jawab / PIC",
    picSectionDescription:
      "Kontak utama yang mewakili bisnis dalam proses verifikasi dan operasional.",

    picName: "Nama PIC",
    picNamePlaceholder: "Nama lengkap",

    picPosition: "Jabatan",
    picPositionPlaceholder: "Direktur / Manager / PIC",

    picPhone: "Nomor WhatsApp",
    picPhonePlaceholder: "+62",

    picEmail: "Email PIC",
    picEmailPlaceholder: "nama@perusahaan.com",

    addressSection: "Alamat Bisnis",
    addressSectionDescription:
      "Alamat utama yang digunakan untuk identitas dan verifikasi bisnis.",

    fullAddress: "Alamat Lengkap",
    fullAddressPlaceholder:
      "Nama jalan, nomor, kecamatan, dan detail alamat",

    city: "Kota / Kabupaten",
    cityPlaceholder: "Kota / Kabupaten",

    province: "Provinsi",
    provincePlaceholder: "Provinsi",

    country: "Negara",
    countryPlaceholder: "Indonesia",

    postalCode: "Kode Pos",
    postalCodePlaceholder: "Kode pos",

    serviceLabel: "Jenis Produk / Layanan",
    serviceSectionDescription:
      "Vendor dapat memiliki lebih dari satu produk atau layanan sesuai kegiatan bisnisnya.",

    addServiceLabel: "Tambahkan Produk / Layanan",
    servicePlaceholder:
      "Contoh: Hotel Makkah, Bus Pariwisata, Visa Umrah",
    serviceHelp:
      "Ketik satu produk atau layanan lalu tekan Enter atau tombol Tambah.",

    add: "Tambah",
    remove: "Hapus",

    noServiceTitle: "Belum ada produk atau layanan",
    noServiceDescription:
      "Tambahkan sesuai bisnis Anda, misalnya hotel, transportasi, visa, tiket, catering, handling, aktivitas, atau layanan lainnya.",

    documentsSectionDescription:
      "Siapkan dokumen bisnis yang relevan untuk proses pemeriksaan Vendor.",

    businessDocument: "NIB / Izin Usaha",
    businessDocumentDescription:
      "Dokumen legalitas atau izin usaha yang berlaku.",

    taxDocument: "NPWP",
    taxDocumentDescription:
      "Dokumen NPWP perusahaan atau pemilik usaha.",

    identityDocument: "Identitas Penanggung Jawab",
    identityDocumentDescription:
      "KTP atau paspor Direktur / PIC yang berwenang.",

    supportingDocument: "Dokumen Pendukung",
    supportingDocumentDescription:
      "Dokumen tambahan sesuai jenis produk atau layanan.",

    fileTypes: "PDF, JPG atau PNG",

    documentNotice:
      "Dokumen yang dipilih tetap berada di perangkat Anda sampai proses pengiriman resmi dilakukan.",

    reviewVendorTitle: "Ringkasan Vendor",
    reviewVendorDescription:
      "Pastikan informasi utama bisnis sudah sesuai.",

    reviewVendorName: "Nama Vendor",
    reviewLegalName: "Nama Legal",
    reviewBusinessType: "Badan Usaha",
    reviewRegistration: "NIB / Registrasi",
    reviewBusinessEmail: "Email Bisnis",
    reviewPic: "PIC",
    reviewWhatsapp: "WhatsApp",
    reviewLocation: "Domisili",

    reviewServicesTitle: "Produk & Layanan",
    reviewServicesDescription:
      "Produk dan layanan yang akan diajukan untuk verifikasi.",
    reviewServicesEmpty: "Belum ada produk atau layanan.",

    reviewDocumentsTitle: "Dokumen",
    reviewDocumentsDescription:
      "Dokumen yang saat ini telah dipilih dari perangkat.",
    notSelected: "Belum dipilih",

    verificationTitle: "Verifikasi Vendor Segaloka",

    saveLocal: "Simpan Draft",
    saved: "Draft tersimpan di perangkat ini.",
    continue: "Lanjutkan",
    previous: "Kembali",
    finish: "Kirim untuk Verifikasi",
    finishNotice:
      "Pengiriman verifikasi akan tersedia saat layanan registrasi Vendor resmi diaktifkan.",

    required: "Wajib diisi",
  },

  EN: {
    back: "Back to Vendor Partner",
    badge: "SEGALOKA VENDOR PARTNER",
    heroTitle: "Join Segaloka as a Vendor",
    heroDescription:
      "Expand your business reach and connect your travel products and services with the Segaloka Travel ecosystem.",

    benefits: [
      {
        title: "Reach More Travel Businesses",
        description:
          "Offer your products and services to Travel businesses across the Segaloka ecosystem.",
      },
      {
        title: "Manage Products & Services",
        description:
          "Prepare your catalogue, pricing, availability, and operational requirements.",
      },
      {
        title: "Structured Transactions",
        description:
          "Manage requests, orders, payments, and settlements through one structured workflow.",
      },
      {
        title: "Integrated Ecosystem",
        description:
          "Build sustainable business relationships with the Segaloka Travel network.",
      },
    ],

    footerVerified: "Verified Vendor",
    footerEcosystem: "Travel Ecosystem",

    steps: [
      "Vendor Data",
      "Products & Services",
      "Documents",
      "Review",
    ],

    step1Eyebrow: "Step 1 of 4",
    step1Title: "Vendor Data",
    step1Description:
      "Complete your business identity and primary contact information.",

    step2Eyebrow: "Step 2 of 4",
    step2Title: "Products & Services",
    step2Description:
      "Add the products or services provided by your business.",

    step3Eyebrow: "Step 3 of 4",
    step3Title: "Legal Documents",
    step3Description:
      "Select the documents to be used for Vendor verification.",

    step4Eyebrow: "Step 4 of 4",
    step4Title: "Registration Review",
    step4Description:
      "Review your Vendor information before proceeding to verification.",

    businessSection: "Business Information",
    businessSectionDescription:
      "Primary business identity to be registered as a Segaloka Vendor.",

    businessName: "Business / Vendor Name",
    businessNamePlaceholder: "Example: ABW Travel Service",

    legalName: "Legal Company Name",
    legalNamePlaceholder: "Company / legal business entity",

    businessType: "Business Entity Type",
    businessTypePlaceholder: "Select business entity",

    businessTypeSole: "Sole Proprietorship",
    businessTypeFirm: "Partnership / Firm",
    businessTypeCooperative: "Cooperative",
    businessTypeOther: "Other",

    registrationNumber: "NIB / Registration Number",
    registrationNumberPlaceholder: "Business registration number",

    taxNumber: "Tax Number",
    taxNumberPlaceholder: "Tax identification number",

    establishedYear: "Year Established",
    establishedYearPlaceholder: "Example: 2024",

    businessEmail: "Business Email",
    businessEmailPlaceholder: "vendor@company.com",

    website: "Website",
    websitePlaceholder: "https://",

    businessDescription: "Business Description",
    businessDescriptionPlaceholder:
      "Describe your products, services, operating areas, and a brief business profile.",

    picSection: "Person in Charge",
    picSectionDescription:
      "Primary contact representing the business during verification and operations.",

    picName: "PIC Name",
    picNamePlaceholder: "Full name",

    picPosition: "Position",
    picPositionPlaceholder: "Director / Manager / PIC",

    picPhone: "WhatsApp Number",
    picPhonePlaceholder: "+62",

    picEmail: "PIC Email",
    picEmailPlaceholder: "name@company.com",

    addressSection: "Business Address",
    addressSectionDescription:
      "Primary address used for business identification and verification.",

    fullAddress: "Full Address",
    fullAddressPlaceholder:
      "Street name, number, district, and address details",

    city: "City / Regency",
    cityPlaceholder: "City / Regency",

    province: "Province",
    provincePlaceholder: "Province",

    country: "Country",
    countryPlaceholder: "Indonesia",

    postalCode: "Postal Code",
    postalCodePlaceholder: "Postal code",

    serviceLabel: "Product / Service Type",
    serviceSectionDescription:
      "A Vendor may provide multiple products or services according to its business activities.",

    addServiceLabel: "Add Product / Service",
    servicePlaceholder:
      "Example: Makkah Hotel, Tour Bus, Umrah Visa",
    serviceHelp:
      "Type one product or service and press Enter or the Add button.",

    add: "Add",
    remove: "Remove",

    noServiceTitle: "No products or services yet",
    noServiceDescription:
      "Add services relevant to your business, such as hotels, transportation, visas, tickets, catering, handling, activities, or other services.",

    documentsSectionDescription:
      "Prepare relevant business documents for the Vendor verification process.",

    businessDocument: "NIB / Business License",
    businessDocumentDescription:
      "Valid business legality document or business license.",

    taxDocument: "Tax Document",
    taxDocumentDescription:
      "Company or business owner's tax document.",

    identityDocument: "Person in Charge Identity",
    identityDocumentDescription:
      "Identity card or passport of the authorized Director / PIC.",

    supportingDocument: "Supporting Documents",
    supportingDocumentDescription:
      "Additional documents relevant to the product or service type.",

    fileTypes: "PDF, JPG or PNG",

    documentNotice:
      "Selected documents remain on your device until the official submission process is performed.",

    reviewVendorTitle: "Vendor Summary",
    reviewVendorDescription:
      "Make sure the primary business information is correct.",

    reviewVendorName: "Vendor Name",
    reviewLegalName: "Legal Name",
    reviewBusinessType: "Business Entity",
    reviewRegistration: "NIB / Registration",
    reviewBusinessEmail: "Business Email",
    reviewPic: "PIC",
    reviewWhatsapp: "WhatsApp",
    reviewLocation: "Location",

    reviewServicesTitle: "Products & Services",
    reviewServicesDescription:
      "Products and services that will be submitted for verification.",
    reviewServicesEmpty: "No products or services added.",

    reviewDocumentsTitle: "Documents",
    reviewDocumentsDescription:
      "Documents currently selected from your device.",
    notSelected: "Not selected",

    verificationTitle: "Segaloka Vendor Verification",

    saveLocal: "Save Draft",
    saved: "Draft saved on this device.",
    continue: "Continue",
    previous: "Back",
    finish: "Submit for Verification",
    finishNotice:
      "Verification submission will be available when Vendor registration is officially activated.",

    required: "Required",
  },

  AR: {
    back: "العودة إلى شركاء الموردين",
    badge: "شريك مورد سيجالوكا",
    heroTitle: "انضم إلى سيجالوكا كمورد",
    heroDescription:
      "وسّع نطاق أعمالك واربط منتجاتك وخدماتك السياحية بمنظومة السفر في سيجالوكا.",

    benefits: [
      {
        title: "الوصول إلى المزيد من شركات السفر",
        description:
          "اعرض منتجاتك وخدماتك على شركات السفر ضمن منظومة سيجالوكا.",
      },
      {
        title: "إدارة المنتجات والخدمات",
        description:
          "نظّم المنتجات والأسعار والتوافر والمتطلبات التشغيلية لنشاطك.",
      },
      {
        title: "معاملات أكثر تنظيماً",
        description:
          "أدر الطلبات والحجوزات والمدفوعات والتسويات ضمن مسار عمل واضح.",
      },
      {
        title: "منظومة متكاملة",
        description:
          "ابنِ علاقات أعمال مستدامة مع شبكة شركات السفر في سيجالوكا.",
      },
    ],

    footerVerified: "مورد موثّق",
    footerEcosystem: "منظومة السفر",

    steps: [
      "بيانات المورد",
      "المنتجات والخدمات",
      "المستندات",
      "المراجعة",
    ],

    step1Eyebrow: "الخطوة 1 من 4",
    step1Title: "بيانات المورد",
    step1Description:
      "أكمل بيانات النشاط التجاري ومعلومات جهة الاتصال الرئيسية.",

    step2Eyebrow: "الخطوة 2 من 4",
    step2Title: "المنتجات والخدمات",
    step2Description:
      "أضف المنتجات أو الخدمات التي يقدمها نشاطك التجاري.",

    step3Eyebrow: "الخطوة 3 من 4",
    step3Title: "المستندات القانونية",
    step3Description:
      "اختر المستندات المستخدمة في عملية التحقق من المورد.",

    step4Eyebrow: "الخطوة 4 من 4",
    step4Title: "مراجعة التسجيل",
    step4Description:
      "راجع بيانات المورد قبل المتابعة إلى عملية التحقق.",

    businessSection: "معلومات النشاط التجاري",
    businessSectionDescription:
      "الهوية الأساسية للنشاط التجاري الذي سيتم تسجيله كمورد في سيجالوكا.",

    businessName: "اسم النشاط / المورد",
    businessNamePlaceholder: "مثال: ABW Travel Service",

    legalName: "الاسم القانوني للشركة",
    legalNamePlaceholder: "شركة / مؤسسة / كيان تجاري",

    businessType: "نوع الكيان التجاري",
    businessTypePlaceholder: "اختر نوع الكيان التجاري",

    businessTypeSole: "مؤسسة فردية",
    businessTypeFirm: "شركة تضامن",
    businessTypeCooperative: "تعاونية",
    businessTypeOther: "أخرى",

    registrationNumber: "رقم NIB / التسجيل",
    registrationNumberPlaceholder: "رقم تسجيل النشاط التجاري",

    taxNumber: "الرقم الضريبي",
    taxNumberPlaceholder: "رقم التعريف الضريبي",

    establishedYear: "سنة التأسيس",
    establishedYearPlaceholder: "مثال: 2024",

    businessEmail: "البريد الإلكتروني للنشاط",
    businessEmailPlaceholder: "vendor@company.com",

    website: "الموقع الإلكتروني",
    websitePlaceholder: "https://",

    businessDescription: "نبذة عن النشاط التجاري",
    businessDescriptionPlaceholder:
      "اشرح المنتجات والخدمات ومناطق التشغيل ونبذة مختصرة عن نشاطك.",

    picSection: "المسؤول / جهة الاتصال",
    picSectionDescription:
      "جهة الاتصال الرئيسية التي تمثل النشاط التجاري في عمليات التحقق والتشغيل.",

    picName: "اسم المسؤول",
    picNamePlaceholder: "الاسم الكامل",

    picPosition: "المنصب",
    picPositionPlaceholder: "مدير / مسؤول / جهة اتصال",

    picPhone: "رقم واتساب",
    picPhonePlaceholder: "+62",

    picEmail: "البريد الإلكتروني للمسؤول",
    picEmailPlaceholder: "name@company.com",

    addressSection: "عنوان النشاط التجاري",
    addressSectionDescription:
      "العنوان الرئيسي المستخدم لهوية النشاط التجاري والتحقق منه.",

    fullAddress: "العنوان الكامل",
    fullAddressPlaceholder:
      "اسم الشارع والرقم والمنطقة وتفاصيل العنوان",

    city: "المدينة / المنطقة",
    cityPlaceholder: "المدينة / المنطقة",

    province: "المحافظة",
    provincePlaceholder: "المحافظة",

    country: "الدولة",
    countryPlaceholder: "إندونيسيا",

    postalCode: "الرمز البريدي",
    postalCodePlaceholder: "الرمز البريدي",

    serviceLabel: "نوع المنتج / الخدمة",
    serviceSectionDescription:
      "يمكن للمورد إضافة أكثر من منتج أو خدمة وفقاً لنشاطه التجاري.",

    addServiceLabel: "إضافة منتج / خدمة",
    servicePlaceholder:
      "مثال: فندق مكة، حافلات سياحية، تأشيرة عمرة",
    serviceHelp:
      "اكتب منتجاً أو خدمة واحدة ثم اضغط Enter أو زر الإضافة.",

    add: "إضافة",
    remove: "حذف",

    noServiceTitle: "لم تتم إضافة منتجات أو خدمات",
    noServiceDescription:
      "أضف الخدمات المناسبة لنشاطك مثل الفنادق أو النقل أو التأشيرات أو التذاكر أو التموين أو المناولة أو الأنشطة أو غيرها.",

    documentsSectionDescription:
      "جهّز مستندات النشاط التجاري ذات الصلة لإجراء التحقق من المورد.",

    businessDocument: "NIB / رخصة النشاط",
    businessDocumentDescription:
      "مستند قانوني أو رخصة نشاط سارية.",

    taxDocument: "المستند الضريبي",
    taxDocumentDescription:
      "المستند الضريبي للشركة أو مالك النشاط.",

    identityDocument: "هوية المسؤول",
    identityDocumentDescription:
      "بطاقة الهوية أو جواز سفر المدير أو المسؤول المخول.",

    supportingDocument: "مستندات داعمة",
    supportingDocumentDescription:
      "مستندات إضافية وفقاً لنوع المنتج أو الخدمة.",

    fileTypes: "PDF أو JPG أو PNG",

    documentNotice:
      "تبقى المستندات المحددة على جهازك حتى تنفيذ عملية الإرسال الرسمية.",

    reviewVendorTitle: "ملخص المورد",
    reviewVendorDescription:
      "تأكد من صحة المعلومات الرئيسية للنشاط التجاري.",

    reviewVendorName: "اسم المورد",
    reviewLegalName: "الاسم القانوني",
    reviewBusinessType: "نوع الكيان",
    reviewRegistration: "NIB / التسجيل",
    reviewBusinessEmail: "البريد الإلكتروني",
    reviewPic: "المسؤول",
    reviewWhatsapp: "واتساب",
    reviewLocation: "الموقع",

    reviewServicesTitle: "المنتجات والخدمات",
    reviewServicesDescription:
      "المنتجات والخدمات التي سيتم تقديمها للتحقق.",
    reviewServicesEmpty: "لم تتم إضافة منتجات أو خدمات.",

    reviewDocumentsTitle: "المستندات",
    reviewDocumentsDescription:
      "المستندات المحددة حالياً من جهازك.",
    notSelected: "لم يتم الاختيار",

    verificationTitle: "التحقق من مورد سيجالوكا",

    saveLocal: "حفظ المسودة",
    saved: "تم حفظ المسودة على هذا الجهاز.",
    continue: "متابعة",
    previous: "رجوع",
    finish: "إرسال للتحقق",
    finishNotice:
      "سيصبح إرسال طلب التحقق متاحاً عند تفعيل خدمة تسجيل الموردين رسمياً.",

    required: "مطلوب",
  },
} as const;

export function resolveVendorRegistrationLanguage(
  language: string,
): VendorRegistrationLanguage {
  if (language === "AR") return "AR";
  if (language === "EN") return "EN";
  return "ID";
}