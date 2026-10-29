export function displayIndonesianLocationName(
  name: string,
  language: string,
  countryCode: string
): string {
  if (language !== "ID" || countryCode !== "ID") {
    return name;
  }

  const provinceNames: Record<string, string> = {
      "Aceh": "Aceh",
      "Bali": "Bali",
      "Bangka–Belitung Islands": "Kepulauan Bangka Belitung",
      "Bangka-Belitung Islands": "Kepulauan Bangka Belitung",
      "Banten": "Banten",
      "Bengkulu": "Bengkulu",
      "Central Java": "Jawa Tengah",
      "Central Kalimantan": "Kalimantan Tengah",
      "Central Papua": "Papua Tengah",
      "Central Sulawesi": "Sulawesi Tengah",
      "East Java": "Jawa Timur",
      "East Kalimantan": "Kalimantan Timur",
      "East Nusa Tenggara": "Nusa Tenggara Timur",
      "Gorontalo": "Gorontalo",
      "Highland Papua": "Papua Pegunungan",
      "Jakarta": "DKI Jakarta",
      "Jambi": "Jambi",
      "Lampung": "Lampung",
      "Maluku": "Maluku",
      "North Kalimantan": "Kalimantan Utara",
      "North Maluku": "Maluku Utara",
      "North Sulawesi": "Sulawesi Utara",
      "North Sumatra": "Sumatera Utara",
      "Papua": "Papua",
      "Riau": "Riau",
      "Riau Islands": "Kepulauan Riau",
      "South Kalimantan": "Kalimantan Selatan",
      "South Papua": "Papua Selatan",
      "South Sulawesi": "Sulawesi Selatan",
      "South Sumatra": "Sumatera Selatan",
      "Southeast Sulawesi": "Sulawesi Tenggara",
      "Southwest Papua": "Papua Barat Daya",
      "West Java": "Jawa Barat",
      "West Kalimantan": "Kalimantan Barat",
      "West Nusa Tenggara": "Nusa Tenggara Barat",
      "West Papua": "Papua Barat",
      "West Sulawesi": "Sulawesi Barat",
      "West Sumatra": "Sumatera Barat",
      "Yogyakarta": "DI Yogyakarta"
    };

  return provinceNames[name] ?? name;
}