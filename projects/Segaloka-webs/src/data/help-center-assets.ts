/**
 * Segaloka Help Center
 * Canonical image asset registry.
 *
 * IMPORTANT:
 * - Jangan mengganti path/nama file setelah digunakan artikel.
 * - Untuk mengganti ilustrasi cukup replace file di public/.
 * - UI Help Center tidak perlu diubah.
 */

export const HELP_CENTER_IMAGE_ROOT = "/images/help-center";

export const helpCenterImageAssets = [
  "/images/help-center/general/tentang-segaloka.webp",
  "/images/help-center/general/cara-mencari-layanan.webp",
  "/images/help-center/general/cara-menghubungi-bantuan.webp",
  "/images/help-center/booking/cara-pesan-01-cari-produk.webp",
  "/images/help-center/booking/cara-pesan-02-pilih-paket.webp",
  "/images/help-center/booking/cara-pesan-03-pilih-jadwal.webp",
  "/images/help-center/booking/cara-pesan-04-pilih-traveler.webp",
  "/images/help-center/booking/cara-pesan-05-data-pemesan.webp",
  "/images/help-center/booking/cara-pesan-06-review-pesanan.webp",
  "/images/help-center/booking/cara-pesan-07-pembayaran.webp",
  "/images/help-center/booking/cara-pesan-08-pesanan-berhasil.webp",
  "/images/help-center/booking/lihat-status-pesanan.webp",
  "/images/help-center/booking/lihat-invoice.webp",
  "/images/help-center/umrah/cari-paket-umrah.webp",
  "/images/help-center/umrah/detail-paket-umrah.webp",
  "/images/help-center/umrah/pilih-tipe-kamar.webp",
  "/images/help-center/umrah/pilih-keberangkatan.webp",
  "/images/help-center/umrah/isi-data-pemesan.webp",
  "/images/help-center/umrah/isi-data-traveler.webp",
  "/images/help-center/umrah/detail-pesanan-umrah.webp",
  "/images/help-center/haji/cari-paket-haji.webp",
  "/images/help-center/haji/pilih-tahun-haji.webp",
  "/images/help-center/haji/detail-paket-haji.webp",
  "/images/help-center/haji/pesan-paket-haji.webp",
  "/images/help-center/halal-tour/cari-halal-tour.webp",
  "/images/help-center/halal-tour/detail-halal-tour.webp",
  "/images/help-center/halal-tour/pesan-halal-tour.webp",
  "/images/help-center/tour-domestic/cari-tour-domestic.webp",
  "/images/help-center/tour-domestic/detail-tour-domestic.webp",
  "/images/help-center/tour-domestic/pesan-tour-domestic.webp",
  "/images/help-center/tour-international/cari-tour-international.webp",
  "/images/help-center/tour-international/detail-tour-international.webp",
  "/images/help-center/tour-international/pesan-tour-international.webp",
  "/images/help-center/tour-international/dokumen-perjalanan.webp",
  "/images/help-center/segadeals/cari-segadeals.webp",
  "/images/help-center/segadeals/detail-segadeals.webp",
  "/images/help-center/segadeals/pesan-segadeals.webp",
  "/images/help-center/akomodasi/cari-akomodasi-la.webp",
  "/images/help-center/akomodasi/detail-akomodasi-la.webp",
  "/images/help-center/akomodasi/pilih-periode.webp",
  "/images/help-center/akomodasi/pilih-tipe-kamar.webp",
  "/images/help-center/akomodasi/isi-data-pemesan.webp",
  "/images/help-center/akomodasi/lihat-invoice.webp",
  "/images/help-center/akomodasi/traveler-passport.webp",
  "/images/help-center/akomodasi/paket-info.webp",
  "/images/help-center/akomodasi/hotel-reservation.webp",
  "/images/help-center/akomodasi/visa.webp",
  "/images/help-center/akomodasi/transport-transfer.webp",
  "/images/help-center/akomodasi/city-tour.webp",
  "/images/help-center/akomodasi/masyair.webp",
  "/images/help-center/akomodasi/local-contact.webp",
  "/images/help-center/akomodasi/confirmation-letter.webp",
  "/images/help-center/payment/pilih-metode-pembayaran.webp",
  "/images/help-center/payment/pembayaran-dp.webp",
  "/images/help-center/payment/pembayaran-cicilan.webp",
  "/images/help-center/payment/pembayaran-lunas.webp",
  "/images/help-center/payment/status-pembayaran.webp",
  "/images/help-center/payment/invoice.webp",
  "/images/help-center/changes/ajukan-pembatalan.webp",
  "/images/help-center/changes/ajukan-refund.webp",
  "/images/help-center/changes/status-refund.webp",
  "/images/help-center/changes/ajukan-reschedule.webp",
  "/images/help-center/changes/status-reschedule.webp",
  "/images/help-center/account/daftar-akun.webp",
  "/images/help-center/account/masuk-akun.webp",
  "/images/help-center/account/lupa-password.webp",
  "/images/help-center/account/ubah-profil.webp",
  "/images/help-center/account/keamanan-akun.webp",
  "/images/help-center/promo/gunakan-voucher.webp",
  "/images/help-center/promo/gunakan-promo.webp",
  "/images/help-center/promo/loyalty-points.webp",
  "/images/help-center/affiliate/daftar-affiliate.webp",
  "/images/help-center/affiliate/dashboard-affiliate.webp",
  "/images/help-center/affiliate/bagikan-link.webp",
  "/images/help-center/affiliate/tracking-transaksi.webp",
  "/images/help-center/affiliate/komisi-affiliate.webp",
  "/images/help-center/travel-partner/daftar-travel.webp",
  "/images/help-center/travel-partner/verifikasi-travel.webp",
  "/images/help-center/travel-partner/portal-travel.webp",
  "/images/help-center/vendor/daftar-vendor.webp",
  "/images/help-center/vendor/verifikasi-vendor.webp",
  "/images/help-center/vendor/portal-vendor.webp",
  "/images/help-center/vendor/kelola-produk.webp",
  "/images/help-center/vendor/kelola-layanan.webp",
] as const;

export type HelpCenterImageAsset =
  (typeof helpCenterImageAssets)[number];

export function helpCenterImage(
  path: string,
): string {
  const normalized = path
    .replace(/^\/+/, "")
    .replace(/^images\/help-center\//, "");

  return HELP_CENTER_IMAGE_ROOT + "/" + normalized;
}

// SEGALOKA HELP CENTER — SEGADEALS VISUAL V2
export const SEGADEALS_HELP_IMAGES_V2 = {
  createRequest: "segadeals/buat-request.webp",
  requirementsBudget: "segadeals/isi-kebutuhan-budget.webp",
  requestSubmitted: "segadeals/request-terkirim.webp",
  offersList: "segadeals/daftar-penawaran.webp",
  offerDetail: "segadeals/detail-penawaran.webp",
  selectOffer: "segadeals/pilih-penawaran.webp",
} as const;

// SEGALOKA HELP CENTER — VISA SERVICE V1
export const VISA_HELP_IMAGES = {
  search: "visa/cari-layanan-visa.webp",
  detail: "visa/detail-layanan-visa.webp",
  applicant: "visa/data-pemohon.webp",
  documents: "visa/upload-dokumen.webp",
  reviewPayment: "visa/review-pembayaran.webp",
  orderStatus: "visa/status-pengajuan.webp",
  additionalDocuments: "visa/dokumen-tambahan.webp",
  result: "visa/hasil-pengajuan.webp",
} as const;
