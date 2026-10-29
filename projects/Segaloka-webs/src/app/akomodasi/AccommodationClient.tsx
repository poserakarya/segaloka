"use client";

import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  List,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Users,
  Minus,
  Plus,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  accommodationProducts,
  type AccommodationProduct,
} from "@/data/accommodations";

type ViewMode = "grid" | "list";


const destinationOptions = [
  "Semua",
  "Arab Saudi",
  "Turki",
  "Uni Emirat Arab",
  "Mesir",
  "Malaysia",
  "Indonesia",
];

const popularDestinations = [
  {
    city: "Makkah",
    country: "Arab Saudi",
    duration: "9 Hari",
    image: "/images/la/makkah.jpg",
  },
  {
    city: "Madinah",
    country: "Arab Saudi",
    duration: "9 Hari",
    image: "/images/la/madinah.jpg",
  },
  {
    city: "Istanbul",
    country: "Turki",
    duration: "7 Hari",
    image: "/images/la/istanbul.jpg",
  },
  {
    city: "Dubai",
    country: "Uni Emirat Arab",
    duration: "5 Hari",
    image: "/images/la/dubai.jpg",
  },
  {
    city: "Kairo",
    country: "Mesir",
    duration: "6 Hari",
    image: "/images/la/cairo.jpg",
  },
  {
    city: "Kuala Lumpur",
    country: "Malaysia",
    duration: "4 Hari",
    image: "/images/la/kuala-lumpur.jpg",
  },
  {
    city: "Bali",
    country: "Indonesia",
    duration: "4 Hari",
    image: "/images/la/pulau-nusa.jpg",
  },
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function ImageWithFallback({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={[
          "accommodation-image-fallback",
          className ?? "",
        ].join(" ")}
        aria-label={alt}
      >
        <Building2 size={28} />
        <span>{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export default function AccommodationClient() {
  const [destination, setDestination] = useState("Semua");
  const [keyword, setKeyword] = useState("");
  const [adult, setAdult] = useState(2);
  const [child, setChild] = useState(0);
  const [infant, setInfant] = useState(0);
  const [openSearchPanel, setOpenSearchPanel] = useState<
    "destination" | "date" | "traveler" | null
  >(null);
  const [destinationQuery, setDestinationQuery] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [travelDate, setTravelDate] = useState("");
  const [maxPrice, setMaxPrice] = useState(15000000);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<
    Array<AccommodationProduct["providerType"]>
  >([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [sort, setSort] = useState("recommended");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showMoreDestinations, setShowMoreDestinations] = useState(false);

  const toggleRating = (rating: number) => {
    setSelectedRatings((current) =>
      current.includes(rating)
        ? current.filter((item) => item !== rating)
        : [...current, rating],
    );
  };

  const toggleProvider = (provider: AccommodationProduct["providerType"]) => {
    setSelectedProviders((current) =>
      current.includes(provider)
        ? current.filter((item) => item !== provider)
        : [...current, provider],
    );
  };

  const toggleFacility = (facility: string) => {
    setSelectedFacilities((current) =>
      current.includes(facility)
        ? current.filter((item) => item !== facility)
        : [...current, facility],
    );
  };

  const totalTraveler = adult + child + infant;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatAccommodationDate = (value: string) => {
    if (!value) return "Pilih tanggal";

    const [year, month, day] = value.split("-").map(Number);

    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  };

  const toDateValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getCalendarDays = (month: Date) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);

    const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
    const cells: Array<Date | null> = [];

    for (let i = 0; i < mondayFirstOffset; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      cells.push(new Date(year, monthIndex, day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  };

  const calendarDays = getCalendarDays(calendarMonth);

  const calendarMonthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(calendarMonth);

  const goToPreviousMonth = () => {
    const previous = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() - 1,
      1,
    );

    const currentMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );

    if (previous < currentMonth) return;

    setCalendarMonth(previous);
  };

  const goToNextMonth = () => {
    setCalendarMonth(
      new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() + 1,
        1,
      ),
    );
  };
  const resetFilters = () => {
    setDestination("Semua");
    setKeyword("");
    setAdult(2);
    setChild(0);
    setInfant(0);
    setOpenSearchPanel(null);
    setDestinationQuery("");
    setTravelDate("");
    setMaxPrice(15000000);
    setSelectedRatings([]);
    setSelectedProviders([]);
    setSelectedFacilities([]);
    setSort("recommended");
  };

  const scrollToResults = () => {
    window.requestAnimationFrame(() => {
      document
        .getElementById("hasil-akomodasi")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSearch = () => {
    scrollToResults();
  };

  const scrollPopular = (direction: "left" | "right") => {
    const rail = document.querySelector<HTMLElement>(
      ".accommodation-popular-rail",
    );

    rail?.scrollBy({
      left: direction === "right" ? 420 : -420,
      behavior: "smooth",
    });
  };

  const filteredItems = useMemo(() => {
    const query = keyword.trim().toLowerCase();

    const result = accommodationProducts.filter((item) => {
      const matchesDestination =
        destination === "Semua" || item.country === destination;

      const matchesKeyword =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.city.toLowerCase().includes(query) ||
        item.country.toLowerCase().includes(query) ||
        item.providerName.toLowerCase().includes(query) ||
        item.includes.some((facility) =>
          facility.toLowerCase().includes(query),
        );

      const matchesPrice = item.price <= maxPrice;

      const matchesRating =
        selectedRatings.length === 0 ||
        selectedRatings.some(
          (rating) => item.rating >= rating && item.rating < rating + 1,
        );

      const matchesProvider =
        selectedProviders.length === 0 ||
        selectedProviders.includes(item.providerType);

      const matchesFacilities =
        selectedFacilities.length === 0 ||
        selectedFacilities.every((facility) =>
          item.includes.some(
            (itemFacility) =>
              itemFacility.toLowerCase() === facility.toLowerCase(),
          ),
        );

      return (
        matchesDestination &&
        matchesKeyword &&
        matchesPrice &&
        matchesRating &&
        matchesProvider &&
        matchesFacilities
      );
    });

    return [...result].sort((a, b) => {
      if (sort === "lowest") return a.price - b.price;
      if (sort === "highest") return b.price - a.price;
      if (sort === "rating") return b.rating - a.rating;

      return b.rating * b.reviews - a.rating * a.reviews;
    });
  }, [
    destination,
    keyword,
    maxPrice,
    selectedRatings,
    selectedProviders,
    selectedFacilities,
    sort,
  ]);

  return (
    <main className="accommodation-page">
      <section className="accommodation-hero">
        <div className="accommodation-container accommodation-hero-inner">
          <div className="accommodation-breadcrumb">
            Beranda
            <ChevronRight size={12} />
            <span>Akomodasi</span>
          </div>

          <div className="accommodation-hero-copy">
            <span className="accommodation-eyebrow">
              Akomodasi & Land Arrangement
            </span>

            <h1>
              Temukan Akomodasi & Land Arrangement
              <br />
              di Berbagai Destinasi
            </h1>

            <p>
              Pilihan akomodasi dan layanan darat untuk melengkapi
              perjalanan Anda.
            </p>
          </div>

          <div className="accommodation-search">
            {/* TUJUAN */}
            <div className="accommodation-search-control accommodation-search-control-destination">
              <button
                type="button"
                className="accommodation-search-field accommodation-search-trigger"
                onClick={() =>
                  setOpenSearchPanel((current) =>
                    current === "destination" ? null : "destination",
                  )
                }
              >
                <span>Tujuan</span>

                <div className="accommodation-search-value">
                  <MapPin size={18} />

                  <strong>
                    {destination === "Semua"
                      ? "Cari negara atau kota..."
                      : destination}
                  </strong>

                  <ChevronDown size={14} />
                </div>
              </button>

              {openSearchPanel === "destination" && (
                <div className="accommodation-search-popover accommodation-destination-popover">
                  <div className="accommodation-popover-title">
                    <strong>Pilih Tujuan</strong>

                    <button
                      type="button"
                      aria-label="Tutup"
                      onClick={() => setOpenSearchPanel(null)}
                    >
                      <X size={17} />
                    </button>
                  </div>

                  <label className="accommodation-popover-search">
                    <Search size={16} />

                    <input
                      type="text"
                      value={destinationQuery}
                      placeholder="Cari negara atau kota..."
                      onChange={(event) =>
                        setDestinationQuery(event.target.value)
                      }
                      autoFocus
                    />
                  </label>

                  <div className="accommodation-destination-options">
                    {destinationOptions
                      .filter((option) => {
                        const query = destinationQuery
                          .trim()
                          .toLowerCase();

                        if (!query) return true;

                        return option
                          .toLowerCase()
                          .includes(query);
                      })
                      .map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={
                            destination === option
                              ? "is-selected"
                              : undefined
                          }
                          onClick={() => {
                            setDestination(option);
                            setDestinationQuery("");
                            setOpenSearchPanel(null);
                          }}
                        >
                          <MapPin size={15} />

                          <span>
                            {option === "Semua"
                              ? "Semua Destinasi"
                              : option}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* TANGGAL */}
            <div className="accommodation-search-control accommodation-search-control-date">
              <button
                type="button"
                className="accommodation-search-field accommodation-search-trigger"
                onClick={() => {
                  if (openSearchPanel !== "date") {
                    if (travelDate) {
                      const [year, month] = travelDate
                        .split("-")
                        .map(Number);

                      setCalendarMonth(
                        new Date(year, month - 1, 1),
                      );
                    } else {
                      const now = new Date();

                      setCalendarMonth(
                        new Date(
                          now.getFullYear(),
                          now.getMonth(),
                          1,
                        ),
                      );
                    }
                  }

                  setOpenSearchPanel((current) =>
                    current === "date" ? null : "date",
                  );
                }}
              >
                <span>Tanggal Perjalanan</span>

                <div className="accommodation-search-value">
                  <CalendarDays size={18} />

                  <strong>
                    {formatAccommodationDate(travelDate)}
                  </strong>

                  <ChevronDown size={14} />
                </div>
              </button>

              {openSearchPanel === "date" && (
                <div className="accommodation-search-popover accommodation-date-popover">
                  <div className="accommodation-calendar-header">
                    <button
                      type="button"
                      aria-label="Bulan sebelumnya"
                      onClick={goToPreviousMonth}
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <strong>{calendarMonthLabel}</strong>

                    <button
                      type="button"
                      aria-label="Bulan berikutnya"
                      onClick={goToNextMonth}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="accommodation-calendar-weekdays">
                    {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(
                      (day) => (
                        <span key={day}>{day}</span>
                      ),
                    )}
                  </div>

                  <div className="accommodation-calendar-grid">
                    {calendarDays.map((date, index) => {
                      if (!date) {
                        return (
                          <span
                            key={`empty-${index}`}
                            className="accommodation-calendar-empty"
                          />
                        );
                      }

                      const value = toDateValue(date);
                      const disabled = date < today;
                      const selected = travelDate === value;

                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={disabled}
                          className={
                            selected ? "is-selected" : undefined
                          }
                          onClick={() => {
                            setTravelDate(value);
                            setOpenSearchPanel(null);
                          }}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* TRAVELER */}
            <div className="accommodation-search-control accommodation-search-control-traveler">
              <button
                type="button"
                className="accommodation-search-field accommodation-search-trigger"
                onClick={() =>
                  setOpenSearchPanel((current) =>
                    current === "traveler" ? null : "traveler",
                  )
                }
              >
                <span>Traveler</span>

                <div className="accommodation-search-value">
                  <Users size={18} />

                  <strong>{totalTraveler} orang</strong>

                  <ChevronDown size={14} />
                </div>
              </button>

              {openSearchPanel === "traveler" && (
                <div className="accommodation-search-popover accommodation-traveler-popover">
                  <div className="accommodation-popover-title">
                    <strong>Traveler</strong>

                    <button
                      type="button"
                      aria-label="Tutup"
                      onClick={() => setOpenSearchPanel(null)}
                    >
                      <X size={17} />
                    </button>
                  </div>

                  <div className="accommodation-traveler-row">
                    <div>
                      <strong>Dewasa</strong>
                      <small>12 tahun ke atas</small>
                    </div>

                    <div className="accommodation-traveler-stepper">
                      <button
                        type="button"
                        disabled={adult <= 1}
                        onClick={() =>
                          setAdult((current) =>
                            Math.max(1, current - 1),
                          )
                        }
                      >
                        <Minus size={16} />
                      </button>

                      <strong>{adult}</strong>

                      <button
                        type="button"
                        onClick={() =>
                          setAdult((current) =>
                            Math.min(20, current + 1),
                          )
                        }
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="accommodation-traveler-row">
                    <div>
                      <strong>Anak</strong>
                      <small>2 - 11 tahun</small>
                    </div>

                    <div className="accommodation-traveler-stepper">
                      <button
                        type="button"
                        disabled={child <= 0}
                        onClick={() =>
                          setChild((current) =>
                            Math.max(0, current - 1),
                          )
                        }
                      >
                        <Minus size={16} />
                      </button>

                      <strong>{child}</strong>

                      <button
                        type="button"
                        onClick={() =>
                          setChild((current) =>
                            Math.min(20, current + 1),
                          )
                        }
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="accommodation-traveler-row">
                    <div>
                      <strong>Bayi</strong>
                      <small>Di bawah 2 tahun</small>
                    </div>

                    <div className="accommodation-traveler-stepper">
                      <button
                        type="button"
                        disabled={infant <= 0}
                        onClick={() =>
                          setInfant((current) =>
                            Math.max(0, current - 1),
                          )
                        }
                      >
                        <Minus size={16} />
                      </button>

                      <strong>{infant}</strong>

                      <button
                        type="button"
                        onClick={() =>
                          setInfant((current) =>
                            Math.min(20, current + 1),
                          )
                        }
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="accommodation-traveler-done"
                    onClick={() => setOpenSearchPanel(null)}
                  >
                    Selesai
                  </button>
                </div>
              )}
            </div>

            {/* SEARCH */}
            <button
              type="button"
              className="accommodation-search-button"
              onClick={() => {
                setOpenSearchPanel(null);
                handleSearch();
              }}
            >
              <Search size={18} />
              Cari Akomodasi
            </button>
          </div>
        </div>
      </section>

      <section className="accommodation-main">
        <div className="accommodation-container">
          <section className="accommodation-popular">
            <div className="accommodation-section-heading">
              <div>
                <h2>Destinasi Populer</h2>
                <p>
                  Pilihan destinasi Land Arrangement yang banyak dicari.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDestination("Semua");
                  setKeyword("");
                  setShowMoreDestinations(true);
                  scrollToResults();
                }}
              >
                Lihat Semua Destinasi
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="accommodation-popular-wrap">
              <button
                type="button"
                className="accommodation-rail-arrow accommodation-rail-arrow-left"
                onClick={() => scrollPopular("left")}
                aria-label="Sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="accommodation-popular-rail">
                {popularDestinations.map((item) => (
                  <button
                    type="button"
                    key={`${item.city}-${item.country}`}
                    className="accommodation-destination-card"
                    onClick={() => {
                      if (
                        destinationOptions.includes(item.country)
                      ) {
                        setDestination(item.country);
                        setKeyword(item.city);
                        scrollToResults();
                      }
                    }}
                  >
                    <div className="accommodation-destination-image">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.city}
                      />

                      <span>{item.duration}</span>
                    </div>

                    <strong>{item.city}</strong>
                    <small>{item.country}</small>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="accommodation-rail-arrow accommodation-rail-arrow-right"
                onClick={() => scrollPopular("right")}
                aria-label="Berikutnya"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </section>

          <a
            href="#hasil-akomodasi"
            className="accommodation-promo-banner"
          >
            <div>
              <span>Segaloka LA</span>

              <strong>
                Land Arrangement untuk perjalanan yang lebih praktis
              </strong>

              <small>
                Temukan pilihan layanan dari Travel dan Vendor.
              </small>
            </div>

            <span className="accommodation-promo-cta">
              Lihat Pilihan
              <ChevronRight size={14} />
            </span>
          </a>

          <div className="accommodation-category-bar">
            <div className="accommodation-category-scroll">
              {destinationOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={
                    destination === option ? "active" : undefined
                  }
                  onClick={() => setDestination(option)}
                >
                  {option === "Semua" ? "Semua" : option}
                </button>
              ))}

              <button
                type="button"
                className={showMoreDestinations ? "active" : undefined}
                onClick={() => setShowMoreDestinations((current) => !current)}
                aria-expanded={showMoreDestinations}
              >
                {showMoreDestinations ? "Tutup" : "Lainnya"}
                <ChevronDown size={12} />
              </button>
            </div>

            <div className="accommodation-view-actions">
              <label className="accommodation-sort">
                <SlidersHorizontal size={15} />

                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label="Urutkan akomodasi"
                >
                  <option value="recommended">Paling Relevan</option>
                  <option value="lowest">Harga Terendah</option>
                  <option value="highest">Harga Tertinggi</option>
                  <option value="rating">Rating Tertinggi</option>
                </select>

                <ChevronDown size={13} />
              </label>

              <div className="accommodation-view-switch">
                <button
                  type="button"
                  className={viewMode === "grid" ? "active" : undefined}
                  onClick={() => setViewMode("grid")}
                >
                  <Grid2X2 size={15} />
                  Grid
                </button>

                <button
                  type="button"
                  className={viewMode === "list" ? "active" : undefined}
                  onClick={() => setViewMode("list")}
                >
                  <List size={16} />
                  List
                </button>
              </div>
            </div>
          </div>

          <div
            className="accommodation-layout"
            id="hasil-akomodasi"
          >
            <aside className="accommodation-sidebar">
              <div className="accommodation-filter-title">
                <strong>Filter Pencarian</strong>

                <button
                  type="button"
                  onClick={resetFilters}
                >
                  Reset
                </button>
              </div>

              <div className="accommodation-filter-group accommodation-filter-first">
                <strong>Lokasi</strong>

                <label className="accommodation-keyword">
                  <Search size={15} />

                  <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Cari negara atau kota..."
                    aria-label="Cari negara atau kota"
                  />
                </label>

                {destinationOptions.map((option) => (
                  <label key={option}>
                    <input
                      type="radio"
                      name="destination"
                      checked={destination === option}
                      onChange={() => setDestination(option)}
                    />

                    <span>
                      {option === "Semua"
                        ? "Semua Negara"
                        : option}
                    </span>
                  </label>
                ))}
              </div>

              <div className="accommodation-filter-group">
                <strong>Harga</strong>

                <input
                  className="accommodation-range"
                  type="range"
                  min="500000"
                  max="15000000"
                  step="250000"
                  value={maxPrice}
                  onChange={(event) =>
                    setMaxPrice(Number(event.target.value))
                  }
                  aria-label="Harga maksimum"
                />

                <div className="accommodation-range-labels">
                  <span>Rp500 rb</span>
                  <span>Rp15 jt+</span>
                </div>
              </div>

              <div className="accommodation-filter-group">
                <strong>Rating Tamu</strong>

                {[5, 4, 3].map((rating) => (
                  <label key={rating}>
                    <input
                      type="checkbox"
                      checked={selectedRatings.includes(rating)}
                      onChange={() => toggleRating(rating)}
                    />

                    <span className="accommodation-stars">
                      {"★".repeat(rating)}
                    </span>

                    <span>{rating} bintang</span>
                  </label>
                ))}
              </div>

              <div className="accommodation-filter-group">
                <strong>Jenis Penyedia</strong>

                <label>
                  <input
                    type="checkbox"
                    checked={selectedProviders.includes("Travel")}
                    onChange={() => toggleProvider("Travel")}
                  />
                  <span>Travel</span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={selectedProviders.includes("Vendor")}
                    onChange={() => toggleProvider("Vendor")}
                  />
                  <span>Vendor</span>
                </label>
              </div>

              <div className="accommodation-filter-group">
                <strong>Fasilitas</strong>

                {[
                  "Hotel",
                  "Transportasi",
                  "Visa",
                  "Guide",
                  "Konsumsi",
                ].map((facility) => (
                  <label key={facility}>
                    <input
                      type="checkbox"
                      checked={selectedFacilities.includes(facility)}
                      onChange={() => toggleFacility(facility)}
                    />
                    <span>{facility}</span>
                  </label>
                ))}
              </div>
            </aside>

            <section className="accommodation-results">
              <div className="accommodation-results-heading">
                <div>
                  <h2>Akomodasi & LA</h2>
                  <p>
                    {filteredItems.length} pilihan tersedia
                  </p>
                </div>
              </div>

              {filteredItems.length > 0 ? (
                <div
                  className={[
                    "accommodation-grid",
                    viewMode === "list"
                      ? "accommodation-grid-list"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {filteredItems.map((item) => (
                    <a
                      key={item.slug}
                      href={`/akomodasi/${item.slug}`}
                      className="accommodation-card"
                    >
                      <div className="accommodation-card-media">
                        <ImageWithFallback
                          src={item.image}
                          alt={item.title}
                        />

                        {item.badge && (
                          <span className="accommodation-card-badge">
                            {item.badge}
                          </span>
                        )}

                        <span className="accommodation-duration">
                          {item.duration}
                        </span>
                      </div>

                      <div className="accommodation-card-body">
                        <span className="accommodation-location">
                          <MapPin size={12} />
                          {item.city} · {item.country}
                        </span>

                        <h3>{item.title}</h3>

                        <p>{item.subtitle}</p>

                        <div className="accommodation-includes">
                          {item.includes.slice(0, 4).map((facility) => (
                            <span key={facility}>
                              {facility}
                            </span>
                          ))}
                        </div>

                        <div className="accommodation-provider-row">
                          <div className="accommodation-provider-icon">
                            <Building2 size={15} />
                          </div>

                          <div className="accommodation-provider">
                            <small>{item.providerType}</small>
                            <strong>{item.providerName}</strong>
                          </div>

                          <div className="accommodation-rating">
                            <Star
                              size={13}
                              fill="currentColor"
                            />

                            <strong>{item.rating}</strong>
                            <span>({item.reviews})</span>
                          </div>
                        </div>

                        <div className="accommodation-price-row">
                          <div>
                            <small>Mulai dari</small>

                            <strong>
                              {formatRupiah(item.price)}
                            </strong>

                            <span>/ pax</span>
                          </div>

                          <span className="accommodation-view">
                            Lihat Detail
                            <ChevronRight size={13} />
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="accommodation-empty">
                  <Search size={27} />

                  <strong>Akomodasi belum ditemukan</strong>

                  <p>
                    Coba ubah lokasi atau kata kunci pencarian.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}