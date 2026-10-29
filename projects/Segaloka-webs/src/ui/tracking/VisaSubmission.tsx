"use client";

import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock3,
  FileCheck2,
  Fingerprint,
  Send,
} from "lucide-react";

import type {
  VisaSubmissionProgress,
  VisaSubmissionStatus,
} from "@/lib/visa/visa-submission";

import {
  getVisaLocalizedText,
  type VisaLanguage,
} from "@/lib/visa/visa-localization";

import styles from "./VisaSubmission.module.css";

type Props = {
  progress: VisaSubmissionProgress;
  language: VisaLanguage;
};

const copy = {
  ID: {
    title: "4. Pengajuan Visa",
    description:
      "Pantau proses pengajuan Visa setelah seluruh dokumen disetujui.",
    inProgress: "Sedang Diproses",
    documentsApproved: "Dokumen Disetujui",
    ready: "Siap Diajukan",
    submitted: "Diajukan",
    processing: "Diproses",
    completedProcessing: "Selesai Diproses",
    completedAtLabel: "Dikonfirmasi Selesai",
    completedByLabel: "Dikonfirmasi oleh Vendor",
    completionNoteLabel: "Catatan Vendor",
    actionRequired: "Tindakan Tambahan",
    completed: "Selesai",
    reference: "Nomor Referensi",
    submittedAt: "Tanggal Pengajuan",
    estimated: "Estimasi Selesai",
    notAvailable: "Belum tersedia",
    attendance: "Kehadiran Fisik",
    attendanceRequired: "Kehadiran fisik diperlukan",
    attendanceSchedule: "Jadwal",
    attendanceLocation: "Lokasi",
    schedulePending: "Jadwal belum ditentukan Vendor",
    updates: "Pembaruan Pengajuan",
    noUpdates:
      "Belum ada pembaruan dari Vendor.",
  },
  EN: {
    title: "4. Visa Submission",
    description:
      "Track the Visa submission process after all documents have been approved.",
    inProgress: "In Progress",
    documentsApproved: "Documents Approved",
    ready: "Ready for Submission",
    submitted: "Submitted",
    processing: "Processing",
    completedProcessing: "Processing Completed",
    completedAtLabel: "Completion Confirmed",
    completedByLabel: "Confirmed by Vendor",
    completionNoteLabel: "Vendor Note",
    actionRequired: "Additional Action",
    completed: "Completed",
    reference: "Submission Reference",
    submittedAt: "Submitted Date",
    estimated: "Estimated Completion",
    notAvailable: "Not available yet",
    attendance: "Physical Attendance",
    attendanceRequired: "Physical attendance is required",
    attendanceSchedule: "Schedule",
    attendanceLocation: "Location",
    schedulePending: "Schedule has not been provided by the Vendor",
    updates: "Submission Updates",
    noUpdates:
      "No submission updates from the Vendor yet.",
  },
  AR: {
    title: "4. تقديم طلب التأشيرة",
    description:
      "تابع عملية تقديم طلب التأشيرة بعد اعتماد جميع المستندات.",
    inProgress: "قيد التنفيذ",
    documentsApproved: "تم اعتماد المستندات",
    ready: "جاهز للتقديم",
    submitted: "تم التقديم",
    processing: "قيد المعالجة",
    completedProcessing: "اكتملت المعالجة",
    completedAtLabel: "تاريخ تأكيد الإكمال",
    completedByLabel: "تم التأكيد بواسطة مقدم الخدمة",
    completionNoteLabel: "ملاحظة مقدم الخدمة",
    actionRequired: "إجراء إضافي مطلوب",
    completed: "مكتمل",
    reference: "رقم مرجع الطلب",
    submittedAt: "تاريخ التقديم",
    estimated: "التاريخ المتوقع للانتهاء",
    notAvailable: "غير متاح بعد",
    attendance: "الحضور الشخصي",
    attendanceRequired: "الحضور الشخصي مطلوب",
    attendanceSchedule: "الموعد",
    attendanceLocation: "الموقع",
    schedulePending: "لم يحدد مقدم الخدمة الموعد بعد",
    updates: "تحديثات الطلب",
    noUpdates:
      "لا توجد تحديثات من مقدم الخدمة حتى الآن.",
  },
} as const;

const statusOrder: VisaSubmissionStatus[] = [
  "ready",
  "submitted",
  "processing",
  "additional_action_required",
  "completed",
];

function getStatusIndex(
  status: VisaSubmissionStatus,
): number {
  return statusOrder.indexOf(status);
}

