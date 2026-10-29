import type { LanguageCode } from "@/data/preferences";

type Translation = Record<LanguageCode, string>;

const values: Record<string, Translation> = {
  "Single Entry": {
    ID: "Single Entry",
    EN: "Single Entry",
    AR: "دخول لمرة واحدة",
  },
  "Double Entry": {
    ID: "Double Entry",
    EN: "Double Entry",
    AR: "دخول لمرتين",
  },
  "Multiple Entry": {
    ID: "Multiple Entry",
    EN: "Multiple Entry",
    AR: "دخول متعدد",
  },

  "Single Entry Visa": {
    ID: "Visa Single Entry",
    EN: "Single Entry Visa",
    AR: "تأشيرة دخول لمرة واحدة",
  },
  "Double Entry Visa": {
    ID: "Visa Double Entry",
    EN: "Double Entry Visa",
    AR: "تأشيرة دخول لمرتين",
  },
  "Multiple Entry Visa": {
    ID: "Visa Multiple Entry",
    EN: "Multiple Entry Visa",
    AR: "تأشيرة دخول متعدد",
  },

  "Single Entry Express": {
    ID: "Single Entry Express",
    EN: "Single Entry Express",
    AR: "دخول لمرة واحدة - سريع",
  },
  "Double Entry Express": {
    ID: "Double Entry Express",
    EN: "Double Entry Express",
    AR: "دخول لمرتين - سريع",
  },
  "Multiple Entry (6 Bulan)": {
    ID: "Multiple Entry (6 Bulan)",
    EN: "Multiple Entry (6 Months)",
    AR: "دخول متعدد (6 أشهر)",
  },
  "Multiple Entry (12 Bulan)": {
    ID: "Multiple Entry (12 Bulan)",
    EN: "Multiple Entry (12 Months)",
    AR: "دخول متعدد (12 شهراً)",
  },

  "3 bulan": {
    ID: "3 bulan",
    EN: "3 months",
    AR: "3 أشهر",
  },
  "6 bulan": {
    ID: "6 bulan",
    EN: "6 months",
    AR: "6 أشهر",
  },
  "12 bulan": {
    ID: "12 bulan",
    EN: "12 months",
    AR: "12 شهراً",
  },

  "Maks. 30 hari": {
    ID: "Maks. 30 hari",
    EN: "Max. 30 days",
    AR: "بحد أقصى 30 يوماً",
  },
  "Maks. 30 hari/kunjungan": {
    ID: "Maks. 30 hari/kunjungan",
    EN: "Max. 30 days per visit",
    AR: "بحد أقصى 30 يوماً لكل زيارة",
  },
  "Sesuai visa": {
    ID: "Sesuai visa",
    EN: "According to visa",
    AR: "وفقاً للتأشيرة",
  },

  "7–14 hari kerja": {
    ID: "7–14 hari kerja",
    EN: "7–14 business days",
    AR: "7–14 يوم عمل",
  },
  "Proses express": {
    ID: "Proses express",
    EN: "Express processing",
    AR: "معالجة سريعة",
  },
  "Sesuai pemeriksaan": {
    ID: "Sesuai pemeriksaan",
    EN: "Subject to assessment",
    AR: "حسب التقييم",
  },

  "Regular": {
    ID: "Reguler",
    EN: "Regular",
    AR: "عادي",
  },
  "Express": {
    ID: "Express",
    EN: "Express",
    AR: "سريع",
  },

  "Wisata / Bisnis / Kunjungan": {
    ID: "Wisata / Bisnis / Kunjungan",
    EN: "Tourism / Business / Visit",
    AR: "سياحة / أعمال / زيارة",
  },

  "Wisata": {
    ID: "Wisata",
    EN: "Tourism",
    AR: "سياحة",
  },
  "Bisnis": {
    ID: "Bisnis",
    EN: "Business",
    AR: "أعمال",
  },
  "Kunjungan": {
    ID: "Kunjungan",
    EN: "Visit",
    AR: "زيارة",
  },
  "Kunjungan Berulang": {
    ID: "Kunjungan Berulang",
    EN: "Multiple Visits",
    AR: "زيارات متعددة",
  },

  "Visa untuk masuk ke China satu kali. Cocok untuk perjalanan wisata, bisnis, atau kunjungan dengan satu kali masuk.": {
    ID: "Visa untuk masuk ke China satu kali. Cocok untuk perjalanan wisata, bisnis, atau kunjungan dengan satu kali masuk.",
    EN: "Visa for a single entry into China. Suitable for tourism, business, or visit purposes with one entry.",
    AR: "تأشيرة لدخول الصين مرة واحدة. مناسبة للسياحة أو الأعمال أو الزيارة بدخول واحد.",
  },

  "Visa satu kali masuk dengan proses lebih cepat untuk kebutuhan perjalanan yang lebih mendesak.": {
    ID: "Visa satu kali masuk dengan proses lebih cepat untuk kebutuhan perjalanan yang lebih mendesak.",
    EN: "Single-entry visa with faster processing for more urgent travel needs.",
    AR: "تأشيرة دخول لمرة واحدة بمعالجة أسرع لاحتياجات السفر الأكثر إلحاحاً.",
  },

  "Visa untuk masuk ke China sebanyak dua kali selama masa berlaku visa.": {
    ID: "Visa untuk masuk ke China sebanyak dua kali selama masa berlaku visa.",
    EN: "Visa for two entries into China during the visa validity period.",
    AR: "تأشيرة تسمح بدخول الصين مرتين خلال فترة صلاحية التأشيرة.",
  },

  "Visa dua kali masuk dengan proses dipercepat untuk kebutuhan perjalanan dengan jadwal lebih dekat.": {
    ID: "Visa dua kali masuk dengan proses dipercepat untuk kebutuhan perjalanan dengan jadwal lebih dekat.",
    EN: "Double-entry visa with expedited processing for travel with a closer departure date.",
    AR: "تأشيرة دخول لمرتين بمعالجة سريعة للسفر ذي موعد المغادرة الأقرب.",
  },

  "Visa untuk perjalanan berkali-kali ke China dengan masa berlaku hingga 6 bulan.": {
    ID: "Visa untuk perjalanan berkali-kali ke China dengan masa berlaku hingga 6 bulan.",
    EN: "Visa for multiple trips to China with validity of up to 6 months.",
    AR: "تأشيرة لرحلات متعددة إلى الصين بصلاحية تصل إلى 6 أشهر.",
  },

  "Visa untuk perjalanan berkali-kali ke China dengan masa berlaku hingga 12 bulan.": {
    ID: "Visa untuk perjalanan berkali-kali ke China dengan masa berlaku hingga 12 bulan.",
    EN: "Visa for multiple trips to China with validity of up to 12 months.",
    AR: "تأشيرة لرحلات متعددة إلى الصين بصلاحية تصل إلى 12 شهراً.",
  },
};

export function translateVisaValue(
  value: string | undefined | null,
  language: LanguageCode,
): string {
  if (!value) {
    return "";
  }

  return values[value]?.[language] ?? value;
}