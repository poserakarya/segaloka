"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  Search,
  UsersRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  useMarketplacePreferences,
} from "@/components/providers/MarketplacePreferencesProvider";

type Props = {
  category: string;
  initialOrigin: string;
  initialDestination: string;
  initialTravelers: string;
  initialDate: string;
  initialYear: string;
};

type Panel =
  | "origin"
  | "destination"
  | "traveler"
  | "date"
  | null;

type TravelerState = {
  adult: number;
  child: number;
  infant: number;
};

const origins = [
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
];

const categoryOptions: Record<string, string[]> = {
  Umrah: [
    "Makkah",
    "Madinah",
    "Makkah & Madinah",
  ],

  Haji: [
    "Makkah",
    "Madinah",
    "Makkah & Madinah",
  ],

  "Halal Tour": [
    "Turkiye",
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

  "Tour Domestic": [
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

  "Tour International": [
    "Malaysia",
    "Singapura",
    "Thailand",
    "Vietnam",
    "Jepang",
    "Korea Selatan",
    "Tiongkok",
    "Hong Kong",
    "Turkiye",
    "Uni Emirat Arab",
    "Australia",
    "Eropa",
  ],

  SegaDeals: [
    "Umrah",
    "Haji",
    "Halal Tour",
    "Tour Domestic",
    "Tour International",
  ],
};

const copy = {
  ID: {
    from: "Dari",
    destination: "Tujuan",
    umrahDestination: "Tujuan Umrah",
    date: "Tanggal",
    traveler: "Traveler",
    search: "Cari",

    originTitle: "Pilih Kota atau Bandara",
    originPlaceholder: "Masukkan nama kota atau bandara...",
    popularDestination: "Destinasi Populer",

    destinationTitle: "Pilih Tujuan",
    destinationPlaceholder: "Cari negara tujuan...",
    chooseDestination: "Pilih tujuan",

    dateTitle: "Atur Tanggal",
    chooseDate: "Pilih tanggal",

    travelerTitle: "Atur Traveler",
    travelerDescription: "Tentukan jumlah traveler",

    adult: "Dewasa",
    adultDescription: "Usia 12 tahun ke atas",

    child: "Anak",
    childDescription: "Usia 2–11 tahun",

    infant: "Bayi",
    infantDescription: "Di bawah 2 tahun",

    person: "orang",
    done: "Selesai",

    weekdays: [
      "Min",
      "Sen",
      "Sel",
      "Rab",
      "Kam",
      "Jum",
      "Sab",
    ],

    months: [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ],
  },

  EN: {
    from: "From",
    destination: "Destination",
    umrahDestination: "Umrah Destination",
    date: "Date",
    traveler: "Traveler",
    search: "Search",

    originTitle: "Choose City or Airport",
    originPlaceholder: "Enter city or airport name...",
    popularDestination: "Popular Destinations",

    destinationTitle: "Choose Destination",
    destinationPlaceholder: "Search destination...",
    chooseDestination: "Choose destination",

    dateTitle: "Set Date",
    chooseDate: "Choose date",

    travelerTitle: "Set Travelers",
    travelerDescription: "Choose number of travelers",

    adult: "Adult",
    adultDescription: "12 years and above",

    child: "Child",
    childDescription: "2–11 years",

    infant: "Infant",
    infantDescription: "Under 2 years",

    person: "people",
    done: "Done",

    weekdays: [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ],

    months: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
  },

  AR: {
    from: "من",
    destination: "الوجهة",
    umrahDestination: "وجهة العمرة",
    date: "التاريخ",
    traveler: "المسافرون",
    search: "بحث",

    originTitle: "اختر المدينة أو المطار",
    originPlaceholder: "أدخل اسم المدينة أو المطار...",
    popularDestination: "الوجهات الشائعة",

    destinationTitle: "اختر الوجهة",
    destinationPlaceholder: "ابحث عن الوجهة...",
    chooseDestination: "اختر الوجهة",

    dateTitle: "حدد التاريخ",
    chooseDate: "اختر التاريخ",

    travelerTitle: "حدد المسافرين",
    travelerDescription: "حدد عدد المسافرين",

    adult: "بالغ",
    adultDescription: "12 سنة فما فوق",

    child: "طفل",
    childDescription: "من 2 إلى 11 سنة",

    infant: "رضيع",
    infantDescription: "أقل من سنتين",

    person: "مسافر",
    done: "تم",

    weekdays: [
      "أحد",
      "اثن",
      "ثلا",
      "أرب",
      "خمي",
      "جمع",
      "سبت",
    ],

    months: [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ],
  },
} as const;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateValue(
  year: number,
  month: number,
  day: number,
) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseDateValue(value: string) {
  if (!value) {
    return null;
  }

  const parts = value
    .split("-")
    .map(Number);

  if (parts.length !== 3) {
    return null;
  }

  const [year, month, day] = parts;

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day,
  );
}

function sameDay(
  first: Date,
  second: Date,
) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function buildMonthDays(
  year: number,
  month: number,
) {
  const firstDay =
    new Date(
      year,
      month,
      1,
    ).getDay();

  const totalDays =
    new Date(
      year,
      month + 1,
      0,
    ).getDate();

  const result: Array<number | null> = [];

  for (
    let index = 0;
    index < firstDay;
    index += 1
  ) {
    result.push(null);
  }

  for (
    let day = 1;
    day <= totalDays;
    day += 1
  ) {
    result.push(day);
  }

  while (
    result.length % 7 !== 0
  ) {
    result.push(null);
  }

  return result;
}

export function SearchEditBar({
  category,
  initialOrigin,
  initialDestination,
  initialTravelers,
  initialDate,
  initialYear,
}: Props) {
  const router = useRouter();

  const {
    language,
    locale,
    direction,
  } = useMarketplacePreferences();

  const t = copy[language];
  // SEGALOKA_HAJI_YEAR_UI_V1
  const isHaji = category.trim().toLowerCase() === "haji";
  const hajiYearLabel = language === "EN" ? "Hajj Year" : language === "AR" ? "Ø³Ù†Ø© Ø§Ù„Ø­Ø¬" : "Tahun Haji";
  const hajiYearTitle = language === "EN" ? "Choose Hajj Year" : language === "AR" ? "Ø§Ø®ØªØ± Ø³Ù†Ø© Ø§Ù„Ø­Ø¬" : "Pilih Tahun Haji";
  const hajiYearPassed = language === "EN" ? "Passed" : language === "AR" ? "Ø§Ù†ØªÙ‡Ù‰" : "Lewat";

  const rootRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [panel, setPanel] =
    useState<Panel>(null);

  const [origin, setOrigin] =
    useState(
      initialOrigin || "Jakarta",
    );

  const [
    originQuery,
    setOriginQuery,
  ] = useState("");

  const [
    destination,
    setDestination,
  ] = useState(
    initialDestination || "",
  );

  const [
    destinationQuery,
    setDestinationQuery,
  ] = useState("");

  const initialTravelerTotal =
    Math.max(
      1,
      Number(
        initialTravelers || 2,
      ),
    );

  const [
    travelers,
    setTravelers,
  ] = useState<TravelerState>({
    adult: initialTravelerTotal,
    child: 0,
    infant: 0,
  });

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    initialDate || "",
  );

  const [selectedHajiYear, setSelectedHajiYear] = useState<number | null>(() => {
    const parsed = Number(initialYear);
    return /^\d{4}$/.test(initialYear) && Number.isInteger(parsed) ? parsed : null;
  });

  useEffect(() => {
    const parsed = Number(initialYear);
    setSelectedHajiYear(/^\d{4}$/.test(initialYear) && Number.isInteger(parsed) ? parsed : null);
  }, [initialYear]);

  const currentHajiYear = new Date().getFullYear();
  const hajiYears = Array.from({ length: 6 }, (_, index) => currentHajiYear + index);
  const isValidHajiYear = (value: number | null) =>
    value !== null && hajiYears.includes(value) && value !== 2026;

  const parsedInitialDate =
    parseDateValue(
      initialDate,
    );

  const today = new Date();

  const [
    calendarMonth,
    setCalendarMonth,
  ] = useState(
    parsedInitialDate
      ? new Date(
          parsedInitialDate.getFullYear(),
          parsedInitialDate.getMonth(),
          1,
        )
      : new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        ),
  );

  useEffect(() => {
    function handlePointerDown(
      event: PointerEvent,
    ) {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node,
        )
      ) {
        setPanel(null);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape"
      ) {
        setPanel(null);
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, []);

  useEffect(() => {
    setDestination(
      initialDestination || "",
    );
  }, [
    category,
    initialDestination,
  ]);

  const destinationOptions =
    useMemo(
      () =>
        categoryOptions[
          category
        ] || [],
      [category],
    );

  const filteredOrigins =
    useMemo(() => {
      const query =
        originQuery
          .trim()
          .toLowerCase();

      if (!query) {
        return origins;
      }

      return origins.filter(
        (value) =>
          value
            .toLowerCase()
            .includes(query),
      );
    }, [originQuery]);

  const filteredDestinations =
    useMemo(() => {
      const query =
        destinationQuery
          .trim()
          .toLowerCase();

      if (!query) {
        return destinationOptions;
      }

      return destinationOptions.filter(
        (value) =>
          value
            .toLowerCase()
            .includes(query),
      );
    }, [
      destinationOptions,
      destinationQuery,
    ]);

  const travelerTotal =
    travelers.adult +
    travelers.child +
    travelers.infant;

  const canSearch =
    origin.trim().length > 0 &&
    destination.trim().length > 0 &&
    travelerTotal > 0 &&
    (isHaji ? isValidHajiYear(selectedHajiYear) : selectedDate.length > 0);

  function togglePanel(
    nextPanel: Exclude<
      Panel,
      null
    >,
  ) {
    setPanel(
      panel === nextPanel
        ? null
        : nextPanel,
    );
  }

  function updateTraveler(
    key: keyof TravelerState,
    delta: number,
  ) {
    setTravelers(
      (current) => {
        const next = {
          ...current,
          [key]: Math.max(
            0,
            current[key] + delta,
          ),
        };

        if (
          next.adult +
            next.child +
            next.infant ===
          0
        ) {
          return current;
        }

        return next;
      },
    );
  }

  function formatSelectedDate() {
    if (!selectedDate) {
      return t.chooseDate;
    }

    const parsed =
      parseDateValue(
        selectedDate,
      );

    if (!parsed) {
      return selectedDate;
    }

    return new Intl.DateTimeFormat(
      locale,
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      },
    ).format(parsed);
  }

  function submitSearch() {
    if (!canSearch) {
      return;
    }

    const params =
      new URLSearchParams();

    if (category) {
      params.set(
        "category",
        category,
      );
    }

    params.set(
      "origin",
      origin,
    );

    params.set(
      "destination",
      destination,
    );

    params.set(
      "travelers",
      String(travelerTotal),
    );

    params.set(
      "adult",
      String(travelers.adult),
    );

    params.set(
      "child",
      String(travelers.child),
    );

    params.set(
      "infant",
      String(travelers.infant),
    );

    if (isHaji) {
      params.set("year", String(selectedHajiYear));
    } else {
      params.set("date", selectedDate);
    }

    setPanel(null);

    router.push(
      `/search?${params.toString()}`,
    );
  }

  const currentYear =
    calendarMonth.getFullYear();

  const currentMonth =
    calendarMonth.getMonth();

  const nextMonth =
    new Date(
      currentYear,
      currentMonth + 1,
      1,
    );

  const monthOneDays =
    buildMonthDays(
      currentYear,
      currentMonth,
    );

  const monthTwoDays =
    buildMonthDays(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
    );

  const selectedDateObject =
    parseDateValue(
      selectedDate,
    );

  function renderMonth(
    year: number,
    month: number,
    days: Array<number | null>,
  ) {
    return (
      <div className="search-unified-calendar-month">
        <strong className="search-unified-calendar-month-title">
          {t.months[month]} {year}
        </strong>

        <div className="search-unified-calendar-weekdays">
          {t.weekdays.map(
            (weekday, index) => (
              <span
                key={`${weekday}-${index}`}
                className={
                  index === 0
                    ? "is-sunday"
                    : undefined
                }
              >
                {weekday}
              </span>
            ),
          )}
        </div>

        <div className="search-unified-calendar-days">
          {days.map(
            (day, index) => {
              if (!day) {
                return (
                  <span
                    key={`blank-${index}`}
                    className="is-empty"
                  />
                );
              }

              const value =
                new Date(
                  year,
                  month,
                  day,
                );

              const normalizedToday =
                new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  today.getDate(),
                );

              const disabled =
                value <
                normalizedToday;

              const active =
                selectedDateObject
                  ? sameDay(
                      value,
                      selectedDateObject,
                    )
                  : false;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  className={
                    active
                      ? "is-active"
                      : undefined
                  }
                  onClick={() => {
                    setSelectedDate(
                      toDateValue(
                        year,
                        month,
                        day,
                      ),
                    );

                    setPanel(null);
                  }}
                >
                  {day}
                </button>
              );
            },
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="search-edit-bar search-unified-bar"
      dir={direction}
    >
      <div className="search-edit-control">
        <button
          type="button"
          className="search-edit-field"
          aria-expanded={
            panel === "origin"
          }
          onClick={() =>
            togglePanel("origin")
          }
        >
          <MapPin size={18} />

          <span>
            <small>
              {t.from}
            </small>

            <strong>
              {origin}
            </strong>
          </span>
        </button>

        {panel === "origin" && (
          <div className="search-edit-dropdown search-unified-dropdown search-unified-origin">
            <div className="search-unified-dropdown-head">
              <strong>
                {t.originTitle}
              </strong>

              <button
                type="button"
                className="search-unified-close"
                aria-label="Close"
                onClick={() =>
                  setPanel(null)
                }
              >
                <X size={18} />
              </button>
            </div>

            <label className="search-unified-input">
              <Search size={18} />

              <input
                autoFocus
                value={originQuery}
                placeholder={
                  t.originPlaceholder
                }
                onChange={(event) =>
                  setOriginQuery(
                    event.target.value,
                  )
                }
              />
            </label>

            <strong className="search-unified-subtitle">
              {t.popularDestination}
            </strong>

            <div className="search-unified-chip-grid">
              {filteredOrigins.map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      value === origin
                        ? "active"
                        : undefined
                    }
                    onClick={() => {
                      setOrigin(value);
                      setOriginQuery("");
                      setPanel(null);
                    }}
                  >
                    {value}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      <div className="search-edit-control">
        <button
          type="button"
          className="search-edit-field"
          aria-expanded={
            panel ===
            "destination"
          }
          onClick={() =>
            togglePanel(
              "destination",
            )
          }
        >
          <MapPin size={18} />

          <span>
            <small>
              {category === "Umrah"
                ? t.umrahDestination
                : t.destination}
            </small>

            <strong>
              {destination ||
                t.chooseDestination}
            </strong>
          </span>
        </button>

        {panel ===
          "destination" && (
          <div className="search-edit-dropdown search-unified-dropdown search-unified-destination">
            <div className="search-unified-dropdown-head">
              <strong>
                {t.destinationTitle}
              </strong>

              <button
                type="button"
                className="search-unified-close"
                aria-label="Close"
                onClick={() =>
                  setPanel(null)
                }
              >
                <X size={18} />
              </button>
            </div>

            <label className="search-unified-input">
              <Search size={18} />

              <input
                autoFocus
                value={
                  destinationQuery
                }
                placeholder={
                  t.destinationPlaceholder
                }
                onChange={(event) =>
                  setDestinationQuery(
                    event.target.value,
                  )
                }
              />
            </label>

            <strong className="search-unified-subtitle">
              {t.popularDestination}
            </strong>

            <div className="search-unified-chip-grid">
              {filteredDestinations.map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      value ===
                      destination
                        ? "active"
                        : undefined
                    }
                    onClick={() => {
                      setDestination(
                        value,
                      );

                      setDestinationQuery(
                        "",
                      );

                      setPanel(null);
                    }}
                  >
                    {value}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      <div className="search-edit-control">
        <button
          type="button"
          className="search-edit-field"
          aria-expanded={
            panel === "date"
          }
          onClick={() =>
            togglePanel("date")
          }
        >
          <CalendarDays size={18} />

          <span>
            <small>
              {isHaji ? hajiYearLabel : t.date}
            </small>

            <strong>
              {isHaji ? (selectedHajiYear ? String(selectedHajiYear) : hajiYearTitle) : formatSelectedDate()}
            </strong>
          </span>
        </button>

        {isHaji && panel === "date" && (
          <div className="search-edit-dropdown search-unified-dropdown search-unified-year">
            <div className="search-unified-dropdown-head">
              <strong>{hajiYearTitle}</strong>
              <button type="button" className="search-unified-close" aria-label={language === "EN" ? "Close" : language === "AR" ? "Ø¥ØºÙ„Ø§Ù‚" : "Tutup"} onClick={() => setPanel(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="search-haji-year-options" role="group" aria-label={hajiYearTitle}>
              {hajiYears.map((year) => {
                const disabled = year === 2026;
                return (
                  <button
                    key={year}
                    type="button"
                    disabled={disabled}
                    aria-pressed={selectedHajiYear === year}
                    className={selectedHajiYear === year ? "selected" : undefined}
                    onClick={() => { setSelectedHajiYear(year); setPanel(null); }}
                  >
                    <span>{year}</span>
                    {disabled && <small>{hajiYearPassed}</small>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!isHaji && panel === "date" && (
          <div className="search-edit-dropdown search-unified-dropdown search-unified-date">
            <div className="search-unified-dropdown-head">
              <strong>
                {t.dateTitle}
              </strong>

              <button
                type="button"
                className="search-unified-close"
                aria-label="Close"
                onClick={() =>
                  setPanel(null)
                }
              >
                <X size={18} />
              </button>
            </div>

            <div className="search-unified-calendar-controls">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() =>
                  setCalendarMonth(
                    new Date(
                      currentYear,
                      currentMonth - 1,
                      1,
                    ),
                  )
                }
              >
                <ChevronLeft size={18} />
              </button>

              <div>
                <select
                  value={currentMonth}
                  onChange={(event) =>
                    setCalendarMonth(
                      new Date(
                        currentYear,
                        Number(
                          event.target.value,
                        ),
                        1,
                      ),
                    )
                  }
                >
                  {t.months.map(
                    (
                      month,
                      index,
                    ) => (
                      <option
                        key={month}
                        value={index}
                      >
                        {month}
                      </option>
                    ),
                  )}
                </select>

                <select
                  value={currentYear}
                  onChange={(event) =>
                    setCalendarMonth(
                      new Date(
                        Number(
                          event.target.value,
                        ),
                        currentMonth,
                        1,
                      ),
                    )
                  }
                >
                  {Array.from(
                    {
                      length: 4,
                    },
                    (_, index) =>
                      today.getFullYear() +
                      index,
                  ).map(
                    (year) => (
                      <option
                        key={year}
                        value={year}
                      >
                        {year}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <button
                type="button"
                aria-label="Next month"
                onClick={() =>
                  setCalendarMonth(
                    new Date(
                      currentYear,
                      currentMonth + 1,
                      1,
                    ),
                  )
                }
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="search-unified-calendar-grid">
              {renderMonth(
                currentYear,
                currentMonth,
                monthOneDays,
              )}

              {renderMonth(
                nextMonth.getFullYear(),
                nextMonth.getMonth(),
                monthTwoDays,
              )}
            </div>
          </div>
        )}
      </div>

      <div className="search-edit-control">
        <button
          type="button"
          className="search-edit-field"
          aria-expanded={
            panel === "traveler"
          }
          onClick={() =>
            togglePanel(
              "traveler",
            )
          }
        >
          <UsersRound size={18} />

          <span>
            <small>
              {t.traveler}
            </small>

            <strong>
              {travelerTotal}{" "}
              {t.person}
            </strong>
          </span>
        </button>

        {panel ===
          "traveler" && (
          <div className="search-edit-dropdown search-unified-dropdown search-unified-traveler">
            <div className="search-unified-dropdown-head">
              <div>
                <strong>
                  {t.travelerTitle}
                </strong>

                <small>
                  {
                    t.travelerDescription
                  }
                </small>
              </div>

              <button
                type="button"
                className="search-unified-close"
                aria-label="Close"
                onClick={() =>
                  setPanel(null)
                }
              >
                <X size={18} />
              </button>
            </div>

            {(
              [
                [
                  "adult",
                  t.adult,
                  t.adultDescription,
                ],
                [
                  "child",
                  t.child,
                  t.childDescription,
                ],
                [
                  "infant",
                  t.infant,
                  t.infantDescription,
                ],
              ] as const
            ).map(
              ([
                key,
                title,
                description,
              ]) => (
                <div
                  className="search-unified-traveler-row"
                  key={key}
                >
                  <div>
                    <strong>
                      {title}
                    </strong>

                    <small>
                      {description}
                    </small>
                  </div>

                  <div className="search-unified-counter">
                    <button
                      type="button"
                      disabled={
                        travelers[key] <=
                          0 ||
                        travelerTotal <= 1
                      }
                      onClick={() =>
                        updateTraveler(
                          key,
                          -1,
                        )
                      }
                    >
                      <Minus size={16} />
                    </button>

                    <strong>
                      {travelers[key]}
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        updateTraveler(
                          key,
                          1,
                        )
                      }
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ),
            )}

            <button
              type="button"
              className="search-unified-done"
              onClick={() =>
                setPanel(null)
              }
            >
              {t.done}
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        className="search-edit-submit"
        disabled={!canSearch}
        onClick={submitSearch}
      >
        <Search size={18} />
        {t.search}
      </button>
    </div>
  );
}