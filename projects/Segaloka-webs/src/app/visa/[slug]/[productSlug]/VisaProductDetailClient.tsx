"use client";

import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Headphones,
  Heart,
  Home,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";
import { translateVisaValue } from "@/ui/visa-detail/visa-detail.presentation";

import "./visa-product-detail.css";

type VisaProduct = {
  slug: string;
  title: string;
  description: string;
  countrySlug: string;
  visaType: string;
  entryType?: string;
  processingType?: string;
  purpose?: string;
  validity: string;
  stayDuration: string;
  processTime: string;
  requirements?: string[];
  documents?: string[];
  depositPolicy?: {
    enabled: boolean;
    type: "fixed" | "percentage";
    value: number;
  };
  price: number;
  included: string[];
  vendor: {
    slug?: string;
    name: string;
    verified?: boolean;
    rating?: number;
    reviewCount?: number;
  };
};

type Props = {
  countrySlug: string;
  countryName: string;
  countryImage: string;
  product: VisaProduct;
  vendorSlug: string;
  initialTravelers?: string;
  departureDate?: string;
  returnDate?: string;
};


function parseInitialApplicants(value?: string) {
  const parsed = Number.parseInt(value ?? "1", 10);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(Math.max(parsed, 1), 20);
}

export default function VisaProductDetailClient({
  countrySlug,
  countryName,
  countryImage,
  product,
  vendorSlug,
  initialTravelers,
  departureDate,
  returnDate,
}: Props) {
  const { language, formatCurrency } =
    useMarketplacePreferences();

  const copy =
    language === "EN"
      ? {
          home: "Home",
          explore: (country: string) =>
            `Explore ${country} more easily`,
          heroDescription:
            "Choose the Visa service that suits your travel needs.",
          officialVendor: "Official Vendor",
          official: "Official",
          fastProcess: "Fast Process",
          professionalService: "Professional Service",
          systemSupport: "System Support",
          vendorLabel: "Segaloka Visa Vendor",
          serviceCopy:
            "Visa application with a clear process, document assistance, and consultation through the Segaloka system.",
          process: "Processing Time",
          validity: "Validity",
          stayDuration: "Stay Duration",
          visaType: "Visa Type",
          entryType: "Entry Type",
          processingType: "Processing Type",
          purpose: "Purpose",
          visaPrice: "Visa Price",
          serviceType: "Service Type",
          applicant1: "1 Applicant",
          applicant2: "2 Applicants",
          applicant36: "3 - 6 Applicants",
          applicant7: "> 7 Applicants",
          downPayment: "Down Payment (DP)",
          perApplicant: "applicant",
          requirementsTitle: "Requirements",
          documentsTitle: "Required Documents",
          workflow: "How Segaloka Works",
          consultationAfterDp: "Consultation After DP",
          consultationAfterDpText:
            "After the DP payment is confirmed, chat with the vendor will automatically become available in Segaloka.",
          documentCollection: "Document Collection",
          documentCollectionText:
            "Submit the required documents through the Visa application process available in Segaloka.",
          visaProcess: "Visa Application Process",
          visaProcessText:
            "The vendor processes the application according to the Visa type and destination requirements.",
          visaCompleted: "Visa Completed",
          visaCompletedText:
            "Application status is updated through the system until the Visa process is completed.",
          applyNow: "Apply Now",
          applyDescription:
            "Complete the number of applicants and travel schedule to continue.",
          applicants: "Number of Applicants",
          decreaseApplicant: "Decrease applicants",
          increaseApplicant: "Increase applicants",
          departure: "Departure",
          return: "Return",
          pricePerApplicant: "Price / applicant",
          totalVisa: "Total Visa",
          continuePayment: "Continue Payment",
          chatAfterPayment: (vendor: string) =>
            `After the DP payment is confirmed, chat with ${vendor} will automatically become available for consultation and to continue the Visa application process.`,
          consultationTitle: "Consultation through Segaloka",
          consultationLocked:
            "Consultation chat will be available after the DP payment is confirmed.",
          removeFavorite: "Remove from favorites",
          addFavorite: "Add to favorites",
        }
      : language === "AR"
        ? {
            home: "الرئيسية",
            explore: (country: string) =>
              `استكشف ${country} بسهولة أكبر`,
            heroDescription:
              "اختر خدمة التأشيرة التي تناسب احتياجات سفرك.",
            officialVendor: "مزود معتمد",
            official: "معتمد",
            fastProcess: "معالجة سريعة",
            professionalService: "خدمة احترافية",
            systemSupport: "دعم عبر النظام",
            vendorLabel: "مزود تأشيرات سيغالـوكا",
            serviceCopy:
              "طلب تأشيرة بإجراءات واضحة، ومساعدة في المستندات، واستشارة عبر نظام سيغالـوكا.",
            process: "مدة المعالجة",
            validity: "مدة الصلاحية",
            stayDuration: "مدة الإقامة",
            visaType: "نوع التأشيرة",
            entryType: "نوع الدخول",
            processingType: "نوع المعالجة",
            purpose: "الغرض",
            visaPrice: "سعر التأشيرة",
            serviceType: "نوع الخدمة",
            applicant1: "متقدم واحد",
            applicant2: "متقدمان",
            applicant36: "3 - 6 متقدمين",
            applicant7: "أكثر من 7 متقدمين",
            downPayment: "الدفعة المقدمة (DP)",
            perApplicant: "متقدم",
            requirementsTitle: "المتطلبات",
            documentsTitle: "المستندات المطلوبة",
            workflow: "آلية العمل في سيغالـوكا",
            consultationAfterDp: "الاستشارة بعد الدفعة المقدمة",
            consultationAfterDpText:
              "بعد تأكيد الدفعة المقدمة، ستتاح المحادثة مع المزود تلقائياً داخل سيغالـوكا.",
            documentCollection: "جمع المستندات",
            documentCollectionText:
              "أرسل المستندات المطلوبة من خلال إجراءات طلب التأشيرة المتاحة في سيغالـوكا.",
            visaProcess: "معالجة طلب التأشيرة",
            visaProcessText:
              "يعالج المزود الطلب وفق نوع التأشيرة ومتطلبات الوجهة.",
            visaCompleted: "اكتمال التأشيرة",
            visaCompletedText:
              "يتم تحديث حالة الطلب عبر النظام حتى اكتمال إجراءات التأشيرة.",
            applyNow: "قدم الآن",
            applyDescription:
              "أكمل عدد المتقدمين وجدول السفر للمتابعة.",
            applicants: "عدد المتقدمين",
            decreaseApplicant: "تقليل عدد المتقدمين",
            increaseApplicant: "زيادة عدد المتقدمين",
            departure: "المغادرة",
            return: "العودة",
            pricePerApplicant: "السعر / متقدم",
            totalVisa: "إجمالي التأشيرة",
            continuePayment: "متابعة الدفع",
            chatAfterPayment: (vendor: string) =>
              `بعد تأكيد الدفعة المقدمة، ستتاح المحادثة مع ${vendor} تلقائياً للاستشارة ومتابعة طلب التأشيرة.`,
            consultationTitle: "الاستشارة عبر سيغالـوكا",
            consultationLocked:
              "ستتاح محادثة الاستشارة بعد تأكيد الدفعة المقدمة.",
            removeFavorite: "إزالة من المفضلة",
            addFavorite: "إضافة إلى المفضلة",
          }
        : {
            home: "Beranda",
            explore: (country: string) =>
              `Jelajahi ${country} dengan lebih mudah`,
            heroDescription:
              "Pilih layanan Visa yang sesuai dengan kebutuhan perjalanan Anda.",
            officialVendor: "Vendor Resmi",
            official: "Resmi",
            fastProcess: "Proses Cepat",
            professionalService: "Layanan Profesional",
            systemSupport: "Bantuan di Sistem",
            vendorLabel: "Vendor Visa Segaloka",
            serviceCopy:
              "Kami melayani pengajuan Visa dengan proses yang jelas, bantuan dokumen, dan konsultasi melalui sistem Segaloka.",
            process: "Waktu Proses",
            validity: "Masa Berlaku",
            stayDuration: "Masa Tinggal",
            visaType: "Jenis Visa",
            entryType: "Tipe Masuk",
            processingType: "Jenis Proses",
            purpose: "Tujuan",
            visaPrice: "Harga Visa",
            serviceType: "Jenis Layanan",
            applicant1: "1 Applicant",
            applicant2: "2 Applicant",
            applicant36: "3 - 6 Applicant",
            applicant7: "> 7 Applicant",
            downPayment: "Down Payment (DP)",
            perApplicant: "applicant",
            requirementsTitle: "Persyaratan",
            documentsTitle: "Dokumen yang Diperlukan",
            workflow: "Cara Kerja Segaloka",
            consultationAfterDp: "Konsultasi Setelah DP",
            consultationAfterDpText:
              "Setelah pembayaran DP terkonfirmasi, chat dengan vendor akan terbuka otomatis di sistem Segaloka.",
            documentCollection: "Pengumpulan Dokumen",
            documentCollectionText:
              "Kirim dokumen persyaratan melalui proses pengajuan yang tersedia di Segaloka.",
            visaProcess: "Proses Pengajuan Visa",
            visaProcessText:
              "Vendor memproses pengajuan sesuai jenis Visa dan persyaratan tujuan.",
            visaCompleted: "Visa Selesai",
            visaCompletedText:
              "Status pengajuan diperbarui melalui sistem hingga proses Visa selesai.",
            applyNow: "Ajukan Sekarang",
            applyDescription:
              "Lengkapi informasi jumlah pemohon dan jadwal perjalanan untuk melanjutkan.",
            applicants: "Jumlah Pemohon",
            decreaseApplicant: "Kurangi pemohon",
            increaseApplicant: "Tambah pemohon",
            departure: "Berangkat",
            return: "Pulang",
            pricePerApplicant: "Harga / applicant",
            totalVisa: "Total Visa",
            continuePayment: "Lanjutkan Pembayaran",
            chatAfterPayment: (vendor: string) =>
              `Setelah pembayaran DP terkonfirmasi, Anda dapat berkonsultasi dengan tim ${vendor} dan melanjutkan proses pengajuan Visa.`,
            consultationTitle: "Konsultasi melalui Segaloka",
            consultationLocked:
              "Chat konsultasi akan tersedia setelah pembayaran DP dikonfirmasi.",
            removeFavorite: "Hapus dari favorit",
            addFavorite: "Tambahkan ke favorit",
          };

  const [applicants, setApplicants] = useState(
    parseInitialApplicants(initialTravelers),
  );
  const [favorite, setFavorite] = useState(false);

  const unitPrice = product.price;
  const totalPrice = unitPrice * applicants;

  const dpPerApplicant = product.depositPolicy?.enabled
    ? product.depositPolicy.type === "percentage"
      ? Math.round(
          unitPrice *
            (product.depositPolicy.value / 100),
        )
      : Math.min(product.depositPolicy.value, unitPrice)
    : null;

  const dpTotal =
    dpPerApplicant !== null
      ? dpPerApplicant * applicants
      : null;
  const usesDepositPayment = product.depositPolicy?.enabled === true;

  const paymentConsultation = usesDepositPayment
    ? {
        title: copy.consultationAfterDp,
        description: copy.consultationAfterDpText,
        notice: copy.chatAfterPayment(product.vendor.name),
        locked: copy.consultationLocked,
      }
    : language === "EN"
      ? {
          title: "Consultation After Payment",
          description:
            "After payment is confirmed, chat with the vendor will automatically become available in Segaloka.",
          notice: `After payment is confirmed, chat with ${product.vendor.name} will automatically become available for consultation and to continue the Visa application process.`,
          locked:
            "Consultation chat will be available after payment is confirmed.",
        }
      : language === "AR"
        ? {
            title: "الاستشارة بعد الدفع",
            description:
              "بعد تأكيد الدفع، ستتاح المحادثة مع المزود تلقائياً داخل سيغالـوكا.",
            notice: `بعد تأكيد الدفع، ستتاح المحادثة مع ${product.vendor.name} تلقائياً للاستشارة ومتابعة طلب التأشيرة.`,
            locked:
              "ستتاح محادثة الاستشارة بعد تأكيد الدفع.",
          }
        : {
            title: "Konsultasi Setelah Pembayaran",
            description:
              "Setelah pembayaran terkonfirmasi, chat dengan vendor akan terbuka otomatis di sistem Segaloka.",
            notice: `Setelah pembayaran terkonfirmasi, Anda dapat berkonsultasi dengan tim ${product.vendor.name} dan melanjutkan proses pengajuan Visa.`,
            locked:
              "Chat konsultasi akan tersedia setelah pembayaran dikonfirmasi.",
          };
  const bookingQuery = new URLSearchParams({
    type: "visa",
    country: countrySlug,
    visaProduct: product.slug,
    applicants: String(applicants),
    paymentTerm: product.depositPolicy?.enabled ? "dp" : "full",
  });

  if (vendorSlug) {
    bookingQuery.set("vendor", vendorSlug);
  }

  if (departureDate) {
    bookingQuery.set("departureDate", departureDate);
  }

  if (returnDate) {
    bookingQuery.set("returnDate", returnDate);
  }

  const bookingHref =
    `/booking/${product.slug}?${bookingQuery.toString()}`;

  const vendorHref = vendorSlug
    ? `/visa/${countrySlug}/vendor/${vendorSlug}`
    : `/visa/${countrySlug}`;

  return (
    <main className="visa-pd">
      <section
        className="visa-pd-hero"
        style={{
          backgroundImage:
            `linear-gradient(90deg, rgba(5, 28, 66, .82), rgba(5, 28, 66, .18)), url("${countryImage}")`,
        }}
      >
        <div className="visa-pd-shell visa-pd-hero-content">
          <nav className="visa-pd-breadcrumb" aria-label="Breadcrumb">
            <a href="/" aria-label={copy.home}>
              <Home size={15} />
            </a>

            <ChevronRight size={14} />
            <a href="/search?category=Visa">Visa</a>

            <ChevronRight size={14} />
            <a href={`/visa/${countrySlug}`}>
              {countryName}
            </a>

            <ChevronRight size={14} />
            <span>{translateVisaValue(product.title, language)}</span>
          </nav>

          <div className="visa-pd-country-title">
            <img
              src={`/images/visa/flags/${countrySlug}.jpg`}
              alt=""
            />

            <h1>{countryName}</h1>
          </div>

          <h2>{copy.explore(countryName)}</h2>

          <p>
            {copy.heroDescription}
          </p>
        </div>
      </section>

      <div className="visa-pd-shell visa-pd-layout">
        <section className="visa-pd-main-card">
          <header className="visa-pd-vendor">
            <div className="visa-pd-vendor-logo">
              <FileText size={25} />
            </div>

            <div className="visa-pd-vendor-copy">
              <div className="visa-pd-vendor-name">
                <a href={vendorHref}>
                  {product.vendor.name}
                </a>

                {product.vendor.verified && (
                  <span>
                    <BadgeCheck size={14} />
                    {copy.officialVendor}
                  </span>
                )}
              </div>

              <div className="visa-pd-vendor-meta">
                {product.vendor.rating && (
                  <strong>
                    ★ {product.vendor.rating}
                    {product.vendor.reviewCount
                      ? ` (${product.vendor.reviewCount} ulasan)`
                      : ""}
                  </strong>
                )}

                <span>{copy.vendorLabel}</span>
              </div>
            </div>

            <div className="visa-pd-trust-mini">
              <span>
                <ShieldCheck size={19} />
                <small>{copy.official}</small>
              </span>

              <span>
                <Zap size={19} />
                <small>{copy.fastProcess}</small>
              </span>

              <span>
                <Headphones size={19} />
                <small>{copy.professionalService}</small>
              </span>

              <span>
                <ShieldCheck size={19} />
                <small>{copy.systemSupport}</small>
              </span>
            </div>
          </header>

          <div className="visa-pd-divider" />

          <div className="visa-pd-product-heading">
            <div>
              <h2>
                {countryName} – {translateVisaValue(product.title, language)}
              </h2>

              <p>{translateVisaValue(product.description, language)}</p>
            </div>

            <button
              type="button"
              className="visa-pd-favorite"
              aria-label={favorite ? copy.removeFavorite : copy.addFavorite}
              aria-pressed={favorite}
              onClick={() => setFavorite((current) => !current)}
            >
              <Heart
                size={20}
                fill={favorite ? "currentColor" : "none"}
              />
            </button>
          </div>

          <p className="visa-pd-service-copy">{copy.serviceCopy}</p>

          <div className="visa-pd-facts">
            <div>
              <Zap size={23} />
              <span>
                <small>{copy.process}</small>
                <strong>{translateVisaValue(product.processTime, language)}</strong>
              </span>
            </div>

            <div>
              <CalendarDays size={23} />
              <span>
                <small>{copy.validity}</small>
                <strong>{translateVisaValue(product.validity, language)}</strong>
              </span>
            </div>

            <div>
              <Clock3 size={23} />
              <span>
                <small>{copy.stayDuration}</small>
                <strong>{translateVisaValue(product.stayDuration, language)}</strong>
              </span>
            </div>

            <div>
              <FileText size={23} />
              <span>
                <small>{copy.visaType}</small>
                <strong>{translateVisaValue(product.visaType, language)}</strong>
              </span>
            </div>

            {product.entryType ? (
              <div>
                <FileText size={23} />
                <span>
                  <small>{copy.entryType}</small>
                  <strong>{translateVisaValue(product.entryType, language)}</strong>
                </span>
              </div>
            ) : null}

            {product.processingType ? (
              <div>
                <Zap size={23} />
                <span>
                  <small>{copy.processingType}</small>
                  <strong>{translateVisaValue(product.processingType, language)}</strong>
                </span>
              </div>
            ) : null}

            {product.purpose ? (
              <div>
                <Check size={23} />
                <span>
                  <small>{copy.purpose}</small>
                  <strong>{translateVisaValue(product.purpose, language)}</strong>
                </span>
              </div>
            ) : null}
          </div>

          <section className="visa-pd-price-section">
            <h3>{copy.visaPrice}</h3>

            <div className="visa-pd-price-panel">
              <div className="visa-pd-price-main">
                <div className="visa-pd-price-service">
                  <strong>{translateVisaValue(product.title, language)}</strong>
                  <span>{copy.pricePerApplicant}</span>
                </div>

                <div className="visa-pd-price-amount">
                  <strong>{formatCurrency(product.price)}</strong>
                  <span>/ {copy.perApplicant}</span>
                </div>
              </div>

              {dpPerApplicant !== null ? (
                <div className="visa-pd-price-dp">
                  <span>{copy.downPayment}</span>

                  <strong>
                    {formatCurrency(dpPerApplicant)} / {copy.perApplicant}
                  </strong>
                </div>
              ) : null}
            </div>
          </section>
          {(product.requirements?.length || product.documents?.length) ? (
            <section className="visa-pd-requirements">
              {product.requirements?.length ? (
                <div>
                  <h3>{copy.requirementsTitle}</h3>
                  <ul>
                    {product.requirements.map((requirement) => (
                      <li key={requirement}>
                        <Check size={18} />
                        <span>{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {product.documents?.length ? (
                <div>
                  <h3>{copy.documentsTitle}</h3>
                  <ul>
                    {product.documents.map((document) => (
                      <li key={document}>
                        <FileText size={18} />
                        <span>{document}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
          <section className="visa-pd-workflow">
            <h3>{copy.workflow}</h3>

            <div className="visa-pd-workflow-grid">
              <article>
                <div className="visa-pd-step-icon">
                  <MessageCircle size={23} />
                </div>

                <strong>{paymentConsultation.title}</strong>

                <p>{paymentConsultation.description}</p>
              </article>

              <article>
                <div className="visa-pd-step-icon">
                  <FileText size={23} />
                </div>

                <strong>{copy.documentCollection}</strong>

                <p>{copy.documentCollectionText}</p>
              </article>

              <article>
                <div className="visa-pd-step-icon">
                  <Sparkles size={23} />
                </div>

                <strong>{copy.visaProcess}</strong>

                <p>{copy.visaProcessText}</p>
              </article>

              <article>
                <div className="visa-pd-step-icon">
                  <Check size={23} />
                </div>

                <strong>{copy.visaCompleted}</strong>

                <p>{copy.visaCompletedText}</p>
              </article>
            </div>
          </section>
        </section>

        <aside className="visa-pd-order-card">
          <h3>{copy.applyNow}</h3>

          <p>{copy.applyDescription}</p>

          <div className="visa-pd-order-divider" />

          <label>{copy.applicants}</label>

          <div className="visa-pd-counter">
            <button
              type="button"
              aria-label={copy.decreaseApplicant}
              disabled={applicants <= 1}
              onClick={() =>
                setApplicants((current) =>
                  Math.max(current - 1, 1),
                )
              }
            >
              <Minus size={17} />
            </button>

            <strong>{applicants}</strong>

            <button
              type="button"
              aria-label={copy.increaseApplicant}
              disabled={applicants >= 20}
              onClick={() =>
                setApplicants((current) =>
                  Math.min(current + 1, 20),
                )
              }
            >
              <Plus size={17} />
            </button>
          </div>

          {(departureDate || returnDate) && (
            <div className="visa-pd-trip-dates">
              {departureDate && (
                <span>
                  <small>{copy.departure}</small>
                  <strong>{departureDate}</strong>
                </span>
              )}

              {returnDate && (
                <span>
                  <small>{copy.return}</small>
                  <strong>{returnDate}</strong>
                </span>
              )}
            </div>
          )}

          <div className="visa-pd-summary">
            <div>
              <span>{copy.pricePerApplicant}</span>
              <strong>{formatCurrency(unitPrice)}</strong>
            </div>

            <div>
              <span>{copy.totalVisa}</span>
              <strong>{formatCurrency(totalPrice)}</strong>
            </div>

            {dpPerApplicant !== null && dpTotal !== null ? (
              <div className="visa-pd-summary-total">
                <span>
                  <strong>DP</strong>
                  <small>
                    {formatCurrency(dpPerApplicant)} × {applicants}
                  </small>
                </span>

                <strong>{formatCurrency(dpTotal)}</strong>
              </div>
            ) : null}
          </div>

          <a
            className="visa-pd-payment"
            href={bookingHref}
          >
            {copy.continuePayment}
            <ArrowRight size={18} />
          </a>

          <div className="visa-pd-chat-notice">
            <MessageCircle size={21} />

            <p>
              {paymentConsultation.notice}
            </p>
          </div>

          <div className="visa-pd-question">
            <div>
              <MessageCircle size={22} />

              <span>
                <strong>{copy.consultationTitle}</strong>
                <small>{paymentConsultation.locked}</small>
              </span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}