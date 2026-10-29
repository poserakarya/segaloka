"use client";

import {
  useRouter,
} from "next/navigation";

import {
  CheckCircle2,
  ChevronLeft,
  Clock3,
  FileCheck2,
  LockKeyhole,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  X,
  Users,
} from "lucide-react";

import {
  getVisaProductBySlug,
  getVisaVendorBySlug,
} from "@/ui/visa-detail";

import {
  translateVisaValue,
} from "@/ui/visa-detail/visa-detail.presentation";

import {
  useMarketplacePreferences,
} from "@/components/providers/MarketplacePreferencesProvider";

import {
  containsBlockedContact,
} from "@/ui/tracking/contact-guard";

import {
  createInitialTranslations,
  getChatSearchText,
  getLocalizedChatText,
  type ChatLanguage,
} from "@/lib/chat/multilingual-chat";

import {
  getVisaChatLifecycle,
} from "@/lib/chat/chat-lifecycle";

import {
  getVisaProgressItems,
  type VisaProgressStage,
} from "@/lib/visa/visa-progress";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  VisaDocumentReview,
} from "./VisaDocumentReview";

import {
  VisaSubmission,
} from "@/ui/tracking/VisaSubmission";

import type {
  VisaSubmissionProgress,
} from "@/lib/visa/visa-submission";

import {
  visaSubmissionFixture,
} from "@/ui/tracking/visa-submission.fixture";
import {
  VisaResult,
} from "@/ui/tracking/VisaResult";
import { VisaCompleted } from "@/ui/tracking/VisaCompleted";

import {
  visaResultFixture,
} from "@/ui/tracking/visa-result.fixture";

import type {
  VisaApplicantDocumentProgress,
  VisaDocumentRequirement,
} from "@/lib/visa/visa-document-requirements";

import {
  visaDocumentReviewFixtureProgress,
  visaDocumentReviewFixtureRequirements,
} from "@/ui/tracking/visa-document-review.fixture";

import styles from "./VisaOrder.module.css";

export type VisaOrderSnapshot = {
  country: string;
  productSlug: string;
  vendorSlug: string;
  applicants: number;
  paymentTerm: "full" | "dp";
  paymentStatus: "pending" | "confirmed";

  /**
   * UI-ready Visa progress.
   * Production source will come from the canonical order.
   */
  progressStage?: VisaProgressStage;

  /**
   * Canonical Visa completion timestamp.
   * Never manufacture this value in the browser.
   */
  completedAt?: string | null;
};

type Props = {
  slug: string;
  snapshot: VisaOrderSnapshot;
};

type TrackingStatus =
  | "done"
  | "active"
  | "waiting";

type VisaChatAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
};


type VisaChatMessage = {
  id: string;

  senderRole:
    | "traveler"
    | "vendor";

  originalText: string;
  originalLanguage: ChatLanguage;

  translations: Partial<
    Record<ChatLanguage, string>
  >;

  attachment: VisaChatAttachment | null;
  createdAt: string;
};

type Copy = {
  order: string;
  detail: string;
  tracking: string;
  title: string;
  subtitle: string;
  payment: string;
  consultation: string;
  documents: string;
  submission: string;
  result: string;
  waitingPayment: string;
  paymentConfirmed: string;
  waiting: string;
  processing: string;
  completed: string;
  paymentSection: string;
  paymentWaitingTitle: string;
  paymentWaitingDescription: string;
  paymentConfirmedTitle: string;
  paymentConfirmedDescription: string;
  summary: string;
  product: string;
  country: string;
  vendor: string;
  applicants: string;
  applicant: string;
  unitPrice: string;
  total: string;
  paymentStatus: string;
  paymentMethod: string;
  fullPayment: string;
  deposit: string;
  nextStages: string;
  chatTitle: string;
  chatDetail: string;
  chatLockedTitle: string;
  chatLockedDescription: string;
  chatReadyTitle: string;
  chatReadyDescription: string;
  startConsultation: string;
  startConsultationDescription: string;
  messagePlaceholder: string;
  send: string;
  protectedTitle: string;
  protectedDescription: string;
  back: string;
};

