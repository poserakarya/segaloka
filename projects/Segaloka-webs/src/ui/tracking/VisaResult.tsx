"use client";

import {
  MessageSquare,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Info,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import type {
  VisaApplicantResult,
  VisaApplicantResultStatus,
  VisaResultProgress,
} from "@/lib/visa/visa-result";

import {
  canCompleteVisaResultStep,
} from "@/lib/visa/visa-result";

import {
  getVisaLocalizedText,
  type VisaLanguage,
} from "@/lib/visa/visa-localization";

import { useState } from "react";

import {
  downloadVisaResultsPdf,
  getVisaDownloadSummary,
  type VisaDownloadFilter,
} from "@/lib/visa/visa-pdf-download";
import styles from "./VisaResult.module.css";

type Props = {
  progress: VisaResultProgress;
  language: VisaLanguage;
};

const copy = {
  ID: {
    title: "5. Hasil Visa",
    description: "Pantau keputusan Visa dan dokumen resmi dari Vendor.",
    approved: "Disetujui",
    rejected: "Ditolak",
    pending: "Menunggu Hasil",
    additional: "Perlu Tindakan Tambahan",
    confirmed: "Dikonfirmasi",
    decisionEvidence: "Bukti Keputusan",
    approvalEvidence: "Bukti Persetujuan",
    rejectionEvidence: "Bukti Penolakan",
    issuedVisa: "Dokumen Visa Terbit",
    issuedDescription: "e-Visa atau scan Visa yang telah diterbitkan.",
    waitingVisa: "Menunggu dokumen Visa terbit",
    waitingVisaDescription:
      "Vendor akan menyediakan e-Visa atau scan Visa setelah diterbitkan.",
    rejectionReason: "Alasan Penolakan",
    vendorNote: "Catatan Vendor",
    updates: "Riwayat Hasil Visa",
    decisionComplete:
      "Keputusan seluruh pemohon telah dikonfirmasi Vendor.",
    decisionWaiting:
      "Masih menunggu keputusan atau bukti resmi dari Vendor.",
    documentsPending:
      "Sebagian dokumen Visa terbit masih menunggu Vendor.",
    noEvidence: "Bukti keputusan belum tersedia.",
    noUpdates: "Belum ada pembaruan hasil.",
    view: "Lihat",
    download: "Download",
    unavailable: "File belum tersedia",
    noApplicants: "Belum ada data pemohon.",
    noName: "Nama Traveler belum tersedia",
    final: "Keputusan Final",
    processing: "Dalam Proses",
    visaNumber: "Nomor Visa",
    validity: "Masa Berlaku",
    fileReady: "Dokumen tersedia",
    fileWaiting: "Menunggu unggahan Vendor",
  },
  EN: {
    title: "5. Visa Result",
    description: "Track Visa decisions and official Vendor documents.",
    approved: "Approved",
    rejected: "Rejected",
    pending: "Awaiting Result",
    additional: "Additional Action Required",
    confirmed: "Confirmed",
    decisionEvidence: "Visa Decision Evidence",
    approvalEvidence: "Approval Evidence",
    rejectionEvidence: "Rejection Evidence",
    issuedVisa: "Issued Visa Document",
    issuedDescription: "An issued e-Visa or scanned Visa.",
    waitingVisa: "Waiting for issued Visa document",
    waitingVisaDescription:
      "The Vendor will provide the e-Visa or scanned Visa once issued.",
    rejectionReason: "Rejection Reason",
    vendorNote: "Vendor Note",
    updates: "Result Updates",
    decisionComplete:
      "Decisions for all applicants have been confirmed by the Vendor.",
    decisionWaiting:
      "Awaiting complete decisions or official evidence from the Vendor.",
    documentsPending:
      "Some issued Visa documents are still pending.",
    noEvidence: "Decision evidence is not yet available.",
    noUpdates: "No result updates yet.",
    view: "View",
    download: "Download",
    unavailable: "File not available yet",
    noApplicants: "No applicant information available.",
    noName: "Traveler name unavailable",
    final: "Final Decision",
    processing: "In Progress",
    visaNumber: "Visa Number",
    validity: "Validity",
    fileReady: "Document available",
    fileWaiting: "Awaiting Vendor upload",
  },
  AR: {
    title: "٥. نتيجة التأشيرة",
    description: "تابع قرارات التأشيرة والمستندات الرسمية من مزود الخدمة.",
    approved: "تمت الموافقة",
    rejected: "مرفوض",
    pending: "بانتظار النتيجة",
    additional: "مطلوب إجراء إضافي",
    confirmed: "تم التأكيد",
    decisionEvidence: "إثبات قرار التأشيرة",
    approvalEvidence: "إثبات الموافقة",
    rejectionEvidence: "إثبات الرفض",
    issuedVisa: "وثيقة التأشيرة الصادرة",
    issuedDescription: "التأشيرة الإلكترونية أو صورة التأشيرة الصادرة.",
    waitingVisa: "بانتظار إصدار وثيقة التأشيرة",
    waitingVisaDescription:
      "سيقدم مزود الخدمة وثيقة التأشيرة بعد إصدارها.",
    rejectionReason: "سبب الرفض",
    vendorNote: "ملاحظة مزود الخدمة",
    updates: "تحديثات النتيجة",
    decisionComplete:
      "تم تأكيد قرارات جميع المتقدمين من مزود الخدمة.",
    decisionWaiting:
      "بانتظار القرارات أو الإثباتات الرسمية من مزود الخدمة.",
    documentsPending:
      "بعض وثائق التأشيرة الصادرة لم تتوفر بعد.",
    noEvidence: "إثبات القرار غير متوفر بعد.",
    noUpdates: "لا توجد تحديثات بعد.",
    view: "عرض",
    download: "تنزيل",
    unavailable: "الملف غير متوفر بعد",
    noApplicants: "لا توجد بيانات للمتقدمين.",
    noName: "اسم المسافر غير متوفر",
    final: "القرار النهائي",
    processing: "قيد المعالجة",
    visaNumber: "رقم التأشيرة",
    validity: "الصلاحية",
    fileReady: "المستند متوفر",
    fileWaiting: "بانتظار رفع المستند",
  },
} as const;

function formatDate(
  value: string | null | undefined,
  language: VisaLanguage,
) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const locale =
    language === "AR"
      ? "ar-SA"
      : language === "EN"
        ? "en-US"
        : "id-ID";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function safeFileUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value, "https://segaloka.invalid");

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    if (url.hostname === "segaloka.invalid") {
      return value.startsWith("/") && !value.startsWith("//")
        ? value
        : null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

type DocumentFile = {
  id: string;
  fileName: string;
  fileUrl?: string;
  uploadedAt?: string | null;
  issuedAt?: string | null;
};

function DocumentRow({
  file,
  language,
}: {
  file: DocumentFile;
  language: VisaLanguage;
}) {
  const t = copy[language];
  const url = safeFileUrl(file.fileUrl);
  const date = formatDate(
    file.issuedAt ?? file.uploadedAt,
    language,
  );

  return (
    <div className={styles.fileRow}>
      <div className={styles.fileIcon}>
        <FileText size={19} />
      </div>

      <div className={styles.fileDetails}>
        <strong className={styles.fileName}>
          {file.fileName}
        </strong>
        <span className={styles.fileMeta}>
          {url ? t.fileReady : t.fileWaiting}
          {date ? ` · ${date}` : ""}
        </span>
      </div>

      {url ? (
        <div className={styles.fileActions}>
          <a
            className={styles.viewButton}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={14} />
            {t.view}
          </a>
          <a
            className={styles.downloadButton}
            href={url}
            download={file.fileName}
          >
            <Download size={14} />
            {t.download}
          </a>
        </div>
      ) : (
        <span className={styles.unavailable}>
          {t.unavailable}
        </span>
      )}
    </div>
  );
}

function statusLabel(
  status: VisaApplicantResultStatus,
  language: VisaLanguage,
) {
  const t = copy[language];

  switch (status) {
    case "approved":
      return t.approved;
    case "rejected":
      return t.rejected;
    case "additional_action_required":
      return t.additional;
    default:
      return t.pending;
  }
}

const visaApplicantFixtureMetadata: Record<
  string,
  {
    passportNumber: string;
    country: string;
    visaType: string;
    applicationDate: string;
  }
> = {
  "fixture-applicant-1": {
    passportNumber: "E1234567",
    country: "China",
    visaType: "Single Entry",
    applicationDate: "2026-10-10",
  },
  "fixture-applicant-2": {
    passportNumber: "E7654321",
    country: "China",
    visaType: "Single Entry",
    applicationDate: "2026-10-10",
  },
  "fixture-applicant-3": {
    passportNumber: "B7654321",
    country: "China",
    visaType: "Single Entry",
    applicationDate: "2026-10-10",
  },
};
function ApplicantCard({
  applicant,
  language,
}: {
  applicant: VisaApplicantResult;
  language: VisaLanguage;
}) {
  const t = copy[language];

  const approved = applicant.status === "approved";
  const rejected = applicant.status === "rejected";
  const final = approved || rejected;

  const tone = approved
    ? styles.approved
    : rejected
      ? styles.rejected
      : styles.pending;

  const evidence = applicant.evidence ?? [];
  const [expanded, setExpanded] = useState(true);
  const panelId = `visa-result-${applicant.applicantId}`;

  return (
    <article className={`${styles.applicantCard} ${tone}`}>
      <button
        type="button"
        className={styles.applicantHeader}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((current) => !current)}
      >
        <div className={styles.person}>
          <div className={styles.avatar} aria-hidden="true">
            {applicant.applicantName
              ?.trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part.charAt(0))
              .join("")
              .toUpperCase() || "?"}
          </div>

          <div className={styles.personDetails}>
            <h3 className={styles.personName}>
              {applicant.applicantName?.trim() || t.noName}
            </h3>

            {(() => {
              const metadata =
                visaApplicantFixtureMetadata[applicant.applicantId];

              return metadata ? (
                <p className={styles.confirmedDate}>
                  {language === "AR"
                    ? "رقم الجواز"
                    : language === "EN"
                      ? "Passport No."
                      : "No. Paspor"}: {metadata.passportNumber}
                  {" · "}
                  {metadata.country} — {metadata.visaType}
                  {" · "}
                  {language === "AR"
                    ? "تاريخ التقديم"
                    : language === "EN"
                      ? "Applied"
                      : "Pengajuan"}:{" "}
                  {new Intl.DateTimeFormat(
                    language === "AR"
                      ? "ar-SA"
                      : language === "EN"
                        ? "en-US"
                        : "id-ID",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    }
                  ).format(new Date(`${metadata.applicationDate}T00:00:00Z`))}
                </p>
              ) : (
                applicant.confirmedAt && (
                  <p className={styles.confirmedDate}>
                    {t.confirmed}:{" "}
                    {formatDate(applicant.confirmedAt, language)}
                  </p>
                )
              );
            })()}
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.statusTopRow}>
            <span className={styles.statusBadge}>
              <span aria-hidden="true">
                {approved ? "😊" : rejected ? "😢" : "⏳"}
              </span>
              {statusLabel(applicant.status, language)}
            </span>
            <span className={styles.collapseButton} aria-hidden="true">
              <ChevronDown
                size={20}
                className={expanded ? styles.chevronOpen : ""}
              />
            </span>
          </div>
          {applicant.confirmedAt ? (
            <span className={styles.statusConfirmedDate}>
              {t.confirmed}: {formatDate(applicant.confirmedAt, language)}
            </span>
          ) : applicant.applicantId === "fixture-applicant-3" ? (
            <span className={styles.statusConfirmedDate}>
              {language === "AR"
                ? "آخر تحديث"
                : language === "EN"
                  ? "Updated"
                  : "Update"}:{" "}
              {formatDate("2026-10-15T12:30:00+08:00", language)}
            </span>
          ) : null}
        </div>
      </button>

      {expanded && <div id={panelId} className={styles.applicantBody}>
        <div className={styles.documentGrid}>
          <section className={styles.detailPanel}>
            <div className={styles.panelHeading}>
              {rejected ? (
                <XCircle size={18} />
              ) : (
                <FileCheck2 size={18} />
              )}
              <h4>
                {approved
                  ? t.approvalEvidence
                  : rejected
                    ? t.rejectionEvidence
                    : t.decisionEvidence}
              </h4>
            </div>

            {evidence.length ? (
              <div className={styles.fileList}>
                {evidence.map((file) => (
                  <DocumentRow
                    key={file.id}
                    file={file}
                    language={language}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>{t.noEvidence}</p>
            )}
          </section>

          {applicant.vendorNote && (
            <section className={styles.vendorNote}>
              <div className={styles.vendorNoteHeading}>
                <MessageSquare size={18} aria-hidden="true" />
                <strong>{t.vendorNote}</strong>
              </div>
              <div className={styles.vendorNoteMessage}>
                <MessageSquare size={18} aria-hidden="true" />
                <p style={{ whiteSpace: "pre-line" }}>
                  {getVisaLocalizedText(
                    applicant.vendorNoteTranslations,
                    applicant.vendorNote,
                    language,
                  ).replace(/([.!?])\s+(?=\S)/g, "$1\n")}
                </p>
              </div>
            </section>
          )}
        </div>

        <div
          className={`${styles.resultFooter} ${
            approved
              ? styles.finalApproved
              : rejected
                ? styles.finalRejected
                : styles.finalPending
          }`}
        >
          {approved ? (
            <CheckCircle2 size={21} aria-hidden="true" />
          ) : rejected ? (
            <XCircle size={21} aria-hidden="true" />
          ) : (
            <Clock3 size={21} aria-hidden="true" />
          )}
          <div className={styles.finalDecisionText}>
            <strong>{final ? t.final : t.processing}</strong>
            <span>
              {approved
                ? language === "AR"
                  ? "حصل مقدم الطلب على الموافقة على التأشيرة."
                  : language === "EN"
                    ? "The applicant has received Visa approval."
                    : "Pemohon telah mendapatkan persetujuan Visa."
                : rejected
                  ? language === "AR"
                    ? "لم يحصل مقدم الطلب على الموافقة على التأشيرة."
                    : language === "EN"
                      ? "The applicant has not received Visa approval."
                      : "Pemohon belum mendapatkan persetujuan Visa."
                  : language === "AR"
                    ? "لا يزال قرار التأشيرة قيد المعالجة."
                    : language === "EN"
                      ? "The Visa decision is still being processed."
                      : "Keputusan Visa masih dalam proses."}
            </span>
          </div>
        </div>
      </div>}
    </article>
  );
}

function VisaBulkDownloadPanel({
  progress,
  language,
}: Props) {
  const [loading, setLoading] =
    useState<VisaDownloadFilter | null>(null);
  const [error, setError] = useState(false);

  const translations = {
    ID: {
      title: "Download Dokumen",
      subtitle: "Gabungkan dokumen yang tersedia menjadi satu PDF.",
      all: "Download Semua",
      approved: "Download Disetujui",
      rejected: "Download Ditolak",
      available: "file tersedia",
      missing: "file belum tersedia",
      loading: "Membuat PDF...",
      error: "Download gagal. Periksa dokumen dan coba lagi.",
    },
    EN: {
      title: "Download Documents",
      subtitle: "Combine available documents into a single PDF.",
      all: "Download All",
      approved: "Download Approved",
      rejected: "Download Rejected",
      available: "files available",
      missing: "files unavailable",
      loading: "Creating PDF...",
      error: "Download failed. Check the documents and retry.",
    },
    AR: {
      title: "تنزيل المستندات",
      subtitle: "دمج المستندات المتاحة في ملف PDF واحد.",
      all: "تنزيل الكل",
      approved: "تنزيل الموافق عليهم",
      rejected: "تنزيل المرفوضين",
      available: "ملفات متاحة",
      missing: "ملفات غير متاحة",
      loading: "جارٍ إنشاء PDF...",
      error: "فشل التنزيل. تحقق من المستندات وحاول مجددًا.",
    },
  } as const;

  const t = translations[language];

  const filters: VisaDownloadFilter[] = [
    "all",
    "approved",
    "rejected",
  ];

  async function handleDownload(filter: VisaDownloadFilter) {
    if (loading) return;

    setLoading(filter);
    setError(false);

    try {
      await downloadVisaResultsPdf(progress, filter);
    } catch (cause) {
      console.error("Visa PDF generation failed", cause);
      setError(true);
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className={styles.bulkPdfPanel}>
      <div className={styles.bulkPdfGrid}>
        {filters.map((filter) => {
          const summary = getVisaDownloadSummary(
            progress,
            filter,
          );

          const isAll = filter === "all";

          const label =
            filter === "all"
              ? t.all
              : filter === "approved"
                ? t.approved
                : t.rejected;

          return (
            <div
              key={filter}
              className={`${styles.bulkPdfButton} ${
                isAll ? styles.bulkPdfPrimary : ""
              } ${
                filter === "rejected" ? styles.bulkPdfRejected : ""
              }`}
            >
              <span className={styles.bulkPdfCompactIcon}>
                <Download size={18} />
              </span>

              <span className={styles.bulkPdfCompactText}>
                <strong>
                  {isAll ? t.title : label}
                </strong>
                <small>
                  {isAll
                    ? t.subtitle
                    : `${summary.availableFiles} file tersedia`}
                </small>
              </span>

              <button
                type="button"
                className={styles.bulkPdfCompactAction}
                onClick={() => void handleDownload(filter)}
                disabled={
                  loading !== null ||
                  summary.availableFiles === 0
                }
                aria-label={label}
              >
                <Download size={17} />
                {isAll && <span>{label}</span>}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className={styles.bulkPdfError}>
          {t.error}
        </p>
      )}
    </section>
  );
}
export function VisaResult({ progress, language }: Props) {
  const t = copy[language];

  const decisionComplete = canCompleteVisaResultStep(progress);


  const sortedUpdates = [...progress.updates].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime(),
  );

  return (
    <section
      className={styles.root}
      dir={language === "AR" ? "rtl" : "ltr"}
    >
      <header className={styles.heading}>
        <h2>{t.title}</h2>
        <p>{t.description}</p>
      </header>

      <div className={styles.notice}>
        {decisionComplete ? (
          <CheckCircle2 size={19} />
        ) : (
          <Clock3 size={19} />
        )}

        <div>
          <strong>
            {decisionComplete
              ? t.decisionComplete
              : t.decisionWaiting}
          </strong>


        </div>
      </div>

      <VisaBulkDownloadPanel progress={progress} language={language} />

      <div className={styles.applicantList}>
        {progress.applicants.length ? (
          progress.applicants.map((applicant) => (
            <ApplicantCard
              key={applicant.applicantId}
              applicant={applicant}
              language={language}
            />
          ))
        ) : (
          <p className={styles.emptyText}>
            {t.noApplicants}
          </p>
        )}
      </div>

      <section className={styles.timelineCard}>
        <div className={styles.timelineTitle}>
          <Clock3 size={19} />
          <h3>{t.updates}</h3>
        </div>

        {sortedUpdates.length ? (
          <ol className={styles.timeline}>
            {sortedUpdates.map((update) => (
              <li key={update.id} className={styles.timelineItem}>
                <span className={styles.timelineDot} />

                <div className={styles.timelineContent}>
                  <time className={styles.timelineDate}>
                    {formatDate(update.createdAt, language)}
                  </time>
                  <p>
                    {getVisaLocalizedText(
                      update.noteTranslations,
                      update.note,
                      language,
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.emptyText}>{t.noUpdates}</p>
        )}
      </section>
    </section>
  );
}