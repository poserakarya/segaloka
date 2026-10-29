"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BedDouble,
  BookOpen,
  Building2,
  Bus,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Flame,
  Globe2,
  Heart,
  Hotel,
  Images,
  MapPin,
  Minus,
  Plane,
  Plus,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  UsersRound,
  Utensils,
} from "lucide-react";

import {
  makkahMadinahAccommodationMock,
  type AccommodationDetailMock,
  type AccommodationDetailRoom,
  type AccommodationDetailSummary,
} from "./accommodation-detail.mock";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";

import "./accommodation-detail.css";

type DetailTab =
  | "included"
  | "excluded"
  | "policy"
  | "notes";

type AccommodationDetailUIProps = {
  data?: AccommodationDetailMock;
};

function SummaryIcon({
  icon,
}: {
  icon: AccommodationDetailSummary["icon"];
}) {
  switch (icon) {
    case "calendar":
      return <CalendarDays size={20} />;
    case "location":
      return <MapPin size={20} />;
    case "hotel":
      return <Hotel size={20} />;
    case "transport":
      return <Bus size={20} />;
    case "service":
      return <UsersRound size={20} />;
    case "program":
      return <BookOpen size={20} />;
  }
}

function HighlightIcon({
  tone,
}: {
  tone: "orange" | "green" | "blue";
}) {
  if (tone === "orange") {
    return <Flame size={15} />;
  }

  if (tone === "green") {
    return <ShieldCheck size={15} />;
  }

  return <Sparkles size={15} />;
}