function formatDate(
  value: string | null | undefined,
  language: VisaLanguage,
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

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

export function VisaSubmission({
  progress,
  language,
}: Props) {
  const t = copy[language];
  const currentIndex = getStatusIndex(progress.status);

  const stages = [
    {
      key: "documents",
      label: t.documentsApproved,
      done: true,
      active: false,
    },
    {
      key: "ready",
      label: t.ready,
      done: currentIndex > 0,
      active: progress.status === "ready",
    },
    {
      key: "submitted",
      label: t.submitted,
      done: currentIndex > 1,
      active: progress.status === "submitted",
    },
    {
      key: "processing",
      label: t.processing,
      done:
        progress.status === "completed" ||
        progress.status ===
          "additional_action_required",
      active:
        progress.status === "processing" ||
        progress.status ===
          "additional_action_required",
    },
    {
      key: "completed",
      label: t.completedProcessing,
      done: progress.status === "completed",
      active: false,
    },
  ];

  const completedAt = formatDate(
    progress.completedAt,
    language,
  );

  const completionNote = getVisaLocalizedText(
    progress.completionNoteTranslations,
    progress.completionNote ?? "",
    language,
  );
  const submittedAt = formatDate(
    progress.submission.submittedAt,
    language,
  );

  const estimatedAt = formatDate(
    progress.submission.estimatedCompletionAt,
    language,
  );

  const attendance = progress.physicalAttendance;
  const attendanceAt = formatDate(
    attendance?.appointmentAt,
    language,
  );

  const attendanceInstructions = attendance
    ? getVisaLocalizedText(
        attendance.instructionsTranslations,
        attendance.instructions ?? "",
        language,
      )
    : undefined;

  const attendanceLocationName = attendance
    ? getVisaLocalizedText(
        attendance.locationNameTranslations,
        attendance.locationName ?? "",
        language,
      )
    : undefined;

  const attendanceAddress = attendance
    ? getVisaLocalizedText(
        attendance.addressTranslations,
        attendance.address ?? "",
        language,
      )
    : undefined;

  return (
    <section className={styles.card}>
      <div className={styles.heading}>
        <div>
          <h2>{t.title}</h2>
          <p>{t.description}</p>
        </div>

        <span className={styles.activeBadge}>
          {t.inProgress}
        </span>
      </div>

      <div className={styles.stageGrid}>
        {stages.map((stage) => (
          <div
            key={stage.key}
            className={[
              styles.stage,
              stage.active ? styles.stageActive : "",
              stage.done ? styles.stageDone : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className={styles.stageIcon}>
              {stage.done ? (
                <CheckCircle2 size={18} />
              ) : stage.active ? (
                <Clock3 size={18} />
              ) : (
                <Circle size={18} />
              )}
            </div>

            <strong>{stage.label}</strong>
          </div>
        ))}
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.detailCard}>
          <div className={styles.detailIcon}>
            <FileCheck2 size={19} />
          </div>

          <div>
            <span>{t.reference}</span>
            <strong>
              {progress.submission.referenceNumber ||
                t.notAvailable}
            </strong>
          </div>
        </div>

        <div className={styles.detailCard}>
          <div className={styles.detailIcon}>
            <Send size={19} />
          </div>

          <div>
            <span>{t.submittedAt}</span>
            <strong>
              {submittedAt || t.notAvailable}
            </strong>
          </div>
        </div>

        <div className={styles.detailCard}>
          <div className={styles.detailIcon}>
            <CalendarClock size={19} />
          </div>

          <div>
            <span>{t.estimated}</span>
            <strong>
              {estimatedAt || t.notAvailable}
            </strong>
          </div>
        </div>
      </div>

      {attendance?.required && (
        <section className={styles.attendance}>
          <div className={styles.sectionTitle}>
            <Fingerprint size={19} />

            <div>
              <h3>{t.attendance}</h3>
              <p>{t.attendanceRequired}</p>
            </div>
          </div>

          <div className={styles.attendanceGrid}>
            <div>
              <span>{t.attendanceSchedule}</span>
              <strong>
                {attendanceAt || t.schedulePending}
              </strong>
            </div>

            {(attendanceLocationName ||
              attendanceAddress) && (
              <div>
                <span>{t.attendanceLocation}</span>
                <strong>
                  {[
                    attendanceLocationName,
                    attendanceAddress,
                  ]
                    .filter(Boolean)
                    .join(" — ")}
                </strong>
              </div>
            )}
          </div>

          {attendanceInstructions && (
            <p className={styles.instructions}>
              {attendanceInstructions}
            </p>
          )}
        </section>
      )}

      {progress.status === "completed" && (
        <section
          style={{
            marginTop: 12,
            padding: 16,
            border: "1px solid #bce8d2",
            borderRadius: 12,
            background: "#f1fbf6",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#08784a",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <CheckCircle2 size={18} />
            {t.completedProcessing}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginTop: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {t.completedAtLabel}
              </div>
              <strong style={{ fontSize: 13 }}>
                {completedAt || t.notAvailable}
              </strong>
            </div>

            {progress.completedByVendorName && (
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {t.completedByLabel}
                </div>
                <strong style={{ fontSize: 13 }}>
                  {progress.completedByVendorName}
                </strong>
              </div>
            )}
          </div>

          {completionNote && (
            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 12 }}>
                {t.completionNoteLabel}
              </strong>
              <p style={{
                marginTop: 5,
                fontSize: 13,
                lineHeight: 1.6,
                color: "#475569",
              }}>
                {completionNote}
              </p>
            </div>
          )}
        </section>
      )}
      <section className={styles.updates}>
        <div className={styles.sectionTitle}>
          <Clock3 size={19} />

          <div>
            <h3>{t.updates}</h3>
          </div>
        </div>

        {progress.updates.length === 0 ? (
          <div className={styles.empty}>
            {t.noUpdates}
          </div>
        ) : (
          <div className={styles.timeline}>
            {progress.updates
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .map((update) => {
                const note = update.note
                  ? getVisaLocalizedText(
                      update.noteTranslations,
                      update.note,
                      language,
                    )
                  : "";

                return (
                  <div
                    key={update.id}
                    className={styles.update}
                  >
                    <div className={styles.updateDot} />

                    <div>
                      <div className={styles.updateMeta}>
                        <strong>
                          {update.status === "ready"
                            ? t.ready
                            : update.status === "submitted"
                              ? t.submitted
                              : update.status ===
                                  "processing"
                                ? t.processing
                                : update.status ===
                                    "additional_action_required"
                                  ? t.actionRequired
                                  : t.completed}
                        </strong>

                        <span>
                          {formatDate(
                            update.createdAt,
                            language,
                          )}
                        </span>
                      </div>

                      {note && <p>{note}</p>}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </section>
  );
}