const copies: Record<"ID" | "EN" | "AR", Copy> = {
  ID: {
    order: "Pesanan Saya",
    detail: "Detail Pesanan",
    tracking: "Tracking Pengajuan Visa",
    title: "Tracking Pengajuan Visa",
    subtitle:
      "Pantau progres pengajuan Visa Anda melalui Segaloka.",
    payment: "Konfirmasi Pembayaran",
    consultation: "Konsultasi Vendor",
    documents: "Pemeriksaan Dokumen",
    submission: "Pengajuan Visa",
    result: "Hasil Visa",
    waitingPayment: "Menunggu Pembayaran",
    paymentConfirmed: "Pembayaran Terkonfirmasi",
    waiting: "Menunggu",
    processing: "Sedang diproses",
    completed: "Selesai",
    paymentSection: "1. Konfirmasi Pembayaran",
    paymentWaitingTitle:
      "Pembayaran menunggu konfirmasi",
    paymentWaitingDescription:
      "Proses pengajuan Visa akan dilanjutkan setelah pembayaran terkonfirmasi.",
    paymentConfirmedTitle:
      "Pembayaran telah dikonfirmasi",
    paymentConfirmedDescription:
      "Pembayaran telah terkonfirmasi. Konsultasi dengan Vendor sekarang tersedia.",
    summary: "Ringkasan Pesanan",
    product: "Produk",
    country: "Negara",
    vendor: "Vendor",
    applicants: "Jumlah Pemohon",
    applicant: "pemohon",
    unitPrice: "Harga per Pemohon",
    total: "Total Pembayaran",
    paymentStatus: "Status Pembayaran",
    paymentMethod: "Ketentuan Pembayaran",
    fullPayment: "Pembayaran Penuh",
    deposit: "DP",
    nextStages: "Tahapan Selanjutnya",
    chatTitle: "Chat dengan Vendor",
    chatDetail: "Detail",
    chatLockedTitle:
      "Chat akan aktif setelah pembayaran dikonfirmasi",
    chatLockedDescription:
      "Setelah pembayaran terkonfirmasi, Anda dapat berkonsultasi langsung dengan Vendor mengenai proses Visa.",
    chatReadyTitle: "Chat konsultasi tersedia",
    chatReadyDescription:
      "Pembayaran telah dikonfirmasi. Anda dapat melanjutkan konsultasi dengan Vendor.",
    startConsultation: "Mulai konsultasi",
    startConsultationDescription:
      "Kirim pertanyaan mengenai dokumen, jadwal, atau proses pengajuan Visa.",
    messagePlaceholder: "Tulis pesan...",
    send: "Kirim",
    protectedTitle: "Proses melalui Segaloka",
    protectedDescription:
      "Tracking dan komunikasi pengajuan tercatat dalam pesanan.",
    back: "Kembali ke Pesanan Saya",
  },

  EN: {
    order: "My Bookings",
    detail: "Booking Details",
    tracking: "Visa Application Tracking",
    title: "Visa Application Tracking",
    subtitle:
      "Track the progress of your Visa application through Segaloka.",
    payment: "Payment Confirmation",
    consultation: "Vendor Consultation",
    documents: "Document Review",
    submission: "Visa Submission",
    result: "Visa Result",
    waitingPayment: "Awaiting Payment",
    paymentConfirmed: "Payment Confirmed",
    waiting: "Waiting",
    processing: "In Progress",
    completed: "Completed",
    paymentSection: "1. Payment Confirmation",
    paymentWaitingTitle:
      "Payment is awaiting confirmation",
    paymentWaitingDescription:
      "Your Visa application will continue after the payment is confirmed.",
    paymentConfirmedTitle:
      "Payment has been confirmed",
    paymentConfirmedDescription:
      "Your payment is confirmed. Vendor consultation is now available.",
    summary: "Booking Summary",
    product: "Product",
    country: "Country",
    vendor: "Vendor",
    applicants: "Applicants",
    applicant: "applicant(s)",
    unitPrice: "Price per Applicant",
    total: "Total Payment",
    paymentStatus: "Payment Status",
    paymentMethod: "Payment Term",
    fullPayment: "Full Payment",
    deposit: "Deposit",
    nextStages: "Next Stages",
    chatTitle: "Chat with Vendor",
    chatDetail: "Details",
    chatLockedTitle:
      "Chat will activate after payment confirmation",
    chatLockedDescription:
      "Once payment is confirmed, you can consult directly with the Vendor about your Visa application.",
    chatReadyTitle: "Consultation chat is available",
    chatReadyDescription:
      "Payment has been confirmed. You can now continue your consultation with the Vendor.",
    startConsultation: "Start consultation",
    startConsultationDescription:
      "Ask questions about documents, schedules, or your Visa application process.",
    messagePlaceholder: "Write a message...",
    send: "Send",
    protectedTitle: "Processed through Segaloka",
    protectedDescription:
      "Application tracking and communication are recorded in your booking.",
    back: "Back to My Bookings",
  },

  AR: {
    order: "طلباتي",
    detail: "تفاصيل الطلب",
    tracking: "تتبع طلب التأشيرة",
    title: "تتبع طلب التأشيرة",
    subtitle:
      "تابع تقدم طلب التأشيرة الخاص بك عبر Segaloka.",
    payment: "تأكيد الدفع",
    consultation: "استشارة مقدم الخدمة",
    documents: "مراجعة المستندات",
    submission: "تقديم طلب التأشيرة",
    result: "نتيجة التأشيرة",
    waitingPayment: "بانتظار الدفع",
    paymentConfirmed: "تم تأكيد الدفع",
    waiting: "بانتظار",
    processing: "قيد المعالجة",
    completed: "مكتمل",
    paymentSection: "1. تأكيد الدفع",
    paymentWaitingTitle:
      "الدفع بانتظار التأكيد",
    paymentWaitingDescription:
      "سيستمر طلب التأشيرة بعد تأكيد الدفع.",
    paymentConfirmedTitle:
      "تم تأكيد الدفع",
    paymentConfirmedDescription:
      "تم تأكيد الدفع ويمكنك الآن التواصل مع مقدم الخدمة.",
    summary: "ملخص الطلب",
    product: "المنتج",
    country: "الدولة",
    vendor: "مقدم الخدمة",
    applicants: "عدد المتقدمين",
    applicant: "متقدم",
    unitPrice: "السعر لكل متقدم",
    total: "إجمالي الدفع",
    paymentStatus: "حالة الدفع",
    paymentMethod: "طريقة الدفع",
    fullPayment: "الدفع الكامل",
    deposit: "دفعة مقدمة",
    nextStages: "المراحل التالية",
    chatTitle: "الدردشة مع مقدم الخدمة",
    chatDetail: "التفاصيل",
    chatLockedTitle:
      "ستتاح الدردشة بعد تأكيد الدفع",
    chatLockedDescription:
      "بعد تأكيد الدفع يمكنك التواصل مباشرة مع مقدم الخدمة بشأن طلب التأشيرة.",
    chatReadyTitle: "الدردشة متاحة",
    chatReadyDescription:
      "تم تأكيد الدفع ويمكنك الآن متابعة الاستشارة مع مقدم الخدمة.",
    startConsultation: "ابدأ الاستشارة",
    startConsultationDescription:
      "أرسل استفسارك حول المستندات أو المواعيد أو إجراءات طلب التأشيرة.",
    messagePlaceholder: "اكتب رسالة...",
    send: "إرسال",
    protectedTitle: "تتم العملية عبر Segaloka",
    protectedDescription:
      "يتم تسجيل تتبع الطلب والمحادثات ضمن الطلب.",
    back: "العودة إلى طلباتي",
  },
};

