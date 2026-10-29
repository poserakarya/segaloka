"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileText,
  RotateCcw,
  Upload,
} from "lucide-react";

import type {
  VisaApplicantDocumentProgress,
  VisaDocumentRequirement,
} from "@/lib/visa/visa-document-requirements";

import {
  getVisaLocalizedText,
} from "@/lib/visa/visa-localization";

import styles from "./VisaDocumentReview.module.css";

type Language = "ID" | "EN" | "AR";

type Props = {
  applicantCount: number;
  requirements: VisaDocumentRequirement[];
  progress: VisaApplicantDocumentProgress[];
  language: Language;
};

const copy = {
  ID: {
    title: "3. Pemeriksaan Dokumen",
    description:
      "Unggah dan lengkapi dokumen yang diminta Vendor untuk setiap pemohon.",
    inProgress: "Sedang Diproses",
    emptyTitle: "Persyaratan dokumen belum tersedia dari Vendor.",
    emptyDescription:
      "Daftar unggahan akan tampil setelah Vendor menetapkan persyaratan.",
    applicant: "Pemohon",
    documentsComplete: "dokumen selesai",
    overallProgress: "Progress Dokumen",
    approved: "Disetujui",
    revisionRequired: "Perlu Revisi",
    uploadAgain: "Unggah Ulang",
    upload: "Unggah Dokumen",
    underReview: "Sedang Diperiksa",
    uploaded: "Sudah Diunggah",
    missing: "Belum Diunggah",
    required: "Wajib",
    optional: "Opsional",
  },
  EN: {
    title: "3. Document Review",
    description:
      "Upload and complete the documents requested by the Vendor for each applicant.",
    inProgress: "In Progress",
    emptyTitle: "Document requirements have not been provided by the Vendor.",
    emptyDescription:
      "The upload list will appear after the Vendor defines the requirements.",
    applicant: "Applicant",
    documentsComplete: "documents complete",
    overallProgress: "Document Progress",
    approved: "Approved",
    revisionRequired: "Revision Required",
    uploadAgain: "Upload Again",
    upload: "Upload Document",
    underReview: "Under Review",
    uploaded: "Uploaded",
    missing: "Not Uploaded",
    required: "Required",
    optional: "Optional",
  },
  AR: {
    title: "3. مراجعة المستندات",
    description:
      "قم برفع واستكمال المستندات المطلوبة من البائع لكل مقدم طلب.",
    inProgress: "قيد المعالجة",
    emptyTitle: "لم يقدم البائع متطلبات المستندات بعد.",
    emptyDescription:
      "ستظهر قائمة الرفع بعد أن يحدد البائع المتطلبات.",
    applicant: "مقدم الطلب",
    documentsComplete: "مستندات مكتملة",
    overallProgress: "تقدم المستندات",
    approved: "معتمد",
    revisionRequired: "يتطلب تعديلاً",
    uploadAgain: "إعادة الرفع",
    upload: "رفع المستند",
    underReview: "قيد المراجعة",
    uploaded: "تم الرفع",
    missing: "لم يتم الرفع",
    required: "مطلوب",
    optional: "اختياري",
  },
} satisfies Record<Language, Record<string, string>>;

