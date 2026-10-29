"use client";

import {
  AlertTriangle,
  BedDouble,
  Bus,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  FileText,
  Hotel,
  MapPin,
  MessageSquareText,
  Pencil,
  Plane,
  Plus,
  Save,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import styles from "./AccommodationPackageInfo.module.css";

type PackageInfoSnapshot = {
  periodId: string;
  startDate: string;
  endDate: string;
  traveler: number;
  roomType: string;
  rooms: number;
  pricePerPax: number;
  total: number;
  bookingDeadline: string;
};

type Props = {
  slug: string;
  snapshot: PackageInfoSnapshot;
};

type HotelRow = {
  id: string;
  city: string;
  hotel: string;
  dateIn: string;
  dateOut: string;
  roomType: string;
  reservationNo: string;
};

type FlightRow = {
  id: string;
  from: string;
  to: string;
  date: string;
  etd: string;
  eta: string;
  carrier: string;
  flightNo: string;
  remarks: string;
};

type TransportRow = {
  id: string;
  date: string;
  from: string;
  to: string;
  time: string;
  busTotal: string;
  notes: string;
};

type LocalContact = {
  id: string;
  role: string;
  name: string;
  phone: string;
};

type ChangeRequest = {
  id: string;
  field: string;
  fromValue: string;
  toValue: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};
type OperationalStatus =
  | "WAITING"
  | "SENT"
  | "READY"
  | "IN_PROGRESS"
  | "COMPLETED";

type OperationalService = {
  id: string;
  title: string;
  date: string;
  from: string;
  to: string;
  time: string;
  busCompany: string;
  busNumber: string;
  driverName: string;
  driverPhone: string;
  picName: string;
  picPhone: string;
  meetingPoint: string;
  notes: string;
  status: OperationalStatus;
  updatedAt: string;
};

type OperationalHistory = {
  id: string;
  serviceId: string;
  serviceTitle: string;
  summary: string;
  actor: string;
  createdAt: string;
};

const PRODUCT = {
  bookingCode: "SGK-LA-001",
  product: "Land Arrangement Makkah & Madinah",
  destination: "Makkah & Madinah",
  provider: "Penyedia LA",
  packageInfoStatus: "DRAFT",
};

function snapshotDate(value: string) {
  if (!value) return "-";

  const parsed =
    new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function snapshotRoomLabel(value: string) {
  if (value === "double") return "Double";
  if (value === "triple") return "Triple";
  return "Quad";
}

function createInitialHotels(
  snapshot: PackageInfoSnapshot,
): HotelRow[] {
  const roomType =
    snapshotRoomLabel(snapshot.roomType);

  const startDate =
    snapshot.startDate
      ? snapshotDate(snapshot.startDate)
      : "Menunggu Penyedia";

  const endDate =
    snapshot.endDate
      ? snapshotDate(snapshot.endDate)
      : "Menunggu Penyedia";

  return [
    {
      id: "hotel-madinah",
      city: "Madinah",
      hotel: "Menunggu Penyedia",
      dateIn: startDate,
      dateOut: "Menunggu Penyedia",
      roomType,
      reservationNo: "",
    },
    {
      id: "hotel-makkah",
      city: "Makkah",
      hotel: "Menunggu Penyedia",
      dateIn: "Menunggu Penyedia",
      dateOut: endDate,
      roomType,
      reservationNo: "",
    },
  ];
}

const initialFlights: FlightRow[] = [
  {
    id: "flight-1",
    from: "",
    to: "",
    date: "",
    etd: "",
    eta: "",
    carrier: "",
    flightNo: "",
    remarks: "",
  },
];

const initialTransport: TransportRow[] = [
  {
    id: "transport-1",
    date: "",
    from: "Jeddah Airport",
    to: "Madinah Hotel",
    time: "",
    busTotal: "",
    notes: "",
  },
  {
    id: "transport-2",
    date: "",
    from: "Madinah Hotel",
    to: "City Tour Madinah",
    time: "",
    busTotal: "",
    notes: "",
  },
  {
    id: "transport-3",
    date: "",
    from: "Madinah Hotel",
    to: "Makkah Hotel",
    time: "",
    busTotal: "",
    notes: "",
  },
  {
    id: "transport-4",
    date: "",
    from: "Makkah Hotel",
    to: "City Tour Makkah",
    time: "",
    busTotal: "",
    notes: "",
  },
  {
    id: "transport-5",
    date: "",
    from: "Makkah Hotel",
    to: "Jeddah Airport",
    time: "",
    busTotal: "",
    notes: "",
  },
];

const initialContacts: LocalContact[] = [
  {
    id: "contact-1",
    role: "Tour Leader",
    name: "",
    phone: "",
  },
  {
    id: "contact-2",
    role: "Mutawif",
    name: "",
    phone: "",
  },
  {
    id: "contact-3",
    role: "Handling",
    name: "",
    phone: "",
  },
];

function SectionTitle({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div className={styles.sectionIcon}>
        {icon}
      </div>

      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

const initialOperationalServices: OperationalService[] = [
  {
    id: "arrival-transfer",
    title: "Airport Jeddah → Hotel Madinah",
    date: "",
    from: "Jeddah Airport",
    to: "Hotel Madinah",
    time: "",
    busCompany: "",
    busNumber: "",
    driverName: "",
    driverPhone: "",
    picName: "",
    picPhone: "",
    meetingPoint: "",
    notes: "",
    status: "WAITING",
    updatedAt: "",
  },
  {
    id: "madinah-city-tour",
    title: "City Tour Madinah",
    date: "",
    from: "Hotel Madinah",
    to: "City Tour Madinah",
    time: "",
    busCompany: "",
    busNumber: "",
    driverName: "",
    driverPhone: "",
    picName: "",
    picPhone: "",
    meetingPoint: "",
    notes: "",
    status: "WAITING",
    updatedAt: "",
  },
  {
    id: "madinah-makkah",
    title: "Madinah → Makkah",
    date: "",
    from: "Hotel Madinah",
    to: "Hotel Makkah",
    time: "",
    busCompany: "",
    busNumber: "",
    driverName: "",
    driverPhone: "",
    picName: "",
    picPhone: "",
    meetingPoint: "",
    notes: "",
    status: "WAITING",
    updatedAt: "",
  },
  {
    id: "makkah-city-tour",
    title: "City Tour Makkah",
    date: "",
    from: "Hotel Makkah",
    to: "City Tour Makkah",
    time: "",
    busCompany: "",
    busNumber: "",
    driverName: "",
    driverPhone: "",
    picName: "",
    picPhone: "",
    meetingPoint: "",
    notes: "",
    status: "WAITING",
    updatedAt: "",
  },
  {
    id: "masyair",
    title: "Masyair",
    date: "",
    from: "",
    to: "",
    time: "",
    busCompany: "",
    busNumber: "",
    driverName: "",
    driverPhone: "",
    picName: "",
    picPhone: "",
    meetingPoint: "",
    notes: "",
    status: "WAITING",
    updatedAt: "",
  },
  {
    id: "departure-transfer",
    title: "Hotel Makkah → Airport Jeddah",
    date: "",
    from: "Hotel Makkah",
    to: "Jeddah Airport",
    time: "",
    busCompany: "",
    busNumber: "",
    driverName: "",
    driverPhone: "",
    picName: "",
    picPhone: "",
    meetingPoint: "",
    notes: "",
    status: "WAITING",
    updatedAt: "",
  },
];
export function AccommodationPackageInfoClient({
  slug,
  snapshot,
}: Props) {
  const bookingSnapshot = {
    bookingCode: PRODUCT.bookingCode,
    product: PRODUCT.product,
    destination: PRODUCT.destination,
    period:
      `${snapshotDate(snapshot.startDate)} – ${snapshotDate(snapshot.endDate)}`,
    roomType:
      snapshotRoomLabel(snapshot.roomType),
    rooms: snapshot.rooms,
    travelers: snapshot.traveler,
    provider: PRODUCT.provider,
    packageInfoStatus:
      PRODUCT.packageInfoStatus,
  };

  const sharedQuery =
    new URLSearchParams({
      periodId: snapshot.periodId,
      startDate: snapshot.startDate,
      endDate: snapshot.endDate,
      traveler: String(snapshot.traveler),
      roomType: snapshot.roomType,
      rooms: String(snapshot.rooms),
      pricePerPax: String(snapshot.pricePerPax),
      total: String(snapshot.total),
      bookingDeadline: snapshot.bookingDeadline,
    }).toString();

  const orderHref =
    `/booking/${slug}/pesanan?${sharedQuery}`;
  const [hotels, setHotels] =
    useState<HotelRow[]>(() =>
      createInitialHotels(snapshot),
    );

  const [flights, setFlights] =
    useState<FlightRow[]>(initialFlights);

  const [transport, setTransport] =
    useState<TransportRow[]>(initialTransport);

  const [contacts, setContacts] =
    useState<LocalContact[]>(initialContacts);

  const [notes, setNotes] = useState("");

  const [tourLeader, setTourLeader] =
    useState("");

  const [groupName, setGroupName] =
    useState("");

  const [changeRequests, setChangeRequests] =
    useState<ChangeRequest[]>([]);
  const [operationalServices, setOperationalServices] =
    useState<OperationalService[]>(initialOperationalServices);

  const [operationalHistory, setOperationalHistory] =
    useState<OperationalHistory[]>([]);

  const [activeOperationalServiceId, setActiveOperationalServiceId] =
    useState<string>(initialOperationalServices[0]?.id ?? "");

  const [editingHotel, setEditingHotel] =
    useState<HotelRow | null>(null);

  const [hotelDraft, setHotelDraft] =
    useState("");

  const [changeReason, setChangeReason] =
    useState("");

  const [saved, setSaved] = useState(false);

  const completedSections = useMemo(() => {
    let completed = 1;

    if (
      flights.some(
        (item) =>
          item.from &&
          item.to &&
          item.date &&
          item.carrier &&
          item.flightNo,
      )
    ) {
      completed += 1;
    }

    if (
      transport.some(
        (item) =>
          item.date &&
          item.from &&
          item.to,
      )
    ) {
      completed += 1;
    }

    if (
      notes.trim() ||
      groupName.trim() ||
      tourLeader.trim()
    ) {
      completed += 1;
    }

    if (
      contacts.some(
        (item) =>
          item.name.trim() &&
          item.phone.trim(),
      )
    ) {
      completed += 1;
    }

    return completed;
  }, [
    contacts,
    flights,
    groupName,
    notes,
    tourLeader,
    transport,
  ]);

  const progress =
    Math.round((completedSections / 5) * 100);

  function updateFlight(
    id: string,
    field: keyof FlightRow,
    value: string,
  ) {
    setFlights((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );

    setSaved(false);
  }

  function updateTransport(
    id: string,
    field: keyof TransportRow,
    value: string,
  ) {
    setTransport((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );

    setSaved(false);
  }

  function updateContact(
    id: string,
    field: keyof LocalContact,
    value: string,
  ) {
    setContacts((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );

    setSaved(false);
  }

  function updateReservation(
    id: string,
    value: string,
  ) {
    setHotels((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              reservationNo: value,
            }
          : item,
      ),
    );

    setSaved(false);
  }

  function openHotelChange(
    hotel: HotelRow,
  ) {
    setEditingHotel(hotel);
    setHotelDraft(hotel.hotel);
    setChangeReason("");
  }

  function submitHotelChange() {
    if (
      !editingHotel ||
      !hotelDraft.trim() ||
      hotelDraft.trim() === editingHotel.hotel
    ) {
      return;
    }

    const request: ChangeRequest = {
      id: `change-${Date.now()}`,
      field: `Hotel ${editingHotel.city}`,
      fromValue: editingHotel.hotel,
      toValue: hotelDraft.trim(),
      reason:
        changeReason.trim() ||
        "Penyesuaian operasional penyedia.",
      status: "PENDING",
    };

    setChangeRequests((current) => [
      request,
      ...current,
    ]);

    setEditingHotel(null);
    setHotelDraft("");
    setChangeReason("");
  }

  function updateOperationalService<K extends keyof OperationalService>(
    serviceId: string,
    field: K,
    value: OperationalService[K],
  ) {
    setOperationalServices((current) =>
      current.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              [field]: value,
            }
          : service,
      ),
    );
  }

  function publishOperationalUpdate(serviceId: string) {
    const service = operationalServices.find(
      (item) => item.id === serviceId,
    );

    if (!service) {
      return;
    }

    const updatedAt = new Date().toLocaleString("id-ID");

    const publishedStatus: OperationalStatus =
      service.status === "WAITING"
        ? "SENT"
        : service.status;

    setOperationalServices((current) =>
      current.map((item) =>
        item.id === serviceId
          ? {
              ...item,
              status: publishedStatus,
              updatedAt,
            }
          : item,
      ),
    );

    const summary =
      [
        service.busNumber
          ? `Bus ${service.busNumber}`
          : "",
        service.driverName
          ? `Driver ${service.driverName}`
          : "",
        service.picName
          ? `PIC ${service.picName}`
          : "",
        service.time
          ? `Pukul ${service.time}`
          : "",
      ]
        .filter(Boolean)
        .join(" · ") || "Detail operasional diperbarui.";

    setOperationalHistory((current) => [
      {
        id: `operational-history-${Date.now()}`,
        serviceId: service.id,
        serviceTitle: service.title,
        summary,
        actor: "Penyedia / Vendor",
        createdAt: updatedAt,
      },
      ...current,
    ]);
  }
  function approveChange(
    request: ChangeRequest,
  ) {
    const city =
      request.field.replace("Hotel ", "");

    setHotels((current) =>
      current.map((item) =>
        item.city === city
          ? {
              ...item,
              hotel: request.toValue,
            }
          : item,
      ),
    );

    setChangeRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: "APPROVED",
            }
          : item,
      ),
    );
  }

  function rejectChange(
    request: ChangeRequest,
  ) {
    setChangeRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: "REJECTED",
            }
          : item,
      ),
    );
  }

  function addFlight() {
    setFlights((current) => [
      ...current,
      {
        id: `flight-${Date.now()}`,
        from: "",
        to: "",
        date: "",
        etd: "",
        eta: "",
        carrier: "",
        flightNo: "",
        remarks: "",
      },
    ]);
  }

  function addTransport() {
    setTransport((current) => [
      ...current,
      {
        id: `transport-${Date.now()}`,
        date: "",
        from: "",
        to: "",
        time: "",
        busTotal: "",
        notes: "",
      },
    ]);
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <a href="/">Beranda</a>
          <ChevronRight size={12} />
          <a href={orderHref}>
            Detail Pesanan
          </a>
          <ChevronRight size={12} />
          <strong>Paket Info</strong>
        </nav>

        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>
              LAND ARRANGEMENT · UMRAH
            </span>

            <h1>Paket Info</h1>

            <p>
              Informasi perjalanan dan operasional
              untuk satu pesanan LA Umrah.
            </p>
          </div>

          <div className={styles.heroStatus}>
            <span>
              <CircleDot size={14} />
              Dalam penyusunan
            </span>

            <strong>{progress}% lengkap</strong>
          </div>
        </section>

        <div className={styles.layout}>
          <div className={styles.main}>
            <section className={styles.card}>
              <SectionTitle
                icon={<FileText size={20} />}
                eyebrow="OTOMATIS DARI TRANSAKSI"
                title="Ringkasan Pesanan"
                description="Data dasar ini berasal dari snapshot transaksi."
              />

              <div className={styles.summaryGrid}>
                <div>
                  <span>Kode Booking</span>
                  <strong>
                    {bookingSnapshot.bookingCode}
                  </strong>
                </div>

                <div>
                  <span>Produk</span>
                  <strong>
                    {bookingSnapshot.product}
                  </strong>
                </div>

                <div>
                  <span>Periode</span>
                  <strong>
                    {bookingSnapshot.period}
                  </strong>
                </div>

                <div>
                  <span>Tipe Kamar</span>
                  <strong>
                    {bookingSnapshot.roomType}
                  </strong>
                </div>

                <div>
                  <span>Jumlah Kamar</span>
                  <strong>
                    {bookingSnapshot.rooms}
                  </strong>
                </div>

                <div>
                  <span>Traveler</span>
                  <strong>
                    {bookingSnapshot.travelers} orang
                  </strong>
                </div>

                <div>
                  <span>Harga / Traveler</span>
                  <strong>
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }).format(snapshot.pricePerPax)}
                  </strong>
                </div>

                <div>
                  <span>Total Transaksi</span>
                  <strong>
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }).format(snapshot.total)}
                  </strong>
                </div>
              </div>

              <div className={styles.snapshotNotice}>
                <ShieldCheck size={18} />

                <div>
                  <strong>
                    Snapshot transaksi dilindungi
                  </strong>
                  <p>
                    Perubahan komponen utama tidak
                    langsung menimpa data transaksi.
                  </p>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <SectionTitle
                icon={<Hotel size={20} />}
                eyebrow="HOTEL ACCOMMODATION"
                title="Akomodasi"
                description="Data yang sudah tersedia dari transaksi terisi otomatis. Detail hotel, pembagian tanggal menginap, dan nomor reservasi yang belum tersedia dilengkapi penyedia. Perubahan material membutuhkan persetujuan pemesan."
              />

              <div className={styles.hotelList}>
                {hotels.map((hotel) => (
                  <article
                    key={hotel.id}
                    className={styles.hotelRow}
                  >
                    <div className={styles.hotelTop}>
                      <div>
                        <MapPin size={17} />
                        <strong>{hotel.city}</strong>
                      </div>

                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() =>
                          openHotelChange(hotel)
                        }
                      >
                        <Pencil size={14} />
                        Ajukan Perubahan
                      </button>
                    </div>

                    <div className={styles.hotelFields}>
                      <label>
                        <span>City</span>
                        <input
                          value={hotel.city}
                          readOnly
                        />
                      </label>

                      <label>
                        <span>Hotel</span>
                        <input
                          value={hotel.hotel}
                          readOnly
                        />
                      </label>

                      <label>
                        <span>Date In</span>
                        <input
                          value={hotel.dateIn}
                          readOnly
                        />
                      </label>

                      <label>
                        <span>Date Out</span>
                        <input
                          value={hotel.dateOut}
                          readOnly
                        />
                      </label>

                      <label>
                        <span>Type Room</span>
                        <input
                          value={hotel.roomType}
                          readOnly
                        />
                      </label>

                      <label>
                        <span>Resv No.</span>
                        <input
                          value={hotel.reservationNo}
                          placeholder="Menunggu Penyedia"
                          onChange={(event) =>
                            updateReservation(
                              hotel.id,
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <SectionTitle
                icon={<UsersRound size={20} />}
                eyebrow="GROUP INFORMATION"
                title="Informasi Grup"
                description="Diisi oleh pemesan atau Travel."
              />

              <div className={styles.formGrid}>
                <label>
                  <span>Nama Grup / Sub Agent</span>
                  <input
                    value={groupName}
                    placeholder="Contoh: Group Desember"
                    onChange={(event) => {
                      setGroupName(event.target.value);
                      setSaved(false);
                    }}
                  />
                </label>

                <label>
                  <span>Tour Leader</span>
                  <input
                    value={tourLeader}
                    placeholder="Nama Tour Leader"
                    onChange={(event) => {
                      setTourLeader(event.target.value);
                      setSaved(false);
                    }}
                  />
                </label>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.headingAction}>
                <SectionTitle
                  icon={<Plane size={20} />}
                  eyebrow="FLIGHT INFORMATION"
                  title="Informasi Penerbangan"
                  description="Diisi pemesan sesuai tiket atau jadwal penerbangan grup."
                />

                <button
                  type="button"
                  className={styles.addButton}
                  onClick={addFlight}
                >
                  <Plus size={15} />
                  Tambah Flight
                </button>
              </div>

              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>To</th>
                      <th>Date</th>
                      <th>ETD</th>
                      <th>ETA</th>
                      <th>Carrier</th>
                      <th>Flight No.</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>

                  <tbody>
                    {flights.map((flight) => (
                      <tr key={flight.id}>
                        {(
                          [
                            "from",
                            "to",
                            "date",
                            "etd",
                            "eta",
                            "carrier",
                            "flightNo",
                            "remarks",
                          ] as (keyof FlightRow)[]
                        ).map((field) => (
                          <td key={field}>
                            <input
                              value={flight[field]}
                              onChange={(event) =>
                                updateFlight(
                                  flight.id,
                                  field,
                                  event.target.value,
                                )
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.headingAction}>
                <SectionTitle
                  icon={<Bus size={20} />}
                  eyebrow="TRANSPORT"
                  title="Rencana Transportasi"
                  description="Pemesan mengisi rencana layanan. Detail bus dan driver aktual dilengkapi penyedia pada operasional perjalanan."
                />

                <button
                  type="button"
                  className={styles.addButton}
                  onClick={addTransport}
                >
                  <Plus size={15} />
                  Tambah Rute
                </button>
              </div>

              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Time</th>
                      <th>Total Bus</th>
                      <th>Catatan</th>
                    </tr>
                  </thead>

                  <tbody>
                    {transport.map((item) => (
                      <tr key={item.id}>
                        {(
                          [
                            "date",
                            "from",
                            "to",
                            "time",
                            "busTotal",
                            "notes",
                          ] as (keyof TransportRow)[]
                        ).map((field) => (
                          <td key={field}>
                            <input
                              value={item[field]}
                              onChange={(event) =>
                                updateTransport(
                                  item.id,
                                  field,
                                  event.target.value,
                                )
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.infoBox}>
                <Bus size={18} />
                <p>
                  Nomor bus, driver, kontak driver,
                  perusahaan transport dan detail
                  aktual tidak perlu diisi pemesan.
                  Data tersebut akan dikirim penyedia
                  pada workspace operasional.
                </p>
              </div>
            </section>

            <section className={styles.card}>
              <SectionTitle
                icon={<MessageSquareText size={20} />}
                eyebrow="NOTED"
                title="Catatan Perjalanan"
                description="Informasi tambahan yang perlu diketahui penyedia."
              />

              <textarea
                className={styles.textarea}
                value={notes}
                placeholder="Tulis catatan perjalanan..."
                onChange={(event) => {
                  setNotes(event.target.value);
                  setSaved(false);
                }}
              />
            </section>

            <section className={styles.card}>
              <SectionTitle
                icon={<UserRound size={20} />}
                eyebrow="LOCAL CONTACT PERSON"
                title="Kontak Lokal"
                description="Kontak dapat dilengkapi oleh pemesan maupun penyedia sesuai perannya."
              />

              <div className={styles.contactList}>
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={styles.contactRow}
                  >
                    <label>
                      <span>Peran</span>
                      <input
                        value={contact.role}
                        onChange={(event) =>
                          updateContact(
                            contact.id,
                            "role",
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>Nama</span>
                      <input
                        value={contact.name}
                        onChange={(event) =>
                          updateContact(
                            contact.id,
                            "name",
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>Nomor Telepon / WhatsApp</span>
                      <input
                        value={contact.phone}
                        onChange={(event) =>
                          updateContact(
                            contact.id,
                            "phone",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>

                        <section className={styles.card}>
              <SectionTitle
                icon={<Clock3 size={20} />}
                eyebrow="VENDOR OPERATIONAL WORKSPACE"
                title="Operasional Penyedia"
                description="Detail aktual seperti bus, driver, PIC, meeting point, jadwal dan status layanan diperbarui penyedia. Update operasional tidak mengubah komitmen paket dan tidak membutuhkan persetujuan pemesan."
              />

              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                {operationalServices.map((service) => {
                  const isActive =
                    activeOperationalServiceId === service.id;

                  const statusLabel =
                    service.status === "WAITING"
                      ? "Menunggu Detail"
                      : service.status === "SENT"
                        ? "Detail Dikirim"
                        : service.status === "READY"
                          ? "Siap"
                          : service.status === "IN_PROGRESS"
                            ? "Sedang Berjalan"
                            : "Selesai";

                  return (
                    <article
                      key={service.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 16,
                        overflow: "hidden",
                        background: "#fff",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveOperationalServiceId(
                            isActive ? "" : service.id,
                          )
                        }
                        style={{
                          width: "100%",
                          border: 0,
                          background: "#fff",
                          padding: "16px 18px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 14,
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <span>
                          <strong
                            style={{
                              display: "block",
                              fontSize: 14,
                              color: "#0f172a",
                            }}
                          >
                            {service.title}
                          </strong>

                          <small
                            style={{
                              display: "block",
                              marginTop: 4,
                              color: "#64748b",
                            }}
                          >
                            {service.updatedAt
                              ? `Terakhir diperbarui ${service.updatedAt}`
                              : "Menunggu detail penyedia"}
                          </small>
                        </span>

                        <span
                          style={{
                            flexShrink: 0,
                            padding: "6px 10px",
                            borderRadius: 999,
                            background:
                              service.status === "COMPLETED"
                                ? "#dcfce7"
                                : service.status === "IN_PROGRESS"
                                  ? "#dbeafe"
                                  : service.status === "READY"
                                    ? "#e0f2fe"
                                    : service.status === "SENT"
                                      ? "#fef3c7"
                                      : "#f1f5f9",
                            color:
                              service.status === "COMPLETED"
                                ? "#166534"
                                : service.status === "IN_PROGRESS"
                                  ? "#1d4ed8"
                                  : service.status === "READY"
                                    ? "#0369a1"
                                    : service.status === "SENT"
                                      ? "#92400e"
                                      : "#475569",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </button>

                      {isActive && (
                        <div
                          style={{
                            padding: "16px 18px 18px",
                            borderTop: "1px solid #f1f5f9",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(190px, 1fr))",
                              gap: 12,
                            }}
                          >
                            <label>
                              <span>Tanggal</span>
                              <input
                                type="date"
                                value={service.date}
                                onChange={(event) =>
                                  updateOperationalService(
                                    service.id,
                                    "date",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Waktu</span>
                              <input
                                type="time"
                                value={service.time}
                                onChange={(event) =>
                                  updateOperationalService(
                                    service.id,
                                    "time",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Dari</span>
                              <input
                                value={service.from}
                                onChange={(event) =>
                                  updateOperationalService(
                                    service.id,
                                    "from",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Tujuan</span>
                              <input
                                value={service.to}
                                onChange={(event) =>
                                  updateOperationalService(
                                    service.id,
                                    "to",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Perusahaan Bus</span>
                              <input
                                value={service.busCompany}
                                placeholder="Menunggu penyedia"
                                onChange={(event) =>
                                  updateOperationalService(
                                    service.id,
                                    "busCompany",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Nomor Bus / Kendaraan</span>
                              <input
                                value={service.busNumber}
                                placeholder="Menunggu penyedia"
                                onChange={(event) =>
                                  updateOperationalService(
                                    service.id,
                                    "busNumber",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Nama Driver</span>
                              <input
                                value={service.driverName}
                                placeholder="Menunggu penyedia"
                                onChange={(event) =>
                                  updateOperationalService(
                                    service.id,
                                    "driverName",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Kontak Driver</span>
                              <input
                                type="tel"
                                value={service.driverPhone}
                                placeholder="+966..."
                                onChange={(event) =>
                                  updateOperationalService(
                                    service.id,
                                    "driverPhone",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>PIC / Handling</span>
                              <input
                                value={service.picName}
                                placeholder="Menunggu penyedia"
                                onChange={(event) =>
                                  updateOperationalService(
                                    service.id,
                                    "picName",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Kontak PIC</span>
                              <input
                                type="tel"
                                value={service.picPhone}
                                placeholder="+966..."
                                onChange={(event) =>
                                  updateOperationalService(
                                    service.id,
                                    "picPhone",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Meeting Point</span>
                              <input
                                value={service.meetingPoint}
                                placeholder="Lokasi berkumpul"
                                onChange={(event) =>
                                  updateOperationalService(
                                    service.id,
                                    "meetingPoint",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Status Layanan</span>
                              <select
                                value={service.status}
                                onChange={(event) =>
                                  updateOperationalService(
                                    service.id,
                                    "status",
                                    event.target
                                      .value as OperationalStatus,
                                  )
                                }
                              >
                                <option value="WAITING">
                                  Menunggu Detail
                                </option>
                                <option value="SENT">
                                  Detail Dikirim Vendor
                                </option>
                                <option value="READY">
                                  Siap
                                </option>
                                <option value="IN_PROGRESS">
                                  Sedang Berjalan
                                </option>
                                <option value="COMPLETED">
                                  Selesai
                                </option>
                              </select>
                            </label>
                          </div>

                          <label
                            style={{
                              display: "block",
                              marginTop: 12,
                            }}
                          >
                            <span>Catatan Operasional</span>
                            <textarea
                              value={service.notes}
                              placeholder="Catatan perjalanan, titik jemput, instruksi khusus, dan informasi operasional lainnya."
                              onChange={(event) =>
                                updateOperationalService(
                                  service.id,
                                  "notes",
                                  event.target.value,
                                )
                              }
                            />
                          </label>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              marginTop: 14,
                            }}
                          >
                            <button
                              type="button"
                              className={styles.primaryButton}
                              onClick={() =>
                                publishOperationalUpdate(
                                  service.id,
                                )
                              }
                            >
                              Publikasikan Update
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {operationalHistory.length > 0 && (
                <div
                  style={{
                    marginTop: 18,
                    paddingTop: 18,
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      marginBottom: 10,
                      color: "#0f172a",
                    }}
                  >
                    Riwayat Update Operasional
                  </strong>

                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    {operationalHistory.map((history) => (
                      <article
                        key={history.id}
                        style={{
                          padding: "12px 14px",
                          border: "1px solid #e2e8f0",
                          borderRadius: 12,
                          background: "#f8fafc",
                        }}
                      >
                        <strong
                          style={{
                            display: "block",
                            fontSize: 13,
                          }}
                        >
                          {history.serviceTitle}
                        </strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: 4,
                            fontSize: 12,
                            color: "#475569",
                          }}
                        >
                          {history.summary}
                        </span>

                        <small
                          style={{
                            display: "block",
                            marginTop: 5,
                            color: "#94a3b8",
                          }}
                        >
                          {history.actor} · {history.createdAt}
                        </small>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>
{changeRequests.length > 0 && (
              <section className={styles.card}>
                <SectionTitle
                  icon={<Clock3 size={20} />}
                  eyebrow="CHANGE REQUEST"
                  title="Persetujuan Perubahan"
                  description="Perubahan material harus disetujui pemesan sebelum menjadi data Paket Info aktif."
                />

                <div className={styles.changeList}>
                  {changeRequests.map((request) => (
                    <article
                      key={request.id}
                      className={styles.changeCard}
                    >
                      <div className={styles.changeHeader}>
                        <div>
                          <span>{request.field}</span>

                          <strong>
                            {request.status === "PENDING"
                              ? "Menunggu Persetujuan"
                              : request.status === "APPROVED"
                                ? "Disetujui"
                                : "Ditolak"}
                          </strong>
                        </div>

                        <span
                          className={`${styles.changeStatus} ${
                            request.status === "APPROVED"
                              ? styles.approved
                              : request.status === "REJECTED"
                                ? styles.rejected
                                : ""
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>

                      <div className={styles.changeCompare}>
                        <div>
                          <span>Sebelumnya</span>
                          <strong>
                            {request.fromValue}
                          </strong>
                        </div>

                        <ChevronRight size={18} />

                        <div>
                          <span>Diusulkan</span>
                          <strong>
                            {request.toValue}
                          </strong>
                        </div>
                      </div>

                      <p>{request.reason}</p>

                      {request.status === "PENDING" && (
                        <div className={styles.changeActions}>
                          <button
                            type="button"
                            className={styles.rejectButton}
                            onClick={() =>
                              rejectChange(request)
                            }
                          >
                            <X size={15} />
                            Tolak
                          </button>

                          <button
                            type="button"
                            className={styles.approveButton}
                            onClick={() =>
                              approveChange(request)
                            }
                          >
                            <Check size={15} />
                            Setujui
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className={styles.sidebar}>
            <section className={styles.sideCard}>
              <div className={styles.progressTop}>
                <div>
                  <span>Kelengkapan Paket Info</span>
                  <strong>{progress}%</strong>
                </div>

                <div className={styles.progressTrack}>
                  <span
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>

              <div className={styles.checklist}>
                <div className={styles.done}>
                  <CheckCircle2 size={17} />
                  <span>Data transaksi</span>
                </div>

                <div>
                  <CircleDot size={17} />
                  <span>Flight Information</span>
                </div>

                <div>
                  <CircleDot size={17} />
                  <span>Transport</span>
                </div>

                <div>
                  <CircleDot size={17} />
                  <span>Noted</span>
                </div>

                <div>
                  <CircleDot size={17} />
                  <span>Local Contact</span>
                </div>
              </div>

              <button
                type="button"
                className={styles.saveButton}
                onClick={() => setSaved(true)}
              >
                {saved ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <Save size={17} />
                )}

                {saved
                  ? "Tersimpan Sementara"
                  : "Simpan Paket Info"}
              </button>

              <small>
                Prototype UI lokal. Data belum
                dikirim ke server.
              </small>
            </section>

            <section className={styles.sideCard}>
              <strong className={styles.sideTitle}>
                Alur Berikutnya
              </strong>

              <div className={styles.timeline}>
                <div className={styles.timelineActive}>
                  <span>1</span>
                  <div>
                    <strong>Paket Info</strong>
                    <small>
                      Pemesan melengkapi informasi.
                    </small>
                  </div>
                </div>

                <div>
                  <span>2</span>
                  <div>
                    <strong>Data Traveler</strong>
                    <small>
                      Lengkapi traveler & paspor.
                    </small>
                  </div>
                </div>

                <div>
                  <span>3</span>
                  <div>
                    <strong>Persiapan Vendor</strong>
                    <small>
                      Hotel, visa dan operasional.
                    </small>
                  </div>
                </div>

                <div>
                  <span>4</span>
                  <div>
                    <strong>Operasional</strong>
                    <small>
                      Bus, driver, handling,
                      Masyair dan layanan.
                    </small>
                  </div>
                </div>

                <div>
                  <span>5</span>
                  <div>
                    <strong>CL</strong>
                    <small>
                      Confirmation Letter.
                    </small>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.warningCard}>
              <AlertTriangle size={18} />

              <div>
                <strong>
                  Perubahan material
                </strong>

                <p>
                  Hotel, tanggal, kota dan tipe
                  kamar tidak boleh berubah tanpa
                  persetujuan pemesan.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {editingHotel && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() =>
            setEditingHotel(null)
          }
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className={styles.modalHeader}>
              <div>
                <span>PERUBAHAN MATERIAL</span>
                <h2>
                  Ajukan Perubahan Hotel
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingHotel(null)
                }
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalCurrent}>
              <span>Hotel saat ini</span>
              <strong>
                {editingHotel.hotel}
              </strong>
            </div>

            <label className={styles.modalField}>
              <span>Hotel Pengganti</span>
              <input
                autoFocus
                value={hotelDraft}
                onChange={(event) =>
                  setHotelDraft(
                    event.target.value,
                  )
                }
              />
            </label>

            <label className={styles.modalField}>
              <span>Alasan Perubahan</span>
              <textarea
                value={changeReason}
                placeholder="Jelaskan alasan perubahan..."
                onChange={(event) =>
                  setChangeReason(
                    event.target.value,
                  )
                }
              />
            </label>

            <div className={styles.modalNotice}>
              <ShieldCheck size={17} />
              <p>
                Hotel aktif tidak berubah sampai
                pemesan menyetujui permintaan ini.
              </p>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() =>
                  setEditingHotel(null)
                }
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.submitButton}
                onClick={submitHotelChange}
              >
                Kirim Permintaan
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}