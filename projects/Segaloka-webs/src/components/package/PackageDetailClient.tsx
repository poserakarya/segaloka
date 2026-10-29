"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Hotel,
  MapPin,
  Minus,
  Plane,
  Plus,
  Share2,
  Star,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import type {
  TravelProduct,
} from "@/data/home";


type PackageItem =
  TravelProduct & {
    travelName?: string;
    travelLogo?: string;
  };


type Props = {
  item: PackageItem;
  recommendations: PackageItem[];
};


type TabKey =
  | "description"
  | "itinerary"
  | "facilities"
  | "ticket"
  | "policy"
  | "reviews";


type RoomType =
  | "quad"
  | "triple"
  | "double";


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
  ).format(value);
}


function getCategory(
  item: PackageItem,
) {
  const value =
    item.title.toLowerCase();

  if (value.includes("haji")) {
    return "Haji";
  }

  if (value.includes("halal")) {
    return "Halal Tour";
  }

  if (
    value.includes("bali") ||
    value.includes("lombok") ||
    value.includes("domestic")
  ) {
    return "Tour Domestic";
  }

  if (
    value.includes("jepang") ||
    value.includes("japan") ||
    value.includes("korea") ||
    value.includes("turkiye") ||
    value.includes("international")
  ) {
    return "Tour International";
  }

  return "Umrah";
}


function getTravelName(
  item: PackageItem,
) {
  return (
    item.travelName ||
    "Travel Segaloka"
  );
}


