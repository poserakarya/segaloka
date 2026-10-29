"use client";

import {
  SearchEditBar,
} from "@/components/search/SearchEditBar";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  Filter,
  Globe2,
  Grid2X2,
  List,
  Map,
  MapPin,
  Search,
  Sparkles,
  Star,
  UsersRound,
  CalendarDays,
  X,
} from "lucide-react";

import {
  featuredPackages,
  type TravelProduct,
} from "@/data/home";

import {
  useMemo,
  useState,
} from "react";


type Props = {
  category: string;
  origin: string;
  destination: string;
  travelers: string;
  date: string;
};


const supportedAirlines = [
  "Garuda Indonesia",
  "Saudia",
  "Emirates",
  "Qatar Airways",
  "Etihad Airways",
  "Turkish Airlines",
  "Oman Air",
  "Malaysia Airlines",
  "AirAsia",
  "Scoot",
  "Lion Air",
  "Hainan Airlines",
  "IndiGo",
];

const umrahFilterOptions = [
  "Hemat",
  "Regular",
  "Plus",
  "First",
];

type SortMode =
  | "relevant"
  | "lowest"
  | "highest"
  | "departure";


type ViewMode =
  | "grid"
  | "list";


type PackageMeta = {
  airline: string;
  departure: string;
};



const sponsoredPackages = [
  {
    id: "sponsored-nuzultrip-umrah",
    travel: "Nuzultrip",
    category: "Umrah",
    title: "Umrah Premium 12 Hari",
    location: "Makkah · Madinah",
    duration: "12 Hari",
    rating: 4.9,
    reviews: 128,
    price: 32900000,
    badge: "Sponsored",
    promo: "Diskon hingga Rp 2.500.000",
    image:
      "/images/packages/umrah-premium.jpg",
    target:
      "/paket/umrah-premium-12d",
  },
  {
    id: "sponsored-alhanan-umrah",
    travel: "Alhanan Berkah Wisata",
    category: "Umrah",
    title: "Umrah Reguler 9 Hari",
    location: "Makkah · Madinah",
    duration: "9 Hari",
    rating: 4.8,
    reviews: 96,
    price: 30500000,
    badge: "Sponsored",
    promo: "Promo keberangkatan pilihan",
    image:
      "/images/packages/umrah-reguler.jpg",
    target:
      "/paket/umrah-reguler-9d",
  },
  {
    id: "sponsored-amanah-umrah",
    travel: "Amanah Travel",
    category: "Umrah",
    title: "Umrah Plus Turkiye",
    location: "Istanbul · Makkah · Madinah",
    duration: "13 Hari",
    rating: 4.8,
    reviews: 84,
    price: 38900000,
    badge: "Sponsored",
    promo: "Paket Umrah Plus pilihan",
    image:
      "/images/packages/umrah-turkiye.jpg",
    target:
      "/paket/umrah-plus-turkiye",
  },
];
const packageMeta: Record<string, PackageMeta> = {
  "umrah-premium-12d": {
    airline: "Garuda Indonesia",
    departure: "2026-12-10",
  },

  "umrah-plus-turkiye": {
    airline: "Turkish Airlines",
    departure: "2026-12-15",
  },

  "halal-tour-japan": {
    airline: "Japan Airlines",
    departure: "2026-12-18",
  },

  "halal-tour-korea": {
    airline: "Korean Air",
    departure: "2026-12-22",
  },
};


function categoryFor(
  item: TravelProduct,
) {
  const value =
    item.title.toLowerCase();

  if (value.includes("haji")) {
    return {
      label: "Haji",
      Icon: Map,
    };
  }

  if (value.includes("halal")) {
    return {
      label: "Halal Tour",
      Icon: Globe2,
    };
  }

  return {
    label: "Umrah",
    Icon: Building2,
  };
}


function normalizeCategory(
  value: string,
) {
  return value
    .trim()
    .toLowerCase();
}


