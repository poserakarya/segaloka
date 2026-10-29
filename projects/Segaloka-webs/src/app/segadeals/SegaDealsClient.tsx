"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileText,
  HelpCircle,
  MapPin,
  Minus,
  Pencil,
  PlaneTakeoff,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import {
  useMarketplacePreferences,
} from "@/components/providers/MarketplacePreferencesProvider";

import {
  getSegaDealsTravelerTotal,
  segaDealsDestinations,
  segaDealsIndonesiaCities,
  segaDealsTripTypes,
  type SegaDealsTripType,
  type SegaDealsTraveler,
} from "@/data/segadeals";

import { useEffect, useMemo,
  useState, } from "react";

type Language = "ID" | "EN" | "AR";

const copy = {
  ID: {
    home: "Beranda",

    heroKicker: "SEGADEALS · REQUEST PERJALANAN",
    heroTitle:
      "Tentukan perjalanan Anda. Biarkan Travel memberikan penawaran terbaik.",
    heroDesc:
      "Cukup tentukan kebutuhan utama perjalanan seperti jenis perjalanan, kota keberangkatan, tujuan, jumlah traveler, budget, dan waktu keberangkatan. Request Anda akan diteruskan ke Travel yang sesuai dan mengaktifkan SegaDeals.",
    createRequest: "Buat Request SegaDeals",
    learn: "Pelajari Cara Kerjanya",

    request: "Request Traveler",
    matching: "Travel Sesuai",
    offers: "Penawaran Travel",

    aboutKicker: "MENGENAL SEGADEALS",
    aboutTitle: "Anda tentukan kebutuhan. Travel yang memberikan pilihan.",
    aboutDesc:
      "SegaDeals mempermudah Traveler mendapatkan pilihan perjalanan tanpa harus mencari paket satu per satu. Traveler membuat request sederhana, lalu sistem meneruskannya kepada Travel yang sesuai dengan jenis perjalanan dan mengaktifkan fitur SegaDeals.",

    whyTitle: "Kenapa menggunakan SegaDeals?",
    benefits: [
      [
        "Sesuai kebutuhan Anda",
        "Mulai dari kebutuhan perjalanan Anda sendiri, bukan dari paket yang sudah ditentukan.",
      ],
      [
        "Diteruskan ke Travel yang tepat",
        "Request hanya diteruskan kepada Travel yang sesuai dengan jenis perjalanan dan mengaktifkan SegaDeals.",
      ],
      [
        "Dapatkan beberapa penawaran",
        "Travel dapat membalas request dengan penawaran perjalanan yang menarik.",
      ],
      [
        "Anda yang menentukan",
        "Bandingkan penawaran yang masuk dan pilih yang paling pas untuk Anda.",
      ],
    ],

    howKicker: "CARA MENGGUNAKAN",
    howTitle: "Dari request sampai perjalanan Anda",
    steps: [
      [
        "Buat Request",
        "Pilih jenis perjalanan dan isi kebutuhan utama Anda.",
      ],
      [
        "Sistem Mencocokkan Travel",
        "Request diteruskan hanya ke Travel yang sesuai dan mengaktifkan SegaDeals.",
      ],
      [
        "Travel Membuat Penawaran",
        "Travel yang menerima request dapat memberikan penawaran terbaiknya.",
      ],
      [
        "Bandingkan Penawaran",
        "Lihat harga, jadwal, hotel, maskapai, fasilitas, dan detail lainnya.",
      ],
      [
        "Pilih yang Paling Pas",
        "Pilih satu penawaran yang paling sesuai dengan kebutuhan dan budget Anda.",
      ],
      [
        "Lanjut ke Transaksi",
        "Sistem membuat transaksi untuk pembayaran dan proses dokumen Traveler.",
      ],
    ],

    flowKicker: "CARA SEGADEALS BEKERJA",
    flowTitle: "Satu request dapat menerima beberapa penawaran Travel.",
    flowDesc:
      "Travel tidak mengubah request Anda. Travel membalas kebutuhan tersebut dengan penawaran masing-masing. Anda bebas membandingkan dan memilih satu penawaran yang paling cocok.",
    flowPoints: [
      "Request hanya dikirim ke Travel yang relevan dengan jenis perjalanan.",
      "Travel harus mengaktifkan fitur SegaDeals untuk menerima request.",
      "Budget Traveler menjadi acuan kebutuhan, bukan harga transaksi otomatis.",
      "Setiap Travel dapat memberikan harga dan fasilitas yang berbeda.",
      "Setelah satu penawaran dipilih, sistem melanjutkan ke proses transaksi.",
    ],

    important: "Privasi & proses transaksi",
    importantItems: [
      "Dokumen pribadi tidak diperlukan saat baru membuat request.",
      "Data Traveler lengkap diminta setelah Anda memilih penawaran.",
      "Link/halaman transaksi dibuat melalui sistem Segaloka.",
      "Pembayaran dan kebutuhan dokumen mengikuti transaksi yang dipilih.",
    ],

    builderKicker: "BUAT REQUEST SEGADEALS",
    builderTitle: "Perjalanan seperti apa yang Anda inginkan?",
    builderDesc:
      "Isi kebutuhan utama terlebih dahulu. Pada tahap UI ini request belum dikirim ke backend.",

    tripType: "Jenis Perjalanan",
    origin: "Dari",
    destination: "Tujuan Masuk",
    travelers: "Traveler",
    budget: "Budget",
    departure: "Tanggal & Bulan",
    notes: "Catatan",
    optional: "Opsional",

    tripPlaceholder: "Pilih jenis perjalanan",
    originPlaceholder: "Pilih kota keberangkatan",
    destinationPlaceholder: "Pilih tujuan masuk",
    travelerPlaceholder: "Tentukan jumlah traveler",
    budgetPlaceholder: "Masukkan budget",
    departurePlaceholder: "Pilih tanggal & bulan",
    notesPlaceholder:
      "Tambahkan kebutuhan khusus bila ada",

    sendRequest: "Kirim Request ke Travel",
    uiNotice:
      "Pengiriman request akan diaktifkan setelah alur backend SegaDeals terhubung.",

    faqKicker: "PERTANYAAN UMUM",
    faqTitle: "Tentang SegaDeals",
    faqs: [
      [
        "Apakah SegaDeals adalah paket perjalanan?",
        "Bukan. SegaDeals adalah fitur untuk membuat request perjalanan dan menerima penawaran dari Travel yang sesuai.",
      ],
      [
        "Travel mana yang menerima request saya?",
        "Hanya Travel yang sesuai dengan jenis perjalanan dan mengaktifkan fitur SegaDeals yang dapat menerima request tersebut.",
      ],
      [
        "Apakah Travel harus mengikuti budget saya?",
        "Budget menjadi acuan kebutuhan Traveler. Travel dapat memberikan penawaran dengan harga dan fasilitas yang menurut mereka paling sesuai.",
      ],
      [
        "Apakah saya harus memilih penawaran yang masuk?",
        "Tidak. Traveler bebas membandingkan penawaran dan menentukan mana yang paling sesuai.",
      ],
      [
        "Kapan saya diminta mengisi dokumen Traveler?",
        "Data dan dokumen lengkap diminta setelah Anda memilih penawaran dan proses transaksi dibuat.",
      ],
      [
        "Bagaimana pembayaran dilakukan?",
        "Setelah penawaran dipilih, sistem Segaloka membuat transaksi untuk melanjutkan pembayaran sesuai ketentuan yang berlaku.",
      ],
    ],
  },

  EN: {
    home: "Home",

    heroKicker: "SEGADEALS · TRAVEL REQUEST",
    heroTitle:
      "Define your journey. Let Travel companies send their best offers.",
    heroDesc:
      "Tell us the essentials: travel type, departure city, destination, number of travelers, budget, and departure time. Your request is matched with eligible Travel companies that have SegaDeals enabled.",
    createRequest: "Create SegaDeals Request",
    learn: "How It Works",

    request: "Traveler Request",
    matching: "Matched Travel",
    offers: "Travel Offers",

    aboutKicker: "DISCOVER SEGADEALS",
    aboutTitle: "You define the need. Travel companies provide the choices.",
    aboutDesc:
      "SegaDeals helps Travelers find suitable travel options without searching through packages one by one. Create a simple request and Segaloka routes it to relevant Travel companies with SegaDeals enabled.",

    whyTitle: "Why use SegaDeals?",
    benefits: [
      [
        "Built around your needs",
        "Start from your own travel requirements instead of a predefined package.",
      ],
      [
        "Matched to relevant Travel",
        "Requests are routed only to eligible Travel companies with SegaDeals enabled.",
      ],
      [
        "Receive multiple offers",
        "Matched Travel companies can respond with attractive travel offers.",
      ],
      [
        "You make the choice",
        "Compare incoming offers and choose the one that fits you best.",
      ],
    ],

    howKicker: "HOW TO USE",
    howTitle: "From request to your journey",
    steps: [
      ["Create a Request", "Choose your travel type and enter your essential needs."],
      ["Travel Matching", "Segaloka routes the request to relevant SegaDeals-enabled Travel companies."],
      ["Travel Sends an Offer", "Matched Travel companies can respond with their best offers."],
      ["Compare Offers", "Review prices, schedules, hotels, airlines, facilities, and other details."],
      ["Choose the Best Fit", "Select the offer that best matches your needs and budget."],
      ["Continue to Transaction", "Segaloka creates the transaction flow for payment and Traveler documents."],
    ],

    flowKicker: "HOW SEGADEALS WORKS",
    flowTitle: "One request can receive multiple Travel offers.",
    flowDesc:
      "Travel companies do not modify your request. They respond to it with their own offers. You can compare them and select the one that fits you best.",
    flowPoints: [
      "Requests are routed only to Travel companies relevant to the travel type.",
      "Travel companies must enable SegaDeals to receive requests.",
      "The Traveler's budget is a reference, not an automatic transaction price.",
      "Each Travel company may offer different prices and facilities.",
      "Once an offer is selected, the system continues to the transaction process.",
    ],

    important: "Privacy & transaction process",
    importantItems: [
      "Personal documents are not required when creating the initial request.",
      "Complete Traveler data is requested after an offer is selected.",
      "The transaction page/link is generated through Segaloka.",
      "Payment and document requirements follow the selected transaction.",
    ],

    builderKicker: "CREATE SEGADEALS REQUEST",
    builderTitle: "What kind of journey are you looking for?",
    builderDesc:
      "Enter the essentials first. At this UI stage, requests are not yet submitted to the backend.",

    tripType: "Travel Type",
    origin: "From",
    destination: "Entry Destination",
    travelers: "Travelers",
    budget: "Budget",
    departure: "Date & Month",
    notes: "Notes",
    optional: "Optional",

    tripPlaceholder: "Choose travel type",
    originPlaceholder: "Choose departure city",
    destinationPlaceholder: "Choose entry destination",
    travelerPlaceholder: "Set number of travelers",
    budgetPlaceholder: "Enter your budget",
    departurePlaceholder: "Choose date & month",
    notesPlaceholder: "Add special requirements if needed",

    sendRequest: "Send Request to Travel",
    uiNotice:
      "Request submission will be enabled when the SegaDeals backend flow is connected.",

    faqKicker: "FREQUENTLY ASKED QUESTIONS",
    faqTitle: "About SegaDeals",
    faqs: [
      [
        "Is SegaDeals a travel package?",
        "No. SegaDeals lets Travelers create travel requests and receive offers from matched Travel companies.",
      ],
      [
        "Which Travel companies receive my request?",
        "Only eligible Travel companies matching the travel type and with SegaDeals enabled can receive it.",
      ],
      [
        "Must Travel companies follow my exact budget?",
        "Your budget is a reference. Travel companies may provide offers with prices and facilities they consider suitable.",
      ],
      [
        "Do I have to choose an offer?",
        "No. You can compare the offers received and decide which one fits you best.",
      ],
      [
        "When do I submit Traveler documents?",
        "Complete data and documents are requested after an offer is selected and a transaction is created.",
      ],
      [
        "How does payment work?",
        "After you select an offer, Segaloka creates the transaction flow so you can continue to payment.",
      ],
    ],
  },

  AR: {
    home: "الرئيسية",

    heroKicker: "SEGADEALS · طلب رحلة",
    heroTitle:
      "حدد رحلتك ودع شركات السفر تقدم لك أفضل العروض.",
    heroDesc:
      "حدد نوع الرحلة ومدينة المغادرة والوجهة وعدد المسافرين والميزانية وموعد السفر. يقوم Segaloka بتوجيه طلبك إلى شركات السفر المناسبة التي فعّلت SegaDeals.",
    createRequest: "إنشاء طلب SegaDeals",
    learn: "طريقة العمل",

    request: "طلب المسافر",
    matching: "شركة سفر مناسبة",
    offers: "عروض السفر",

    aboutKicker: "تعرّف على SEGADEALS",
    aboutTitle: "أنت تحدد احتياجك، وشركات السفر تقدم الخيارات.",
    aboutDesc:
      "تساعد SegaDeals المسافر على إيجاد خيارات مناسبة دون البحث في الباقات واحدة تلو الأخرى. أنشئ طلباً بسيطاً وسيقوم Segaloka بتوجيهه إلى شركات السفر المناسبة التي فعّلت SegaDeals.",

    whyTitle: "لماذا تستخدم SegaDeals؟",
    benefits: [
      ["حسب احتياجك", "ابدأ من متطلبات رحلتك بدلاً من باقة محددة مسبقاً."],
      ["مطابقة مع السفر المناسب", "يتم توجيه الطلب فقط إلى شركات السفر المؤهلة التي فعّلت SegaDeals."],
      ["استقبل عدة عروض", "يمكن لشركات السفر المناسبة الرد بعروض سفر جذابة."],
      ["الاختيار لك", "قارن العروض واختر العرض الأنسب لك."],
    ],

    howKicker: "طريقة الاستخدام",
    howTitle: "من الطلب إلى رحلتك",
    steps: [
      ["أنشئ الطلب", "اختر نوع الرحلة وأدخل احتياجاتك الأساسية."],
      ["مطابقة شركات السفر", "يتم إرسال الطلب إلى شركات السفر المناسبة التي فعّلت SegaDeals."],
      ["إرسال العرض", "يمكن لشركات السفر المطابقة تقديم أفضل عروضها."],
      ["قارن العروض", "راجع الأسعار والمواعيد والفنادق وشركات الطيران والخدمات."],
      ["اختر الأنسب", "اختر العرض الأنسب لاحتياجاتك وميزانيتك."],
      ["انتقل إلى المعاملة", "ينشئ Segaloka مسار المعاملة للدفع ومستندات المسافر."],
    ],

    flowKicker: "كيف تعمل SEGADEALS",
    flowTitle: "يمكن لطلب واحد استقبال عدة عروض من شركات السفر.",
    flowDesc:
      "لا تقوم شركات السفر بتغيير طلبك، بل ترد عليه بعروضها الخاصة. ويمكنك المقارنة واختيار العرض الأنسب.",
    flowPoints: [
      "يتم توجيه الطلب فقط إلى شركات السفر المناسبة لنوع الرحلة.",
      "يجب على شركة السفر تفعيل SegaDeals لاستقبال الطلبات.",
      "ميزانية المسافر مرجع للاحتياج وليست سعراً تلقائياً للمعاملة.",
      "يمكن لكل شركة سفر تقديم سعر وخدمات مختلفة.",
      "بعد اختيار عرض واحد ينتقل النظام إلى عملية المعاملة.",
    ],

    important: "الخصوصية وعملية المعاملة",
    importantItems: [
      "لا يلزم تقديم المستندات الشخصية عند إنشاء الطلب الأولي.",
      "يتم طلب بيانات المسافر الكاملة بعد اختيار العرض.",
      "يتم إنشاء صفحة أو رابط المعاملة عبر Segaloka.",
      "الدفع والمستندات المطلوبة تتبع المعاملة المختارة.",
    ],

    builderKicker: "إنشاء طلب SEGADEALS",
    builderTitle: "ما الرحلة التي تبحث عنها؟",
    builderDesc:
      "أدخل الاحتياجات الأساسية أولاً. في مرحلة الواجهة الحالية لن يتم إرسال الطلب إلى النظام الخلفي.",

    tripType: "نوع الرحلة",
    origin: "من",
    destination: "وجهة الدخول",
    travelers: "المسافرون",
    budget: "الميزانية",
    departure: "التاريخ والشهر",
    notes: "ملاحظات",
    optional: "اختياري",

    tripPlaceholder: "اختر نوع الرحلة",
    originPlaceholder: "اختر مدينة المغادرة",
    destinationPlaceholder: "اختر وجهة الدخول",
    travelerPlaceholder: "حدد عدد المسافرين",
    budgetPlaceholder: "أدخل الميزانية",
    departurePlaceholder: "اختر التاريخ والشهر",
    notesPlaceholder: "أضف متطلبات خاصة عند الحاجة",

    sendRequest: "إرسال الطلب إلى شركات السفر",
    uiNotice:
      "سيتم تفعيل إرسال الطلب بعد ربط مسار SegaDeals بالنظام الخلفي.",

    faqKicker: "الأسئلة الشائعة",
    faqTitle: "حول SegaDeals",
    faqs: [
      ["هل SegaDeals باقة سفر؟", "لا. تتيح SegaDeals للمسافر إنشاء طلب واستقبال عروض من شركات السفر المناسبة."],
      ["من يستقبل طلبي؟", "فقط شركات السفر المؤهلة لنوع الرحلة والتي فعّلت SegaDeals."],
      ["هل يجب الالتزام بميزانيتي تماماً؟", "الميزانية مرجع للاحتياج ويمكن لشركة السفر تقديم السعر والخدمات المناسبة."],
      ["هل يجب أن أختار أحد العروض؟", "لا. يمكنك مقارنة العروض واختيار الأنسب لك."],
      ["متى أقدم مستندات المسافر؟", "يتم طلب البيانات والمستندات الكاملة بعد اختيار العرض وإنشاء المعاملة."],
      ["كيف يتم الدفع؟", "بعد اختيار العرض ينشئ Segaloka مسار المعاملة للانتقال إلى الدفع."],
    ],
  },
} as const;

