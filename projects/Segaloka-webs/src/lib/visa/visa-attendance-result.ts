import type {
  VisaLocalizedText,
} from "@/lib/visa/visa-document-requirements";

/**
 * Cara Traveler melaporkan hasil kehadiran fisik.
 *
 * none:
 * Traveler tidak perlu melakukan input.
 *
 * upload:
 * Traveler wajib upload lembar/dokumen yang diterima.
 *
 * manual:
 * Traveler memilih/mengetik hasil sesuai opsi Vendor.
 *
 * upload_or_manual:
 * Traveler dapat upload dokumen atau melakukan konfirmasi manual.
 */
export type VisaAttendanceResultInputMode =
  | "none"
  | "upload"
  | "manual"
  | "upload_or_manual";

export type VisaAttendanceOutcome =
  | "pending"
  | "pending_vendor_review"
  | "approved"
  | "repeat_required"
  | "rejected";

/**
 * Konfigurasi berasal dari layanan Visa milik Vendor.
 * Bukan ditentukan oleh Traveler.
 */
export type VisaAttendanceResultPolicy = {
  enabled: boolean;

  inputMode: VisaAttendanceResultInputMode;

  acceptedFileTypes: Array<
    "pdf" | "jpg" | "jpeg" | "png"
  >;

  instructions?: string;
  instructionsTranslations?: VisaLocalizedText;

  /**
   * Apakah hasil pembacaan otomatis dokumen
   * diperbolehkan untuk membantu klasifikasi.
   *
   * Hasil otomatis bukan keputusan final Vendor.
   */
  automaticDocumentReadingEnabled: boolean;

  /**
   * Jika true, hasil harus diverifikasi Vendor
   * sebelum dianggap final.
   */
  vendorVerificationRequired: boolean;
};

export type VisaAttendanceResultDocument = {
  id: string;
  fileName: string;
  fileType:
    | "pdf"
    | "jpg"
    | "jpeg"
    | "png";

  uploadedAt: string;

  /**
   * Production nanti memakai storage reference
   * dengan authorization.
   */
  fileUrl?: string;
};

export type VisaAttendanceAutomaticReading = {
  status:
    | "not_processed"
    | "processing"
    | "completed"
    | "failed";

  /**
   * Hanya indikasi hasil pembacaan sistem.
   * Tidak otomatis menjadi keputusan final.
   */
  detectedOutcome?: VisaAttendanceOutcome;

  confidence?: number;

  extractedText?: string;

  processedAt?: string | null;
};

export type VisaAttendanceResult = {
  /**
   * Disimpan per pemohon karena hasil kehadiran
   * fisik dapat berbeda pada satu booking.
   */
  applicantId: string;
  applicantName: string;

  outcome: VisaAttendanceOutcome;

  /**
   * Traveler dapat memberikan keterangan
   * apabila policy Vendor mengizinkan manual input.
   */
  travelerNote?: string;

  documents: VisaAttendanceResultDocument[];

  automaticReading?: VisaAttendanceAutomaticReading;

  /**
   * Keputusan/verifikasi Vendor.
   */
  vendorVerified: boolean;
  vendorVerifiedAt?: string | null;

  vendorNote?: string;
  vendorNoteTranslations?: VisaLocalizedText;
};

export type VisaAttendanceResultProgress = {
  policy: VisaAttendanceResultPolicy;
  applicants: VisaAttendanceResult[];
};

/**
 * Hanya hasil yang sudah diverifikasi Vendor
 * yang boleh diperlakukan sebagai final apabila
 * policy mewajibkan verifikasi.
 */
export function isVisaAttendanceResultFinal(
  policy: VisaAttendanceResultPolicy,
  result: VisaAttendanceResult,
): boolean {
  const finalOutcome =
    result.outcome === "approved" ||
    result.outcome === "repeat_required" ||
    result.outcome === "rejected";

  if (!finalOutcome) {
    return false;
  }

  if (policy.vendorVerificationRequired) {
    return result.vendorVerified;
  }

  return true;
}
/**
 * Routing setelah hasil Kehadiran Fisik.
 *
 * approved:
 * proses Visa tetap dilanjutkan dari Step 4.
 *
 * repeat_required:
 * tetap di Step 4 dan menunggu proses/jadwal ulang.
 *
 * rejected:
 * pengajuan berakhir.
 * Step 5 Hasil Visa dilewati dan booking menuju
 * Step 6 Completed dengan outcome rejected.
 *
 * pending / pending_vendor_review:
 * tidak boleh berpindah tahap.
 */
export type VisaAttendanceNextRoute =
  | "continue_submission"
  | "repeat_attendance"
  | "completed_rejected"
  | "wait";

export function getVisaAttendanceNextRoute(
  policy: VisaAttendanceResultPolicy,
  result: VisaAttendanceResult,
): VisaAttendanceNextRoute {
  if (
    !isVisaAttendanceResultFinal(
      policy,
      result,
    )
  ) {
    return "wait";
  }

  switch (result.outcome) {
    case "approved":
      return "continue_submission";

    case "repeat_required":
      return "repeat_attendance";

    case "rejected":
      return "completed_rejected";

    default:
      return "wait";
  }
}