function packageUmrahType(
  item: TravelProduct,
) {
  const title =
    item.title.toLowerCase();

  if (
    title.includes("plus")
  ) {
    return "Plus";
  }

  if (
    title.includes("first")
  ) {
    return "First";
  }

  if (
    title.includes("regular") ||
    title.includes("reguler") ||
    title.includes("premium")
  ) {
    return "Regular";
  }

  return "Hemat";
}

function numericDuration(
  value?: string,
) {
  if (!value) {
    return 0;
  }

  const result =
    Number(
      value.match(/\d+/)?.[0] || 0,
    );

  return result;
}


function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    },
  )
    .format(value)
    .replace("Rp", "Rp ");
}


function displayDate(
  value: string,
) {
  if (!value) {
    return "Pilih tanggal";
  }

  const parsed =
    new Date(`${value}T00:00:00`);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(parsed);
}


export function SearchResultsClient({
  category,
  origin,
  destination,
  travelers,
  date,
}: Props) {

  const initialCategory =
    normalizeCategory(category);


  const categoryPackages =
    useMemo(
      () => {
        const matches =
          featuredPackages.filter(
            (item) =>
              normalizeCategory(
                categoryFor(item).label,
              ) ===
              initialCategory,
          );

        /*
         * Selama data masih lokal:
         * bila kategori belum mempunyai data,
         * tampilkan data paket existing.
         */
        return matches.length
          ? matches
          : featuredPackages;
      },
      [
        initialCategory,
      ],
    );


  const destinationOptions =
    useMemo(
      () => {

        if (
          initialCategory ===
          "umrah"
        ) {
          return umrahFilterOptions;
        }

        return Array.from(
          new Set(
            categoryPackages.flatMap(
              (item) =>
                item.location
                  .split(" · ")
                  .map(
                    (part) =>
                      part.trim(),
                  ),
            ),
          ),
        );
      },
      [
        categoryPackages,
        initialCategory,
      ],
    );
const durationOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            categoryPackages
              .map(
                (item) =>
                  item.duration,
              )
              .filter(
                (
                  item,
                ): item is string =>
                  Boolean(item),
              ),
          ),
        ).sort(
          (a, b) =>
            numericDuration(a) -
            numericDuration(b),
        ),
      [
        categoryPackages,
      ],
    );


  const airlineOptions =
    supportedAirlines;

