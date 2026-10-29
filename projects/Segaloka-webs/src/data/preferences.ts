export const languageOptions = [
  { code: "ID", label: "Bahasa Indonesia", dir: "ltr" },
  { code: "EN", label: "English", dir: "ltr" },
  { code: "AR", label: "العربية", dir: "rtl" },
] as const;

export const currencyOptions = [
  { code: "IDR", label: "Indonesian Rupiah" },
  { code: "USD", label: "US Dollar" },
  { code: "SAR", label: "Saudi Riyal" },
] as const;

export type LanguageCode = (typeof languageOptions)[number]["code"];
export type CurrencyCode = (typeof currencyOptions)[number]["code"];
