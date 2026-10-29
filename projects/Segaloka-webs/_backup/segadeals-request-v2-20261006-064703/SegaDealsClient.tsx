"use client";

import {
  ArrowRight,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  HelpCircle,
  MapPin,
  PlaneTakeoff,
  Search,
  ShieldCheck,
  Sparkles,
  TicketPercent,
  Users,
} from "lucide-react";

import {
  useMarketplacePreferences,
} from "@/components/providers/MarketplacePreferencesProvider";

type Language = "ID" | "EN" | "AR";

type Copy = {
  breadcrumbHome: string;
  eyebrow: string;
  title: string;
  heroDescription: string;
  heroPrimary: string;
  heroSecondary: string;

  whatEyebrow: string;
  whatTitle: string;
  whatDescription: string;

  benefitTitle: string;
  benefits: Array<{
    title: string;
    description: string;
  }>;

  howEyebrow: string;
  howTitle: string;
  steps: Array<{
    title: string;
    description: string;
  }>;

  dealEyebrow: string;
  dealTitle: string;
  dealDescription: string;
  dealPoints: string[];

  importantTitle: string;
  importantItems: string[];

  availableEyebrow: string;
  availableTitle: string;
  availableDescription: string;
  emptyTitle: string;
  emptyDescription: string;

  faqEyebrow: string;
  faqTitle: string;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
};

