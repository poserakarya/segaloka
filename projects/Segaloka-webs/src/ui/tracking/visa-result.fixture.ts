import type { VisaResultProgress } from "@/lib/visa/visa-result";

/**
 * SEGALOKA UI/UX FIXTURE ONLY.
 * Tidak boleh digunakan sebagai data produksi.
 *
 * Tiga pemohon dalam satu booking:
 * - Ahmad Fauzi: Disetujui
 * - Siti Aminah: Ditolak
 * - Rizky Darmawan: Menunggu
 */
export const visaResultFixture: VisaResultProgress = {
  applicants: [
    {
      applicantId: "fixture-applicant-1",
      applicantName: "Ahmad Fauzi",
      status: "approved",
      confirmedAt: "2026-10-15T17:00:00+08:00",
      documents: [
        {
          id: "fixture-issued-visa-ahmad",
          fileName: "visa-terbit-ahmad.pdf",
          fileUrl: "/fixtures/visa/visa-terbit-ahmad.pdf",
          fileType: "pdf",
          issuedAt: "2026-10-15T17:30:00+08:00",
        },
      ],
      evidence: [
        {
          id: "fixture-approval-1",
          type: "approval_letter",
          fileName: "surat-persetujuan-ahmad.pdf",
          fileUrl: "/fixtures/visa/surat-persetujuan-ahmad.pdf",
          fileType: "pdf",
          uploadedAt: "2026-10-15T17:00:00+08:00",
        },
      ],
      vendorNote: "Permohonan Visa disetujui. Menunggu dokumen Visa terbit.",
      vendorNoteTranslations: {
        ID: "Permohonan Visa disetujui. Menunggu dokumen Visa terbit.",
        EN: "Visa approved. Awaiting the issued Visa document.",
        AR: "تمت الموافقة على الطلب. في انتظار إصدار وثيقة التأشيرة.",
      },
    },
    {
      applicantId: "fixture-applicant-2",
      applicantName: "Siti Aminah",
      status: "rejected",
      confirmedAt: "2026-10-15T17:10:00+08:00",
      documents: [],
      evidence: [
        {
          id: "fixture-rejection-2",
          type: "rejection_letter",
          fileName: "surat-penolakan-siti.pdf",
          fileUrl: "/fixtures/visa/surat-penolakan-siti.pdf",
          fileType: "pdf",
          uploadedAt: "2026-10-15T17:10:00+08:00",
        },
      ],
      rejectionReason: "Dokumen pendukung tidak mencukupi.",
      rejectionReasonTranslations: {
        ID: "Dokumen pendukung tidak mencukupi.",
        EN: "Insufficient supporting documents.",
        AR: "المستندات الداعمة غير كافية.",
      },
      vendorNote: "Silahkan periksa surat penolakan\nuntuk mengetahui alasan penolakan.",
      vendorNoteTranslations: {
        ID: "Silahkan periksa surat penolakan\nuntuk mengetahui alasan penolakan.",
        EN: "Please check the rejection letter\n to find out the reason for the rejection.",
        AR: "يرجى مراجعة خطاب الرفض.",
      },
    },
    {
      applicantId: "fixture-applicant-3",
      applicantName: "Rizky Darmawan",
      status: "pending",
      confirmedAt: null,
      documents: [],
      evidence: [],
      vendorNote:
        "Dokumen sedang diproses di kedutaan.\nEstimasi hasil: 3–7 hari kerja.",
      vendorNoteTranslations: {
        ID: "Dokumen sedang diproses di kedutaan.\nEstimasi hasil: 3–7 hari kerja.",
        EN: "Documents are being processed at the embassy.\nEstimated result: 3–7 working days.",
        AR: "المستندات قيد المعالجة في السفارة.\nالنتيجة المتوقعة خلال ٣ إلى ٧ أيام عمل.",
      },
    },
  ],
  updates: [
    {
      id: "fixture-result-update-1",
      note: "Hasil kedua pemohon telah dikonfirmasi Vendor.",
      noteTranslations: {
        ID: "Hasil kedua pemohon telah dikonfirmasi Vendor.",
        EN: "Results for both applicants have been confirmed by the Vendor.",
        AR: "أكد مقدم الخدمة نتائج كلا المتقدمين.",
      },
      createdAt: "2026-10-15T17:10:00+08:00",
    },
  ],
};