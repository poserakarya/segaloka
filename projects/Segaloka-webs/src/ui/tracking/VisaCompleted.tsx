"use client";

import { useState, type FormEvent } from "react";
import {
  Check,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileDown,
  FileText,
  Send,
  Star,
  Truck,
  CalendarDays,
} from "lucide-react";

type Language = "ID" | "EN" | "AR";

type VisaDocument = {
  id: string;
  fileName: string;
  fileUrl?: string;
  fileType: "pdf" | "jpg" | "jpeg" | "png";
  issuedAt?: string;
};

type Applicant = {
  id: string;
  name: string;
  status:
    | "approved"
    | "rejected"
    | "pending"
    | "additional_action_required";
  documents: VisaDocument[];
};

type Props = {
  language: Language;
  physicalReturnRequired: boolean;
  applicants: Applicant[];
  documentReturnComplete?: boolean;
  serviceCompleted?: boolean;
  onReviewSubmitted?: () => void;
};

const messages = {
  ID: {
    title: "6. Selesai",
    subtitle: "Hasil Visa telah dikonfirmasi oleh Vendor.",
    successTitle: "Visa Anda Telah Selesai!",
    successText: "Seluruh permohonan Visa telah mendapatkan keputusan akhir.",
    confirmed: "Dikonfirmasi",
    documentTitle: "Dokumen Visa Terbit",
    documentDescription: "Unduh dokumen Visa yang telah diterbitkan untuk setiap pemohon.",
    downloadAll: "Unduh Semua",
    issued: "Visa Terbit",
    view: "Lihat",
    download: "Unduh",
    noDocuments: "Tidak ada dokumen Visa yang diterbitkan.",
    unavailable: "Dokumen belum tersedia.",
    returnTitle: "Pengembalian Dokumen Asli",
    noReturn: "Tidak ada dokumen fisik yang perlu dikembalikan.",
    returnPending: "Pengembalian dokumen asli masih dalam proses.",
    returnDone: "Dokumen asli telah dikembalikan.",
    finish: "Konfirmasi Layanan Selesai",
    finished: "Layanan Visa Selesai",
    finishedText: "Terima kasih telah menggunakan layanan Visa di Segaloka. Semoga perjalanan Anda lancar!",
    reviewTitle: "Berikan Ulasan",
    reviewDescription: "Bagaimana pengalaman Anda menggunakan layanan Vendor Visa?",
    rating: "Penilaian Layanan",
    comment: "Ulasan Anda (Opsional)",
    placeholder: "Tulis pengalaman Anda di sini...",
    send: "Kirim Ulasan",
    sent: "Ulasan Terkirim",
    thanks: "Ulasan Anda sangat berarti untuk meningkatkan kualitas layanan Segaloka.",
    pending: "Masih ada permohonan Visa yang menunggu keputusan akhir.",
    preview: "Pratinjau UI/UX — perubahan belum tersimpan ke server.",
  },
  EN: {
    title: "6. Completed",
    subtitle: "Visa results have been confirmed by the Vendor.",
    successTitle: "Your Visa Process Is Complete!",
    successText: "All Visa applications have received a final decision.",
    confirmed: "Confirmed",
    documentTitle: "Issued Visa Documents",
    documentDescription: "Download the issued Visa documents for each applicant.",
    downloadAll: "Download All",
    issued: "Visa Issued",
    view: "View",
    download: "Download",
    noDocuments: "No Visa documents have been issued.",
    unavailable: "Document is not available.",
    returnTitle: "Original Document Return",
    noReturn: "No physical documents need to be returned.",
    returnPending: "Original document return is in progress.",
    returnDone: "Original documents have been returned.",
    finish: "Confirm Service Completion",
    finished: "Visa Service Completed",
    finishedText: "Thank you for using Segaloka Visa services. Have a pleasant journey!",
    reviewTitle: "Write a Review",
    reviewDescription: "How was your experience with the Visa Vendor?",
    rating: "Service Rating",
    comment: "Your Review (Optional)",
    placeholder: "Share your experience here...",
    send: "Submit Review",
    sent: "Review Submitted",
    thanks: "Your review helps improve Segaloka services.",
    pending: "Some Visa applications are still awaiting a final decision.",
    preview: "UI/UX preview — changes are not saved to the server.",
  },
  AR: {
    title: "٦. مكتمل",
    subtitle: "تم تأكيد نتائج التأشيرة من مقدم الخدمة.",
    successTitle: "اكتملت معالجة التأشيرة!",
    successText: "صدرت القرارات النهائية لجميع طلبات التأشيرة.",
    confirmed: "تم التأكيد",
    documentTitle: "وثائق التأشيرة الصادرة",
    documentDescription: "قم بتنزيل وثائق التأشيرة الصادرة لكل متقدم.",
    downloadAll: "تنزيل الكل",
    issued: "تأشيرة صادرة",
    view: "عرض",
    download: "تنزيل",
    noDocuments: "لا توجد وثائق تأشيرة صادرة.",
    unavailable: "الوثيقة غير متاحة.",
    returnTitle: "إعادة المستندات الأصلية",
    noReturn: "لا توجد مستندات ورقية تحتاج إلى الإرجاع.",
    returnPending: "إعادة المستندات الأصلية قيد المعالجة.",
    returnDone: "اكتملت إعادة المستندات الأصلية.",
    finish: "تأكيد إكمال الخدمة",
    finished: "اكتملت خدمة التأشيرة",
    finishedText: "شكراً لاستخدام خدمات سيغالـوكا. نتمنى لك رحلة سعيدة!",
    reviewTitle: "أضف تقييمك",
    reviewDescription: "كيف كانت تجربتك مع مقدم خدمة التأشيرة؟",
    rating: "تقييم الخدمة",
    comment: "مراجعتك (اختياري)",
    placeholder: "شارك تجربتك هنا...",
    send: "إرسال التقييم",
    sent: "تم إرسال التقييم",
    thanks: "تقييمك يساعدنا على تحسين جودة الخدمات.",
    pending: "لا تزال بعض طلبات التأشيرة بانتظار القرار النهائي.",
    preview: "معاينة الواجهة — لم يتم الحفظ على الخادم.",
  },
} as const;