export function PackageDetailClient({
  item,
  recommendations,
}: Props) {

  const category =
    getCategory(item);

  const travelName =
    getTravelName(item);


  const [
    activeTab,
    setActiveTab,
  ] =
    useState<TabKey>(
      "description",
    );


  const [
    adult,
    setAdult,
  ] =
    useState(4);


  const [
    child,
    setChild,
  ] =
    useState(2);


  const [
    infant,
    setInfant,
  ] =
    useState(1);


  const [
    roomType,
    setRoomType,
  ] =
    useState<RoomType>(
      "quad",
    );


  const [
    roomOpen,
    setRoomOpen,
  ] =
    useState(false);


  const [
    itineraryPage,
    setItineraryPage,
  ] =
    useState(0);

  const [
    facilityPage,
    setFacilityPage,
  ] =
    useState(0);


  const [
    ticketPage,
    setTicketPage,
  ] =
    useState(0);


  const roomPrices =
    useMemo(
      () => ({
        quad:
          item.price,

        triple:
          Math.round(
            item.price *
            1.0054,
          ),

        double:
          Math.round(
            item.price *
            1.0108,
          ),
      }),
      [
        item.price,
      ],
    );


  const selectedPrice =
    roomPrices[
      roomType
    ];


  const childPrice =
    Math.max(
      3000000,
      Math.round(
        selectedPrice *
        .016,
      ),
    );


  const adultTotal =
    selectedPrice *
    adult;


  const childTotal =
    childPrice *
    child;


  const infantTotal =
    0;


  const discount =
    Math.round(
      selectedPrice *
      .0136,
    );


  const total =
    adultTotal +
    childTotal +
    infantTotal -
    discount;


  const recommendationCards =
    useMemo(
      () => {

        if (
          recommendations.length ===
          0
        ) {
          return [];
        }

        return Array.from(
          {
            length: 4,
          },
          (
            _,
            index,
          ) =>
            recommendations[
              index %
              recommendations.length
            ],
        );

      },
      [
        recommendations,
      ],
    );


  const tabs:
    Array<{
      key: TabKey;
      label: string;
    }> = [
      {
        key:
          "description",
        label:
          "Deskripsi",
      },
      {
        key:
          "itinerary",
        label:
          "Itinerary",
      },
      {
        key:
          "facilities",
        label:
          "Fasilitas",
      },
      {
        key:
          "ticket",
        label:
          "Tiket & Hotel",
      },
      {
        key:
          "policy",
        label:
          "Kebijakan",
      },
      {
        key:
          "reviews",
        label:
          "Ulasan",
      },
    ];


  const roomLabel = {
    quad:
      "Sekamar Berempat",

    triple:
      "Sekamar Bertiga",

    double:
      "Sekamar Berdua",
  };


  return (
    <main className="pkgd-page">

      <div className="pkgd-shell">


        {/* ================================================
            HEADER DETAIL
        ================================================= */}

        <div className="pkgd-breadcrumb">

          <a href="/">
            Beranda
          </a>

          <span>/</span>

          <span>
            {category}
          </span>

          <span>/</span>

          <strong>
            {item.title}
          </strong>

        </div>


        <header className="pkgd-title">

          <div>

            <h1>
              {item.title}
            </h1>


            <div className="pkgd-title-meta">

              <span>
                <MapPin size={12} />
                {travelName}
              </span>

              <span>
                <CalendarDays size={12} />
                {item.duration ||
                  "Durasi paket"}
              </span>

              <span className="pkgd-title-rating">
                <Star
                  size={12}
                  fill="currentColor"
                />
                {item.rating}
                <small>
                  ({item.reviews})
                </small>
              </span>

            </div>

          </div>


          <div className="pkgd-title-actions">

            <button
              type="button"
              aria-label="Simpan"
            >
              <Heart size={18} />
            </button>

            <button
              type="button"
              aria-label="Bagikan"
            >
              <Share2 size={18} />
            </button>

          </div>

        </header>


        {/* ================================================
            TOP DETAIL
        ================================================= */}

        <div className="pkgd-top-grid">


          <section className="pkgd-left">


            {/* GALLERY */}

            <div className="pkgd-gallery">

              <div className="pkgd-gallery-main">

                <img
                  src={item.image}
                  alt={item.title}
                />

                <div className="pkgd-gallery-shade" />

                <div className="pkgd-gallery-caption">

                  <strong>
                    {category === "Umrah" ||
                    category === "Haji"
                      ? "Makkah"
                      : "Destinasi"}
                  </strong>

                  <span>
                    {category === "Umrah" ||
                    category === "Haji"
                      ? "Ka'bah & Masjidil Haram"
                      : "Tujuan utama"}
                  </span>

                </div>

              </div>


              <div className="pkgd-gallery-side">

                <div className="pkgd-gallery-wide">

                  <img
                    src={item.image}
                    alt=""
                  />

                  <div className="pkgd-gallery-shade" />

                  <div className="pkgd-gallery-caption">

                    <strong>
                      {category === "Umrah" ||
                      category === "Haji"
                        ? "Madinah"
                        : "Destinasi"}
                    </strong>

                    <span>
                      {category === "Umrah" ||
                      category === "Haji"
                        ? "Masjid Nabawi"
                        : "Eksplorasi"}
                    </span>

                  </div>

                </div>


                <div className="pkgd-gallery-bottom">

                  <div>

                    <img
                      src={item.image}
                      alt=""
                    />

                    <div className="pkgd-gallery-shade" />

                    <div className="pkgd-gallery-caption">

                      <strong>
                        Hotel
                      </strong>

                      <span>
                        Akomodasi
                      </span>

                    </div>

                  </div>


                  <div>

                    <img
                      src={item.image}
                      alt=""
                    />

                    <div className="pkgd-gallery-shade" />

                    <div className="pkgd-gallery-caption">

                      <strong>
                        Perjalanan
                      </strong>

                      <span>
                        Penerbangan
                      </span>

                    </div>

                  </div>

                </div>

              </div>

            </div>


            {/* TAB */}

            <section className="pkgd-tabs">

              <nav className="pkgd-tab-nav">

                {tabs.map(
                  (
                    tab,
                  ) => (

                    <button
                      key={
                        tab.key
                      }
                      type="button"
                      className={
                        activeTab ===
                        tab.key
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setActiveTab(
                          tab.key,
                        )
                      }
                    >
                      {tab.label}
                    </button>

                  ),
                )}

              </nav>


              <div className="pkgd-tab-panel">


                {activeTab ===
                  "description" && (

                  <div className="pkgd-description">

                    <strong>
                      Informasi
                    </strong>

                    <p>
                      Informasi lengkap mengenai paket perjalanan,
                      layanan, jadwal, fasilitas, serta ketentuan
                      perjalanan akan ditampilkan pada bagian ini.
                      Konten dibuat ringkas agar mudah dibaca
                      sebelum melakukan pemesanan. Informasi
                      tambahan mengenai keberangkatan, pelayanan
                      Travel, akomodasi, transportasi,
                      perlengkapan dan kebutuhan perjalanan juga
                      dapat dicantumkan pada area ini.
                    </p>

                  </div>

                )}


                {activeTab ===
                  "itinerary" && (

                  <div className="pkgd-itinerary">

                    <div className="pkgd-itinerary-content">

                      <strong>
                        Hari {
                          itineraryPage +
                          1
                        }
                      </strong>

                      <p>
                        {itineraryPage === 0
                          ? "Keberangkatan dan proses perjalanan awal. Informasi waktu berkumpul, transportasi, serta agenda hari pertama ditampilkan pada bagian ini."
                          : itineraryPage === 1
                            ? "Perjalanan menuju destinasi berikutnya sesuai itinerary yang telah ditentukan Travel."
                            : itineraryPage === 2
                              ? "Agenda utama perjalanan, kunjungan destinasi, aktivitas ibadah atau wisata sesuai jenis paket."
                              : "Kelanjutan program perjalanan hingga proses kepulangan."}
                      </p>

                    </div>


                    <div className="pkgd-pager">

                      <button
                        type="button"
                        disabled={
                          itineraryPage ===
                          0
                        }
                        onClick={() =>
                          setItineraryPage(
                            Math.max(
                              0,
                              itineraryPage -
                                1,
                            ),
                          )
                        }
                      >
                        <ChevronLeft size={13} />
                      </button>


                      <button
                        type="button"
                        disabled={
                          itineraryPage ===
                          3
                        }
                        onClick={() =>
                          setItineraryPage(
                            Math.min(
                              3,
                              itineraryPage +
                                1,
                            ),
                          )
                        }
                      >
                        <ChevronRight size={13} />
                      </button>


                      <span>
                        {itineraryPage + 1}
                        {" / "}
                        4
                      </span>

                    </div>

                  </div>

                )}


                {activeTab === "facilities" && (
                  <div className="pkgd-facilities">

                    <div
                      key={`facility-${facilityPage}`}
                      className="pkgd-facilities-scroll"
                    >
                      <div className="pkgd-facilities-layout">

                        <strong className="pkgd-facilities-label">
                          {facilityPage === 0
                            ? "Termasuk"
                            : "Tidak Termasuk"}
                        </strong>

                        <div className="pkgd-facilities-items">

                          {facilityPage === 0 ? (
                            <>
                              <span>◎ Akomodasi</span>
                              <span>◎ Transportasi</span>
                              <span>◎ Konsumsi</span>
                              <span>◎ Pendamping perjalanan</span>
                              <span>◎ Bagasi sesuai ketentuan</span>
                              <span>◎ Perlengkapan paket</span>
                              <span>◎ Dokumentasi perjalanan</span>
                              <span>◎ Layanan pendampingan</span>
                            </>
                          ) : (
                            <>
                              <span>⊗ Paspor dan dokumen pribadi</span>
                              <span>⊗ Kelebihan bagasi</span>
                              <span>⊗ Pengeluaran pribadi</span>
                              <span>⊗ Upgrade kamar</span>
                              <span>⊗ Biaya di luar itinerary</span>
                              <span>⊗ Layanan tambahan pribadi</span>
                              <span>⊗ Keperluan pribadi jamaah</span>
                              <span>⊗ Biaya lain di luar paket</span>
                            </>
                          )}

                        </div>

                      </div>
                    </div>

                    <div className="pkgd-facility-pager">

                      <button
                        type="button"
                        disabled={facilityPage === 0}
                        onClick={() =>
                          setFacilityPage((page) =>
                            Math.max(0, page - 1)
                          )
                        }
                        aria-label="Fasilitas sebelumnya"
                      >
                        <ChevronLeft size={13} />
                      </button>

                      <button
                        type="button"
                        disabled={facilityPage === 1}
                        onClick={() =>
                          setFacilityPage((page) =>
                            Math.min(1, page + 1)
                          )
                        }
                        aria-label="Fasilitas berikutnya"
                      >
                        <ChevronRight size={13} />
                      </button>

                      <span>
                        {facilityPage + 1} / 2
                      </span>

                    </div>

                  </div>
                )}

                {activeTab ===
                  "ticket" && (

                  <div className="pkgd-ticket">

                    {ticketPage ===
                      0 ? (

                      <div className="pkgd-hotel">

                        <strong>
                          Hotel
                        </strong>


                        <div>

                          <b>
                            Hotel sesuai paket perjalanan
                          </b>

                          <span>
                            Lokasi strategis · sesuai program
                          </span>

                          <p>
                            Informasi tipe kamar, fasilitas,
                            check-in/check-out dan layanan
                            akomodasi ditampilkan di sini.
                          </p>

                        </div>


                        <aside>
                          <MapPin size={22} />

                          <button
                            type="button"
                          >
                            Buka di Maps ↗
                          </button>
                        </aside>

                      </div>

                    ) : (

                      <div className="pkgd-flight">

                        <strong>
                          Tiket
                        </strong>


                        <div className="pkgd-flight-card">

                          <header>

                            <strong>
                              Pulang
                            </strong>

                            <span>
                              WY
                            </span>

                            <b>
                              Oman Air WY674
                            </b>

                            <small>
                              Ekonomi · Transit
                            </small>

                          </header>


                          <div>

                            <section>

                              <strong>
                                MCT
                              </strong>

                              <span>
                                Muscat
                              </span>

                            </section>


                            <section className="pkgd-flight-middle">

                              <Plane size={15} />

                              <span>
                                8j 05m
                              </span>

                            </section>


                            <section>

                              <strong>
                                CGK
                              </strong>

                              <span>
                                Soekarno Hatta
                              </span>

                            </section>

                          </div>

                        </div>

                      </div>

                    )}


                    <div className="pkgd-pager">

                      <button
                        type="button"
                        disabled={
                          ticketPage ===
                          0
                        }
                        onClick={() =>
                          setTicketPage(
                            0,
                          )
                        }
                      >
                        <ChevronLeft size={13} />
                      </button>


                      <button
                        type="button"
                        disabled={
                          ticketPage ===
                          1
                        }
                        onClick={() =>
                          setTicketPage(
                            1,
                          )
                        }
                      >
                        <ChevronRight size={13} />
                      </button>


                      <span>
                        {ticketPage + 1}
                        {" / "}
                        2
                      </span>

                    </div>

                  </div>

                )}


                {activeTab ===
                  "policy" && (

                  <div className="pkgd-policy">

                    <strong>
                      Ketentuan
                    </strong>

                    <ol>
                      <li>
                        Pemesanan mengikuti ketersediaan jadwal dan kuota.
                      </li>

                      <li>
                        Perubahan jadwal mengikuti ketentuan Travel dan penyedia layanan.
                      </li>

                      <li>
                        Pembatalan dan refund mengikuti kebijakan paket yang berlaku.
                      </li>

                      <li>
                        Ketentuan dokumen dan pembayaran mengikuti rincian paket.
                      </li>
                    </ol>

                  </div>

                )}


                {activeTab ===
                  "reviews" && (

                  <div className="pkgd-review">

                    <div>

                      <strong>
                        {item.rating}/5
                      </strong>

                      <span>
                        Dari {item.reviews}
                        <br />
                        ulasan
                      </span>

                    </div>


                    <div>

                      <p>
                        Pelayanan Travel ramah dan responsif.
                        Informasi perjalanan mudah dipahami dan
                        proses pemesanan dapat dipantau dengan jelas.
                      </p>

                      <strong>
                        Traveler Segaloka
                      </strong>

                    </div>

                  </div>

                )}

              </div>

            </section>

          </section>


          {/* ================================================
              BOOKING PANEL
          ================================================= */}

          <aside className="pkgd-booking">


            <section className="pkgd-booking-price">

              <div className="pkgd-booking-date">

                <div>

                  <strong>
                    Pergi
                  </strong>

                  <span>
                    30 Des 2026
                  </span>

                </div>


                <div>
                  ···
                  <Plane size={13} />
                  ···
                </div>


                <div>

                  <strong>
                    Pulang
                  </strong>

                  <span>
                    09 Jan 2027
                  </span>

                </div>

              </div>


              <button
                type="button"
                className="pkgd-price-toggle"
                onClick={() =>
                  setRoomOpen(
                    !roomOpen,
                  )
                }
              >

                <div>

                  <del>
                    {formatCurrency(
                      Math.round(
                        selectedPrice *
                        1.01,
                      ),
                    )}
                  </del>

                  <strong>
                    {formatCurrency(
                      selectedPrice,
                    )}
                  </strong>

                  <span>
                    /pax
                  </span>

                </div>

                <ChevronDown
                  size={13}
                  className={
                    roomOpen
                      ? "open"
                      : ""
                  }
                />

              </button>


              {roomOpen && (

                <div className="pkgd-price-dropdown">

                  {(
                    [
                      "quad",
                      "triple",
                      "double",
                    ] as RoomType[]
                  ).map(
                    (
                      room,
                    ) => (

                      <button
                        key={
                          room
                        }
                        type="button"
                        onClick={() => {
                          setRoomType(
                            room,
                          );

                          setRoomOpen(
                            false,
                          );
                        }}
                      >

                        <span>
                          {
                            roomLabel[
                              room
                            ]
                          }
                        </span>

                        <strong>
                          {formatCurrency(
                            roomPrices[
                              room
                            ],
                          )}
                          <small>
                            /pax
                          </small>
                        </strong>

                      </button>

                    ),
                  )}

                </div>

              )}

            </section>


            <section className="pkgd-participants">

              <h3>
                Atur Peserta
              </h3>


              <Participant
                label="Dewasa"
                note="Umur 12 tahun +"
                value={adult}
                onChange={setAdult}
              />


              <Participant
                label="Anak"
                note="Umur 2 - 11 tahun"
                value={child}
                onChange={setChild}
              />


              <Participant
                label="Bayi"
                note="Umur 0 - 23 bulan"
                value={infant}
                onChange={setInfant}
              />

            </section>


            <section className="pkgd-price-detail">

              <h3>
                Detail Harga
              </h3>


              <div>

                <span>
                  {adult}x Dewasa
                </span>

                <strong>
                  {formatCurrency(
                    adultTotal,
                  )}
                </strong>

              </div>


              <div>

                <span>
                  {child}x Anak
                </span>

                <strong>
                  {formatCurrency(
                    childTotal,
                  )}
                </strong>

              </div>


              <div>

                <span>
                  {infant}x Bayi
                </span>

                <strong>
                  {formatCurrency(
                    infantTotal,
                  )}
                </strong>

              </div>


              <div className="pkgd-discount">

                <span>
                  Diskon 2%
                </span>

                <strong>
                  - {formatCurrency(
                    discount,
                  )}
                </strong>

              </div>


              <div className="pkgd-voucher">

                <span>
                  Kode Voucher ✨
                </span>

                <input
                  type="text"
                  defaultValue="XYZMNO"
                />

              </div>

            </section>


            <section className="pkgd-total">

              <strong>
                Total Harga
              </strong>

              <strong>
                {formatCurrency(
                  total,
                )}
              </strong>

            </section>


            <button className="pkgd-continue" onClick={() => {
                      const currentSlug =
                        window.location.pathname
                          .split("/")
                          .filter(Boolean)
                          .pop();

                      if (currentSlug) {
                        const bookingParams =
                          new URLSearchParams({
                            adult:
                              String(adult),
                            child:
                              String(child),
                            infant:
                              String(infant),
                          });

                        window.location.href =
                          `/booking/${currentSlug}?${bookingParams.toString()}`;
                      }
                    }}
                  >
                    Lanjutkan
                  </button>

          </aside>

        </div>


        {/* ================================================
            ADS
        ================================================= */}

        <section className="pkgd-ad">

          <div>

            <small>
              PROMO SPESIAL
            </small>

            <strong>
              Penawaran perjalanan pilihan Segaloka
            </strong>

            <p>
              Temukan promo perjalanan dari Travel pilihan dengan harga spesial.
            </p>

          </div>


          <div className="pkgd-ad-badge">

            <small>
              DISKON
            </small>

            <strong>
              HINGGA
              <br />
              30%
            </strong>

          </div>


          <button
            type="button"
          >
            Lihat Promo
            <ChevronRight size={14} />
          </button>

        </section>


        {/* ================================================
            REKOMENDASI
        ================================================= */}

        <section className="pkgd-recommendations">

          <header className="pkgd-rec-heading">

            <h2>
              Rekomendasi Paket
            </h2>

            <p>
              Paket lain yang mungkin sesuai untuk perjalanan Anda.
            </p>

          </header>


          <div className="pkgd-rec-grid">

            {recommendationCards.map(
              (
                recommendation,
                index,
              ) => {

                const recCategory =
                  getCategory(
                    recommendation,
                  );

                const recTravel =
                  getTravelName(
                    recommendation,
                  );

                const recDuration =
                  recommendation.duration ||
                  "Durasi tersedia";

                const recLocation =
                  recommendation.location ||
                  "Destinasi tersedia";

                return (

                  <a
                    href={`/paket/${recommendation.id}`}
                    className="pkgd-rec-card"
                    key={`${recommendation.id}-${index}`}
                  >


                    <div className="pkgd-rec-image">

                      <img
                        src={
                          recommendation.image
                        }
                        alt={
                          recommendation.title
                        }
                      />


                      <span className="pkgd-rec-category">
                        {recCategory}
                      </span>


                      {recommendation.travelLogo ? (

                        <span className="pkgd-rec-travel-logo">

                          <img
                            src={
                              recommendation.travelLogo
                            }
                            alt={
                              recTravel
                            }
                          />

                        </span>

                      ) : null}


                      <span className="pkgd-rec-rating">

                        <Star
                          size={11}
                          fill="currentColor"
                        />

                        <strong>
                          {
                            recommendation.rating
                          }
                        </strong>

                        <small>
                          (
                          {
                            recommendation.reviews
                          }
                          )
                        </small>

                      </span>

                    </div>


                    <div className="pkgd-rec-body">


                      <div className="pkgd-rec-location">
                        {recLocation}
                      </div>


                      <h3>
                        {
                          recommendation.title
                        }
                      </h3>


                      <div className="pkgd-rec-detail">

                        <span>
                          {recDuration}
                          {" · "}
                          {recLocation.split("·")[0].trim()}
                        </span>

                      </div>


                      <div className="pkgd-rec-journey">

                        <i />

                        <span>
                          {recDuration} perjalanan
                        </span>

                      </div>


                      <div className="pkgd-rec-divider" />


                      <div className="pkgd-rec-price">

                        <div>

                          <small>
                            HARGA
                          </small>

                          <strong>
                            {formatCurrency(
                              recommendation.price,
                            )}
                          </strong>

                        </div>


                        <span className="pkgd-rec-arrow">

                          <ChevronRight
                            size={15}
                          />

                        </span>

                      </div>

                    </div>

                  </a>

                );

              },
            )}

          </div>


          <div className="pkgd-dots">

            <span className="active" />
            <span />
            <span />
            <span />
            <span />
            <span />

          </div>

        </section>

      </div>

    </main>
  );
}


function Participant({
  label,
  note,
  value,
  onChange,
}: {
  label: string;
  note: string;
  value: number;
  onChange: (
    value: number
  ) => void;
}) {

  return (
    <div className="pkgd-participant-row">

      <div>

        <strong>
          {label}
        </strong>

        <span>
          {note}
        </span>

      </div>


      <div className="pkgd-counter">

        <button
          type="button"
          disabled={
            value <= 0
          }
          onClick={() =>
            onChange(
              Math.max(
                0,
                value - 1,
              ),
            )
          }
        >
          <Minus size={11} />
        </button>


        <strong>
          {value}
        </strong>


        <button
          type="button"
          onClick={() =>
            onChange(
              value + 1,
            )
          }
        >
          <Plus size={11} />
        </button>

      </div>

    </div>
  );
}
