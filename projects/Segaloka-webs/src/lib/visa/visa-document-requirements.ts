export type VisaLocalizedText = {
  ID: string;
  EN?: string;
  AR?: string;
};

export type VisaDocumentFileType =
  | "pdf"
  | "jpg"
  | "jpeg"
  | "png";

export type VisaDocumentRequirement = {
  id: string;

  /**
   * Fallback/source text.
   * Dipertahankan untuk kompatibilitas data lama.
   */
  name: string;
  description?: string;

  /**
   * Konten multibahasa Marketplace.
   *
   * ID adalah bahasa dasar.
   * EN/AR dapat menggunakan fallback ID
   * apabila terjemahan belum tersedia.
   */
  localizedName?: VisaLocalizedText;
  localizedDescription?: VisaLocalizedText;

  /**
   * Traveler wajib memenuhi requirement ini.
   */
  required: boolean;

  /**
   * Traveler harus mengunggah salinan digital.
   */
  digitalUploadRequired: boolean;

  /**
   * Format upload yang diizinkan Vendor.
   */
  acceptedFileTypes: VisaDocumentFileType[];

  /**
   * Dokumen fisik/asli juga wajib dikirim.
   */
  originalDocumentRequired: boolean;
};

export type VisaOriginalDocumentDelivery = {
  required: boolean;

  /**
   * Alamat berasal dari konfigurasi layanan Vendor.
   * Tidak boleh dibuat otomatis oleh Traveler UI.
   */
  recipientName?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  instructions?: string;
};

export type VisaPhysicalAppointmentType =
  | "interview"
  | "biometric"
  | "photo"
  | "embassy"
  | "consulate"
  | "visa_center"
  | "other";

export type VisaPhysicalAttendance = {
  required: boolean;
  types: VisaPhysicalAppointmentType[];

  /**
   * Informasi dasar yang sudah diketahui
   * ketika Vendor membuat layanan.
   */
  instructions?: string;
  instructionsTranslations?: VisaLocalizedText;

  locationName?: string;
  locationNameTranslations?: VisaLocalizedText;

  address?: string;
  addressTranslations?: VisaLocalizedText;

  /**
   * Jadwal dapat diisi Vendor setelah order
   * apabila belum tersedia saat produk dibuat.
   */
  appointmentAt?: string | null;
};

export type VisaServiceRequirements = {
  documents: VisaDocumentRequirement[];

  originalDocumentDelivery:
    VisaOriginalDocumentDelivery;

  physicalAttendance:
    VisaPhysicalAttendance;
};

export type VisaApplicantDocumentStatus =
  | "missing"
  | "uploaded"
  | "under_review"
  | "approved"
  | "revision_required";

export type VisaApplicantDocument = {
  requirementId: string;
  status: VisaApplicantDocumentStatus;

  fileName?: string;
  uploadedAt?: string | null;

  /**
   * Catatan asli pemeriksaan dari Vendor.
   * Disimpan untuk audit dan histori.
   */
  vendorNote?: string;

  /**
   * Terjemahan catatan Vendor untuk Marketplace.
   *
   * Dibuat oleh translation service.
   * Teks asli pada vendorNote tidak boleh ditimpa.
   */
  vendorNoteTranslations?: VisaLocalizedText;

  /**
   * Riwayat seluruh upload/revisi dokumen.
   * Versi sebelumnya tidak boleh ditimpa.
   */
  revisions: VisaDocumentRevision[];
};

export type VisaDocumentRevision = {
  id: string;
  revisionNumber: number;
  fileName: string;
  uploadedAt: string;
  status:
    | "uploaded"
    | "under_review"
    | "approved"
    | "revision_required";

  /**
   * Catatan asli Vendor pada revision ini.
   */
  vendorNote?: string;

  /**
   * Terjemahan catatan Vendor.
   * Teks asli tetap dipertahankan.
   */
  vendorNoteTranslations?: VisaLocalizedText;

  reviewedAt?: string | null;
};

export type VisaDocumentReviewAction =
  | "approve"
  | "request_revision";

export type VisaDocumentReview = {
  applicantId: string;
  requirementId: string;
  action: VisaDocumentReviewAction;
  note?: string;
  reviewedAt: string;
};

export type VisaApplicantDocumentProgress = {
  applicantId: string;
  applicantName: string;
  documents: VisaApplicantDocument[];
};

export type VisaOriginalDeliveryStatus =
  | "not_required"
  | "not_sent"
  | "sent"
  | "received";

export type VisaOrderDocumentProgress = {
  applicants: VisaApplicantDocumentProgress[];

  originalDeliveryStatus:
    VisaOriginalDeliveryStatus;

  trackingNumber?: string;
  courierName?: string;
};

export function requiresOriginalDelivery(
  requirements: VisaServiceRequirements,
): boolean {
  return (
    requirements.originalDocumentDelivery.required ||
    requirements.documents.some(
      (document) =>
        document.originalDocumentRequired,
    )
  );
}

export function requiresPhysicalAttendance(
  requirements: VisaServiceRequirements,
): boolean {
  return requirements.physicalAttendance.required;
}

export function getRequiredDocuments(
  requirements: VisaServiceRequirements,
): VisaDocumentRequirement[] {
  return requirements.documents.filter(
    (document) => document.required,
  );
}