const benefitIcons = [
  Search,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
];

const stepIcons = [
  FileText,
  Search,
  Send,
  Sparkles,
  CheckCircle2,
  WalletCards,
];

export default function SegaDealsClient() {
  const {
    language,
    direction,
    currency,
    locale,
  } = useMarketplacePreferences();

  const [tripType, setTripType] =
    useState<SegaDealsTripType>("Umrah");

  /* SEGADEALS_PICKER_V9 */
  const [origin, setOrigin] = useState("");
  const [originQuery, setOriginQuery] = useState("");
  const [originOpen, setOriginOpen] = useState(false);

  const [destination, setDestination] = useState("");
  const [customDestination, setCustomDestination] = useState("");

  const [destinationOpen, setDestinationOpen] =
    useState(false);

  const [destinationQuery, setDestinationQuery] =
    useState("");

  /* SEGADEALS_PICKER_OUTSIDE_V11 */
  const [dateOpen, setDateOpen] =
    useState(false);

  const [calendarCursor, setCalendarCursor] =
    useState(() => {
      const now = new Date();

      return new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );
    });

  const [travelers, setTravelers] =
    useState<SegaDealsTraveler>({
      adult: 1,
      child: 0,
      infant: 0,
    });

  const [budget, setBudget] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [notes, setNotes] = useState("");

  const [requestStage, setRequestStage] =
    useState<"form" | "review" | "confirmed">("form");

  useEffect(() => {
    const closePickersFromOutside = (
      event: PointerEvent,
    ) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      /*
       * Klik di dalam trigger / popover tidak boleh
       * menutup picker sebelum event internal selesai.
       */
      if (
        target.closest(
          ".segadeals-picker-anchor, .segadeals-combobox, .segadeals-picker-popover",
        )
      ) {
        return;
      }

      setOriginOpen(false);
      setDestinationOpen(false);
      setDateOpen(false);
    };

    document.addEventListener(
      "pointerdown",
      closePickersFromOutside,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        closePickersFromOutside,
      );
    };
  }, []);

  const filteredOrigins = useMemo(() => {
    const query = originQuery.trim().toLocaleLowerCase();

    if (!query) {
      return segaDealsIndonesiaCities;
    }

    return segaDealsIndonesiaCities.filter((city) =>
      city.toLocaleLowerCase().includes(query),
    );
  }, [originQuery]);

  const destinationOptions =
    segaDealsDestinations[tripType];

  const selectedDestination =
    tripType === "Custom"
      ? customDestination.trim()
      : destination;

  const filteredDestinations = useMemo(() => {
    const query =
      destinationQuery
        .trim()
        .toLocaleLowerCase();

    if (!query) {
      return destinationOptions;
    }

    return destinationOptions.filter((item) =>
      item.toLocaleLowerCase().includes(query),
    );
  }, [destinationOptions, destinationQuery]);

  const calendarLocale =
    language === "ID"
      ? "id-ID"
      : language === "AR"
        ? "ar-SA"
        : "en-US";

  const calendarMonthFormatter =
    new Intl.DateTimeFormat(calendarLocale, {
      month: "long",
      year: "numeric",
    });

  const calendarWeekdays =
    language === "ID"
      ? ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
      : language === "AR"
        ? ["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"]
        : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const toDateKey = (date: Date) => {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1,
    ).padStart(2, "0");

    const day = String(
      date.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const buildCalendarDays = (
    monthDate: Date,
  ) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDay =
      new Date(year, month, 1).getDay();

    const totalDays =
      new Date(
        year,
        month + 1,
        0,
      ).getDate();

    const previousMonthDays =
      new Date(
        year,
        month,
        0,
      ).getDate();

    const cells: Array<{
      date: Date;
      currentMonth: boolean;
    }> = [];

    for (
      let offset = firstDay - 1;
      offset >= 0;
      offset -= 1
    ) {
      cells.push({
        date: new Date(
          year,
          month - 1,
          previousMonthDays - offset,
        ),
        currentMonth: false,
      });
    }

    for (
      let day = 1;
      day <= totalDays;
      day += 1
    ) {
      cells.push({
        date: new Date(
          year,
          month,
          day,
        ),
        currentMonth: true,
      });
    }

    let nextDay = 1;

    while (cells.length < 42) {
      cells.push({
        date: new Date(
          year,
          month + 1,
          nextDay,
        ),
        currentMonth: false,
      });

      nextDay += 1;
    }

    return cells;
  };

  const calendarSecondMonth =
    new Date(
      calendarCursor.getFullYear(),
      calendarCursor.getMonth() + 1,
      1,
    );

  const calendarMonths = [
    calendarCursor,
    calendarSecondMonth,
  ];

  const chooseDestination = (
    value: string,
  ) => {
    setDestination(value);
    setDestinationQuery("");

    setOriginOpen(false);
    setDestinationOpen(false);
    setDateOpen(false);

    setRequestStage("form");
  };

  const chooseDepartureDate = (
    date: Date,
  ) => {
    const value = toDateKey(date);

    if (value < minimumDate) {
      return;
    }

    setDepartureDate(value);

    setOriginOpen(false);
    setDestinationOpen(false);
    setDateOpen(false);

    setRequestStage("form");
  };

  const moveCalendar = (
    delta: number,
  ) => {
    setCalendarCursor((current) =>
      new Date(
        current.getFullYear(),
        current.getMonth() + delta,
        1,
      ),
    );
  };

  const travelerTotal =
    getSegaDealsTravelerTotal(travelers);

  const numericBudget =
    Number(budget.replace(/[^0-9]/g, ""));

  const isRequestValid =
    origin.trim().length > 0 &&
    selectedDestination.length > 0 &&
    travelerTotal > 0 &&
    numericBudget > 0 &&
    departureDate.length > 0;

  const minimumDate = new Date()
    .toISOString()
    .slice(0, 10);

  const budgetDisplay = numericBudget
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits:
          currency === "IDR" ? 0 : 2,
        minimumFractionDigits: 0,
      }).format(numericBudget)
    : "-";

  const departureDisplay = departureDate
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(
        new Date(`${departureDate}T00:00:00`),
      )
    : "-";

  const updateTraveler = (
    key: keyof SegaDealsTraveler,
    delta: number,
  ) => {
    setTravelers((current) => {
      const next = Math.max(0, current[key] + delta);

      if (
        key === "adult" &&
        next === 0 &&
        current.child === 0 &&
        current.infant === 0
      ) {
        return current;
      }

      return {
        ...current,
        [key]: next,
      };
    });
  };

  const chooseTripType = (
    nextType: SegaDealsTripType,
  ) => {
    setTripType(nextType);
    setDestination("");
    setDestinationQuery("");
    setDestinationOpen(false);
    setCustomDestination("");
    setRequestStage("form");
  };

  const chooseOrigin = (city: string) => {
    setOrigin(city);
    setOriginQuery(city);

    setOriginOpen(false);
    setDestinationOpen(false);
    setDateOpen(false);
  };

  const resetRequest = () => {
    setTripType("Umrah");
    setOrigin("");
    setOriginQuery("");
    setOriginOpen(false);
    setDestination("");
    setDestinationQuery("");
    setDestinationOpen(false);
    setCustomDestination("");
    setDateOpen(false);
    setTravelers({
      adult: 1,
      child: 0,
      infant: 0,
    });
    setBudget("");
    setDepartureDate("");
    setNotes("");
    setRequestStage("form");
  };

  const t =
    copy[(language as Language) ?? "ID"] ??
    copy.ID;

  const scrollToRequest = () => {
    document
      .getElementById("segadeals-request")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const scrollToHow = () => {
    document
      .getElementById("segadeals-how")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  return (
    <main
      className="segadeals-page"
      dir={direction}
      lang={
        language === "AR"
          ? "ar"
          : language === "EN"
            ? "en"
            : "id"
      }
    >
      <section className="segadeals-hero">
        <div className="segadeals-shell segadeals-hero-inner">
          <div className="segadeals-breadcrumb">
            <a href="/">{t.home}</a>
            <span>/</span>
            <strong>SegaDeals</strong>
          </div>

          <div className="segadeals-hero-grid">
            <div className="segadeals-hero-copy">
              <span className="segadeals-eyebrow">
                {t.heroKicker}
              </span>

              <h1>{language === "ID" ? (
  <>
    Tentukan perjalanan Anda. Biarkan Travel memberikan{" "}
    <strong>penawaran terbaik.</strong>
  </>
) : (
  t.heroTitle
)}</h1>
              <p>{t.heroDesc}</p>

              <div className="segadeals-hero-actions">
                <button
                  type="button"
                  className="segadeals-button segadeals-button-primary"
                  onClick={scrollToRequest}
                >
                  {t.createRequest}
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  className="segadeals-button segadeals-button-secondary"
                  onClick={scrollToHow}
                >
                  {t.learn}
                </button>
              </div>
            </div>

            <div className="segadeals-request-visual">
              <div className="segadeals-request-node is-main">
                <div className="segadeals-request-node-icon">
                  <Users size={22} />
                </div>
                <div>
                  <span>01</span>
                  <strong>{t.request}</strong>
                </div>
              </div>

              <div className="segadeals-request-line" />

              <div className="segadeals-request-node">
                <div className="segadeals-request-node-icon">
                  <Search size={20} />
                </div>
                <div>
                  <span>02</span>
                  <strong>{t.matching}</strong>
                </div>
              </div>

              <div className="segadeals-request-line" />

              <div className="segadeals-request-node">
                <div className="segadeals-request-node-icon">
                  <Sparkles size={20} />
                </div>
                <div>
                  <span>03</span>
                  <strong>{t.offers}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="segadeals-section segadeals-about-section">
        <div className="segadeals-shell">
          <div className="segadeals-intro">
            <span className="segadeals-section-eyebrow">
              {t.aboutKicker}
            </span>
            <h2>{t.aboutTitle}</h2>
            <p>{t.aboutDesc}</p>
          </div>

          <h3 className="segadeals-benefit-title">
            {t.whyTitle}
          </h3>

          <div className="segadeals-benefit-grid">
            {t.benefits.map((item, index) => {
              const Icon = benefitIcons[index];

              return (
                <article
                  className="segadeals-benefit-card"
                  key={item[0]}
                >
                  <div className="segadeals-icon-box">
                    <Icon size={22} />
                  </div>
                  <h3>{item[0]}</h3>
                  <p>{item[1]}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="segadeals-section segadeals-how-section"
        id="segadeals-how"
      >
        <div className="segadeals-shell">
          <div className="segadeals-section-heading">
            <span className="segadeals-section-eyebrow">
              {t.howKicker}
            </span>
            <h2>{t.howTitle}</h2>
          </div>

          <div className="segadeals-step-grid segadeals-step-grid-six">
            {t.steps.map((step, index) => {
              const Icon = stepIcons[index];

              return (
                <article
                  className="segadeals-step"
                  key={step[0]}
                >
                  <div className="segadeals-step-number">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="segadeals-step-icon">
                    <Icon size={21} />
                  </div>

                  <h3>{step[0]}</h3>
                  <p>{step[1]}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="segadeals-section segadeals-request-section segadeals-request-v3"
        id="segadeals-request"
      >
        <div className="segadeals-shell">
          <div className="segadeals-builder-heading">
            <div>
              <span className="segadeals-section-eyebrow">
                {t.builderKicker}
              </span>
              <h2>{t.builderTitle}</h2>
              <p>
                Tentukan kebutuhan utama perjalanan Anda.
                Travel akan melengkapi detail hotel, maskapai,
                durasi, fasilitas, dan harga melalui penawaran.
              </p>
            </div>

            <div className="segadeals-builder-status">
              <ShieldCheck size={18} />
              <span>Data pribadi belum diperlukan</span>
            </div>
          </div>

          <div className="segadeals-builder-layout">
            <aside className="segadeals-builder-aside">
              <div className="segadeals-builder-aside-copy">
                <span>REQUEST → OFFER</span>
                <h3>
                  Satu kebutuhan,
                  beberapa pilihan Travel.
                </h3>
                <p>
                  Anda cukup menentukan kebutuhan utama.
                  Travel yang sesuai akan memberikan
                  penawaran untuk dibandingkan.
                </p>
              </div>

              <div className="segadeals-builder-collage">
                <div className="segadeals-builder-photo segadeals-builder-photo-main">
                  <div>
                    <strong>Umrah</strong>
                    <span>Makkah & Madinah</span>
                  </div>
                </div>

                <div className="segadeals-builder-photo segadeals-builder-photo-second">
                  <div>
                    <strong>Halal Tour</strong>
                    <span>Jelajahi dunia</span>
                  </div>
                </div>

                <div className="segadeals-builder-photo segadeals-builder-photo-third">
                  <div>
                    <strong>Domestik</strong>
                    <span>Indonesia</span>
                  </div>
                </div>
              </div>

              <div className="segadeals-builder-aside-flow">
                <div>
                  <span>01</span>
                  <strong>Buat request</strong>
                </div>
                <div>
                  <span>02</span>
                  <strong>Terima penawaran</strong>
                </div>
                <div>
                  <span>03</span>
                  <strong>Pilih Travel</strong>
                </div>
              </div>
            </aside>

            <div className="segadeals-builder-card">
              {requestStage === "form" && (
                <>
                  <div className="segadeals-builder-card-head">
                    <div>
                      <span>LANGKAH 1 DARI 2</span>
                      <h3>Detail Request</h3>
                    </div>

                    <div className="segadeals-currency-badge">
                      <CircleDollarSign size={16} />
                      {currency}
                    </div>
                  </div>

                  <div className="segadeals-builder-block">
                    <div className="segadeals-builder-label">
                      <span>Jenis Perjalanan</span>
                      <small>Pilih satu</small>
                    </div>

                    <div className="segadeals-trip-types">
                      {segaDealsTripTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          className={
                            tripType === type
                              ? "is-active"
                              : ""
                          }
                          onClick={() =>
                            chooseTripType(type)
                          }
                        >
                          <PlaneTakeoff size={17} />
                          <span>{type}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="segadeals-builder-grid">
                    <div className="segadeals-builder-field">
                      <label htmlFor="segadeals-origin">
                        Dari
                      </label>

                      <div className="segadeals-control segadeals-combobox">
                        <MapPin size={18} />

                        <input
                          id="segadeals-origin"
                          type="text"
                          autoComplete="off"
                          value={originQuery}
                          placeholder="Cari kota keberangkatan"
                          onFocus={() => {
                            /* SEGADEALS_PICKER_EXCLUSIVE_V10 */
                            setOriginOpen(true);
                            setDestinationOpen(false);
                            setDateOpen(false);
                          }}
                          onChange={(event) => {
                            setOriginQuery(
                              event.target.value,
                            );
                            setOrigin("");
                            setOriginOpen(true);
                            setDestinationOpen(false);
                            setDateOpen(false);
                          }}
                        />

                        <ChevronDown size={16} />

                        {originOpen && (
                          <div className="segadeals-picker-popover segadeals-origin-picker">
                            <div className="segadeals-picker-head">
                              <strong>
                                Pilih Kota atau Bandara
                              </strong>

                              <button
                                type="button"
                                className="segadeals-picker-close"
                                aria-label="Tutup"
                                onMouseDown={(event) =>
                                  event.preventDefault()
                                }
                                onClick={() =>
                                  setOriginOpen(false)
                                }
                              >
                                ×
                              </button>
                            </div>

                            <div className="segadeals-picker-search">
                              <Search size={18} />

                              <input
                                type="text"
                                autoComplete="off"
                                value={originQuery}
                                placeholder="Masukkan nama kota atau bandara..."
                                onChange={(event) => {
                                  setOriginQuery(
                                    event.target.value,
                                  );

                                  setOrigin("");
                                }}
                              />
                            </div>

                            <div className="segadeals-picker-section">
                              <span className="segadeals-picker-label">
                                Destinasi Populer
                              </span>

                              <div className="segadeals-picker-chips">
                                {filteredOrigins.length > 0 ? (
                                  filteredOrigins.map((city) => (
                                    <button
                                      key={city}
                                      type="button"
                                      className={
                                        origin === city
                                          ? "is-active"
                                          : ""
                                      }
                                      onMouseDown={(event) =>
                                        event.preventDefault()
                                      }
                                      onClick={() =>
                                        chooseOrigin(city)
                                      }
                                    >
                                      {city}
                                    </button>
                                  ))
                                ) : (
                                  <div className="segadeals-picker-empty">
                                    Kota atau bandara tidak ditemukan.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="segadeals-builder-field">
                      <label htmlFor="segadeals-destination">
                        {tripType === "Umrah"
                          ? "Tujuan Masuk"
                          : "Tujuan"}
                      </label>

                      {tripType === "Custom" ? (
                        <div className="segadeals-control">
                          <MapPin size={18} />

                          <input
                            id="segadeals-destination"
                            type="text"
                            value={customDestination}
                            placeholder="Tulis tujuan perjalanan"
                            onChange={(event) =>
                              setCustomDestination(
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      ) : (
                        <div className="segadeals-picker-anchor">
                          <button
                            id="segadeals-destination"
                            type="button"
                            className={[
                              "segadeals-control",
                              "segadeals-picker-trigger",
                              destination
                                ? "has-value"
                                : "",
                              destinationOpen
                                ? "is-open"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            aria-haspopup="dialog"
                            aria-expanded={destinationOpen}
                            onClick={() => {
                              const nextOpen =
                                !destinationOpen;

                              setOriginOpen(false);
                              setDateOpen(false);
                              setDestinationOpen(
                                nextOpen,
                              );
                            }}
                          >
                            <MapPin size={18} />

                            <span>
                              {destination ||
                                (tripType === "Umrah"
                                  ? "Pilih tujuan Umrah"
                                  : "Pilih tujuan")}
                            </span>

                            <ChevronDown size={16} />
                          </button>

                          {destinationOpen && (
                            <div className="segadeals-picker-popover segadeals-destination-picker">
                              <div className="segadeals-picker-head">
                                <strong>
                                  Pilih Tujuan
                                </strong>

                                <button
                                  type="button"
                                  className="segadeals-picker-close"
                                  aria-label="Tutup"
                                  onClick={() =>
                                    setDestinationOpen(false)
                                  }
                                >
                                  ×
                                </button>
                              </div>

                              <div className="segadeals-picker-search">
                                <Search size={18} />

                                <input
                                  type="text"
                                  autoComplete="off"
                                  value={destinationQuery}
                                  placeholder={
                                    tripType === "Umrah" ||
                                    tripType === "Haji"
                                      ? "Cari tujuan..."
                                      : "Cari negara atau destinasi..."
                                  }
                                  onChange={(event) =>
                                    setDestinationQuery(
                                      event.target.value,
                                    )
                                  }
                                />
                              </div>

                              <div className="segadeals-picker-section">
                                <span className="segadeals-picker-label">
                                  Destinasi Populer
                                </span>

                                <div className="segadeals-picker-chips">
                                  {filteredDestinations.length >
                                  0 ? (
                                    filteredDestinations.map(
                                      (item) => (
                                        <button
                                          key={item}
                                          type="button"
                                          className={
                                            destination === item
                                              ? "is-active"
                                              : ""
                                          }
                                          onClick={() =>
                                            chooseDestination(
                                              item,
                                            )
                                          }
                                        >
                                          {item}
                                        </button>
                                      ),
                                    )
                                  ) : (
                                    <div className="segadeals-picker-empty">
                                      Tujuan tidak ditemukan.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="segadeals-builder-block">
                    <div className="segadeals-builder-label">
                      <span>Traveler</span>
                      <small>
                        {travelerTotal} traveler
                      </small>
                    </div>

                    <div className="segadeals-traveler-grid">
                      {(
                        [
                          [
                            "adult",
                            "Dewasa",
                            "12 tahun ke atas",
                          ],
                          [
                            "child",
                            "Anak",
                            "2–11 tahun",
                          ],
                          [
                            "infant",
                            "Bayi",
                            "Di bawah 2 tahun",
                          ],
                        ] as const
                      ).map(
                        ([key, label, description]) => (
                          <div
                            className="segadeals-traveler-item"
                            key={key}
                          >
                            <div>
                              <strong>{label}</strong>
                              <span>{description}</span>
                            </div>

                            <div className="segadeals-stepper">
                              <button
                                type="button"
                                aria-label={`Kurangi ${label}`}
                                onClick={() =>
                                  updateTraveler(
                                    key,
                                    -1,
                                  )
                                }
                                disabled={
                                  travelers[key] === 0 ||
                                  (key === "adult" &&
                                    travelers.adult ===
                                      1 &&
                                    travelers.child ===
                                      0 &&
                                    travelers.infant ===
                                      0)
                                }
                              >
                                <Minus size={15} />
                              </button>

                              <strong>
                                {travelers[key]}
                              </strong>

                              <button
                                type="button"
                                aria-label={`Tambah ${label}`}
                                onClick={() =>
                                  updateTraveler(
                                    key,
                                    1,
                                  )
                                }
                              >
                                <Plus size={15} />
                              </button>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="segadeals-builder-grid">
                    <div className="segadeals-builder-field">
                      <label htmlFor="segadeals-budget">
                        Budget
                      </label>

                      <div className="segadeals-control">
                        <CircleDollarSign size={18} />

                        <span className="segadeals-control-prefix">
                          {currency}
                        </span>

                        <input
                          id="segadeals-budget"
                          type="text"
                          inputMode="numeric"
                          value={budget}
                          placeholder={
                            currency === "IDR"
                              ? "Contoh 30000000"
                              : "Masukkan budget"
                          }
                          onChange={(event) =>
                            setBudget(
                              event.target.value.replace(
                                /[^0-9]/g,
                                "",
                              ),
                            )
                          }
                        />
                      </div>

                      {numericBudget > 0 && (
                        <small className="segadeals-field-helper">
                          {budgetDisplay}
                        </small>
                      )}
                    </div>

                    <div className="segadeals-builder-field">
                      <label htmlFor="segadeals-date">
                        Tanggal Keberangkatan
                      </label>

                      <div className="segadeals-picker-anchor">
                        <button
                          id="segadeals-date"
                          type="button"
                          className={[
                            "segadeals-control",
                            "segadeals-picker-trigger",
                            departureDate
                              ? "has-value"
                              : "",
                            dateOpen
                              ? "is-open"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          aria-haspopup="dialog"
                          aria-expanded={dateOpen}
                          onClick={() => {
                            const nextOpen =
                              !dateOpen;

                            setOriginOpen(false);
                            setDestinationOpen(false);
                            setDateOpen(
                              nextOpen,
                            );
                          }}
                        >
                          <CalendarDays size={18} />

                          <span>
                            {departureDate
                              ? departureDisplay
                              : "Pilih tanggal keberangkatan"}
                          </span>

                          <ChevronDown size={16} />
                        </button>

                        {dateOpen && (
                          <div className="segadeals-picker-popover segadeals-calendar-popover">
                            <div className="segadeals-calendar-head">
                              <strong>
                                Atur Tanggal
                              </strong>

                              <button
                                type="button"
                                className="segadeals-picker-close"
                                aria-label="Tutup"
                                onClick={() =>
                                  setDateOpen(false)
                                }
                              >
                                ×
                              </button>
                            </div>

                            <div className="segadeals-calendar-navigation">
                              <button
                                type="button"
                                aria-label="Bulan sebelumnya"
                                onClick={() =>
                                  moveCalendar(-1)
                                }
                              >
                                <ChevronDown
                                  size={18}
                                  style={{
                                    transform:
                                      "rotate(90deg)",
                                  }}
                                />
                              </button>

                              <div>
                                {calendarMonthFormatter.format(
                                  calendarCursor,
                                )}
                              </div>

                              <button
                                type="button"
                                aria-label="Bulan berikutnya"
                                onClick={() =>
                                  moveCalendar(1)
                                }
                              >
                                <ChevronDown
                                  size={18}
                                  style={{
                                    transform:
                                      "rotate(-90deg)",
                                  }}
                                />
                              </button>
                            </div>

                            <div className="segadeals-calendar-months">
                              {calendarMonths.map(
                                (monthDate) => (
                                  <div
                                    className="segadeals-calendar-month"
                                    key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
                                  >
                                    <strong>
                                      {calendarMonthFormatter.format(
                                        monthDate,
                                      )}
                                    </strong>

                                    <div className="segadeals-calendar-weekdays">
                                      {calendarWeekdays.map(
                                        (day) => (
                                          <span key={day}>
                                            {day}
                                          </span>
                                        ),
                                      )}
                                    </div>

                                    <div className="segadeals-calendar-days">
                                      {buildCalendarDays(
                                        monthDate,
                                      ).map(
                                        ({
                                          date,
                                          currentMonth,
                                        }) => {
                                          const dateKey =
                                            toDateKey(
                                              date,
                                            );

                                          const disabled =
                                            dateKey <
                                            minimumDate;

                                          const selected =
                                            dateKey ===
                                            departureDate;

                                          return (
                                            <button
                                              key={dateKey}
                                              type="button"
                                              disabled={
                                                disabled
                                              }
                                              className={[
                                                currentMonth
                                                  ? ""
                                                  : "is-outside",
                                                selected
                                                  ? "is-selected"
                                                  : "",
                                              ]
                                                .filter(
                                                  Boolean,
                                                )
                                                .join(
                                                  " ",
                                                )}
                                              onClick={() =>
                                                chooseDepartureDate(
                                                  date,
                                                )
                                              }
                                            >
                                              {date.getDate()}
                                            </button>
                                          );
                                        },
                                      )}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="segadeals-builder-field">
                    <label htmlFor="segadeals-notes">
                      Catatan
                      <span>Opsional</span>
                    </label>

                    <textarea
                      id="segadeals-notes"
                      rows={4}
                      value={notes}
                      placeholder="Contoh: membawa lansia, membutuhkan penerbangan langsung, atau kebutuhan khusus lainnya."
                      onChange={(event) =>
                        setNotes(event.target.value)
                      }
                    />
                  </div>

                  <div className="segadeals-builder-submit">
                    <div>
                      <ShieldCheck size={17} />
                      <p>
                        Hotel, maskapai, durasi dan
                        fasilitas akan diberikan Travel
                        melalui penawaran.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="segadeals-button segadeals-button-primary"
                      disabled={!isRequestValid}
                      onClick={() =>
                        setRequestStage("review")
                      }
                    >
                      Review Request
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </>
              )}

              {requestStage === "review" && (
                <div className="segadeals-review">
                  <div className="segadeals-builder-card-head">
                    <div>
                      <span>LANGKAH 2 DARI 2</span>
                      <h3>Review Request</h3>
                    </div>

                    <button
                      type="button"
                      className="segadeals-review-edit"
                      onClick={() =>
                        setRequestStage("form")
                      }
                    >
                      <Pencil size={15} />
                      Edit
                    </button>
                  </div>

                  <div className="segadeals-review-hero">
                    <div>
                      <span>{tripType}</span>
                      <h4>
                        {origin} → {selectedDestination}
                      </h4>
                    </div>

                    <PlaneTakeoff size={28} />
                  </div>

                  <div className="segadeals-review-grid">
                    <div>
                      <span>Traveler</span>
                      <strong>
                        {travelerTotal} traveler
                      </strong>
                      <small>
                        {travelers.adult} Dewasa ·{" "}
                        {travelers.child} Anak ·{" "}
                        {travelers.infant} Bayi
                      </small>
                    </div>

                    <div>
                      <span>Budget</span>
                      <strong>{budgetDisplay}</strong>
                      <small>
                        Mata uang: {currency}
                      </small>
                    </div>

                    <div>
                      <span>Keberangkatan</span>
                      <strong>
                        {departureDisplay}
                      </strong>
                    </div>

                    <div>
                      <span>Tujuan</span>
                      <strong>
                        {selectedDestination}
                      </strong>
                    </div>
                  </div>

                  {notes.trim() && (
                    <div className="segadeals-review-notes">
                      <span>Catatan</span>
                      <p>{notes}</p>
                    </div>
                  )}

                  <div className="segadeals-review-notice">
                    <ShieldCheck size={20} />
                    <div>
                      <strong>
                        Periksa kembali request Anda
                      </strong>
                      <p>
                        Tahap ini masih UI-only.
                        Request belum dikirim atau
                        disimpan ke backend Segaloka.
                      </p>
                    </div>
                  </div>

                  <div className="segadeals-review-actions">
                    <button
                      type="button"
                      className="segadeals-button segadeals-button-secondary"
                      onClick={() =>
                        setRequestStage("form")
                      }
                    >
                      Kembali & Edit
                    </button>

                    <button
                      type="button"
                      className="segadeals-button segadeals-button-primary"
                      onClick={() =>
                        setRequestStage("confirmed")
                      }
                    >
                      <Send size={17} />
                      Konfirmasi Request
                    </button>
                  </div>
                </div>
              )}

              {requestStage === "confirmed" && (
                <div className="segadeals-confirmed">
                  <div className="segadeals-confirmed-icon">
                    <CheckCircle2 size={34} />
                  </div>

                  <span>SIMULASI UI BERHASIL</span>

                  <h3>Request Anda sudah siap.</h3>

                  <p>
                    Tampilan dan validasi Request
                    Builder telah selesai. Belum ada
                    data yang dikirim ke Travel atau
                    disimpan ke backend pada tahap ini.
                  </p>

                  <div className="segadeals-confirmed-summary">
                    <strong>
                      {origin} → {selectedDestination}
                    </strong>
                    <span>
                      {tripType} · {travelerTotal} traveler
                      · {budgetDisplay}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="segadeals-button segadeals-button-primary"
                    onClick={resetRequest}
                  >
                    Buat Request Baru
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      
      <section className="segadeals-section segadeals-post-request">
        <div className="segadeals-shell segadeals-post-request-grid">

          <div className="segadeals-post-request-copy">
            <span className="segadeals-section-eyebrow">
              {language === "ID" ? "KELEBIHAN SEGADEALS" : t.flowKicker}
            </span>

            <h2>{t.flowTitle}</h2>
            <p>{t.flowDesc}</p>
          </div>

          <div className="segadeals-post-request-points">
            {t.flowPoints.map((point) => (
              <div className="segadeals-post-request-point" key={point}>
                <CheckCircle2 size={18} />
                <span>{point}</span>
              </div>
            ))}
          </div>

          <aside className="segadeals-post-request-privacy">
            <div className="segadeals-important-title">
              <ShieldCheck size={22} />
              <h3>{t.important}</h3>
            </div>

            {t.importantItems.map((item) => (
              <div
                className="segadeals-important-item"
                key={item}
              >
                <span />
                <p>{item}</p>
              </div>
            ))}
          </aside>

          <div className="segadeals-offer-stack">

            <article className="segadeals-offer-card">
              <div
                className="segadeals-offer-image"
                style={{
                  backgroundImage:
                    'url("/images/segadeals/segadeals-offer-bali.webp")',
                }}
              />

              <div className="segadeals-offer-copy">
                <strong>Bali · 4D3N</strong>
                <span>Happy Travel</span>
                <b>
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency,
                    maximumFractionDigits: 0,
                  }).format(
                    currency === "IDR"
                      ? 3450000
                      : currency === "USD"
                        ? 210
                        : 790,
                  )}
                </b>
              </div>

              <span className="segadeals-offer-action">
                {language === "ID"
                  ? "Lihat Penawaran"
                  : language === "AR"
                    ? "عرض التفاصيل"
                    : "View Offer"}
              </span>
            </article>

            <article className="segadeals-offer-card">
              <div
                className="segadeals-offer-image"
                style={{
                  backgroundImage:
                    'url("/images/segadeals/segadeals-offer-labuan-bajo.webp")',
                }}
              />

              <div className="segadeals-offer-copy">
                <strong>Labuan Bajo · 3D2N</strong>
                <span>Explore Indonesia</span>
                <b>
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency,
                    maximumFractionDigits: 0,
                  }).format(
                    currency === "IDR"
                      ? 4200000
                      : currency === "USD"
                        ? 255
                        : 960,
                  )}
                </b>
              </div>

              <span className="segadeals-offer-action">
                {language === "ID"
                  ? "Lihat Penawaran"
                  : language === "AR"
                    ? "عرض التفاصيل"
                    : "View Offer"}
              </span>
            </article>

            <article className="segadeals-offer-card">
              <div
                className="segadeals-offer-image"
                style={{
                  backgroundImage:
                    'url("/images/segadeals/segadeals-offer-yogyakarta.webp")',
                }}
              />

              <div className="segadeals-offer-copy">
                <strong>Yogyakarta · 3D2N</strong>
                <span>Java Trip</span>
                <b>
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency,
                    maximumFractionDigits: 0,
                  }).format(
                    currency === "IDR"
                      ? 2800000
                      : currency === "USD"
                        ? 170
                        : 640,
                  )}
                </b>
              </div>

              <span className="segadeals-offer-action">
                {language === "ID"
                  ? "Lihat Penawaran"
                  : language === "AR"
                    ? "عرض التفاصيل"
                    : "View Offer"}
              </span>
            </article>

          </div>
        </div>
      </section>
<section className="segadeals-section segadeals-faq-section">
        <div className="segadeals-shell">
          <div className="segadeals-section-heading">
            <span className="segadeals-section-eyebrow">
              {t.faqKicker}
            </span>
            <h2>{t.faqTitle}</h2>
          </div>

          <div className="segadeals-faq-list segadeals-faq-grid">
            {t.faqs.map((faq) => (
              <details
                className="segadeals-faq"
                key={faq[0]}
              >
                <summary>
                  <span>{faq[0]}</span>
                  <HelpCircle size={19} />
                </summary>
                <p>{faq[1]}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
