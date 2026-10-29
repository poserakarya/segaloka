import type {
  VisaSubmissionProgress,
} from "@/lib/visa/visa-submission";

/**
 * UI/UX PRESENTATION FIXTURE ONLY.
 *
 * Bukan data produksi.
 * Hapus/ganti dengan data backend saat integrasi Supabase.
 */
export const visaSubmissionFixture: VisaSubmissionProgress = {
  status: "completed",

  submission: {
    referenceNumber: "VISA-CN-2026-100801",
    submittedAt: "2026-10-08T10:15:00+08:00",
    estimatedCompletionAt: "2026-10-15T17:00:00+08:00",
  },

  physicalAttendance: {
    required: true,
    types: ["biometric"],
    instructions:
      "Harap hadir 30 menit sebelum jadwal dan membawa paspor asli serta bukti pengajuan.",
    instructionsTranslations: {
      ID: "Harap hadir 30 menit sebelum jadwal dan membawa paspor asli serta bukti pengajuan.",
      EN: "Please arrive 30 minutes before the scheduled time and bring your original passport and application receipt.",
      AR: "يرجى الحضور قبل الموعد المحدد بـ 30 دقيقة وإحضار جواز السفر الأصلي وإيصال تقديم الطلب.",
    },

    locationName: "Visa Application Center",
    locationNameTranslations: {
      ID: "Pusat Aplikasi Visa",
      EN: "Visa Application Center",
      AR: "مركز تقديم طلبات التأشيرة",
    },

    address: "Jakarta, Indonesia",
    addressTranslations: {
      ID: "Jakarta, Indonesia",
      EN: "Jakarta, Indonesia",
      AR: "جاكرتا، إندونيسيا",
    },

    appointmentAt: "2026-10-10T09:30:00+07:00",
  },

  completedAt: "2026-10-15T16:30:00+08:00",
  completedByVendorUserId: "fixture-vendor-user-1",
  completedByVendorName: "ABW Travel Service",
  completionNote:
    "Vendor telah mengonfirmasi bahwa proses pengajuan Visa selesai. Hasil akhir akan disampaikan pada tahap berikutnya.",
  completionNoteTranslations: {
    ID: "Vendor telah mengonfirmasi bahwa proses pengajuan Visa selesai. Hasil akhir akan disampaikan pada tahap berikutnya.",
    EN: "The Vendor has confirmed that the Visa submission process is complete. The final result will be provided in the next stage.",
    AR: "أكد مقدم الخدمة اكتمال إجراءات تقديم طلب التأشيرة. سيتم تقديم النتيجة النهائية في المرحلة التالية.",
  },
  updates: [
    {
      id: "fixture-submission-completed",
      status: "completed",
      note:
        "Proses pengajuan Visa dikonfirmasi selesai oleh Vendor.",
      noteTranslations: {
        ID: "Proses pengajuan Visa dikonfirmasi selesai oleh Vendor.",
        EN: "The Visa submission process was confirmed complete by the Vendor.",
        AR: "أكد مقدم الخدمة اكتمال إجراءات تقديم طلب التأشيرة.",
      },
      createdAt: "2026-10-15T16:30:00+08:00",
    },
    {
      id: "fixture-submission-ready",
      status: "ready",
      note:
        "Seluruh dokumen pemohon telah disetujui dan pengajuan siap diteruskan.",
      noteTranslations: {
        ID: "Seluruh dokumen pemohon telah disetujui dan pengajuan siap diteruskan.",
        EN: "All applicant documents have been approved and the application is ready for submission.",
        AR: "تم اعتماد جميع مستندات مقدم الطلب وأصبح الطلب جاهزًا للتقديم.",
      },
      createdAt: "2026-10-08T09:30:00+08:00",
    },

    {
      id: "fixture-submission-submitted",
      status: "submitted",
      note:
        "Permohonan Visa telah diajukan dan nomor referensi pengajuan telah diterbitkan.",
      noteTranslations: {
        ID: "Permohonan Visa telah diajukan dan nomor referensi pengajuan telah diterbitkan.",
        EN: "The Visa application has been submitted and the submission reference has been issued.",
        AR: "تم تقديم طلب التأشيرة وإصدار الرقم المرجعي للطلب.",
      },
      createdAt: "2026-10-08T10:15:00+08:00",
    },

    {
      id: "fixture-submission-processing",
      status: "processing",
      note:
        "Permohonan sedang diproses. Pantau halaman ini untuk pembaruan berikutnya.",
      noteTranslations: {
        ID: "Permohonan sedang diproses. Pantau halaman ini untuk pembaruan berikutnya.",
        EN: "The application is being processed. Monitor this page for the next update.",
        AR: "الطلب قيد المعالجة. تابع هذه الصفحة للحصول على التحديث التالي.",
      },
      createdAt: "2026-10-08T13:45:00+08:00",
    },
  ],
};