const copies: Record<Language, Copy> = {
  ID: {
    breadcrumbHome: "Beranda",
    eyebrow: "PENAWARAN KHUSUS SEGALOKA",
    title: "Lebih dekat dengan perjalanan yang Anda inginkan.",
    heroDescription:
      "SegaDeals adalah ruang penawaran khusus di Segaloka untuk membantu traveler menemukan kesempatan perjalanan dengan nilai yang menarik pada periode, kuota, dan ketentuan tertentu.",
    heroPrimary: "Lihat SegaDeals",
    heroSecondary: "Pelajari Cara Kerjanya",

    whatEyebrow: "MENGENAL SEGADEALS",
    whatTitle: "Apa itu SegaDeals?",
    whatDescription:
      "SegaDeals mengumpulkan penawaran perjalanan tertentu yang tersedia melalui ekosistem Segaloka. Setiap deal dapat memiliki tujuan, periode perjalanan, kuota, harga, fasilitas, dan ketentuan yang berbeda. Informasi final selalu ditampilkan pada detail deal sebelum traveler melanjutkan transaksi.",

    benefitTitle: "Kenapa menggunakan SegaDeals?",
    benefits: [
      {
        title: "Penawaran terpilih",
        description:
          "Temukan deal perjalanan yang ditampilkan secara khusus pada periode tertentu.",
      },
      {
        title: "Informasi lebih jelas",
        description:
          "Lihat harga, periode, kuota, fasilitas, dan ketentuan deal sebelum memesan.",
      },
      {
        title: "Pilihan lebih praktis",
        description:
          "Bandingkan deal yang tersedia tanpa harus mencari dari banyak tempat.",
      },
      {
        title: "Terhubung dengan Segaloka",
        description:
          "Proses penawaran tetap berada dalam pengalaman marketplace Segaloka.",
      },
    ],

    howEyebrow: "CARA MENGGUNAKAN",
    howTitle: "Cara mendapatkan SegaDeals",
    steps: [
      {
        title: "Temukan deal",
        description:
          "Buka SegaDeals dan lihat penawaran yang sedang tersedia.",
      },
      {
        title: "Periksa detail",
        description:
          "Baca tujuan, jadwal, harga, kuota, fasilitas, serta syarat deal.",
      },
      {
        title: "Pilih penawaran",
        description:
          "Pilih deal yang sesuai dengan kebutuhan perjalanan Anda.",
      },
      {
        title: "Lanjutkan pemesanan",
        description:
          "Ikuti alur pemesanan dan pembayaran yang berlaku pada deal tersebut.",
      },
    ],

    dealEyebrow: "CARA DEAL BEKERJA",
    dealTitle: "Setiap SegaDeals dapat memiliki ketentuan berbeda.",
    dealDescription:
      "SegaDeals bukan satu paket dengan aturan yang sama untuk semua penawaran. Detail transaksi mengikuti informasi dan ketentuan pada deal yang dipilih.",
    dealPoints: [
      "Periode penjualan dan perjalanan dapat dibatasi.",
      "Kuota dapat berubah sesuai ketersediaan.",
      "Harga dan fasilitas mengikuti detail deal.",
      "Kebijakan perubahan, pembatalan, atau refund mengikuti ketentuan yang ditampilkan pada deal.",
    ],

    importantTitle: "Yang perlu diperhatikan",
    importantItems: [
      "Periksa nama Travel atau Vendor penyedia sebelum memesan.",
      "Pastikan tanggal perjalanan dan jumlah traveler sudah sesuai.",
      "Baca seluruh fasilitas yang termasuk dan tidak termasuk.",
      "Periksa syarat pembayaran dan kebijakan perubahan transaksi.",
    ],

    availableEyebrow: "SEGADEALS TERSEDIA",
    availableTitle: "Penawaran SegaDeals",
    availableDescription:
      "Deal aktif akan tampil di bagian ini ketika telah tersedia di Segaloka.",
    emptyTitle: "Belum ada SegaDeals aktif",
    emptyDescription:
      "Penawaran yang sudah siap akan ditampilkan di sini. Kami tidak menampilkan deal atau harga yang belum tersedia.",

    faqEyebrow: "PERTANYAAN UMUM",
    faqTitle: "Tentang SegaDeals",
    faqs: [
      {
        question: "Apakah semua produk Segaloka termasuk SegaDeals?",
        answer:
          "Tidak. SegaDeals hanya menampilkan penawaran yang secara khusus tersedia sebagai deal pada periode tertentu.",
      },
      {
        question: "Apakah harga SegaDeals selalu sama?",
        answer:
          "Tidak. Harga mengikuti masing-masing deal dan dapat berbeda berdasarkan produk, periode, kuota, serta ketentuan penyedia.",
      },
      {
        question: "Siapa yang menyediakan produk dalam SegaDeals?",
        answer:
          "Identitas Travel atau Vendor penyedia akan ditampilkan pada detail deal yang tersedia.",
      },
      {
        question: "Bagaimana jika deal sudah tidak tersedia?",
        answer:
          "Deal yang kuotanya habis atau periodenya berakhir tidak dapat dilanjutkan sebagai penawaran aktif.",
      },
    ],
  },

  EN: {
    breadcrumbHome: "Home",
    eyebrow: "SPECIAL OFFERS BY SEGALOKA",
    title: "Get closer to the journey you want.",
    heroDescription:
      "SegaDeals is Segaloka's dedicated offers space, helping travelers discover travel opportunities with attractive value during selected periods and subject to availability and specific terms.",
    heroPrimary: "Explore SegaDeals",
    heroSecondary: "How It Works",

    whatEyebrow: "DISCOVER SEGADEALS",
    whatTitle: "What is SegaDeals?",
    whatDescription:
      "SegaDeals brings together selected travel offers available through the Segaloka ecosystem. Each deal may have different destinations, travel periods, availability, prices, inclusions, and terms. Final information is always shown on the deal detail before a traveler proceeds with a transaction.",

    benefitTitle: "Why use SegaDeals?",
    benefits: [
      {
        title: "Selected offers",
        description:
          "Discover travel deals highlighted for selected periods.",
      },
      {
        title: "Clearer information",
        description:
          "Review pricing, travel periods, availability, inclusions, and terms before booking.",
      },
      {
        title: "Simpler discovery",
        description:
          "Compare available deals without searching across multiple places.",
      },
      {
        title: "Connected to Segaloka",
        description:
          "The offer experience remains within the Segaloka marketplace.",
      },
    ],

    howEyebrow: "HOW TO USE",
    howTitle: "How to get a SegaDeal",
    steps: [
      {
        title: "Discover a deal",
        description:
          "Open SegaDeals and browse the offers currently available.",
      },
      {
        title: "Review the details",
        description:
          "Check destination, schedule, price, availability, inclusions, and terms.",
      },
      {
        title: "Choose an offer",
        description:
          "Select the deal that matches your travel needs.",
      },
      {
        title: "Continue booking",
        description:
          "Follow the booking and payment flow applicable to that deal.",
      },
    ],

    dealEyebrow: "HOW DEALS WORK",
    dealTitle: "Each SegaDeal may have different terms.",
    dealDescription:
      "SegaDeals is not a single package with identical rules for every offer. Transaction details follow the information and terms shown for the selected deal.",
    dealPoints: [
      "Sales and travel periods may be limited.",
      "Availability may change according to remaining quota.",
      "Prices and inclusions follow each deal detail.",
      "Changes, cancellations, and refunds follow the policy displayed for the deal.",
    ],

    importantTitle: "Things to check",
    importantItems: [
      "Check the Travel or Vendor providing the offer before booking.",
      "Make sure the travel date and number of travelers are correct.",
      "Review all included and excluded services.",
      "Check payment terms and transaction-change policies.",
    ],

    availableEyebrow: "AVAILABLE SEGADEALS",
    availableTitle: "SegaDeals Offers",
    availableDescription:
      "Active deals will appear here once they are available on Segaloka.",
    emptyTitle: "No active SegaDeals yet",
    emptyDescription:
      "Ready-to-book offers will appear here. We do not display deals or prices that are not yet available.",

    faqEyebrow: "FREQUENTLY ASKED QUESTIONS",
    faqTitle: "About SegaDeals",
    faqs: [
      {
        question: "Are all Segaloka products part of SegaDeals?",
        answer:
          "No. SegaDeals only contains offers specifically made available as deals during selected periods.",
      },
      {
        question: "Is the SegaDeals price always the same?",
        answer:
          "No. Pricing depends on each deal and may vary by product, period, availability, and provider terms.",
      },
      {
        question: "Who provides products in SegaDeals?",
        answer:
          "The Travel or Vendor providing an offer will be identified on the available deal detail.",
      },
      {
        question: "What happens when a deal is no longer available?",
        answer:
          "A deal with no remaining availability or an expired sales period can no longer proceed as an active offer.",
      },
    ],
  },

  AR: {
    breadcrumbHome: "الرئيسية",
    eyebrow: "عروض خاصة من SEGALOKA",
    title: "اقترب أكثر من الرحلة التي تريدها.",
    heroDescription:
      "SegaDeals هي مساحة العروض الخاصة في Segaloka لمساعدة المسافرين على اكتشاف فرص سفر بقيمة جذابة خلال فترات محددة ووفق التوفر والشروط الخاصة بكل عرض.",
    heroPrimary: "استكشف SegaDeals",
    heroSecondary: "تعرّف على طريقة العمل",

    whatEyebrow: "تعرّف على SEGADEALS",
    whatTitle: "ما هي SegaDeals؟",
    whatDescription:
      "تجمع SegaDeals عروض سفر مختارة متاحة ضمن منظومة Segaloka. وقد يختلف كل عرض من حيث الوجهة وفترة السفر والتوفر والسعر والخدمات والشروط. ويتم عرض المعلومات النهائية دائماً في تفاصيل العرض قبل متابعة المعاملة.",

    benefitTitle: "لماذا تستخدم SegaDeals؟",
    benefits: [
      {
        title: "عروض مختارة",
        description:
          "اكتشف عروض سفر مميزة متاحة خلال فترات محددة.",
      },
      {
        title: "معلومات أوضح",
        description:
          "راجع السعر وفترة السفر والتوفر والخدمات والشروط قبل الحجز.",
      },
      {
        title: "اختيار أسهل",
        description:
          "قارن العروض المتاحة دون الحاجة إلى البحث في أماكن متعددة.",
      },
      {
        title: "متصل بمنصة Segaloka",
        description:
          "تبقى تجربة العرض ضمن سوق Segaloka.",
      },
    ],

    howEyebrow: "طريقة الاستخدام",
    howTitle: "كيفية الحصول على SegaDeal",
    steps: [
      {
        title: "اكتشف العرض",
        description:
          "افتح SegaDeals واستعرض العروض المتاحة حالياً.",
      },
      {
        title: "راجع التفاصيل",
        description:
          "تحقق من الوجهة والجدول والسعر والتوفر والخدمات والشروط.",
      },
      {
        title: "اختر العرض",
        description:
          "اختر العرض المناسب لاحتياجات رحلتك.",
      },
      {
        title: "تابع الحجز",
        description:
          "اتبع خطوات الحجز والدفع المطبقة على العرض المختار.",
      },
    ],

    dealEyebrow: "كيف تعمل العروض",
    dealTitle: "قد تكون لكل SegaDeal شروط مختلفة.",
    dealDescription:
      "SegaDeals ليست باقة واحدة بقواعد موحدة لجميع العروض. تفاصيل المعاملة تتبع المعلومات والشروط المعروضة في العرض المختار.",
    dealPoints: [
      "قد تكون فترة البيع والسفر محدودة.",
      "قد يتغير التوفر وفق الحصة المتبقية.",
      "السعر والخدمات يتبعان تفاصيل كل عرض.",
      "التغيير أو الإلغاء أو الاسترداد يخضع للسياسة المعروضة في العرض.",
    ],

    importantTitle: "أمور يجب التحقق منها",
    importantItems: [
      "تحقق من شركة السفر أو المورّد مقدم العرض قبل الحجز.",
      "تأكد من صحة تاريخ السفر وعدد المسافرين.",
      "راجع جميع الخدمات المشمولة وغير المشمولة.",
      "تحقق من شروط الدفع وسياسات تغيير المعاملة.",
    ],

    availableEyebrow: "عروض SEGADEALS المتاحة",
    availableTitle: "عروض SegaDeals",
    availableDescription:
      "ستظهر العروض النشطة هنا عند توفرها على Segaloka.",
    emptyTitle: "لا توجد عروض SegaDeals نشطة حالياً",
    emptyDescription:
      "ستظهر هنا العروض الجاهزة للحجز. لا نعرض عروضاً أو أسعاراً غير متاحة بعد.",

    faqEyebrow: "الأسئلة الشائعة",
    faqTitle: "حول SegaDeals",
    faqs: [
      {
        question: "هل جميع منتجات Segaloka ضمن SegaDeals؟",
        answer:
          "لا. تعرض SegaDeals فقط العروض التي يتم توفيرها خصيصاً كصفقات خلال فترات محددة.",
      },
      {
        question: "هل سعر SegaDeals ثابت دائماً؟",
        answer:
          "لا. يعتمد السعر على كل عرض وقد يختلف حسب المنتج والفترة والتوفر وشروط مقدم الخدمة.",
      },
      {
        question: "من يقدم المنتجات في SegaDeals؟",
        answer:
          "سيتم توضيح شركة السفر أو المورّد مقدم العرض في تفاصيل كل عرض متاح.",
      },
      {
        question: "ماذا يحدث إذا لم يعد العرض متاحاً؟",
        answer:
          "لا يمكن متابعة العرض كعرض نشط عند نفاد التوفر أو انتهاء فترة البيع.",
      },
    ],
  },
};

