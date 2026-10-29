import type {
  VisaLocalizedText,
} from "@/lib/visa/visa-document-requirements";

export type VisaLanguage = "ID" | "EN" | "AR";

/**
 * Resolver tunggal untuk konten operasional Visa.
 *
 * Prioritas:
 * 1. Bahasa aktif.
 * 2. Bahasa Indonesia sebagai bahasa dasar.
 * 3. Legacy/source fallback.
 *
 * Jangan melakukan auto-translation di UI.
 */
export function getVisaLocalizedText(
  localized: VisaLocalizedText | undefined,
  fallback: string,
  language: VisaLanguage,
): string {
  const selected = localized?.[language]?.trim();

  if (selected) {
    return selected;
  }

  const indonesia = localized?.ID?.trim();

  if (indonesia) {
    return indonesia;
  }

  return fallback;
}