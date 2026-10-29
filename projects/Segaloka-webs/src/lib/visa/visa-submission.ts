import type {
  VisaLocalizedText,
  VisaPhysicalAttendance,
} from "@/lib/visa/visa-document-requirements";

export type VisaSubmissionStatus =
  | "ready"
  | "submitted"
  | "processing"
  | "additional_action_required"
  | "completed";

export type VisaSubmissionReference = {
  referenceNumber?: string;
  submittedAt?: string | null;
  estimatedCompletionAt?: string | null;
};

export type VisaSubmissionUpdate = {
  id: string;
  status: VisaSubmissionStatus;

  /**
   * Teks asli dari Vendor.
   * Tetap disimpan untuk audit/histori.
   */
  note?: string;

  /**
   * Terjemahan note untuk bahasa Marketplace.
   * Production diisi translation service.
   */
  noteTranslations?: VisaLocalizedText;

  createdAt: string;
};

export type VisaSubmissionProgress = {
  status: VisaSubmissionStatus;

  /**
   * Referensi resmi pengajuan apabila sudah tersedia.
   */
  submission: VisaSubmissionReference;

  /**
   * Digunakan hanya jika layanan memang
   * membutuhkan kehadiran fisik Traveler.
   */
  physicalAttendance?: VisaPhysicalAttendance;

  /**
   * Waktu Step 4 dikonfirmasi selesai oleh Vendor.
   *
   * Tidak boleh berasal dari estimatedCompletionAt.
   * Production harus menggunakan trusted server timestamp.
   */
  completedAt?: string | null;

  /**
   * User Vendor yang melakukan konfirmasi manual.
   *
   * Production mengacu ke user/actor ID backend,
   * bukan nama bebas dari browser.
   */
  completedByVendorUserId?: string | null;

  /**
   * Nama snapshot Vendor user untuk histori UI.
   *
   * ID actor tetap menjadi referensi canonical.
   */
  completedByVendorName?: string | null;

  /**
   * Catatan asli Vendor ketika menutup Step 4.
   */
  completionNote?: string;

  /**
   * Terjemahan catatan completion untuk Traveler.
   */
  completionNoteTranslations?: VisaLocalizedText;

  /**
   * Timeline update dari Vendor.
   * Riwayat lama tidak boleh ditimpa.
   */
  updates: VisaSubmissionUpdate[];
};