export function AccommodationDetailUI({
  data = makkahMadinahAccommodationMock,
}: AccommodationDetailUIProps) {
  const {
    language,
    currency,
    direction,
    formatCurrency,
  } = useMarketplacePreferences();

  const [saved, setSaved] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [shareNotice, setShareNotice] = useState("");

  const copy = {
    ID: {
      home: "Beranda",
      umrah: "Umrah",
      save: "Simpan",
      saved: "Tersimpan",
      share: "Bagikan",
      copied: "Tautan disalin",
      reviews: "ulasan",
      photos: "Lihat Semua Foto",
      providedBy: "Disediakan oleh",
      verified: "Penyedia Terverifikasi Segaloka",
      summary: "Ringkasan Program",
      roomTitle: "Pilih Tipe Kamar",
      roomCaption: "Pilih satu atau beberapa tipe kamar sesuai kebutuhan.",
      peopleRoom: "orang / kamar",
      pax: "pax",
      facilities: "Fasilitas yang Anda Dapatkan",
      itinerary: "Itinerary Singkat",
      included: "Termasuk",
      excluded: "Tidak Termasuk",
      policy: "Kebijakan",
      notes: "Catatan Penting",
      startingFrom: "Mulai dari",
      roomType: "Tipe kamar",
      travelers: "Jumlah Kamar",
      travelPeriod: "Periode Perjalanan",
      selectDate: "Pilih periode perjalanan",
      total: "Total Harga",
      continueBooking: "Lanjut Pemesanan",
      competitive: "Harga kompetitif",
      verifiedShort: "Penyedia terverifikasi",
      safe: "Proses aman & mudah",
      contact: "Hubungi Penyedia",
      close: "Tutup",
      bookingSummary: "Ringkasan Pemesanan",
      bookingInfo:
        "Ini adalah pratinjau UI. Pemesanan belum dikirim karena backend belum diaktifkan.",
      selectedRoom: "Kamar",
      selectedTravelers: "Jamaah",
      selectedPeriod: "Tanggal",
      chooseDate: "Pilih Tanggal Perjalanan",
      dateHint: "Pilih tanggal untuk simulasi tampilan pemesanan.",
      applyDate: "Gunakan Tanggal",
      previousPhoto: "Foto sebelumnya",
      nextPhoto: "Foto berikutnya",
    },

    EN: {
      home: "Home",
      umrah: "Umrah",
      save: "Save",
      saved: "Saved",
      share: "Share",
      copied: "Link copied",
      reviews: "reviews",
      photos: "View All Photos",
      providedBy: "Provided by",
      verified: "Segaloka Verified Provider",
      summary: "Program Summary",
      roomTitle: "Choose Room Type",
      roomCaption: "Price per person / land arrangement",
      peopleRoom: "people / room",
      pax: "pax",
      facilities: "Facilities Included",
      itinerary: "Short Itinerary",
      included: "Included",
      excluded: "Not Included",
      policy: "Policy",
      notes: "Important Notes",
      startingFrom: "Starting from",
      roomType: "Room type",
      travelers: "Travelers",
      travelPeriod: "Travel Period",
      selectDate: "Select departure date",
      total: "Total Price",
      continueBooking: "Continue Booking",
      competitive: "Competitive price",
      verifiedShort: "Verified provider",
      safe: "Safe & easy process",
      contact: "Contact Provider",
      close: "Close",
      bookingSummary: "Booking Summary",
      bookingInfo:
        "This is a UI preview. The booking has not been submitted because the backend is not active yet.",
      selectedRoom: "Room",
      selectedTravelers: "Travelers",
      selectedPeriod: "Date",
      chooseDate: "Choose Travel Date",
      dateHint: "Choose a date for the booking UI simulation.",
      applyDate: "Use Date",
      previousPhoto: "Previous photo",
      nextPhoto: "Next photo",
    },

    AR: {
      home: "الرئيسية",
      umrah: "العمرة",
      save: "حفظ",
      saved: "تم الحفظ",
      share: "مشاركة",
      copied: "تم نسخ الرابط",
      reviews: "تقييم",
      photos: "عرض جميع الصور",
      providedBy: "مقدم من",
      verified: "مزود موثق من Segaloka",
      summary: "ملخص البرنامج",
      roomTitle: "اختر نوع الغرفة",
      roomCaption: "السعر للشخص / الخدمات الأرضية",
      peopleRoom: "أشخاص / غرفة",
      pax: "شخص",
      facilities: "الخدمات المشمولة",
      itinerary: "البرنامج المختصر",
      included: "مشمول",
      excluded: "غير مشمول",
      policy: "السياسة",
      notes: "ملاحظات مهمة",
      startingFrom: "يبدأ من",
      roomType: "نوع الغرفة",
      travelers: "عدد المسافرين",
      travelPeriod: "فترة السفر",
      selectDate: "اختر تاريخ المغادرة",
      total: "السعر الإجمالي",
      continueBooking: "متابعة الحجز",
      competitive: "سعر تنافسي",
      verifiedShort: "مزود موثق",
      safe: "عملية آمنة وسهلة",
      contact: "تواصل معنا",
      close: "إغلاق",
      bookingSummary: "ملخص الحجز",
      bookingInfo:
        "هذه معاينة للواجهة فقط. لم يتم إرسال الحجز لأن النظام الخلفي غير مفعل بعد.",
      selectedRoom: "الغرفة",
      selectedTravelers: "المسافرون",
      selectedPeriod: "التاريخ",
      chooseDate: "اختر تاريخ السفر",
      dateHint: "اختر تاريخاً لمحاكاة واجهة الحجز.",
      applyDate: "استخدام التاريخ",
      previousPhoto: "الصورة السابقة",
      nextPhoto: "الصورة التالية",
    },
  } as const;

  const t = copy[language];
  type RoomQuantities = Record<
    AccommodationDetailRoom["id"],
    number
  >;

  const [roomQuantities, setRoomQuantities] =
    useState<RoomQuantities>({
      quad: 1,
      triple: 0,
      double: 0,
      single: 0,
    });

  const [selectedPeriod, setSelectedPeriod] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<DetailTab>("included");

  const totalRooms = useMemo(
    () =>
      Object.values(roomQuantities).reduce(
        (sum, quantity) => sum + quantity,
        0,
      ),
    [roomQuantities],
  );

  const totalPrice = useMemo(
    () =>
      data.rooms.reduce(
        (sum, room) =>
          sum +
          room.price *
            (roomQuantities[room.id] ?? 0),
        0,
      ),
    [data.rooms, roomQuantities],
  );

  const selectedRooms = useMemo(
    () =>
      data.rooms.filter(
        (room) =>
          (roomQuantities[room.id] ?? 0) > 0,
      ),
    [data.rooms, roomQuantities],
  );

  const roomSummary = useMemo(
    () =>
      selectedRooms
        .map(
          (room) =>
            `${roomQuantities[room.id]} ${room.label}`,
        )
        .join(" + "),
    [roomQuantities, selectedRooms],
  );

  const updateRoomQuantity = (
    roomId: AccommodationDetailRoom["id"],
    delta: number,
  ) => {
    setRoomQuantities((current) => ({
      ...current,
      [roomId]: Math.max(
        0,
        Math.min(
          20,
          (current[roomId] ?? 0) + delta,
        ),
      ),
    }));
  };

  const periodOptions = [
    {
      value: "2026-11-05",
      label: "5 - 13 November 2026",
    },
    {
      value: "2026-11-19",
      label: "19 - 27 November 2026",
    },
    {
      value: "2026-12-03",
      label: "3 - 11 Desember 2026",
    },
    {
      value: "2026-12-17",
      label: "17 - 25 Desember 2026",
    },
  ];

  const tabVisual = useMemo(() => {
    const fallbackImage =
      data.gallery[0]?.src ??
      "/images/la/makkah-madinah.jpg";

    const visuals = {
      included: {
        src:
          data.gallery[0]?.src ??
          fallbackImage,
        alt:
          language === "EN"
            ? "Included facilities"
            : language === "AR"
              ? "الخدمات المشمولة"
              : "Fasilitas yang termasuk",
        position: "center 58%",
      },

      excluded: {
        src:
          data.gallery[1]?.src ??
          fallbackImage,
        alt:
          language === "EN"
            ? "Services not included"
            : language === "AR"
              ? "الخدمات غير المشمولة"
              : "Layanan yang tidak termasuk",
        position: "center 42%",
      },

      policy: {
        src:
          data.gallery[2]?.src ??
          fallbackImage,
        alt:
          language === "EN"
            ? "Travel policy"
            : language === "AR"
              ? "سياسة السفر"
              : "Kebijakan perjalanan",
        position: "center 70%",
      },

      notes: {
        src:
          data.gallery[3]?.src ??
          fallbackImage,
        alt:
          language === "EN"
            ? "Important travel notes"
            : language === "AR"
              ? "ملاحظات سفر مهمة"
              : "Catatan penting perjalanan",
        position: "center 30%",
      },
    } as const;

    return visuals[activeTab];
  }, [activeTab, data.gallery, language]);


  const handleShare = async () => {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: data.title,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      setShareNotice(t.copied);

      window.setTimeout(() => {
        setShareNotice("");
      }, 1800);
    } catch {
      // User cancellation or unavailable clipboard should not break UI.
    }
  };

  const previousGalleryImage = () => {
    setGalleryIndex((current) =>
      current <= 0 ? data.gallery.length - 1 : current - 1,
    );
  };

  const nextGalleryImage = () => {
    setGalleryIndex((current) =>
      current >= data.gallery.length - 1 ? 0 : current + 1,
    );
  };

  const defaultUiDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().slice(0, 10);
  };

  const handleProviderContact = () => {
    const target =
      data.provider.contactUrl ??
      data.provider.profileUrl;

    if (!target) {
      return;
    }

    if (
      target.startsWith("http://") ||
      target.startsWith("https://")
    ) {
      window.open(
        target,
        "_blank",
        "noopener,noreferrer",
      );

      return;
    }

    window.location.assign(target);
  };
  return (
    <main className="accommodation-detail-ui" dir={direction} data-language={language} data-currency={currency}>
      <div className="accommodation-detail-container">
        <nav
          className="accommodation-breadcrumb"
          aria-label="Breadcrumb"
        >
          <a href="/">{t.home}</a>
          <ChevronRight size={13} />

          <a href="/akomodasi">{t.umrah}</a>
          <ChevronRight size={13} />

          <a href="/akomodasi">Land Arrangement</a>
          <ChevronRight size={13} />

          <strong>Makkah &amp; Madinah</strong>
        </nav>

        <section className="accommodation-heading">
          <div className="accommodation-heading-main">
            <div className="accommodation-category">
              <Building2 size={14} />
              <span>{data.category}</span>
            </div>

            <h1>{data.title}</h1>

            <div className="accommodation-meta">
              <span className="accommodation-rating">
                <Star
                  size={16}
                  fill="currentColor"
                  aria-hidden="true"
                />
                <strong>{data.rating}</strong>
                <span>({data.reviews} {t.reviews})</span>
              </span>

              {data.locations.map((location) => (
                <span
                  className="accommodation-location"
                  key={location}
                >
                  <MapPin size={15} />
                  {location}
                </span>
              ))}
            </div>
          </div>

          <div className="accommodation-heading-side">
            <div className="accommodation-actions">
              <button
                type="button"
                className={saved ? "is-saved" : ""}
                onClick={() => setSaved((value) => !value)}
                aria-pressed={saved}
              >
                <Heart
                  size={17}
                  fill={saved ? "currentColor" : "none"}
                />
                {saved ? t.saved : t.save}
              </button>

              <button
                type="button"
                onClick={handleShare}
              >
                <Share2 size={17} />
                {shareNotice || t.share}
              </button>
            </div>

            <div className="accommodation-highlights">
              {data.highlights.map((highlight) => (
                <span
                  key={highlight.label}
                  className={`accommodation-highlight accommodation-highlight-${highlight.tone}`}
                >
                  <HighlightIcon tone={highlight.tone} />
                  {highlight.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="accommodation-gallery">
          <div className="accommodation-gallery-primary">
            <img
              src={data.gallery[0].src}
              alt={data.gallery[0].alt}
            />

            <button
              type="button"
              className="accommodation-gallery-all"
              onClick={() => {
                setGalleryIndex(0);
                setGalleryOpen(true);
              }}
            >
              <Images size={17} />
              {t.photos} ({data.photoCount})
            </button>
          </div>

          <div className="accommodation-gallery-mosaic">
            {data.gallery
              .slice(1, 6)
              .map((image, index) => (
                <div
                  className={`accommodation-gallery-item accommodation-gallery-item-${
                    index + 1
                  }`}
                  key={`${image.src}-${index}`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                  />

                  {index === 4 && (
                    <button
                      type="button"
                      className="accommodation-gallery-next"
                      aria-label={t.nextPhoto}
                      onClick={() => {
                        setGalleryIndex(
                          Math.min(index + 1, data.gallery.length - 1),
                        );
                        setGalleryOpen(true);
                      }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  )}
                </div>
              ))}
          </div>
        </section>

        <section className="accommodation-content-layout">
          <div className="accommodation-content">
            <section className="accommodation-provider-card">
              <div className="accommodation-provider-left">
                <span className="accommodation-provider-icon">
                  <Building2 size={20} />
                </span>

                <div>
                  <small>
                    {t.providedBy} {data.provider.type}
                  </small>
                  <strong>{data.provider.name}</strong>
                </div>
              </div>

              {data.provider.verified && (
                <span className="accommodation-provider-verified">
                  <ShieldCheck size={16} />
                  {t.verified}
                </span>
              )}
            </section>

            <section className="accommodation-notice">
              <Plane size={22} />

              <div>
                <strong>{data.notice.title}</strong>
                <p>{data.notice.description}</p>
              </div>
            </section>

            <section className="accommodation-section accommodation-summary-section">
              <div className="accommodation-section-title">
                <h2>{t.summary}</h2>
              </div>

              <div className="accommodation-summary-grid">
                {data.summary.map((item) => (
                  <article
                    className="accommodation-summary-card"
                    key={`${item.label}-${item.value}`}
                  >
                    <span className="accommodation-summary-icon">
                      <SummaryIcon icon={item.icon} />
                    </span>

                    <strong>{item.label}</strong>
                    <span>{item.value}</span>

                    {item.description && (
                      <small>{item.description}</small>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className="accommodation-section accommodation-room-section">
              <div className="accommodation-section-title">
                <h2>{t.roomTitle}</h2>
                <p>
                  {t.roomCaption}
                </p>
              </div>

              <div className="accommodation-room-grid">
                {data.rooms.map((room) => {
                  const quantity =
                    roomQuantities[room.id] ?? 0;

                  const active = quantity > 0;

                  return (
                    <article
                      key={room.id}
                      className={`accommodation-room-card ${
                        active ? "is-active" : ""
                      }`}
                    >
                      <div className="accommodation-room-top">
                        <span className="accommodation-room-icon">
                          <UserRound size={20} />
                        </span>

                        {room.badge && (
                          <span className="accommodation-room-badge">
                            {room.badge}
                          </span>
                        )}
                      </div>

                      <strong>{room.label}</strong>

                      <span>
                        {room.capacity} {t.peopleRoom}
                      </span>

                      <div className="accommodation-room-price">
                        <b>{formatCurrency(room.price)}</b>
                        <small>/ kamar</small>
                      </div>

                      <div
                        className="accommodation-room-quantity"
                        aria-label={`Jumlah kamar ${room.label}`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            updateRoomQuantity(
                              room.id,
                              -1,
                            )
                          }
                          disabled={quantity <= 0}
                          aria-label={`Kurangi kamar ${room.label}`}
                        >
                          <Minus size={15} />
                        </button>

                        <div>
                          <strong>{quantity}</strong>
                          <span>kamar</span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            updateRoomQuantity(
                              room.id,
                              1,
                            )
                          }
                          aria-label={`Tambah kamar ${room.label}`}
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="accommodation-info-grid">
              <article className="accommodation-info-card">
                <h2>
                  Fasilitas yang Anda Dapatkan
                </h2>

                <div className="accommodation-check-list">
                  {data.facilities.map((facility) => (
                    <div key={facility}>
                      <Check size={15} />
                      <span>{facility}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="accommodation-info-card">
                <h2>{t.itinerary}</h2>

                <div className="accommodation-itinerary">
                  {data.itinerary.map((item) => (
                    <div
                      className="accommodation-itinerary-row"
                      key={`${item.day}-${item.description}`}
                    >
                      <span className="accommodation-itinerary-dot" />

                      <strong>{item.day}</strong>

                      <span>{item.description}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="accommodation-tabs">
              <div
                className="accommodation-tab-nav"
                role="tablist"
              >
                <button
                  type="button"
                  className={
                    activeTab === "included"
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab("included")
                  }
                >
                  Termasuk
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "excluded"
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab("excluded")
                  }
                >
                  Tidak Termasuk
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "policy"
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab("policy")
                  }
                >
                  Kebijakan
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "notes"
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab("notes")
                  }
                >
                  Catatan Penting
                </button>
              </div>

              <div className="accommodation-tab-panel">
              <div className="accommodation-tab-content">
                <div className="accommodation-tab-copy">
                  {activeTab === "included" &&
                    data.included.map((item) => (
                      <div
                        key={item}
                        className="accommodation-tab-list-item"
                      >
                        <Check size={16} />
                        <span>{item}</span>
                      </div>
                    ))}

                  {activeTab === "excluded" &&
                    data.excluded.map((item) => (
                      <div
                        key={item}
                        className="accommodation-tab-list-item is-excluded"
                      >
                        <Minus size={16} />
                        <span>{item}</span>
                      </div>
                    ))}

                  {activeTab === "policy" &&
                    data.policies.map((item) => (
                      <div
                        key={item}
                        className="accommodation-tab-list-item is-policy"
                      >
                        <ShieldCheck size={16} />
                        <span>{item}</span>
                      </div>
                    ))}

                  {activeTab === "notes" &&
                    data.importantNotes.map((item) => (
                      <div
                        key={item}
                        className="accommodation-tab-list-item is-notes"
                      >
                        <CircleDollarSign size={16} />
                        <span>{item}</span>
                      </div>
                    ))}
                </div>

                <div
                  className={`accommodation-tab-visual is-${activeTab}`}
                >
                  <img
                    key={activeTab}
                    src={tabVisual.src}
                    alt={tabVisual.alt}
                    style={{
                      objectPosition: tabVisual.position,
                    }}
                  />

                  <span className="accommodation-tab-visual-badge">
                    {activeTab === "included" && (
                      <Check size={16} />
                    )}

                    {activeTab === "excluded" && (
                      <Minus size={16} />
                    )}

                    {activeTab === "policy" && (
                      <ShieldCheck size={16} />
                    )}

                    {activeTab === "notes" && (
                      <BookOpen size={16} />
                    )}
                  </span>
                </div>
              </div>
            </div>
          </section>
          </div>

          <aside className="accommodation-booking">
            <div className="accommodation-booking-price">
              <small>{t.startingFrom}</small>

              <div>
                <strong>
                  {formatCurrency(
                    Math.min(
                      ...data.rooms.map(
                        (room) => room.price,
                      ),
                    ),
                  )}
                </strong>

                <span>/ kamar</span>
              </div>
            </div>

            <div className="accommodation-booking-field">
              <label>
                {language === "ID"
                  ? "Kamar Dipilih"
                  : language === "EN"
                    ? "Selected Rooms"
                    : "الغرف المختارة"}
              </label>

              <div className="accommodation-booking-room-list">
                {data.rooms.map((room) => {
                  const quantity =
                    roomQuantities[room.id] ?? 0;

                  return (
                    <div
                      className={`accommodation-booking-room-row ${
                        quantity > 0
                          ? "is-selected"
                          : ""
                      }`}
                      key={room.id}
                    >
                      <div className="accommodation-booking-room-name">
                        <BedDouble size={17} />

                        <span>
                          <strong>{room.label}</strong>
                          <small>
                            {room.capacity} orang / kamar
                          </small>
                        </span>
                      </div>

                      <div className="accommodation-mini-counter">
                        <button
                          type="button"
                          onClick={() =>
                            updateRoomQuantity(
                              room.id,
                              -1,
                            )
                          }
                          disabled={quantity <= 0}
                          aria-label={`Kurangi ${room.label}`}
                        >
                          <Minus size={13} />
                        </button>

                        <strong>{quantity}</strong>

                        <button
                          type="button"
                          onClick={() =>
                            updateRoomQuantity(
                              room.id,
                              1,
                            )
                          }
                          aria-label={`Tambah ${room.label}`}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="accommodation-booking-field">
              <label>{t.travelPeriod}</label>

              <div className="accommodation-period-select-wrap">
                <CalendarDays
                  size={18}
                  aria-hidden="true"
                />

                <select
                  className="accommodation-period-select"
                  value={selectedPeriod}
                  onChange={(event) =>
                    setSelectedPeriod(
                      event.target.value,
                    )
                  }
                  aria-label={t.travelPeriod}
                >
                  <option value="">
                    {t.selectDate}
                  </option>

                  {periodOptions.map((period) => (
                    <option
                      key={period.value}
                      value={period.value}
                    >
                      {period.label}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={17}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="accommodation-total-card">
              <small>{t.total}</small>

              <div>
                <strong>
                  {formatCurrency(totalPrice)}
                </strong>

                <span>
                  {totalRooms > 0
                    ? `${totalRooms} kamar · ${roomSummary}`
                    : language === "ID"
                      ? "Belum ada kamar dipilih"
                      : language === "EN"
                        ? "No rooms selected"
                        : "لم يتم اختيار غرف"}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="accommodation-booking-cta"
              disabled={
                totalRooms === 0 ||
                !selectedPeriod
              }
              onClick={() => setBookingOpen(true)}
            >
              {t.continueBooking}
              <ArrowRight size={18} />
            </button>

            <div className="accommodation-trust-grid">
              <div>
                <span>
                  <CircleDollarSign size={19} />
                </span>
                <small>{t.competitive}</small>
              </div>

              <div>
                <span>
                  <ShieldCheck size={19} />
                </span>
                <small>{t.verifiedShort}</small>
              </div>

              <div>
                <span>
                  <Globe2 size={19} />
                </span>
                <small>{t.safe}</small>
              </div>
            </div>

            {data.customOffer.enabled && (
              <div className="accommodation-custom-offer">
                <div className="accommodation-custom-offer-heading">
                  <span>
                    <Send size={19} />
                  </span>

                  <div>
                    <strong>
                      {data.customOffer.title}
                    </strong>

                    <p>
                      {data.customOffer.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProviderContact}
                  disabled={
                    !data.provider.contactUrl &&
                    !data.provider.profileUrl
                  }
                  title={
                    !data.provider.contactUrl &&
                    !data.provider.profileUrl
                      ? language === "ID"
                        ? "Kontak penyedia belum tersedia"
                        : language === "EN"
                          ? "Provider contact is not available yet"
                          : "بيانات التواصل مع المزود غير متاحة بعد"
                      : undefined
                  }
                >
                  <Send size={15} />
                  {t.contact}
                </button>
              </div>
            )}
          </aside>
        </section>
      </div>

      {galleryOpen && (
        <div
          className="accommodation-ui-modal-backdrop"
          role="presentation"
          onMouseDown={() => setGalleryOpen(false)}
        >
          <div
            className="accommodation-gallery-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="accommodation-modal-close"
              onClick={() => setGalleryOpen(false)}
              aria-label={t.close}
            >
              ×
            </button>

            <button
              type="button"
              className="accommodation-gallery-modal-arrow is-previous"
              onClick={previousGalleryImage}
              aria-label={t.previousPhoto}
            >
              <ChevronLeft size={24} />
            </button>

            <img
              src={data.gallery[galleryIndex]?.src}
              alt={data.gallery[galleryIndex]?.alt ?? ""}
            />

            <button
              type="button"
              className="accommodation-gallery-modal-arrow is-next"
              onClick={nextGalleryImage}
              aria-label={t.nextPhoto}
            >
              <ChevronRight size={24} />
            </button>

            <span className="accommodation-gallery-counter">
              {galleryIndex + 1} / {data.gallery.length}
            </span>
          </div>
        </div>
      )}

      {bookingOpen && (
        <div
          className="accommodation-ui-modal-backdrop"
          role="presentation"
          onMouseDown={() => setBookingOpen(false)}
        >
          <div
            className="accommodation-ui-dialog accommodation-booking-dialog"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="accommodation-ui-dialog-head">
              <div>
                <strong>{t.bookingSummary}</strong>
                <p>{t.bookingInfo}</p>
              </div>

              <button
                type="button"
                onClick={() => setBookingOpen(false)}
                aria-label={t.close}
              >
                ×
              </button>
            </div>

            <div className="accommodation-booking-preview">
              <div>
                <span>{t.selectedRoom}</span>
                <strong>{roomSummary || "—"}</strong>
              </div>

              <div>
                <span>{t.selectedTravelers}</span>
                <strong>
                  {totalRooms} {language === "ID" ? "kamar" : language === "EN" ? "rooms" : "غرف"}
                </strong>
              </div>

              <div>
                <span>{t.selectedPeriod}</span>
                <strong>
                  {periodOptions.find((period) => period.value === selectedPeriod)?.label || "—"}
                </strong>
              </div>

              <div className="is-total">
                <span>{t.total}</span>
                <strong>
                  {formatCurrency(totalPrice)}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="accommodation-dialog-primary"
              onClick={() => setBookingOpen(false)}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default AccommodationDetailUI;