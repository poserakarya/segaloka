import type {
  VisaLocalizedText,
} from "@/lib/visa/visa-document-requirements";

/**
 * Status hasil Visa per pemohon.
 *
 * pending:
 * hasil belum diterbitkan.
 *
 * approved:
 * Visa disetujui.
 *
 * rejected:
 * Visa ditolak oleh otoritas terkait.
 *
 * additional_action_required:
 * masih diperlukan tindakan tambahan sebelum hasil final.
 */
export type VisaApplicantResultStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "additional_action_required";

export type VisaResultEvidenceType =
  | "visa_document"
  | "approval_letter"
  | "rejection_letter"
  | "passport_page"
  | "official_receipt"
  | "other";

export type VisaResultEvidence = {
  id: string;

  /**
   * Jenis bukti hasil resmi yang dikirim Vendor.
   */
  type: VisaResultEvidenceType;

  fileName: string;

  fileType:
    | "pdf"
    | "jpg"
    | "jpeg"
    | "png";

  /**
   * Production:
   * gunakan private storage + authorization.
   */
  fileUrl?: string;

  uploadedAt: string;
};
export type VisaResultDocument = {
  id: string;

  /**
   * Nama file yang diterima dari Vendor.
   * Contoh: e-Visa PDF.
   */
  fileName: string;

  /**
   * Jenis file untuk UI.
   */
  fileType:
    | "pdf"
    | "jpg"
    | "jpeg"
    | "png";

  /**
   * Production nanti menggunakan URL/storage reference
   * yang memiliki authorization.
   */
  fileUrl?: string;

  issuedAt?: string | null;
};

export type VisaApplicantResult = {
  applicantId: string;
  applicantName: string;

  status: VisaApplicantResultStatus;

  /**
   * Nomor Visa hanya ditampilkan apabila memang tersedia.
   */
  visaNumber?: string;

  /**
   * Masa berlaku Visa.
   */
  validFrom?: string | null;
  validUntil?: string | null;

  /**
   * Catatan asli Vendor.
   * Tidak boleh ditimpa oleh hasil terjemahan.
   */
  vendorNote?: string;

  /**
   * Terjemahan catatan Vendor sesuai bahasa Traveler.
   */
  vendorNoteTranslations?: VisaLocalizedText;

  /**
   * Dokumen hasil Visa/e-Visa.
   */
  documents: VisaResultDocument[];

  /**
   * Bukti keputusan resmi dari Vendor.
   *
   * Approved:
   * Vendor wajib memberikan bukti persetujuan/
   * Visa apabila dokumen tersebut tersedia.
   *
   * Rejected:
   * Vendor wajib memberikan bukti penolakan.
   */
  evidence: VisaResultEvidence[];

  /**
   * Alasan penolakan.
   *
   * Wajib diisi apabila status = rejected.
   */
  rejectionReason?: string;

  /**
   * Terjemahan alasan penolakan.
   * Teks asli Vendor tetap dipertahankan.
   */
  rejectionReasonTranslations?: VisaLocalizedText;

  /**
   * Waktu Vendor mengkonfirmasi hasil final.
   */
  confirmedAt?: string | null;
};

export type VisaResultUpdate = {
  id: string;

  /**
   * Catatan asli Vendor.
   */
  note: string;

  /**
   * Terjemahan otomatis untuk Marketplace.
   */
  noteTranslations?: VisaLocalizedText;

  createdAt: string;
};

export type VisaResultProgress = {
  /**
   * Hasil disimpan per pemohon.
   *
   * Jadi apabila booking memiliki 2, 3, atau lebih Traveler,
   * masing-masing memiliki hasil Visa sendiri.
   */
  applicants: VisaApplicantResult[];

  /**
   * Timeline update hasil dari Vendor.
   * Riwayat tidak boleh ditimpa.
   */
  updates: VisaResultUpdate[];
};

export function isVisaApplicantResultFinal(
  result: VisaApplicantResult,
): boolean {
  return (
    result.status === "approved" ||
    result.status === "rejected"
  );
}

export function areAllVisaResultsFinal(
  progress: VisaResultProgress,
): boolean {
  return (
    progress.applicants.length > 0 &&
    progress.applicants.every(
      isVisaApplicantResultFinal,
    )
  );
}
/**
 * Vendor tidak boleh memfinalisasi hasil tanpa bukti.
 *
 * Rejected juga wajib memiliki alasan.
 */
export function canFinalizeVisaApplicantResult(
  result: VisaApplicantResult,
): boolean {
  if (
    result.status !== "approved" &&
    result.status !== "rejected"
  ) {
    return false;
  }

  if (result.evidence.length === 0) {
    return false;
  }

  if (
    result.status === "rejected" &&
    !result.rejectionReason?.trim()
  ) {
    return false;
  }

  return true;
}

/**
 * Booking dapat berpindah ke Step 6 apabila
 * seluruh pemohon sudah memiliki hasil final
 * yang valid dan memiliki bukti.
 */
export function canCompleteVisaResultStep(
  progress: VisaResultProgress,
): boolean {
  return (
    progress.applicants.length > 0 &&
    progress.applicants.every(
      canFinalizeVisaApplicantResult,
    )
  );
}