const benefitIcons = [
  TicketPercent,
  ShieldCheck,
  Search,
  Sparkles,
];

const stepIcons = [
  Search,
  CalendarDays,
  CheckCircle2,
  PlaneTakeoff,
];

export default function SegaDealsClient() {
  const {
    language,
    direction,
  } = useMarketplacePreferences();

  const copy = copies[language as Language] ?? copies.ID;

  const scrollToDeals = () => {
    document
      .getElementById("segadeals-available")
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
            <a href="/">{copy.breadcrumbHome}</a>
            <span>/</span>
            <strong>SegaDeals</strong>
          </div>

          <div className="segadeals-hero-grid">
            <div className="segadeals-hero-copy">
              <span className="segadeals-eyebrow">
                {copy.eyebrow}
              </span>

              <h1>{copy.title}</h1>

              <p>{copy.heroDescription}</p>

              <div className="segadeals-hero-actions">
                <button
                  type="button"
                  className="segadeals-button segadeals-button-primary"
                  onClick={scrollToDeals}
                >
                  {copy.heroPrimary}
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  className="segadeals-button segadeals-button-secondary"
                  onClick={scrollToHow}
                >
                  {copy.heroSecondary}
                </button>
              </div>
            </div>

            <div
              className="segadeals-hero-visual"
              aria-hidden="true"
            >
              <div className="segadeals-orbit segadeals-orbit-one" />
              <div className="segadeals-orbit segadeals-orbit-two" />

              <div className="segadeals-ticket">
                <div className="segadeals-ticket-top">
                  <span>SegaDeals</span>
                  <BadgePercent size={28} />
                </div>

                <div className="segadeals-ticket-main">
                  <Sparkles size={18} />
                  <strong>Travel Deals</strong>
                  <span>by Segaloka</span>
                </div>

                <div className="segadeals-ticket-route">
                  <MapPin size={16} />
                  <span>Explore • Discover • Go</span>
                </div>
              </div>

              <div className="segadeals-floating-card segadeals-floating-card-one">
                <CircleDollarSign size={18} />
                <span>Special Value</span>
              </div>

              <div className="segadeals-floating-card segadeals-floating-card-two">
                <Clock3 size={18} />
                <span>Limited Period</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="segadeals-section">
        <div className="segadeals-shell">
          <div className="segadeals-intro">
            <span className="segadeals-section-eyebrow">
              {copy.whatEyebrow}
            </span>

            <h2>{copy.whatTitle}</h2>
            <p>{copy.whatDescription}</p>
          </div>

          <h3 className="segadeals-benefit-title">
            {copy.benefitTitle}
          </h3>

          <div className="segadeals-benefit-grid">
            {copy.benefits.map((item, index) => {
              const Icon = benefitIcons[index];

              return (
                <article
                  className="segadeals-benefit-card"
                  key={item.title}
                >
                  <div className="segadeals-icon-box">
                    <Icon size={22} />
                  </div>

                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
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
              {copy.howEyebrow}
            </span>
            <h2>{copy.howTitle}</h2>
          </div>

          <div className="segadeals-step-grid">
            {copy.steps.map((step, index) => {
              const Icon = stepIcons[index];

              return (
                <article
                  className="segadeals-step"
                  key={step.title}
                >
                  <div className="segadeals-step-number">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="segadeals-step-icon">
                    <Icon size={21} />
                  </div>

                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="segadeals-section">
        <div className="segadeals-shell segadeals-deal-grid">
          <div className="segadeals-deal-copy">
            <span className="segadeals-section-eyebrow">
              {copy.dealEyebrow}
            </span>

            <h2>{copy.dealTitle}</h2>
            <p>{copy.dealDescription}</p>

            <div className="segadeals-deal-points">
              {copy.dealPoints.map((point) => (
                <div key={point}>
                  <CheckCircle2 size={18} />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="segadeals-important-card">
            <div className="segadeals-important-title">
              <ShieldCheck size={22} />
              <h3>{copy.importantTitle}</h3>
            </div>

            {copy.importantItems.map((item) => (
              <div
                className="segadeals-important-item"
                key={item}
              >
                <span />
                <p>{item}</p>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <section
        className="segadeals-section segadeals-available-section"
        id="segadeals-available"
      >
        <div className="segadeals-shell">
          <div className="segadeals-section-heading">
            <span className="segadeals-section-eyebrow">
              {copy.availableEyebrow}
            </span>
            <h2>{copy.availableTitle}</h2>
            <p>{copy.availableDescription}</p>
          </div>

          <div className="segadeals-empty">
            <div className="segadeals-empty-icon">
              <TicketPercent size={30} />
            </div>

            <div>
              <h3>{copy.emptyTitle}</h3>
              <p>{copy.emptyDescription}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="segadeals-section segadeals-faq-section">
        <div className="segadeals-shell">
          <div className="segadeals-section-heading">
            <span className="segadeals-section-eyebrow">
              {copy.faqEyebrow}
            </span>
            <h2>{copy.faqTitle}</h2>
          </div>

          <div className="segadeals-faq-list">
            {copy.faqs.map((faq) => (
              <details
                className="segadeals-faq"
                key={faq.question}
              >
                <summary>
                  <span>{faq.question}</span>
                  <HelpCircle size={19} />
                </summary>

                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
