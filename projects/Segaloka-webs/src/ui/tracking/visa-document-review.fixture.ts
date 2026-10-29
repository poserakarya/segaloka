import type {
  VisaApplicantDocumentProgress,
  VisaDocumentRequirement,
} from "@/lib/visa/visa-document-requirements";

/**
 * PRESENTATION FIXTURE ONLY.
 *
 * Data di file ini hanya untuk preview UI/UX.
 * Bukan persyaratan resmi Visa China dan bukan data ABW.
 * Production harus menggunakan requirement yang ditentukan Vendor.
 */

export const visaDocumentReviewFixtureRequirements:
  VisaDocumentRequirement[] = [
    {
      id: "fixture-passport",
      name: "Paspor",
      description:
        "Halaman biodata paspor harus terlihat jelas dan tidak terpotong.",
      localizedName: {
        ID: "Paspor",
        EN: "Passport",
        AR: "جواز السفر",
      },
      localizedDescription: {
        ID: "Halaman biodata paspor harus terlihat jelas dan tidak terpotong.",
        EN: "The passport biodata page must be clear and fully visible.",
        AR: "يجب أن تكون صفحة بيانات جواز السفر واضحة وظاهرة بالكامل.",
      },
      required: true,
      digitalUploadRequired: true,
      acceptedFileTypes: ["pdf", "jpg", "jpeg", "png"],
      originalDocumentRequired: false,
    },
    {
      id: "fixture-photo",
      name: "Pas Foto",
      description:
        "Foto terbaru sesuai ketentuan layanan yang ditetapkan Vendor.",
      localizedName: {
        ID: "Pas Foto",
        EN: "Photo",
        AR: "الصورة الشخصية",
      },
      localizedDescription: {
        ID: "Foto terbaru sesuai ketentuan layanan yang ditetapkan Vendor.",
        EN: "A recent photo that meets the service requirements set by the Vendor.",
        AR: "صورة حديثة تستوفي متطلبات الخدمة التي يحددها البائع.",
      },
      required: true,
      digitalUploadRequired: true,
      acceptedFileTypes: ["jpg", "jpeg", "png"],
      originalDocumentRequired: false,
    },
    {
      id: "fixture-identity",
      name: "Kartu Identitas",
      description:
        "Dokumen identitas pemohon sesuai persyaratan Vendor.",
      localizedName: {
        ID: "Kartu Identitas",
        EN: "Identity Document",
        AR: "وثيقة الهوية",
      },
      localizedDescription: {
        ID: "Dokumen identitas pemohon sesuai persyaratan Vendor.",
        EN: "The applicant's identity document according to the Vendor's requirements.",
        AR: "وثيقة هوية مقدم الطلب وفقاً لمتطلبات البائع.",
      },
      required: true,
      digitalUploadRequired: true,
      acceptedFileTypes: ["pdf", "jpg", "jpeg", "png"],
      originalDocumentRequired: false,
    },
    {
      id: "fixture-bank-statement",
      name: "Rekening Koran / Mutasi Bank",
      description:
        "Dokumen finansial sesuai periode yang ditentukan Vendor.",
      localizedName: {
        ID: "Rekening Koran / Mutasi Bank",
        EN: "Bank Statement",
        AR: "كشف الحساب البنكي",
      },
      localizedDescription: {
        ID: "Dokumen finansial sesuai periode yang ditentukan Vendor.",
        EN: "Financial document covering the period specified by the Vendor.",
        AR: "مستند مالي يغطي الفترة التي يحددها البائع.",
      },
      required: true,
      digitalUploadRequired: true,
      acceptedFileTypes: ["pdf", "jpg", "jpeg", "png"],
      originalDocumentRequired: false,
    },
    {
      id: "fixture-employment",
      name: "Surat Keterangan Kerja / Usaha",
      description:
        "Dokumen pekerjaan atau usaha sesuai kebutuhan pengajuan.",
      localizedName: {
        ID: "Surat Keterangan Kerja / Usaha",
        EN: "Employment / Business Letter",
        AR: "خطاب العمل / النشاط التجاري",
      },
      localizedDescription: {
        ID: "Dokumen pekerjaan atau usaha sesuai kebutuhan pengajuan.",
        EN: "Employment or business document required for the application.",
        AR: "مستند العمل أو النشاط التجاري المطلوب لتقديم الطلب.",
      },
      required: false,
      digitalUploadRequired: true,
      acceptedFileTypes: ["pdf", "jpg", "jpeg", "png"],
      originalDocumentRequired: false,
    },
    {
      id: "fixture-travel-reservation",
      name: "Bukti Reservasi Perjalanan",
      description:
        "Dokumen reservasi perjalanan apabila diminta oleh Vendor.",
      localizedName: {
        ID: "Bukti Reservasi Perjalanan",
        EN: "Travel Reservation Proof",
        AR: "إثبات حجز السفر",
      },
      localizedDescription: {
        ID: "Dokumen reservasi perjalanan apabila diminta oleh Vendor.",
        EN: "Travel reservation document when requested by the Vendor.",
        AR: "مستند حجز السفر عند طلبه من قبل البائع.",
      },
      required: false,
      digitalUploadRequired: true,
      acceptedFileTypes: ["pdf", "jpg", "jpeg", "png"],
      originalDocumentRequired: false,
    },
  ];

