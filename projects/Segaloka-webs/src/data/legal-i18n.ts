import type { LanguageCode } from "@/data/preferences";

export type LegalUiTranslation = {
  back: string;
  version: string;
  effective: string;
  updated: string;
  tableOfContents: string;
};

export const legalUiTranslations: Record<
  LanguageCode,
  LegalUiTranslation
> = {
  ID: {
    back: "Kembali ke Segaloka",
    version: "Versi",
    effective: "Berlaku",
    updated: "Diperbarui",
    tableOfContents: "Daftar Isi",
  },

  EN: {
    back: "Back to Segaloka",
    version: "Version",
    effective: "Effective",
    updated: "Updated",
    tableOfContents: "Table of Contents",
  },

  AR: {
    back: "العودة إلى سيجالوكا",
    version: "الإصدار",
    effective: "ساري من",
    updated: "آخر تحديث",
    tableOfContents: "جدول المحتويات",
  },
};