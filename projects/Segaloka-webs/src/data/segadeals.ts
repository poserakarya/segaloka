export const segaDealsTripTypes = [
  "Umrah",
  "Haji",
  "Halal Tour",
  "Domestik",
  "Internasional",
  "Custom",
] as const;

export type SegaDealsTripType =
  (typeof segaDealsTripTypes)[number];

export const segaDealsIndonesiaCities = [
  "Jakarta",
  "Makassar",
  "Surabaya",
  "Medan",
  "Yogyakarta",
  "Bandung",
  "Semarang",
  "Balikpapan",
  "Banjarmasin",
  "Palembang",
  "Pekanbaru",
  "Padang",
  "Banda Aceh",
  "Batam",
  "Denpasar",
  "Manado",
  "Lombok",
] as const;

export const segaDealsDestinations: Record<
  SegaDealsTripType,
  readonly string[]
> = {
  Umrah: ["Makkah", "Madinah", "Makkah & Madinah"],
  Haji: ["Makkah", "Madinah"],
  "Halal Tour": [
    "Turki",
    "Malaysia",
    "Singapura",
    "Jepang",
    "Korea Selatan",
    "Uni Emirat Arab",
    "Mesir",
    "Maroko",
    "Uzbekistan",
    "Yordania",
    "Eropa",
  ],
  Domestik: [
    "Bali",
    "Yogyakarta",
    "Bandung",
    "Lombok",
    "Labuan Bajo",
    "Raja Ampat",
    "Bromo",
    "Malang",
    "Makassar",
    "Toraja",
  ],
  Internasional: [
    "Malaysia",
    "Singapura",
    "Thailand",
    "Vietnam",
    "Jepang",
    "Korea Selatan",
    "Tiongkok",
    "Hong Kong",
    "Turki",
    "Uni Emirat Arab",
    "Australia",
    "Eropa",
  ],
  Custom: [],
};

export type SegaDealsTraveler = {
  adult: number;
  child: number;
  infant: number;
};

export type SegaDealsRequestDraft = {
  tripType: SegaDealsTripType;
  origin: string;
  destination: string;
  travelers: SegaDealsTraveler;
  budgetIdr: number;
  departureDate: string;
  notes: string;
};

export function getSegaDealsTravelerTotal(
  travelers: SegaDealsTraveler,
) {
  return (
    travelers.adult +
    travelers.child +
    travelers.infant
  );
}