export const visaDocumentReviewFixtureProgress:
  VisaApplicantDocumentProgress[] = [
    {
      applicantId: "fixture-applicant-1",
      applicantName: "Pemohon 1",
      documents: [
        {
          requirementId: "fixture-passport",
          status: "approved",
          fileName: "paspor-pemohon-1.pdf",
          uploadedAt: "2026-10-08T08:00:00+08:00",
          revisions: [
            {
              id: "fixture-passport-r1",
              revisionNumber: 1,
              fileName: "paspor-pemohon-1.pdf",
              uploadedAt: "2026-10-08T08:00:00+08:00",
              status: "approved",
              reviewedAt: "2026-10-08T09:00:00+08:00",
            },
          ],
        },
        {
          requirementId: "fixture-photo",
          status: "under_review",
          fileName: "foto-pemohon-1.jpg",
          uploadedAt: "2026-10-08T08:15:00+08:00",
          revisions: [
            {
              id: "fixture-photo-r1",
              revisionNumber: 1,
              fileName: "foto-pemohon-1.jpg",
              uploadedAt: "2026-10-08T08:15:00+08:00",
              status: "under_review",
            },
          ],
        },
        {
          requirementId: "fixture-identity",
          status: "revision_required",
          fileName: "identitas-pemohon-1-v1.pdf",
          uploadedAt: "2026-10-08T08:30:00+08:00",
          vendorNote:
            "Gambar kurang jelas. Mohon unggah ulang dokumen dengan seluruh bagian terlihat.",
          vendorNoteTranslations: {
            ID: "Gambar kurang jelas. Mohon unggah ulang dokumen dengan seluruh bagian terlihat.",
            EN: "The image is unclear. Please upload the document again with the entire document visible.",
            AR: "الصورة غير واضحة. يرجى رفع المستند مرة أخرى مع التأكد من ظهور المستند بالكامل.",
          },
          revisions: [
            {
              id: "fixture-identity-r1",
              revisionNumber: 1,
              fileName: "identitas-pemohon-1-v1.pdf",
              uploadedAt: "2026-10-08T08:30:00+08:00",
              status: "revision_required",
              vendorNote:
                "Gambar kurang jelas. Mohon unggah ulang dokumen dengan seluruh bagian terlihat.",
              vendorNoteTranslations: {
                ID: "Gambar kurang jelas. Mohon unggah ulang dokumen dengan seluruh bagian terlihat.",
                EN: "The image is unclear. Please upload the document again with the entire document visible.",
                AR: "الصورة غير واضحة. يرجى رفع المستند مرة أخرى مع التأكد من ظهور المستند بالكامل.",
              },
              reviewedAt: "2026-10-08T09:15:00+08:00",
            },
          ],
        },
        {
          requirementId: "fixture-bank-statement",
          status: "uploaded",
          fileName: "mutasi-bank-pemohon-1.pdf",
          uploadedAt: "2026-10-08T08:45:00+08:00",
          revisions: [
            {
              id: "fixture-bank-r1",
              revisionNumber: 1,
              fileName: "mutasi-bank-pemohon-1.pdf",
              uploadedAt: "2026-10-08T08:45:00+08:00",
              status: "uploaded",
            },
          ],
        },
        {
          requirementId: "fixture-employment",
          status: "missing",
          revisions: [],
        },
        {
          requirementId: "fixture-travel-reservation",
          status: "missing",
          revisions: [],
        },
      ],
    },
    {
      applicantId: "fixture-applicant-2",
      applicantName: "Pemohon 2",
      documents: [
        {
          requirementId: "fixture-passport",
          status: "approved",
          fileName: "paspor-pemohon-2.pdf",
          uploadedAt: "2026-10-08T08:10:00+08:00",
          revisions: [
            {
              id: "fixture-applicant-2-passport-r1",
              revisionNumber: 1,
              fileName: "paspor-pemohon-2.pdf",
              uploadedAt: "2026-10-08T08:10:00+08:00",
              status: "approved",
              reviewedAt: "2026-10-08T09:10:00+08:00",
            },
          ],
        },
        {
          requirementId: "fixture-photo",
          status: "approved",
          fileName: "foto-pemohon-2.jpg",
          uploadedAt: "2026-10-08T08:20:00+08:00",
          revisions: [
            {
              id: "fixture-applicant-2-photo-r1",
              revisionNumber: 1,
              fileName: "foto-pemohon-2.jpg",
              uploadedAt: "2026-10-08T08:20:00+08:00",
              status: "approved",
              reviewedAt: "2026-10-08T09:20:00+08:00",
            },
          ],
        },
        {
          requirementId: "fixture-identity",
          status: "under_review",
          fileName: "identitas-pemohon-2.pdf",
          uploadedAt: "2026-10-08T08:35:00+08:00",
          revisions: [
            {
              id: "fixture-applicant-2-identity-r1",
              revisionNumber: 1,
              fileName: "identitas-pemohon-2.pdf",
              uploadedAt: "2026-10-08T08:35:00+08:00",
              status: "under_review",
            },
          ],
        },
        {
          requirementId: "fixture-bank-statement",
          status: "missing",
          revisions: [],
        },
        {
          requirementId: "fixture-employment",
          status: "missing",
          revisions: [],
        },
        {
          requirementId: "fixture-travel-reservation",
          status: "missing",
          revisions: [],
        },
      ],
    },
  ];