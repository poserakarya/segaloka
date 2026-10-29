import type { LanguageCode } from "@/data/preferences";

export const visaBookingCopy = {
  ID: {
    steps: [
      "Data Pemohon",
      "Dokumen & Keberangkatan",
      "Review Data",
      "Pembayaran",
      "Konfirmasi",
    ],

    applicantData: "Data Pemohon",
    applicantDataDescription:
      "Isi data setiap pemohon sesuai dengan paspor dan pastikan semua informasi benar.",
    personalData: "Data Pribadi",
    personalDataApplicant: (number: number) =>
      `Data Pribadi — Pemohon ${number}`,
    selectGender: "Pilih jenis kelamin",
    selectTravelPurpose: "Pilih tujuan perjalanan",
    travelEstimateNote:
      "Tanggal keberangkatan dan kepulangan bersifat estimasi dan digunakan untuk membantu proses pengajuan Visa.",
    contactNote:
      "Pastikan email dan nomor telepon aktif agar informasi proses pengajuan dapat diterima dengan baik.",
    applicant: "Pemohon",
    applicantNumber: (number: number) => `Pemohon ${number}`,

    fullName: "Nama Lengkap",
    fullNamePassport: "Nama Lengkap (sesuai paspor) *",
    fullNamePlaceholder: "Masukkan nama lengkap",
    gender: "Jenis Kelamin",
    genderRequired: "Jenis Kelamin *",
    male: "Laki-laki",
    female: "Perempuan",
    select: "Pilih",

    birthPlace: "Tempat Lahir",
    birthPlaceRequired: "Tempat Lahir *",
    birthPlacePlaceholder: "Contoh: Makassar",
    birthDate: "Tanggal Lahir",
    birthDateRequired: "Tanggal Lahir *",
    nationality: "Kewarganegaraan",
    nationalityRequired: "Kewarganegaraan *",

    passportNumber: "Nomor Paspor",
    passportNumberRequired: "Nomor Paspor *",
    passportNumberPlaceholder: "Masukkan nomor paspor",
    passportIssueDate: "Tanggal Terbit Paspor",
    passportIssueDateRequired: "Tanggal Terbit Paspor *",
    passportExpiryDate: "Tanggal Berlaku Paspor",
    passportExpiryDateRequired: "Tanggal Berlaku Paspor *",

    travelPlan: "Rencana Keberangkatan",
    destinationCountry: "Negara Tujuan",
    destinationCity: "Kota Tujuan",
    destinationCityPlaceholder: "Contoh: Beijing",
    departureEstimate: "Tanggal Keberangkatan (Estimasi)",
    returnEstimate: "Tanggal Kembali (Estimasi)",
    departure: "Keberangkatan",
    return: "Kepulangan",
    departureDate: "Tanggal Keberangkatan",
    returnDate: "Tanggal Kepulangan",

    travelPurpose: "Tujuan Perjalanan",
    travelPurposeRequired: "Tujuan Perjalanan *",
    tourism: "Wisata",
    business: "Bisnis",
    visit: "Kunjungan",
    other: "Lainnya",

    contactInformation: "Informasi Kontak",
    email: "Email",
    emailRequired: "Email *",
    phone: "Nomor Telepon",
    phoneRequired: "Nomor Telepon *",

    domicileAddress: "Alamat Domisili",
    fullAddress: "Alamat Lengkap",
    fullAddressRequired: "Alamat Lengkap *",
    fullAddressPlaceholder: "Masukkan alamat lengkap",
    address: "Alamat",
    city: "Kota",
    cityRequired: "Kota *",
    province: "Provinsi",
    provinceRequired: "Provinsi *",
    postalCode: "Kode Pos",
    postalCodeRequired: "Kode Pos *",

    documentsAndDeparture: "Dokumen & Keberangkatan",
    documentsDepartureDescription:
      "Lengkapi dokumen sesuai produk Visa dan rencana perjalanan.",
    plannedReturn: "Rencana Kepulangan",
    applicationDocumentsDescription:
      "Dokumen mengikuti ketentuan produk Visa yang dipilih.",
    applicantNameEmpty: "Nama belum diisi",
    applicantDocuments: "Dokumen Pemohon",
    noDocuments:
      "Belum ada dokumen pengajuan yang ditetapkan untuk layanan Visa ini. Dokumen yang diperlukan akan mengikuti konfigurasi produk dari Vendor.",
    noMandatoryDocuments:
      "Anda dapat melanjutkan proses karena belum ada persyaratan atau dokumen wajib yang ditetapkan pada produk ini.",
    applicationDocuments: "Dokumen Pengajuan",
    requirements: "Persyaratan",
    documentsToUpload: "Dokumen yang Perlu Diunggah",
    uploadFile: "Unggah File",

    reviewData: "Review Data",

    reviewDescription:
      "Periksa kembali seluruh data sebelum melanjutkan ke pembayaran.",
    travelDetailsDescription:
      "Pastikan rencana perjalanan sudah sesuai dengan pengajuan Visa.",
    contactAndDomicileDescription:
      "Informasi ini digunakan untuk komunikasi terkait proses pengajuan.",
    reviewFinalNote:
      "Pastikan seluruh informasi sudah benar dan sesuai dengan dokumen perjalanan sebelum melanjutkan ke pembayaran.",
    travelDetails: "Detail Perjalanan",
    contactAndDomicile: "Kontak & Domisili",

    payment: "Pembayaran",
    paymentMethod: "Metode Pembayaran",
    selectPaymentMethod: "Pilih Metode Pembayaran",
    selectPaymentMethodDescription:
      "Pilih metode pembayaran untuk melanjutkan proses pengajuan Visa.",
    paymentMethodDescription:
      "Pilih salah satu metode pembayaran yang tersedia.",
    initialPaymentNote:
      "Pembayaran awal sesuai ketentuan produk",
    visaPriceApplicantsLabel: (count: number) =>
      `Harga Visa (${count} pemohon)`,
    paidNow: "Total Dibayar Sekarang",
    bankTransfer: "Transfer Bank",
    bankTransferDescription:
      "Pembayaran melalui transfer rekening bank.",
    virtualAccount: "Virtual Account",
    virtualAccountDescription:
      "Pembayaran menggunakan nomor Virtual Account.",
    eWallet: "E-Wallet",
    eWalletDescription:
      "Pembayaran melalui dompet digital.",
    creditDebitCard: "Kartu Kredit / Debit",
    creditDebitCardDescription:
      "Pembayaran menggunakan kartu kredit atau debit.",
    paymentProcessedBySegaloka:
      "Pembayaran diproses melalui sistem Segaloka.",
    serviceAndPayment: "Layanan & Pembayaran",
    visaService: "Layanan Visa",
    vendor: "Vendor",
    visaPrice: "Harga Visa",
    downPayment: "Down Payment (DP)",
    remainingBill: "Sisa Tagihan",
    paymentNow: "Total Pembayaran Saat Ini",
    fullPayment: "Pembayaran penuh",

    confirmation: "Konfirmasi",
    orderConfirmation: "Konfirmasi Pesanan",
    orderConfirmationDescription:
      "Periksa kembali seluruh informasi sebelum menyelesaikan pesanan.",
    confirmationTravelDescription:
      "Rencana perjalanan yang digunakan untuk pengajuan Visa.",
    departureDateLabel: "Tanggal Keberangkatan",
    returnDateLabel: "Tanggal Kepulangan",
    servicePaymentDescription:
      "Ringkasan layanan Visa dan pembayaran yang dipilih.",
    notSelectedPayment: "Belum dipilih",
    confirmationAgreement:
      "Dengan melanjutkan, Anda menyatakan bahwa data pemohon, rencana perjalanan, layanan Visa, dan rincian pembayaran yang ditampilkan sudah diperiksa dan sesuai.",
    consultationAfterDp: (vendor: string) =>
      `Setelah pembayaran DP terkonfirmasi, Anda dapat berkonsultasi dengan tim ${vendor} dan melanjutkan proses pengajuan Visa.`,
    consultationAfterPayment: (vendor: string) =>
      `Setelah pembayaran terkonfirmasi, Anda dapat berkonsultasi dengan tim ${vendor} dan melanjutkan proses pengajuan Visa.`,

    serviceSummary: "Ringkasan Layanan",
    secureData: "Data Anda diproses dengan aman melalui Segaloka.",
    entryType: "Tipe Masuk",
    validity: "Masa Berlaku",
    maxStay: "Maks. Tinggal",
    processingTime: "Waktu Proses",
    purpose: "Tujuan",

    applicantCount: "Jumlah Pemohon",
    applicantUnit: (count: number) =>
      `${count} pemohon`,
    visaPriceApplicants: (count: number) =>
      `Harga Visa (${count} pemohon)`,

    back: "Kembali",
    continue: "Lanjutkan",
    continuePayment: "Lanjutkan ke Pembayaran",
    confirmOrder: "Konfirmasi & Selesaikan Pesanan",

    productNotFound: "Produk Visa tidak ditemukan",
    productUnavailable:
      "Produk yang dipilih belum tersedia untuk proses booking.",

    notSelected: "Belum dipilih",
  },

  EN: {
    steps: [
      "Applicant Data",
      "Documents & Departure",
      "Review Data",
      "Payment",
      "Confirmation",
    ],

    applicantData: "Applicant Data",
    applicantDataDescription:
      "Enter each applicant's details exactly as shown on the passport and make sure all information is correct.",
    personalData: "Personal Data",
    personalDataApplicant: (number: number) =>
      `Personal Data — Applicant ${number}`,
    selectGender: "Select gender",
    selectTravelPurpose: "Select travel purpose",
    travelEstimateNote:
      "Departure and return dates are estimates and are used to assist with the Visa application process.",
    contactNote:
      "Make sure the email address and phone number are active so application updates can be received properly.",
    applicant: "Applicant",
    applicantNumber: (number: number) => `Applicant ${number}`,

    fullName: "Full Name",
    fullNamePassport: "Full Name (as shown on passport) *",
    fullNamePlaceholder: "Enter full name",
    gender: "Gender",
    genderRequired: "Gender *",
    male: "Male",
    female: "Female",
    select: "Select",

    birthPlace: "Place of Birth",
    birthPlaceRequired: "Place of Birth *",
    birthPlacePlaceholder: "Example: Makassar",
    birthDate: "Date of Birth",
    birthDateRequired: "Date of Birth *",
    nationality: "Nationality",
    nationalityRequired: "Nationality *",

    passportNumber: "Passport Number",
    passportNumberRequired: "Passport Number *",
    passportNumberPlaceholder: "Enter passport number",
    passportIssueDate: "Passport Issue Date",
    passportIssueDateRequired: "Passport Issue Date *",
    passportExpiryDate: "Passport Expiry Date",
    passportExpiryDateRequired: "Passport Expiry Date *",

    travelPlan: "Travel Plan",
    destinationCountry: "Destination Country",
    destinationCity: "Destination City",
    destinationCityPlaceholder: "Example: Beijing",
    departureEstimate: "Estimated Departure Date",
    returnEstimate: "Estimated Return Date",
    departure: "Departure",
    return: "Return",
    departureDate: "Departure Date",
    returnDate: "Return Date",

    travelPurpose: "Travel Purpose",
    travelPurposeRequired: "Travel Purpose *",
    tourism: "Tourism",
    business: "Business",
    visit: "Visit",
    other: "Other",

    contactInformation: "Contact Information",
    email: "Email",
    emailRequired: "Email *",
    phone: "Phone Number",
    phoneRequired: "Phone Number *",

    domicileAddress: "Residential Address",
    fullAddress: "Full Address",
    fullAddressRequired: "Full Address *",
    fullAddressPlaceholder: "Enter full address",
    address: "Address",
    city: "City",
    cityRequired: "City *",
    province: "Province",
    provinceRequired: "Province *",
    postalCode: "Postal Code",
    postalCodeRequired: "Postal Code *",

    documentsAndDeparture: "Documents & Departure",
    documentsDepartureDescription:
      "Complete the documents required for the selected Visa product and your travel plan.",
    plannedReturn: "Planned Return",
    applicationDocumentsDescription:
      "Documents follow the requirements of the selected Visa product.",
    applicantNameEmpty: "Name not entered",
    applicantDocuments: "Applicant Documents",
    noDocuments:
      "No application documents have been specified for this Visa service. Required documents will follow the Vendor's product configuration.",
    noMandatoryDocuments:
      "You may continue because no mandatory requirements or documents have been specified for this product.",
    applicationDocuments: "Application Documents",
    requirements: "Requirements",
    documentsToUpload: "Documents to Upload",
    uploadFile: "Upload File",

    reviewData: "Review Data",
    reviewDescription:
      "Review all information before continuing to payment.",
    travelDetailsDescription:
      "Make sure your travel plan matches the Visa application.",
    contactAndDomicileDescription:
      "This information is used for communication regarding the application process.",
    reviewFinalNote:
      "Make sure all information is correct and matches your travel documents before continuing to payment.",
    travelDetails: "Travel Details",
    contactAndDomicile: "Contact & Address",

    payment: "Payment",
    paymentMethod: "Payment Method",
    selectPaymentMethod: "Select Payment Method",
    selectPaymentMethodDescription:
      "Select a payment method to continue the Visa application process.",
    paymentMethodDescription:
      "Select one of the available payment methods.",
    initialPaymentNote:
      "Initial payment according to the product terms",
    visaPriceApplicantsLabel: (count: number) =>
      `Visa Price (${count} applicants)`,
    paidNow: "Total Paid Now",
    bankTransfer: "Bank Transfer",
    bankTransferDescription:
      "Payment by bank transfer.",
    virtualAccount: "Virtual Account",
    virtualAccountDescription:
      "Payment using a Virtual Account number.",
    eWallet: "E-Wallet",
    eWalletDescription:
      "Payment using a digital wallet.",
    creditDebitCard: "Credit / Debit Card",
    creditDebitCardDescription:
      "Payment using a credit or debit card.",
    paymentProcessedBySegaloka:
      "Payment is processed through the Segaloka system.",
    serviceAndPayment: "Service & Payment",
    visaService: "Visa Service",
    vendor: "Vendor",
    visaPrice: "Visa Price",
    downPayment: "Down Payment (DP)",
    remainingBill: "Remaining Balance",
    paymentNow: "Total Payment Due Now",
    fullPayment: "Full payment",

    confirmation: "Confirmation",
    orderConfirmation: "Order Confirmation",
    orderConfirmationDescription:
      "Review all information before completing your order.",
    confirmationTravelDescription:
      "Travel plan used for the Visa application.",
    departureDateLabel: "Departure Date",
    returnDateLabel: "Return Date",
    servicePaymentDescription:
      "Summary of the selected Visa service and payment.",
    notSelectedPayment: "Not selected",
    confirmationAgreement:
      "By continuing, you confirm that the applicant data, travel plan, Visa service, and payment details displayed have been reviewed and are correct.",
    consultationAfterDp: (vendor: string) =>
      `After the DP payment is confirmed, you can consult with the ${vendor} team and continue the Visa application process.`,
    consultationAfterPayment: (vendor: string) =>
      `After payment is confirmed, you can consult with the ${vendor} team and continue the Visa application process.`,

    serviceSummary: "Service Summary",
    secureData: "Your data is processed securely through Segaloka.",
    entryType: "Entry Type",
    validity: "Validity",
    maxStay: "Max. Stay",
    processingTime: "Processing Time",
    purpose: "Purpose",

    applicantCount: "Number of Applicants",
    applicantUnit: (count: number) =>
      `${count} ${count === 1 ? "applicant" : "applicants"}`,
    visaPriceApplicants: (count: number) =>
      `Visa Price (${count} ${count === 1 ? "applicant" : "applicants"})`,

    back: "Back",
    continue: "Continue",
    continuePayment: "Continue to Payment",
    confirmOrder: "Confirm & Complete Order",

    productNotFound: "Visa product not found",
    productUnavailable:
      "The selected product is not yet available for booking.",

    notSelected: "Not selected",
  },

  AR: {
    steps: [
      "بيانات مقدم الطلب",
      "المستندات والمغادرة",
      "مراجعة البيانات",
      "الدفع",
      "التأكيد",
    ],

    applicantData: "بيانات مقدم الطلب",
    applicantDataDescription:
      "أدخل بيانات كل مقدم طلب كما هي في جواز السفر وتأكد من صحة جميع المعلومات.",
    personalData: "البيانات الشخصية",
    personalDataApplicant: (number: number) =>
      `البيانات الشخصية — مقدم الطلب ${number}`,
    selectGender: "اختر الجنس",
    selectTravelPurpose: "اختر غرض السفر",
    travelEstimateNote:
      "تواريخ المغادرة والعودة تقديرية وتُستخدم للمساعدة في إجراءات طلب التأشيرة.",
    contactNote:
      "تأكد من أن البريد الإلكتروني ورقم الهاتف فعالان لاستلام تحديثات طلب التأشيرة بشكل صحيح.",
    applicant: "مقدم الطلب",
    applicantNumber: (number: number) => `مقدم الطلب ${number}`,

    fullName: "الاسم الكامل",
    fullNamePassport: "الاسم الكامل (كما في جواز السفر) *",
    fullNamePlaceholder: "أدخل الاسم الكامل",
    gender: "الجنس",
    genderRequired: "الجنس *",
    male: "ذكر",
    female: "أنثى",
    select: "اختر",

    birthPlace: "مكان الميلاد",
    birthPlaceRequired: "مكان الميلاد *",
    birthPlacePlaceholder: "مثال: Makassar",
    birthDate: "تاريخ الميلاد",
    birthDateRequired: "تاريخ الميلاد *",
    nationality: "الجنسية",
    nationalityRequired: "الجنسية *",

    passportNumber: "رقم جواز السفر",
    passportNumberRequired: "رقم جواز السفر *",
    passportNumberPlaceholder: "أدخل رقم جواز السفر",
    passportIssueDate: "تاريخ إصدار جواز السفر",
    passportIssueDateRequired: "تاريخ إصدار جواز السفر *",
    passportExpiryDate: "تاريخ انتهاء جواز السفر",
    passportExpiryDateRequired: "تاريخ انتهاء جواز السفر *",

    travelPlan: "خطة السفر",
    destinationCountry: "دولة الوجهة",
    destinationCity: "مدينة الوجهة",
    destinationCityPlaceholder: "مثال: Beijing",
    departureEstimate: "تاريخ المغادرة المتوقع",
    returnEstimate: "تاريخ العودة المتوقع",
    departure: "المغادرة",
    return: "العودة",
    departureDate: "تاريخ المغادرة",
    returnDate: "تاريخ العودة",

    travelPurpose: "غرض السفر",
    travelPurposeRequired: "غرض السفر *",
    tourism: "سياحة",
    business: "أعمال",
    visit: "زيارة",
    other: "أخرى",

    contactInformation: "معلومات الاتصال",
    email: "البريد الإلكتروني",
    emailRequired: "البريد الإلكتروني *",
    phone: "رقم الهاتف",
    phoneRequired: "رقم الهاتف *",

    domicileAddress: "عنوان الإقامة",
    fullAddress: "العنوان الكامل",
    fullAddressRequired: "العنوان الكامل *",
    fullAddressPlaceholder: "أدخل العنوان الكامل",
    address: "العنوان",
    city: "المدينة",
    cityRequired: "المدينة *",
    province: "المقاطعة",
    provinceRequired: "المقاطعة *",
    postalCode: "الرمز البريدي",
    postalCodeRequired: "الرمز البريدي *",

    documentsAndDeparture: "المستندات والمغادرة",
    documentsDepartureDescription:
      "أكمل المستندات المطلوبة لمنتج التأشيرة المحدد وخطة السفر.",
    plannedReturn: "العودة المخططة",
    applicationDocumentsDescription:
      "تتبع المستندات متطلبات منتج التأشيرة المحدد.",
    applicantNameEmpty: "لم يتم إدخال الاسم",
    applicantDocuments: "مستندات مقدم الطلب",
    noDocuments:
      "لم يتم تحديد مستندات طلب لهذه الخدمة بعد. ستتبع المستندات المطلوبة إعدادات المنتج لدى المزود.",
    noMandatoryDocuments:
      "يمكنك المتابعة لأنه لم يتم تحديد متطلبات أو مستندات إلزامية لهذا المنتج.",
    applicationDocuments: "مستندات الطلب",
    requirements: "المتطلبات",
    documentsToUpload: "المستندات المطلوب رفعها",
    uploadFile: "رفع الملف",

    reviewData: "مراجعة البيانات",
    reviewDescription:
      "راجع جميع البيانات قبل المتابعة إلى الدفع.",
    travelDetailsDescription:
      "تأكد من أن خطة السفر متوافقة مع طلب التأشيرة.",
    contactAndDomicileDescription:
      "تُستخدم هذه المعلومات للتواصل بشأن إجراءات الطلب.",
    reviewFinalNote:
      "تأكد من صحة جميع المعلومات ومطابقتها لوثائق السفر قبل المتابعة إلى الدفع.",
    travelDetails: "تفاصيل السفر",
    contactAndDomicile: "الاتصال والعنوان",

    payment: "الدفع",
    paymentMethod: "طريقة الدفع",
    selectPaymentMethod: "اختر طريقة الدفع",
    selectPaymentMethodDescription:
      "اختر طريقة الدفع للمتابعة في إجراءات طلب التأشيرة.",
    paymentMethodDescription:
      "اختر إحدى طرق الدفع المتاحة.",
    initialPaymentNote:
      "الدفعة الأولية وفقًا لشروط المنتج",
    visaPriceApplicantsLabel: (count: number) =>
      `سعر التأشيرة (${count} متقدم)`,
    paidNow: "إجمالي المبلغ المدفوع الآن",
    bankTransfer: "تحويل بنكي",
    bankTransferDescription:
      "الدفع عن طريق التحويل البنكي.",
    virtualAccount: "حساب افتراضي",
    virtualAccountDescription:
      "الدفع باستخدام رقم الحساب الافتراضي.",
    eWallet: "محفظة إلكترونية",
    eWalletDescription:
      "الدفع باستخدام المحفظة الإلكترونية.",
    creditDebitCard: "بطاقة ائتمان / خصم",
    creditDebitCardDescription:
      "الدفع باستخدام بطاقة ائتمان أو خصم.",
    paymentProcessedBySegaloka:
      "تتم معالجة الدفع من خلال نظام Segaloka.",
    serviceAndPayment: "الخدمة والدفع",
    visaService: "خدمة التأشيرة",
    vendor: "المزود",
    visaPrice: "سعر التأشيرة",
    downPayment: "الدفعة المقدمة",
    remainingBill: "الرصيد المتبقي",
    paymentNow: "إجمالي المبلغ المستحق الآن",
    fullPayment: "الدفع الكامل",

    confirmation: "التأكيد",
    orderConfirmation: "تأكيد الطلب",
    orderConfirmationDescription:
      "راجع جميع المعلومات قبل إكمال الطلب.",
    confirmationTravelDescription:
      "خطة السفر المستخدمة في طلب التأشيرة.",
    departureDateLabel: "تاريخ المغادرة",
    returnDateLabel: "تاريخ العودة",
    servicePaymentDescription:
      "ملخص خدمة التأشيرة وطريقة الدفع المختارة.",
    notSelectedPayment: "لم يتم الاختيار",
    confirmationAgreement:
      "بالمتابعة، فإنك تؤكد أن بيانات المتقدم وخطة السفر وخدمة التأشيرة وتفاصيل الدفع المعروضة قد تمت مراجعتها وهي صحيحة.",
    consultationAfterDp: (vendor: string) =>
      `بعد تأكيد دفعة DP، يمكنك التشاور مع فريق ${vendor} ومتابعة إجراءات طلب التأشيرة.`,
    consultationAfterPayment: (vendor: string) =>
      `بعد تأكيد الدفع، يمكنك التشاور مع فريق ${vendor} ومتابعة إجراءات طلب التأشيرة.`,

    serviceSummary: "ملخص الخدمة",
    secureData: "تتم معالجة بياناتك بأمان من خلال Segaloka.",
    entryType: "نوع الدخول",
    validity: "مدة الصلاحية",
    maxStay: "الحد الأقصى للإقامة",
    processingTime: "مدة المعالجة",
    purpose: "الغرض",

    applicantCount: "عدد المتقدمين",
    applicantUnit: (count: number) =>
      `${count} مقدم طلب`,
    visaPriceApplicants: (count: number) =>
      `سعر التأشيرة (${count} مقدم طلب)`,

    back: "رجوع",
    continue: "متابعة",
    continuePayment: "المتابعة إلى الدفع",
    confirmOrder: "تأكيد وإكمال الطلب",

    productNotFound: "منتج التأشيرة غير موجود",
    productUnavailable:
      "المنتج المحدد غير متاح للحجز حالياً.",

    notSelected: "لم يتم الاختيار",
  },
} satisfies Record<LanguageCode, Record<string, unknown>>;

export type VisaBookingCopy =
  (typeof visaBookingCopy)[LanguageCode];