export function VisaOrderClient({
  slug,
  snapshot,
}: Props) {
  const router = useRouter();

  const [chatMessage, setChatMessage] =
    useState("");

  const [sentMessages, setSentMessages] =
    useState<VisaChatMessage[]>([]);

  const [chatSearch, setChatSearch] =
    useState("");

  const [chatError, setChatError] =
    useState("");

  const [selectedAttachment, setSelectedAttachment] =
    useState<VisaChatAttachment | null>(null);

  const attachmentInputRef =
    useRef<HTMLInputElement>(null);

  const filteredMessages =
    useMemo(() => {
      const query =
        chatSearch.trim().toLocaleLowerCase();

      if (!query) {
        return sentMessages;
      }

      return sentMessages.filter((message) => {
        const searchable = [
          getChatSearchText(message),
          message.attachment?.name ?? "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase();

        return searchable.includes(query);
      });
    }, [
      chatSearch,
      sentMessages,
    ]);

  const {
    language,
    formatCurrency,
  } = useMarketplacePreferences();

  const copy =
    copies[language as "ID" | "EN" | "AR"] ??
    copies.ID;

  const product =
    getVisaProductBySlug(
      snapshot.productSlug || slug,
    );

  const productTitle = product
    ? translateVisaValue(
        product.title,
        language,
      )
    : snapshot.productSlug || slug;

  const vendor =
    getVisaVendorBySlug(
      snapshot.vendorSlug,
    );

  const vendorName =
    vendor?.name ??
    snapshot.vendorSlug ??
    "-";

  const vendorInitial =
    vendorName !== "-"
      ? vendorName
          .trim()
          .charAt(0)
          .toUpperCase()
      : "V";

  const vendorHomeUrl =
    vendor
      ? `/visa/${encodeURIComponent(
          snapshot.country,
        )}/vendor/${encodeURIComponent(
          vendor.slug,
        )}`
      : null;

  const countryName =
    snapshot.country || "-";

  const unitPrice =
    product?.price ?? null;

  const totalPrice =
    unitPrice === null
      ? null
      : unitPrice * snapshot.applicants;

  const paymentConfirmed =
    snapshot.paymentStatus === "confirmed";

  const progressStage: VisaProgressStage =
    snapshot.progressStage ??
    (
      paymentConfirmed
        ? "consultation"
        : "payment"
    );

  const [visaReviewSubmitted, setVisaReviewSubmitted] = useState(false);

  const progressSnapshot = {
    currentStage: progressStage,
    reviewSubmitted: visaReviewSubmitted,
    completedAt:
      snapshot.completedAt ?? null,
  };

  const canonicalDocumentRequirements: VisaDocumentRequirement[] =
    product?.serviceRequirements?.documents ?? [];

  const hasCanonicalDocumentRequirements =
    canonicalDocumentRequirements.length > 0;

  const documentRequirements: VisaDocumentRequirement[] =
    hasCanonicalDocumentRequirements
      ? canonicalDocumentRequirements
      : visaDocumentReviewFixtureRequirements;

  const documentProgress: VisaApplicantDocumentProgress[] =
    hasCanonicalDocumentRequirements
      ? []
      : visaDocumentReviewFixtureProgress;

  const submissionProgress: VisaSubmissionProgress = visaSubmissionFixture;
  const resultProgress = visaResultFixture;

  const progressItems = getVisaProgressItems(progressSnapshot).map(
    (item) =>
      progressStage === "completed" &&
      visaReviewSubmitted &&
      item.stage === "completed"
        ? { ...item, status: "done" as const }
        : item,
  );

  const [lifecycleNow, setLifecycleNow] =
    useState<Date | null>(null);

  useEffect(() => {
    setLifecycleNow(new Date());
  }, []);

  const chatLifecycle =
    getVisaChatLifecycle({
      paymentConfirmed,
      completedAt:
        progressSnapshot.completedAt,
      now:
        lifecycleNow ??
        (
          progressSnapshot.completedAt
            ? new Date(
                progressSnapshot.completedAt,
              )
            : new Date(0)
        ),
    });

  const trackingTitle = (
    stage: VisaProgressStage,
  ) => {
    switch (stage) {
      case "payment":
        return copy.payment;

      case "consultation":
        return copy.consultation;

      case "documents":
        return copy.documents;

      case "submission":
        return copy.submission;

      case "result":
        return copy.result;

      case "completed":
        return language === "EN"
          ? "Completed"
          : language === "AR"
            ? "مكتمل"
            : "Selesai";
    }
  };

  const tracking = progressItems
    .map((item) => ({
      key: item.stage,
      title: trackingTitle(
        item.stage,
      ),
      status:
        item.status as TrackingStatus,
    }));
  const handleBackToBookings = () => {
    router.push("/pesanan");
  };

  const handleOpenVendorHome = () => {
    if (!vendorHomeUrl) {
      return;
    }

    router.push(vendorHomeUrl);
  };


  // SEGALOKA VISA STEP 3 CHAT ATTACHMENT GUARD
  const canSendChatAttachment =
    chatLifecycle.canSendAttachment &&
    progressStage !== "documents";
  const handleAttachmentChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!canSendChatAttachment) {
      event.target.value = "";
      return;
    }

    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const allowedTypes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
    ]);

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLocaleLowerCase() ?? "";

    const allowedExtensions =
      new Set([
        "pdf",
        "jpg",
        "jpeg",
        "png",
      ]);

    if (
      !allowedTypes.has(file.type) ||
      !allowedExtensions.has(extension)
    ) {
      setChatError(
        language === "EN"
          ? "Only PDF, JPG, JPEG, and PNG files can be attached."
          : language === "AR"
            ? "يمكن إرفاق ملفات PDF وJPG وJPEG وPNG فقط."
            : "Hanya file PDF, JPG, JPEG, dan PNG yang dapat dilampirkan.",
      );
      return;
    }

    const maxSize =
      10 * 1024 * 1024;

    if (file.size > maxSize) {
      setChatError(
        language === "EN"
          ? "The maximum attachment size is 10 MB."
          : language === "AR"
            ? "الحد الأقصى لحجم المرفق هو 10 ميجابايت."
            : "Ukuran maksimum lampiran adalah 10 MB.",
      );
      return;
    }

    if (
      containsBlockedContact(
        file.name,
        "filename",
      )
    ) {
      setChatError(
        language === "EN"
          ? "Attachment names cannot contain phone numbers or email addresses."
          : language === "AR"
            ? "لا يمكن أن يحتوي اسم المرفق على رقم هاتف أو بريد إلكتروني."
            : "Nama lampiran tidak boleh mengandung nomor telepon atau alamat email.",
      );
      return;
    }

    setSelectedAttachment({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      type: file.type,
      size: file.size,
    });

    setChatError("");
  };

  const handleSendMessage = () => {
    if (!chatLifecycle.canSendMessage) {
      return;
    }

        if (!canSendChatAttachment && selectedAttachment) {
      setSelectedAttachment(null);
      setChatError("");
      return;
    }

    const message = chatMessage.trim();

    if (
      !message &&
      !selectedAttachment
    ) {
      return;
    }

    if (
      message &&
      containsBlockedContact(
        message,
        "message",
      )
    ) {
      setChatError(
        language === "EN"
          ? "Phone numbers and email addresses cannot be sent in this chat."
          : language === "AR"
            ? "لا يمكن إرسال أرقام الهواتف أو عناوين البريد الإلكتروني في هذه المحادثة."
            : "Nomor telepon dan alamat email tidak dapat dikirim melalui chat ini.",
      );
      return;
    }

    setSentMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,

        senderRole: "traveler",

        originalText: message,
        originalLanguage:
          language as ChatLanguage,

        translations:
          createInitialTranslations(
            message,
            language as ChatLanguage,
          ),

        attachment: selectedAttachment,

        createdAt:
          new Date().toISOString(),
      },
    ]);

    setChatMessage("");
    setSelectedAttachment(null);
    setChatError("");
  };

  const chatLocale =
    language === "EN"
      ? "en-US"
      : language === "AR"
        ? "ar-SA"
        : "id-ID";

  const formatChatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(chatLocale, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
  };

  const formatChatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(chatLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const getChatDateKey = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return [
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    ].join("-");
  };
  const handleChatKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <main
      className={styles.page}
      dir={language === "AR" ? "rtl" : "ltr"}
    >
      <div className={styles.container}>
        <nav
          className={styles.breadcrumb}
          aria-label="Breadcrumb"
        >
          <span>{copy.order}</span>
          <span>›</span>
          <span>{copy.detail}</span>
          <span>›</span>
          <strong>{copy.tracking}</strong>
        </nav>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>

          <div
            className={
              paymentConfirmed
                ? styles.paymentConfirmed
                : styles.paymentPending
            }
          >
            {paymentConfirmed ? (
              <CheckCircle2 size={20} />
            ) : (
              <Clock3 size={20} />
            )}

            <span>
              {paymentConfirmed
                ? copy.paymentConfirmed
                : copy.waitingPayment}
            </span>
          </div>
        </section>

        <section className={styles.progressCard}>
          <div className={styles.progressTrack}>
            {tracking.map((item, index) => (
              <div
                key={item.key}
                className={[
                  styles.progressStep,
                  item.status === "done"
                    ? styles.progressDone
                    : item.status === "active"
                      ? styles.progressActive
                      : styles.progressWaiting,
                ].join(" ")}
              >
                <div className={styles.progressTop}>
                  <div className={styles.progressCircle}>
                    {item.status === "done" ? (
                      <CheckCircle2 size={19} />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {index < tracking.length - 1 && (
                    <div
                      className={
                        styles.progressLine
                      }
                    />
                  )}
                </div>

                <strong>{item.title}</strong>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.workspace}>
          <div className={styles.contentColumn}>
            {progressStage === "documents" ? (
              <VisaDocumentReview
                applicantCount={snapshot.applicants}
                requirements={documentRequirements}
                progress={documentProgress}
                language={language}
              />
            ) : progressStage === "submission" ? (
              <VisaSubmission
                progress={submissionProgress}
                language={language}
              />
            ) : progressStage === "result" ? (
              <VisaResult
                progress={resultProgress}
                language={language}
              />
            ) : progressStage === "completed" ? (
              <VisaCompleted
                language={language}
                physicalReturnRequired={false}
                applicants={resultProgress.applicants.map((applicant) => ({
                  id: applicant.applicantId,
                  name: applicant.applicantName,
                  status:
                    applicant.status === "pending" ||
                    applicant.status === "additional_action_required"
                      ? "rejected"
                      : applicant.status,
                  documents: applicant.documents.map((document) => ({
                    id: document.id,
                    fileName: document.fileName,
                    fileUrl: document.fileUrl,
                    fileType: document.fileType,
                  })),
                }))}
                serviceCompleted={Boolean(snapshot.completedAt)}
                onReviewSubmitted={() => setVisaReviewSubmitted(true)}
              />
            ) : (
              <section className={styles.paymentCard}>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>{copy.paymentSection}</h2>
                </div>

                <span
                  className={
                    paymentConfirmed
                      ? styles.statusConfirmed
                      : styles.statusPending
                  }
                >
                  {chatLifecycle.canRead ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Clock3 size={16} />
                  )}

                  {paymentConfirmed
                    ? copy.paymentConfirmed
                    : copy.processing}
                </span>
              </div>

              <div className={styles.paymentNotice}>
                <div className={styles.noticeIcon}>
                  {chatLifecycle.canRead ? (
                    <CheckCircle2 size={26} />
                  ) : (
                    <Clock3 size={26} />
                  )}
                </div>

                <div>
                  <strong>
                    {paymentConfirmed
                      ? copy.paymentConfirmedTitle
                      : copy.paymentWaitingTitle}
                  </strong>

                  <p>
                    {paymentConfirmed
                      ? copy.paymentConfirmedDescription
                      : copy.paymentWaitingDescription}
                  </p>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <section className={styles.orderInfoCard}>
                  <div className={styles.infoHeading}>
                    <FileCheck2 size={19} />
                    <h3>{copy.summary}</h3>
                  </div>

                  <div className={styles.infoRows}>
                    <div>
                      <span>{copy.product}</span>
                      <strong>{productTitle}</strong>
                    </div>

                    <div>
                      <span>{copy.country}</span>
                      <strong>{countryName}</strong>
                    </div>

                    <div>
                      <span>{copy.vendor}</span>
                      <strong>{vendorName}</strong>
                    </div>

                    <div>
                      <span>{copy.applicants}</span>
                      <strong>
                        {snapshot.applicants}{" "}
                        {copy.applicant}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className={styles.priceCard}>
                  <div className={styles.infoHeading}>
                    <Users size={19} />
                    <h3>{copy.paymentMethod}</h3>
                  </div>

                  <div className={styles.priceRows}>
                    <div>
                      <span>{copy.paymentMethod}</span>
                      <strong>
                        {snapshot.paymentTerm === "dp"
                          ? copy.deposit
                          : copy.fullPayment}
                      </strong>
                    </div>

                    {unitPrice !== null && (
                      <div>
                        <span>{copy.unitPrice}</span>
                        <strong>
                          {formatCurrency(unitPrice)}
                        </strong>
                      </div>
                    )}

                    {totalPrice !== null && (
                      <div className={styles.totalRow}>
                        <span>{copy.total}</span>
                        <strong>
                          {formatCurrency(totalPrice)}
                        </strong>
                      </div>
                    )}
                  </div>
                </section>
              </div>
              </section>
            )}

            <section className={styles.nextCard}>
              <div className={styles.nextHeading}>
                <ShieldCheck size={18} />
                <h2>{copy.nextStages}</h2>
              </div>

              <div className={styles.nextStages}>
                {tracking.slice(1).map(
                  (item, index) => (
                    <div
                      key={item.key}
                      className={[
                        styles.nextStage,
                        item.status === "done"
                          ? styles.nextStageDone
                          : item.status === "active"
                            ? styles.nextStageActive
                            : styles.nextStageWaiting,
                      ].join(" ")}
                    >
                      <span>
                        {item.status === "done"
                          ? "✓"
                          : index + 2}
                      </span>

                      <div>
                        <strong>
                          {item.title}
                        </strong>

                        <small>
                          {item.status === "done"
                            ? language === "EN"
                              ? "Completed"
                              : language === "AR"
                                ? "مكتمل"
                                : "Selesai"
                            : item.status === "active"
                              ? copy.processing
                              : copy.waiting}
                        </small>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>

            <section className={styles.securityStrip}>
              <ShieldCheck size={20} />

              <div>
                <strong>
                  {copy.protectedTitle}
                </strong>

                <p>
                  {copy.protectedDescription}
                </p>
              </div>
            </section>

            <button
              type="button"
              className={styles.backButton}
              onClick={handleBackToBookings}
            >
              <ChevronLeft size={18} />
              {copy.back}
            </button>
          </div>

          <aside className={styles.chatColumn}>
            <section className={styles.chatPanel}>
              <div className={styles.chatTitleRow}>
                <div className={styles.chatVendorIdentity}>
                  <button
                    type="button"
                    className={styles.vendorAvatarButton}
                    onClick={handleOpenVendorHome}
                    disabled={!vendorHomeUrl}
                    aria-label={vendorName}
                    title={vendorName}
                  >
                    <span
                      className={styles.vendorAvatar}
                      aria-hidden="true"
                    >
                      {vendorInitial}
                    </span>
                  </button>

                  <div className={styles.chatVendorDetails}>
                    <strong>{vendorName}</strong></div>
                </div>
              </div>

              {chatLifecycle.canRead && (
                <div className={styles.chatDateSummary}>
                  <span>
                    {language === "EN"
                      ? "Conversation history"
                      : language === "AR"
                        ? "سجل المحادثة"
                        : "Riwayat percakapan"}
                  </span>
                  <span>
                    {language === "EN"
                      ? "Visa order"
                      : language === "AR"
                        ? "طلب التأشيرة"
                        : "Pesanan Visa"}
                  </span>
                </div>
              )}

              {chatLifecycle.canRead ? (
                <>
                  {chatLifecycle.state === "grace_period" && (
                    <div
                      className={styles.chatLifecycleNotice}
                      role="status"
                    >
                      <Clock3
                        size={16}
                        aria-hidden="true"
                      />

                      <div>
                        <strong>
                          {language === "EN"
                            ? "Chat remains available for 48 hours after completion"
                            : language === "AR"
                              ? "تظل المحادثة متاحة لمدة 48 ساعة بعد اكتمال الطلب"
                              : "Chat tetap tersedia selama 48 jam setelah proses selesai"}
                        </strong>

                        <span>
                          {language === "EN"
                            ? "After this period, the conversation becomes read-only."
                            : language === "AR"
                              ? "بعد هذه المدة ستصبح المحادثة للقراءة فقط."
                              : "Setelah periode ini, percakapan menjadi hanya-baca."}
                        </span>
                      </div>
                    </div>
                  )}

                  {chatLifecycle.state === "closed" && (
                    <div
                      className={[
                        styles.chatLifecycleNotice,
                        styles.chatLifecycleClosed,
                      ].join(" ")}
                      role="status"
                    >
                      <LockKeyhole
                        size={16}
                        aria-hidden="true"
                      />

                      <div>
                        <strong>
                          {language === "EN"
                            ? "Conversation closed"
                            : language === "AR"
                              ? "تم إغلاق المحادثة"
                              : "Percakapan telah ditutup"}
                        </strong>

                        <span>
                          {language === "EN"
                            ? "The 48-hour consultation period has ended. Chat history remains available."
                            : language === "AR"
                              ? "انتهت فترة الاستشارة البالغة 48 ساعة. يظل سجل المحادثة متاحًا."
                              : "Masa konsultasi 48 jam telah berakhir. Riwayat chat tetap dapat dilihat."}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className={styles.chatThreadTools}>
                    <div className={styles.chatSearch}>
                      <Search
                        size={16}
                        aria-hidden="true"
                      />

                      <input
                        type="search"
                        value={chatSearch}
                        onChange={(event) =>
                          setChatSearch(
                            event.target.value,
                          )
                        }
                        placeholder={
                          language === "EN"
                            ? "Search this conversation"
                            : language === "AR"
                              ? "البحث في هذه المحادثة"
                              : "Cari percakapan ini"
                        }
                        aria-label={
                          language === "EN"
                            ? "Search this conversation"
                            : language === "AR"
                              ? "البحث في هذه المحادثة"
                              : "Cari percakapan ini"
                        }
                        disabled={
                          !chatLifecycle.canSearch
                        }
                      />
                    </div>
                  </div>

                  <div
                    className={styles.chatViewport}
                    aria-live="polite"
                  >
                    <div className={styles.systemMessage}>
                      <ShieldCheck size={18} />

                      <div>
                        <strong>
                          {copy.startConsultation}
                        </strong>

                        <p>
                          {
                            copy.startConsultationDescription
                          }
                        </p>
                      </div>
                    </div>

                    {filteredMessages.length > 0 ? (
                      <div className={styles.chatMessages}>
                        {filteredMessages.map((message, index) => (
  <div key={message.id} className={styles.chatMessageGroup}>
    {(index === 0 ||
      getChatDateKey(filteredMessages[index - 1].createdAt) !==
        getChatDateKey(message.createdAt)) && (
      <div className={styles.chatDateDivider}>
        <span>{formatChatDate(message.createdAt)}</span>
      </div>
    )}
    <div
      className={
  message.senderRole === "traveler"
    ? styles.outgoingMessage
    : styles.incomingMessage
}
                            >
                              {message.originalText && (
                                <p>
                                  {
                                    getLocalizedChatText(
                                      message,
                                      language as ChatLanguage,
                                    )
                                  }
                                </p>
                              )}

      <time
        className={styles.chatMessageTime}
        dateTime={message.createdAt}
      >
        {formatChatTime(message.createdAt)}
      </time>
    </div>
  </div>
))}
                      </div>
                    ) : (
                      chatSearch.trim() && (
                        <div
                          className={
                            styles.noSearchResult
                          }
                        >
                          {language === "EN"
                            ? "No messages found in this conversation."
                            : language === "AR"
                              ? "لم يتم العثور على رسائل في هذه المحادثة."
                              : "Pesan tidak ditemukan dalam percakapan ini."}
                        </div>
                      )
                    )}
                  </div>

                  {canSendChatAttachment && selectedAttachment && (
                    <div
                      className={
                        styles.attachmentPreview
                      }
                    >
                      <Paperclip size={16} />

                      <div>
                        <strong>
                          {selectedAttachment.name}
                        </strong>

                        <span>
                          {(
                            selectedAttachment.size /
                            1024 /
                            1024
                          ).toFixed(2)}{" "}
                          MB
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAttachment(
                            null,
                          );
                          setChatError("");
                        }}
                        aria-label={
                          language === "EN"
                            ? "Remove attachment"
                            : language === "AR"
                              ? "إزالة المرفق"
                              : "Hapus lampiran"
                        }
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {chatError && (
                    <div
                      className={styles.chatError}
                      role="alert"
                    >
                      {chatError}
                    </div>
                  )}

                  <div className={styles.chatComposer}>
                    <input
                      ref={attachmentInputRef}
                      className={
                        styles.hiddenFileInput
                      }
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={
                        handleAttachmentChange
                      }
                      disabled={
                        !canSendChatAttachment
                      }
                      tabIndex={-1}
                    />

                    <button
                      type="button"
                      className={
                        styles.attachmentButton
                      }
                      onClick={() =>
                        attachmentInputRef.current?.click()
                      }
                      disabled={
                        !canSendChatAttachment
                      }
                      aria-label={
                        language === "EN"
                          ? "Attach file"
                          : language === "AR"
                            ? "إرفاق ملف"
                            : "Lampirkan file"
                      }
                      title={
                        language === "EN"
                          ? "PDF, JPG, JPEG, PNG — max 10 MB"
                          : language === "AR"
                            ? "PDF، JPG، JPEG، PNG — بحد أقصى 10 ميجابايت"
                            : "PDF, JPG, JPEG, PNG — maks. 10 MB"
                      }
                    >
                      <Paperclip size={18} />
                    </button>

                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(event) => {
                        setChatMessage(
                          event.target.value,
                        );

                        if (chatError) {
                          setChatError("");
                        }
                      }}
                      onKeyDown={
                        handleChatKeyDown
                      }
                      placeholder={
                        chatLifecycle.state === "closed"
                          ? (
                              language === "EN"
                                ? "This conversation has been closed."
                                : language === "AR"
                                  ? "تم إغلاق هذه المحادثة."
                                  : "Percakapan ini telah ditutup."
                            )
                          : copy.messagePlaceholder
                      }
                      aria-label={
                        copy.messagePlaceholder
                      }
                      disabled={
                        !chatLifecycle.canSendMessage
                      }
                    />

                    <button
                      type="button"
                      className={styles.sendButton}
                      aria-label={copy.send}
                      onClick={
                        handleSendMessage
                      }
                      disabled={
                        !chatLifecycle.canSendMessage ||
                        (
                          !chatMessage.trim() && !(canSendChatAttachment && selectedAttachment)
                        )
                      }
                    >
                      <Send size={19} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.chatLocked}>
                    <div className={styles.lockVisual}>
                      <MessageCircle size={48} />
                      <span>
                        <LockKeyhole size={23} />
                      </span>
                    </div>

                    <strong>
                      {copy.chatLockedTitle}
                    </strong>

                    <p>
                      {copy.chatLockedDescription}
                    </p>
                  </div>

                  <div className={styles.waitingInfo}>
                    <Clock3 size={20} />

                    <div>
                      <strong>
                        {copy.waitingPayment}
                      </strong>

                      <p>
                        {
                          copy.paymentWaitingDescription
                        }
                      </p>
                    </div>
                  </div>
                </>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}