const highestPrice =
    useMemo(
      () =>
        Math.max(
          ...categoryPackages.map(
            (item) =>
              item.price,
          ),
          75000000,
        ),
      [
        categoryPackages,
      ],
    );


  const [selectedDestinations, setSelectedDestinations] =
    useState<string[]>([]);

  const [selectedDurations, setSelectedDurations] =
    useState<string[]>([]);

  const [selectedAirlines, setSelectedAirlines] =
    useState<string[]>([]);

  const [minimumRating, setMinimumRating] =
    useState(0);

  const [maximumPrice, setMaximumPrice] =
    useState(highestPrice);

  const [sortMode, setSortMode] =
    useState<SortMode>("relevant");

  const [viewMode, setViewMode] =
    useState<ViewMode>("grid");

  const [mobileFilterOpen, setMobileFilterOpen] =
    useState(false);


  function toggleArrayValue(
    value: string,
    values: string[],
    setter: (
      next: string[],
    ) => void,
  ) {

    setter(
      values.includes(value)
        ? values.filter(
            (item) =>
              item !== value,
          )
        : [
            ...values,
            value,
          ],
    );
  }


  function resetFilters() {
    setSelectedDestinations([]);
    setSelectedDurations([]);
    setSelectedAirlines([]);
    setMinimumRating(0);
    setMaximumPrice(
      highestPrice,
    );
    setSortMode("relevant");
  }



  const filteredSponsoredPackages =
    useMemo(
      () => {
        return sponsoredPackages
          .filter(
            (item) => {

              const categoryMatch =
                normalizeCategory(
                  item.category,
                ) ===
                initialCategory;

              const destinationMatch =
                selectedDestinations.length === 0 ||
                (
                  initialCategory === "umrah"
                    ? selectedDestinations.includes(
                        packageUmrahType(
                          item,
                        ),
                      )
                    : selectedDestinations.some(
                        (selected) =>
                          item.location
                            .toLowerCase()
                            .includes(
                              selected
                                .toLowerCase(),
                            ),
                      )
                );
const durationMatch =
                selectedDurations.length === 0 ||
                selectedDurations.includes(
                  item.duration,
                );

              const ratingMatch =
                item.rating >=
                minimumRating;

              const priceMatch =
                item.price <=
                maximumPrice;

              return (
                categoryMatch &&
                destinationMatch &&
                durationMatch &&
                ratingMatch &&
                priceMatch
              );
            },
          )
          .slice(0, 3);
      },
      [
        initialCategory,
        selectedDestinations,
        selectedDurations,
        minimumRating,
        maximumPrice,
      ],
    );

  const filteredPackages =
    useMemo(
      () => {

        let result =
          categoryPackages.filter(
            (item) => {

              const meta =
                packageMeta[item.id];

              const destinationMatch =
                selectedDestinations.length === 0 ||
                selectedDestinations.some(
                  (selected) =>
                    item.location
                      .toLowerCase()
                      .includes(
                        selected.toLowerCase(),
                      ),
                );

              const durationMatch =
                selectedDurations.length === 0 ||
                (
                  item.duration &&
                  selectedDurations.includes(
                    item.duration,
                  )
                );

              const airline =
                meta?.airline || "";

              const airlineMatch =
                selectedAirlines.length === 0 ||
                selectedAirlines.includes(
                  airline,
                );

              const ratingMatch =
                item.rating >=
                minimumRating;

              const priceMatch =
                item.price <=
                maximumPrice;

              return (
                destinationMatch &&
                durationMatch &&
                airlineMatch &&
                ratingMatch &&
                priceMatch
              );
            },
          );


        if (
          sortMode ===
          "lowest"
        ) {
          result = [
            ...result,
          ].sort(
            (a, b) =>
              a.price -
              b.price,
          );
        }


        if (
          sortMode ===
          "highest"
        ) {
          result = [
            ...result,
          ].sort(
            (a, b) =>
              b.price -
              a.price,
          );
        }


        if (
          sortMode ===
          "departure"
        ) {
          result = [
            ...result,
          ].sort(
            (a, b) => {

              const first =
                packageMeta[a.id]
                  ?.departure ||
                "9999-12-31";

              const second =
                packageMeta[b.id]
                  ?.departure ||
                "9999-12-31";

              return first.localeCompare(
                second,
              );
            },
          );
        }


        return result;
      },
      [
        categoryPackages,
        selectedDestinations,
        selectedDurations,
        selectedAirlines,
        minimumRating,
        maximumPrice,
        sortMode,
      ],
    );


  const FilterContent = () => (
    <>

      <div className="search-filter-title">

        <strong>
          Filter Pencarian
        </strong>

        <button
          type="button"
          onClick={resetFilters}
        >
          Reset
        </button>

      </div>


      <div className="search-filter-group">

        <h3>
          Tujuan {category}
        </h3>

        <label>
          <input
            type="checkbox"
            checked={
              selectedDestinations.length ===
              0
            }
            onChange={() =>
              setSelectedDestinations(
                [],
              )
            }
          />

          <span>
            Semua Tujuan
          </span>
        </label>


        {destinationOptions.map(
          (value) => (
            <label key={value}>

              <input
                type="checkbox"
                checked={
                  selectedDestinations.includes(
                    value,
                  )
                }
                onChange={() =>
                  toggleArrayValue(
                    value,
                    selectedDestinations,
                    setSelectedDestinations,
                  )
                }
              />

              <span>
                {value}
              </span>

            </label>
          ),
        )}

      </div>


      <div className="search-filter-group">

        <h3>
          Durasi
        </h3>

        <label>
          <input
            type="checkbox"
            checked={
              selectedDurations.length ===
              0
            }
            onChange={() =>
              setSelectedDurations(
                [],
              )
            }
          />

          <span>
            Semua Durasi
          </span>
        </label>


        {durationOptions.map(
          (value) => (
            <label key={value}>

              <input
                type="checkbox"
                checked={
                  selectedDurations.includes(
                    value,
                  )
                }
                onChange={() =>
                  toggleArrayValue(
                    value,
                    selectedDurations,
                    setSelectedDurations,
                  )
                }
              />

              <span>
                {value}
              </span>

            </label>
          ),
        )}

      </div>


      <div className="search-filter-group">

        <h3>
          Harga Maksimal
        </h3>

        <strong className="search-filter-price">
          {formatCurrency(
            maximumPrice,
          )}
        </strong>

        <input
          type="range"
          min="0"
          max={highestPrice}
          step="500000"
          value={maximumPrice}
          onChange={(event) =>
            setMaximumPrice(
              Number(
                event.target.value,
              ),
            )
          }
        />

        <div className="search-filter-range-labels">

          <span>
            Rp 0
          </span>

          <span>
            {formatCurrency(
              highestPrice,
            )}
          </span>

        </div>

      </div>


      <div className="search-filter-group">

        <h3>
          Maskapai
        </h3>

        <label>
          <input
            type="checkbox"
            checked={
              selectedAirlines.length ===
              0
            }
            onChange={() =>
              setSelectedAirlines(
                [],
              )
            }
          />

          <span>
            Semua Maskapai
          </span>
        </label>


        {airlineOptions.map(
          (value) => (
            <label key={value}>

              <input
                type="checkbox"
                checked={
                  selectedAirlines.includes(
                    value,
                  )
                }
                onChange={() =>
                  toggleArrayValue(
                    value,
                    selectedAirlines,
                    setSelectedAirlines,
                  )
                }
              />

              <span>
                {value}
              </span>

            </label>
          ),
        )}

      </div>


      <div className="search-filter-group">

        <h3>
          Rating Travel
        </h3>

        {[
          {
            label:
              "Semua Rating",
            value:
              0,
          },
          {
            label:
              "★ 4.5 ke atas",
            value:
              4.5,
          },
          {
            label:
              "★ 4.0 ke atas",
            value:
              4,
          },
          {
            label:
              "★ 3.0 ke atas",
            value:
              3,
          },
        ].map(
          (option) => (
            <label
              key={
                option.label
              }
            >

              <input
                type="radio"
                name="rating-filter"
                checked={
                  minimumRating ===
                  option.value
                }
                onChange={() =>
                  setMinimumRating(
                    option.value,
                  )
                }
              />

              <span
                className={
                  option.value
                    ? "search-filter-rating-label"
                    : undefined
                }
              >
                {option.label}
              </span>

            </label>
          ),
        )}

      </div>

    </>
  );


  return (
    <main className="search-results-page">

      <section className="search-results-hero">

        <div className="search-results-hero-overlay" />

        <div className="search-results-shell search-results-hero-content">

          <span>
            {category}
          </span>

          <h1>
            Temukan Paket {category}
            <br />
            Impian Anda
          </h1>

          <p>
            Pilih perjalanan terbaik
            sesuai kebutuhan Anda.
          </p>

        </div>

      </section>


      <section className="search-results-search-shell">

        <SearchEditBar
          category={category}
          initialOrigin={origin}
          initialDestination={destination}
          initialTravelers={travelers}
          initialDate={date}
        />

      </section>


      <div className="search-results-shell search-results-main">


        <aside className="search-filter">

          <FilterContent />

        </aside>


        <section className="search-results-content">


          <div className="search-results-heading">

            <div>

              <div className="search-breadcrumb">

                Beranda

                <ChevronRight size={12} />

                {category}

                <ChevronRight size={12} />

                Hasil Pencarian

              </div>


              <h2>
                Paket {category} dari {origin}
              </h2>


              <p>
                {filteredPackages.length} paket ditemukan
                {" · "}
                {destination}
                {" · "}
                {displayDate(date)}
                {" · "}
                {travelers} orang
              </p>

            </div>


            <button
              type="button"
              className="search-mobile-filter"
              onClick={() =>
                setMobileFilterOpen(
                  true,
                )
              }
            >

              <Filter size={17} />

              Filter

            </button>

          </div>


          <div className="search-sponsored-packages">

            {filteredSponsoredPackages.length > 0 && (

              <>
                <div className="search-sponsored-heading">
                  <div>

                    <strong>
                      Paket Pilihan dari Travel
                    </strong>
                  </div>
                </div>


                <div className="search-sponsored-grid">

                  {filteredSponsoredPackages.map(
                    (item) => (

                      <a
                        href={item.target}
                        className="search-sponsored-card"
                        key={item.id}
                      >

                        <div className="search-sponsored-image">

                          <img
                            src={item.image}
                            alt={item.title}
                          />

                          <span
                            className="search-sponsored-badge"
                            aria-label="Paket dipromosikan"
                            title="Paket dipromosikan"
                          >
                            <Sparkles size={14} />
                          </span>

                          <span className="search-sponsored-rating">
                            ★ {item.rating} ({item.reviews})
                          </span>

                        </div>


                        <div className="search-sponsored-body">

                          <small className="search-sponsored-travel">
                            {item.travel}
                          </small>

                          <h3>
                            {item.title}
                          </h3>

                          <p>
                            {item.location}
                          </p>

                          <div className="search-sponsored-meta">
                            <span>
                              {item.duration}
                            </span>

                            <span>
                              {item.promo}
                            </span>
                          </div>

                          <div className="search-sponsored-bottom">

                            <div>
                              <small>
                                Mulai dari
                              </small>

                              <strong>
                                {formatCurrency(
                                  item.price,
                                )}
                              </strong>
                            </div>

                            <span>
                              Lihat Paket
                              <ArrowRight size={14} />
                            </span>

                          </div>

                        </div>

                      </a>

                    ),
                  )}

                </div>
              </>

            )}

          </div>


          <div className="search-wide-promo">

            <div>
              <small>
                PROMO SPESIAL
              </small>

              <strong>
                Paket perjalanan pilihan Segaloka
              </strong>
            </div>

            <span>
              Diskon hingga 30%
            </span>

          </div>


          <div className="search-toolbar">

            <div className="search-sort-tabs">

              <button
                type="button"
                className={
                  sortMode ===
                  "relevant"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setSortMode(
                    "relevant",
                  )
                }
              >
                Semua ({filteredPackages.length})
              </button>


              <button
                type="button"
                className={
                  sortMode ===
                  "lowest"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setSortMode(
                    "lowest",
                  )
                }
              >
                Harga Terendah
              </button>


              <button
                type="button"
                className={
                  sortMode ===
                  "highest"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setSortMode(
                    "highest",
                  )
                }
              >
                Harga Tertinggi
              </button>


              <button
                type="button"
                className={
                  sortMode ===
                  "departure"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setSortMode(
                    "departure",
                  )
                }
              >
                Keberangkatan Terdekat
              </button>

            </div>


            <div className="search-view-toggle">

              <button
                type="button"
                className={
                  viewMode ===
                  "grid"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setViewMode(
                    "grid",
                  )
                }
              >

                <Grid2X2 size={15} />

                Grid

              </button>


              <button
                type="button"
                className={
                  viewMode ===
                  "list"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setViewMode(
                    "list",
                  )
                }
              >

                <List size={15} />

                List

              </button>

            </div>

          </div>


          {filteredPackages.length > 0 ? (

            <div
              className={[
                "search-reference-package-grid",
                viewMode === "list"
                  ? "is-list"
                  : "is-grid",
              ].join(" ")}
            >

              {filteredPackages.map(
                (item) => {

                  const categoryData =
                    categoryFor(item);

                  const Icon =
                    categoryData.Icon;

                  return (
                    <a
                      className="product-card reference-package-card"
                      href={`/paket/${item.id}`}
                      key={item.id}
                    >

                      <div className="reference-package-visual">

                        <img
                          src={item.image}
                          alt={item.title}
                          className="product-image"
                        />

                        <div className="reference-package-visual-overlay" />


                        <span className="reference-package-category">
                          {categoryData.label}
                        </span>


                        <span className="reference-package-travel-logo">
                          {item.travelLogo ? (
                            <img
                              src={item.travelLogo}
                              alt={item.travelName || "Travel"}
                            />
                          ) : (
                            <span className="reference-package-travel-placeholder">
                              {(item.travelName || "T")
                                .slice(0, 1)
                                .toUpperCase()}
                            </span>
                          )}
                        </span>


                        <span className="reference-package-rating">

                          <Star
                            size={12}
                            fill="currentColor"
                          />

                          {item.rating}
                          {" "}
                          ({item.reviews})

                        </span>

                      </div>


                      <div className="product-body reference-package-body">

                        <span className="product-location">
                          {item.location}
                        </span>


                        <h3>
                          {item.title}
                        </h3>


                        <div className="reference-package-meta">

                          <span>
                            {item.duration ??
                              "Durasi tersedia"}
                          </span>

                          <span>
                            ·{" "}
                            {
                              item.location.split(
                                " · ",
                              )[0]
                            }
                          </span>

                        </div>


                        <div className="reference-package-availability">

                          <span />

                          {item.duration
                            ? `${item.duration} perjalanan`
                            : item.location}

                        </div>


                        <div className="search-result-extra-meta">

                          <span>
                            {
                              packageMeta[
                                item.id
                              ]?.airline ||
                              "Maskapai tersedia"
                            }
                          </span>

                          <span>
                            {
                              packageMeta[
                                item.id
                              ]?.departure
                                ? displayDate(
                                    packageMeta[
                                      item.id
                                    ].departure,
                                  )
                                : "Jadwal tersedia"
                            }
                          </span>

                        </div>


                        <div className="product-price">

                          <small>
                            HARGA
                          </small>

                          <strong>
                            {formatCurrency(
                              item.price,
                            )}
                          </strong>

                          <span className="reference-package-arrow">

                            <ArrowRight size={15} />

                          </span>

                        </div>

                      </div>

                    </a>
                  );
                },
              )}

            </div>

          ) : (

            <div className="search-empty-state">

              <div className="search-empty-icon">
                <Search size={24} />
              </div>

              <h3>
                Paket belum ditemukan
              </h3>

              <p>
                Coba ubah filter pencarian atau reset filter untuk melihat pilihan lainnya.
              </p>

              <button
                type="button"
                onClick={resetFilters}
              >
                Reset Filter
              </button>

            </div>

          )}

        </section>

      </div>


      {mobileFilterOpen && (

        <div className="search-filter-drawer-backdrop">

          <div className="search-filter-drawer">

            <div className="search-filter-drawer-head">

              <strong>
                Filter Pencarian
              </strong>

              <button
                type="button"
                aria-label="Tutup filter"
                onClick={() =>
                  setMobileFilterOpen(
                    false,
                  )
                }
              >

                <X size={20} />

              </button>

            </div>


            <div className="search-filter-drawer-body">

              <FilterContent />

            </div>


            <div className="search-filter-drawer-footer">

              <button
                type="button"
                onClick={() => {
                  resetFilters();
                }}
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() =>
                  setMobileFilterOpen(
                    false,
                  )
                }
              >
                Tampilkan {filteredPackages.length} Paket
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}