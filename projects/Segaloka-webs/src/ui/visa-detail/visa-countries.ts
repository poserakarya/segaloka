export type VisaCountryMaster = {
  name: string;
  slug: string;
  flag: string;
  image: string;
};

export const visaCountries: VisaCountryMaster[] = [
  { name: "China", slug: "china", flag: "🇨🇳", image: "/images/visa/countries/china.jpg" },
  { name: "Korea Selatan", slug: "korea-selatan", flag: "🇰🇷", image: "/images/visa/countries/korea-selatan.jpg" },
  { name: "Jepang", slug: "jepang", flag: "🇯🇵", image: "/images/visa/countries/jepang.jpg" },
  { name: "Belanda", slug: "belanda", flag: "🇳🇱", image: "/images/visa/countries/belanda.jpg" },
  { name: "Belgia", slug: "belgia", flag: "🇧🇪", image: "/images/visa/countries/belgia.jpg" },
  { name: "Prancis", slug: "prancis", flag: "🇫🇷", image: "/images/visa/countries/prancis.jpg" },
  { name: "Swiss", slug: "swiss", flag: "🇨🇭", image: "/images/visa/countries/swiss.jpg" },
  { name: "Italia", slug: "italia", flag: "🇮🇹", image: "/images/visa/countries/italia.jpg" },
  { name: "Jerman", slug: "jerman", flag: "🇩🇪", image: "/images/visa/countries/jerman.jpg" },
  { name: "Austria", slug: "austria", flag: "🇦🇹", image: "/images/visa/countries/austria.jpg" },
  { name: "Denmark", slug: "denmark", flag: "🇩🇰", image: "/images/visa/countries/denmark.jpg" },
  { name: "Islandia", slug: "islandia", flag: "🇮🇸", image: "/images/visa/countries/islandia.jpg" },
  { name: "Norwegia", slug: "norwegia", flag: "🇳🇴", image: "/images/visa/countries/norwegia.jpg" },
  { name: "Finlandia", slug: "finlandia", flag: "🇫🇮", image: "/images/visa/countries/finlandia.jpg" },
  { name: "Swedia", slug: "swedia", flag: "🇸🇪", image: "/images/visa/countries/swedia.jpg" },
  { name: "Yunani", slug: "yunani", flag: "🇬🇷", image: "/images/visa/countries/yunani.jpg" },
  { name: "Republik Ceko", slug: "republik-ceko", flag: "🇨🇿", image: "/images/visa/countries/republik-ceko.jpg" },
  { name: "Kroasia", slug: "kroasia", flag: "🇭🇷", image: "/images/visa/countries/kroasia.jpg" },
  { name: "Portugal", slug: "portugal", flag: "🇵🇹", image: "/images/visa/countries/portugal.jpg" },
  { name: "Hungaria", slug: "hungaria", flag: "🇭🇺", image: "/images/visa/countries/hungaria.jpg" },
  { name: "Luksemburg", slug: "luksemburg", flag: "🇱🇺", image: "/images/visa/countries/luksemburg.jpg" },
  { name: "Polandia", slug: "polandia", flag: "🇵🇱", image: "/images/visa/countries/polandia.jpg" },
  { name: "Malta", slug: "malta", flag: "🇲🇹", image: "/images/visa/countries/malta.jpg" },
  { name: "Slovenia", slug: "slovenia", flag: "🇸🇮", image: "/images/visa/countries/slovenia.jpg" },
  { name: "Latvia", slug: "latvia", flag: "🇱🇻", image: "/images/visa/countries/latvia.jpg" },
  { name: "Lithuania", slug: "lithuania", flag: "🇱🇹", image: "/images/visa/countries/lithuania.jpg" },
  { name: "Estonia", slug: "estonia", flag: "🇪🇪", image: "/images/visa/countries/estonia.jpg" },
  { name: "Australia", slug: "australia", flag: "🇦🇺", image: "/images/visa/countries/australia.jpg" },
  { name: "Inggris", slug: "inggris", flag: "🇬🇧", image: "/images/visa/countries/inggris.jpg" },
  { name: "Amerika Serikat", slug: "amerika-serikat", flag: "🇺🇸", image: "/images/visa/countries/amerika-serikat.jpg" },
  { name: "Selandia Baru", slug: "selandia-baru", flag: "🇳🇿", image: "/images/visa/countries/selandia-baru.jpg" },
  { name: "Uni Emirat Arab", slug: "uni-emirat-arab", flag: "🇦🇪", image: "/images/visa/countries/uni-emirat-arab.jpg" },
  { name: "Indonesia", slug: "indonesia", flag: "🇮🇩", image: "/images/visa/countries/indonesia.jpg" },
];

export const visaCountryNames: Record<string, string> =
  Object.fromEntries(
    visaCountries.map((country) => [
      country.slug,
      country.name,
    ]),
  );

export function getVisaCountryBySlug(
  slug: string,
): VisaCountryMaster | null {
  const normalizedSlug =
    slug.trim().toLowerCase();

  return (
    visaCountries.find(
      (country) =>
        country.slug === normalizedSlug,
    ) ?? null
  );
}