const card: React.CSSProperties = {
  background: "var(--ui-surface, #fff)",
  border: "1px solid var(--ui-border, #dce8f5)",
  borderRadius: 12,
  padding: 16,
};

const blueButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "11px 16px",
  background: "var(--ui-primary, #086cf4)",
  color: "var(--ui-primary-foreground, #fff)",
  border: 0,
  borderRadius: 9,
  font: "inherit",
  fontWeight: 700,
  textDecoration: "none",
  cursor: "pointer",
};

function validFileUrl(url?: string): url is string {
  return (
    typeof url === "string" &&
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes("\\")
  );
}

export function VisaCompleted({
  language,
  physicalReturnRequired,
  applicants,
  documentReturnComplete = false,
  serviceCompleted = false,
  onReviewSubmitted,
}: Props) {
  const t = messages[language];
  const [previewCompleted, setPreviewCompleted] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const allFinal =
    applicants.length > 0 &&
    applicants.every(
      (applicant) =>
        applicant.status === "approved" ||
        applicant.status === "rejected",
    );

  const completed = serviceCompleted || previewCompleted;
  const canComplete =
    allFinal &&
    (!physicalReturnRequired || documentReturnComplete);

  const documents = applicants
    .filter((applicant) => applicant.status === "approved")
    .flatMap((applicant) =>
      applicant.documents.map((document) => ({
        ...document,
        applicantId: applicant.id,
        applicantName: applicant.name,
      })),
    );

  const downloadable = documents.filter((document) =>
    validFileUrl(document.fileUrl),
  );

  function downloadAll() {
    downloadable.forEach((document) => {
      if (!validFileUrl(document.fileUrl)) return;

      const link = window.document.createElement("a");
      link.href = document.fileUrl;
      link.download = document.fileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating === 0) return;
    setReviewSubmitted(true);
    onReviewSubmitted?.();
  }

  return (
    <section
      dir={language === "AR" ? "rtl" : "ltr"}
      style={{
        display: "grid",
        gap: 12,
        color: "var(--ui-foreground, #102a59)",
      }}
    >
      <div style={card}>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 750 }}>
          {t.title}
        </h2>
        <p style={{ margin: "5px 0 12px", fontSize: 13, opacity: 0.7 }}>
          {t.subtitle}
        </p>

        {allFinal ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 22,
              padding: "20px 24px",
              borderRadius: 11,
              background:
                "linear-gradient(115deg, var(--ui-success-soft, #e9f9ef), var(--ui-surface, #f3fff8))",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 110,
                minWidth: 80,
                height: 94,
                position: "relative",
                display: "grid",
                placeItems: "center",
              }}
            >
              <FileCheck2
                size={76}
                strokeWidth={1.5}
                color="var(--ui-primary, #086cf4)"
              />
              <span
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 2,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--ui-success, #0aa56a)",
                  color: "white",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 5px 14px #0aa56a33",
                }}
              >
                <Check size={24} strokeWidth={3} />
              </span>
            </div>

            <div>
              <h3
                style={{
                  fontSize: "clamp(17px, 2vw, 24px)",
                  fontWeight: 800,
                  margin: 0,
                  color: "var(--ui-primary, #083c9e)",
                }}
              >
                {t.successTitle}
              </h3>

              <p style={{ margin: "7px 0", fontSize: 13, opacity: 0.8 }}>
                {t.successText}
              </p>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  opacity: 0.75,
                }}
              >
                <CalendarDays size={14} />
                {t.confirmed}
              </span>
            </div>
          </div>
        ) : (
          <div
            role="status"
            style={{
              padding: 16,
              borderRadius: 10,
              background: "var(--ui-warning-soft, #fff7e6)",
            }}
          >
            {t.pending}
          </div>
        )}
      </div>

      {allFinal && (
        <>
          <div style={card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 11,
                    background: "var(--ui-info-soft, #e9f3ff)",
                    color: "var(--ui-primary, #086cf4)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <FileText size={22} />
                </div>

                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>
                    {t.documentTitle}
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>
                    {t.documentDescription}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadAll}
                disabled={downloadable.length === 0}
                style={{
                  ...blueButton,
                  background: "var(--ui-info-soft, #e9f3ff)",
                  color: "var(--ui-primary, #086cf4)",
                  opacity: downloadable.length ? 1 : 0.5,
                }}
              >
                <Download size={16} />
                {t.downloadAll}
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {documents.length === 0 ? (
                <p>{t.noDocuments}</p>
              ) : (
                documents.map((document) => (
                  <div
                    key={`${document.applicantId}-${document.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                      border: "1px solid var(--ui-border, #dce8f5)",
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 46,
                        height: 50,
                        background: "var(--ui-error-soft, #fff0f0)",
                        color: "var(--ui-error, #e44e56)",
                        borderRadius: 9,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <FileDown size={25} />
                    </div>

                    <div style={{ flex: 1, minWidth: 130 }}>
                      <strong style={{ fontSize: 13 }}>
                        {document.applicantName}
                      </strong>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {document.fileName}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>
                        {document.fileType.toUpperCase()}
                      </div>
                    </div>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "8px 12px",
                        borderRadius: 24,
                        background: "var(--ui-success-soft, #e9f9ef)",
                        color: "var(--ui-success, #078554)",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <CheckCircle2 size={15} />
                      {t.issued}
                    </span>

                    {validFileUrl(document.fileUrl) ? (
                      <>
                        <a
                          href={document.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            ...blueButton,
                            background: "var(--ui-surface, #fff)",
                            color: "var(--ui-primary, #086cf4)",
                            border: "1px solid var(--ui-border, #dce8f5)",
                          }}
                        >
                          <Eye size={16} />
                          {t.view}
                        </a>

                        <a
                          href={document.fileUrl}
                          download={document.fileName}
                          style={blueButton}
                        >
                          <Download size={16} />
                          {t.download}
                        </a>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, opacity: 0.6 }}>
                        {t.unavailable}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              ...card,
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "var(--ui-info-soft, #eef7ff)",
            }}
          >
            <Truck
              size={24}
              color="var(--ui-primary, #086cf4)"
            />
            <div>
              <strong style={{ fontSize: 14 }}>
                {t.returnTitle}
              </strong>
              <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.75 }}>
                {!physicalReturnRequired
                  ? t.noReturn
                  : documentReturnComplete
                    ? t.returnDone
                    : t.returnPending}
              </p>
            </div>
          </div>

          {!completed ? (
            <button
              type="button"
              disabled={!canComplete}
              onClick={() => setPreviewCompleted(true)}
              style={{
                ...blueButton,
                width: "100%",
                opacity: canComplete ? 1 : 0.5,
              }}
            >
              <CheckCircle2 size={18} />
              {t.finish}
            </button>
          ) : (
            <>
              <div
                style={{
                  ...card,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: "var(--ui-success-soft, #e9f9ef)",
                }}
              >
                <CheckCircle2
                  size={30}
                  color="var(--ui-success, #0aa56a)"
                />
                <div>
                  <strong style={{ fontSize: 15 }}>
                    {t.finished}
                  </strong>
                  <p style={{ margin: "5px 0 0", fontSize: 12 }}>
                    {t.finishedText}
                  </p>
                </div>
              </div>

              <div style={card}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: "var(--ui-warning-soft, #fff4e3)",
                      color: "var(--ui-warning, #f59e0b)",
                    }}
                  >
                    <Star size={24} fill="currentColor" />
                  </span>

                  <div>
                    <h3 style={{ margin: 0, fontSize: 16 }}>
                      {t.reviewTitle}
                    </h3>
                    <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>
                      {t.reviewDescription}
                    </p>
                  </div>
                </div>

                {reviewSubmitted ? (
                  <div role="status">
                    <strong>{t.sent}</strong>
                    <p>{"★".repeat(rating)}</p>
                    <p>{comment}</p>
                  </div>
                ) : (
                  <form
                    onSubmit={submitReview}
                    style={{ display: "grid", gap: 13 }}
                  >
                    <strong style={{ fontSize: 13 }}>
                      {t.rating}
                    </strong>

                    <div
                      role="group"
                      aria-label={t.rating}
                      style={{ display: "flex", gap: 8 }}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          aria-label={`${star} / 5`}
                          aria-pressed={rating === star}
                          onClick={() => setRating(star)}
                          style={{
                            border: 0,
                            background: "transparent",
                            padding: 0,
                            cursor: "pointer",
                            color:
                              star <= rating
                                ? "var(--ui-warning, #f59e0b)"
                                : "var(--ui-muted, #cbd5e1)",
                          }}
                        >
                          <Star size={31} fill="currentColor" />
                        </button>
                      ))}
                    </div>

                    <label
                      style={{
                        display: "grid",
                        gap: 8,
                        fontSize: 13,
                      }}
                    >
                      {t.comment}

                      <textarea
                        rows={4}
                        maxLength={500}
                        value={comment}
                        onChange={(event) =>
                          setComment(event.target.value)
                        }
                        placeholder={t.placeholder}
                        style={{
                          width: "100%",
                          padding: 12,
                          borderRadius: 9,
                          resize: "vertical",
                          border: "1px solid var(--ui-border, #dce8f5)",
                          background: "var(--ui-surface, #fff)",
                          color: "var(--ui-foreground, inherit)",
                          font: "inherit",
                        }}
                      />

                      <span
                        style={{
                          fontSize: 11,
                          textAlign: "end",
                          opacity: 0.6,
                        }}
                      >
                        {comment.length}/500
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={rating === 0}
                      style={{
                        ...blueButton,
                        width: "100%",
                        opacity: rating ? 1 : 0.5,
                      }}
                    >
                      <Send size={16} />
                      {t.send}
                    </button>

                    <p
                      style={{
                        textAlign: "center",
                        fontSize: 12,
                        opacity: 0.65,
                        margin: 0,
                      }}
                    >
                      {t.thanks}
                    </p>
                  </form>
                )}
              </div>
            </>
          )}
        </>
      )}

      <p
        style={{
          margin: "3px 0",
          textAlign: "center",
          fontSize: 11,
          opacity: 0.5,
        }}
      >
        {t.preview}
      </p>
    </section>
  );
}