export function VisaDocumentReview({
  applicantCount,
  requirements,
  progress,
  language,
}: Props) {
  const [activeApplicantIndex, setActiveApplicantIndex] = useState(0);
  const t = copy[language];

  const applicants = useMemo(
    () =>
      Array.from({ length: applicantCount }, (_, index) => {
        const existing = progress[index];

        return {
          applicantId: existing?.applicantId ?? `applicant-${index + 1}`,
          applicantName:
            existing?.applicantName ?? `${t.applicant} ${index + 1}`,
          documents: existing?.documents ?? [],
        };
      }),
    [applicantCount, progress, t.applicant],
  );

  const safeActiveIndex = Math.min(
    activeApplicantIndex,
    Math.max(applicants.length - 1, 0),
  );

  const activeApplicant = applicants[safeActiveIndex];

  const requiredRequirements = requirements.filter(
    (requirement) => requirement.required,
  );

  const getApprovedCount = (
    applicant: VisaApplicantDocumentProgress,
  ) =>
    requiredRequirements.filter((requirement) => {
      const document = applicant.documents.find(
        (item) => item.requirementId === requirement.id,
      );

      return document?.status === "approved";
    }).length;

  const totalRequiredDocuments =
    requiredRequirements.length * applicants.length;

  const totalApprovedDocuments = applicants.reduce(
    (total, applicant) => total + getApprovedCount(applicant),
    0,
  );

  return (
    <section
      className={styles.card}
      dir={language === "AR" ? "rtl" : "ltr"}
    >
      <div className={styles.heading}>
        <div>
          <h2>{t.title}</h2>
          <p>{t.description}</p>
        </div>

        <span className={styles.activeBadge}>
          {t.inProgress}
        </span>
      </div>

      {requirements.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText size={24} aria-hidden="true" />

          <div>
            <strong>{t.emptyTitle}</strong>
            <span>{t.emptyDescription}</span>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.progressSummary}>
            <div>
              <span className={styles.progressLabel}>
                {t.overallProgress}
              </span>

              <strong>
                {totalApprovedDocuments} / {totalRequiredDocuments}
              </strong>
            </div>

            <div
              className={styles.progressTrack}
              aria-label={`${totalApprovedDocuments} / ${totalRequiredDocuments}`}
            >
              <span
                style={{
                  width:
                    totalRequiredDocuments > 0
                      ? `${Math.round(
                          (totalApprovedDocuments /
                            totalRequiredDocuments) *
                            100,
                        )}%`
                      : "0%",
                }}
              />
            </div>
          </div>

          <div
            className={styles.applicantTabs}
            role="tablist"
            aria-label={t.applicant}
          >
            {applicants.map((applicant, index) => {
              const approved = getApprovedCount(applicant);
              const isActive = index === safeActiveIndex;

              return (
                <button
                  key={applicant.applicantId}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={
                    isActive
                      ? styles.applicantTabActive
                      : styles.applicantTab
                  }
                  onClick={() => setActiveApplicantIndex(index)}
                >
                  <span>{applicant.applicantName}</span>
                  <small>
                    {approved}/{requiredRequirements.length}
                  </small>
                </button>
              );
            })}
          </div>

          {activeApplicant && (
            <section className={styles.applicantCard}>
              <div className={styles.applicantHeading}>
                <div>
                  <strong>{activeApplicant.applicantName}</strong>
                  <span>
                    {getApprovedCount(activeApplicant)}/
                    {requiredRequirements.length} {t.documentsComplete}
                  </span>
                </div>
              </div>

              <div className={styles.documents}>
                {requirements.map((requirement) => {
                  const localizedName =
                    getVisaLocalizedText(
                      requirement.localizedName,
                      requirement.name,
                      language,
                    );

                  const localizedDescription =
                    requirement.description
                      ? getVisaLocalizedText(
                          requirement.localizedDescription,
                          requirement.description,
                          language,
                        )
                      : "";

                  const document =
                    activeApplicant.documents.find(
                      (item) =>
                        item.requirementId === requirement.id,
                    );

                  const status =
                    document?.status ?? "missing";

                  return (
                    <div
                      key={requirement.id}
                      className={styles.documentRow}
                    >
                      <div className={styles.documentInfo}>
                        <FileText
                          size={18}
                          aria-hidden="true"
                        />

                        <div>
                          <div className={styles.documentTitle}>
                            <strong>{localizedName}</strong>

                            <span>
                              {requirement.required
                                ? t.required
                                : t.optional}
                            </span>
                          </div>

                          {localizedDescription && (
                            <span>
                              {localizedDescription}
                            </span>
                          )}

                          {document?.fileName && (
                            <small className={styles.fileName}>
                              {document.fileName}
                            </small>
                          )}
                        </div>
                      </div>

                      <div className={styles.documentAction}>
                        {status === "approved" ? (
                          <span className={styles.approved}>
                            <CheckCircle2 size={15} />
                            {t.approved}
                          </span>
                        ) : status === "revision_required" ? (
                          <>
                            <span className={styles.revision}>
                              {t.revisionRequired}
                            </span>

                            {document?.vendorNote && (
                              <p className={styles.vendorNote}>
                                {getVisaLocalizedText(
                                  document.vendorNoteTranslations,
                                  document.vendorNote,
                                  language,
                                )}
                              </p>
                            )}

                            <button type="button">
                              <RotateCcw size={15} />
                              {t.uploadAgain}
                            </button>
                          </>
                        ) : status === "under_review" ? (
                          <span className={styles.reviewing}>
                            <Clock3 size={15} />
                            {t.underReview}
                          </span>
                        ) : status === "uploaded" ? (
                          <span className={styles.uploaded}>
                            <Clock3 size={15} />
                            {t.uploaded}
                          </span>
                        ) : (
                          <>
                            <span className={styles.missing}>
                              {t.missing}
                            </span>

                            <button type="button">
                              <Upload size={15} />
                              {t.upload}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}