"use client";

import Link from "next/link";

import {
  BedDouble,
  Bus,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleEllipsis,
  Clock3,
  FileCheck2,
  FileText,
  Hotel,
  MapPin,
  Plane,
  ReceiptText,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import styles from "./AccommodationOrder.module.css";

type OrderSnapshot = {
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
  snapshot: OrderSnapshot;
};

type OrderStage = {
  key: string;
  title: string;
  description: string;
  status: "DONE" | "ACTIVE" | "WAITING";
};

const PRODUCT = {
  bookingCode: "SGK-LA-001",
  product: "Land Arrangement Makkah & Madinah",
  destination: "Makkah & Madinah",
  country: "Arab Saudi",
  duration: "9 Hari",
};

function formatDate(value: string) {
  if (!value) return "-";

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function roomLabel(value: string) {
  if (value === "double") return "Double";
  if (value === "triple") return "Triple";
  return "Quad";
}

function travelerDeadline(
  startDate: string,
  days = 30,
) {
  if (!startDate) return "-";

  const parsed =
    new Date(`${startDate}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  parsed.setDate(parsed.getDate() - days);

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

const stages: OrderStage[] = [
  {
    key: "transaction",
    title: "Transaksi",
    description: "Pesanan dan pembayaran tercatat.",
    status: "DONE",
  },
  {
    key: "traveler",
    title: "Data Traveler",
    description: "Lengkapi traveler dan data paspor.",
    status: "ACTIVE",
  },
  {
    key: "package-info",
    title: "Paket Info",
    description: "Informasi perjalanan dan kebutuhan operasional.",
    status: "ACTIVE",
  },
  {
    key: "vendor",
    title: "Persiapan Vendor",
    description: "Hotel, visa, transport dan layanan lokal.",
    status: "WAITING",
  },
  {
    key: "operation",
    title: "Operasional",
    description: "Detail layanan selama perjalanan.",
    status: "WAITING",
  },
  {
    key: "cl",
    title: "Confirmation Letter",
    description: "CL mengikuti kesiapan booking.",
    status: "WAITING",
  },
];

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function StatusBadge({
  status,
}: {
  status: "DONE" | "ACTIVE" | "WAITING";
}) {
  if (status === "DONE") {
    return (
      <span className={`${styles.status} ${styles.done}`}>
        <CheckCircle2 size={13} />
        Selesai
      </span>
    );
  }

  if (status === "ACTIVE") {
    return (
      <span className={`${styles.status} ${styles.active}`}>
        <Clock3 size={13} />
        Perlu dilengkapi
      </span>
    );
  }

  return (
    <span className={`${styles.status} ${styles.waiting}`}>
      <CircleEllipsis size={13} />
      Menunggu
    </span>
  );
}

export function AccommodationOrderClient({
  slug,
  snapshot,
}: Props) {
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
    });

  const sharedQueryString =
    sharedQuery.toString();

  const orderSnapshot = {
    bookingCode: PRODUCT.bookingCode,
    product: PRODUCT.product,
    destination: PRODUCT.destination,
    country: PRODUCT.country,
    duration: PRODUCT.duration,
    period:
      `${formatDate(snapshot.startDate)} – ${formatDate(snapshot.endDate)}`,
    roomType: roomLabel(snapshot.roomType),
    rooms: snapshot.rooms,
    travelers: snapshot.traveler,
    pricePerPax: snapshot.pricePerPax,
    total: snapshot.total,
    travelerDeadline:
      travelerDeadline(snapshot.startDate),
  };

  const packageInfoHref =
    `/booking/${slug}/paket-info?${sharedQueryString}`;

  const travelerHref =
    `/booking/${slug}/traveler?${sharedQueryString}`;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <a href="/">Beranda</a>
          <ChevronRight size={12} />
          <a href="/akomodasi">Akomodasi & LA</a>
          <ChevronRight size={12} />
          <a href={`/akomodasi/${slug}`}>
            Detail Akomodasi
          </a>
          <ChevronRight size={12} />
          <strong>Detail Pesanan</strong>
        </nav>

        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>
              DETAIL PESANAN LA
            </span>

            <h1>{orderSnapshot.product}</h1>

            <p>
              Pantau transaksi, traveler, Paket Info,
              persiapan vendor hingga operasional
              perjalanan dalam satu halaman.
            </p>
          </div>

          <div className={styles.heroStatus}>
            <span>
              <ShieldCheck size={15} />
              Kode Booking
            </span>

            <strong>
              {orderSnapshot.bookingCode}
            </strong>
          </div>
        </section>

        <div className={styles.layout}>
          <div className={styles.main}>
            <section className={styles.card}>
              <div className={styles.sectionHeading}>
                <div className={styles.sectionIcon}>
                  <ReceiptText size={20} />
                </div>

                <div>
                  <span>TRANSAKSI</span>
                  <h2>Ringkasan Pesanan</h2>
                  <p>
                    Data ini merupakan snapshot
                    transaksi yang menjadi acuan
                    proses berikutnya.
                  </p>
                </div>
              </div>

              <div className={styles.summaryGrid}>
                <div>
                  <span>Produk</span>
                  <strong>
                    {orderSnapshot.product}
                  </strong>
                </div>

                <div>
                  <span>Tujuan</span>
                  <strong>
                    {orderSnapshot.destination}
                  </strong>
                </div>

                <div>
                  <span>Periode</span>
                  <strong>
                    {orderSnapshot.period}
                  </strong>
                </div>

                <div>
                  <span>Tipe Kamar</span>
                  <strong>
                    {orderSnapshot.roomType}
                  </strong>
                </div>

                <div>
                  <span>Jumlah Kamar</span>
                  <strong>
                    {orderSnapshot.rooms}
                  </strong>
                </div>

                <div>
                  <span>Traveler</span>
                  <strong>
                    {orderSnapshot.travelers} orang
                  </strong>
                </div>
              </div>

              <div className={styles.priceStrip}>
                <div>
                  <span>Harga / pax</span>
                  <strong>
                    {rupiah(
                      orderSnapshot.pricePerPax,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Total Transaksi</span>
                  <strong>
                    {rupiah(orderSnapshot.total)}
                  </strong>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeading}>
                <div className={styles.sectionIcon}>
                  <UsersRound size={20} />
                </div>

                <div>
                  <span>TRAVELER</span>
                  <h2>Data Traveler & Paspor</h2>
                  <p>
                    Seluruh traveler wajib dilengkapi
                    sebelum batas yang ditentukan
                    periode keberangkatan.
                  </p>
                </div>
              </div>

              <div className={styles.travelerNotice}>
                <CalendarDays size={21} />

                <div>
                  <strong>
                    Batas kelengkapan data
                  </strong>

                  <p>
                    Maksimal{" "}
                    <b>
                      {orderSnapshot.travelerDeadline}
                    </b>
                    . Data meliputi identitas traveler
                    dan paspor lengkap.
                  </p>
                </div>

                <span>
                  0/{orderSnapshot.travelers} lengkap
                </span>
              </div>

              <Link
  href={travelerHref}
  className={styles.primaryAction}
>
  Lengkapi Data Traveler
</Link>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeading}>
                <div className={styles.sectionIcon}>
                  <FileText size={20} />
                </div>

                <div>
                  <span>DOKUMEN OPERASIONAL</span>
                  <h2>Paket Info</h2>
                  <p>
                    Paket Info dibuat dari data
                    transaksi dan dilengkapi bersama
                    pemesan serta penyedia.
                  </p>
                </div>
              </div>

              <div className={styles.packageInfoGrid}>
                <div>
                  <Plane size={18} />
                  <span>Flight Information</span>
                </div>

                <div>
                  <Hotel size={18} />
                  <span>Hotel Accommodation</span>
                </div>

                <div>
                  <Bus size={18} />
                  <span>Transport</span>
                </div>

                <div>
                  <UsersRound size={18} />
                  <span>Local Contact</span>
                </div>
              </div>

              <a
                href={packageInfoHref}
                className={styles.primaryAction}
              >
                <FileText size={17} />
                Buka Paket Info
                <ChevronRight size={16} />
              </a>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeading}>
                <div className={styles.sectionIcon}>
                  <BedDouble size={20} />
                </div>

                <div>
                  <span>PERSIAPAN PENYEDIA</span>
                  <h2>Persiapan Vendor</h2>
                  <p>
                    Data operasional vendor akan
                    tampil per layanan agar perubahan
                    dapat dilacak dengan jelas.
                  </p>
                </div>
              </div>

              <div className={styles.serviceGrid}>
                <article>
                  <Hotel size={19} />
                  <div>
                    <strong>Hotel</strong>
                    <span>
                      Menunggu nomor reservasi
                    </span>
                  </div>
                  <StatusBadge status="ACTIVE" />
                </article>

                <article>
                  <FileCheck2 size={19} />
                  <div>
                    <strong>Visa</strong>
                    <span>
                      Dokumen per traveler
                    </span>
                  </div>
                  <StatusBadge status="WAITING" />
                </article>

                <article>
                  <Bus size={19} />
                  <div>
                    <strong>
                      Transport & Transfer
                    </strong>
                    <span>
                      Bus, driver dan PIC per layanan
                    </span>
                  </div>
                  <StatusBadge status="WAITING" />
                </article>

                <article>
                  <MapPin size={19} />
                  <div>
                    <strong>
                      Local Contact & Handling
                    </strong>
                    <span>
                      Kontak operasional lokal
                    </span>
                  </div>
                  <StatusBadge status="WAITING" />
                </article>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeading}>
                <div className={styles.sectionIcon}>
                  <Bus size={20} />
                </div>

                <div>
                  <span>OPERASIONAL PERJALANAN</span>
                  <h2>Timeline Layanan</h2>
                  <p>
                    Bus, driver, PIC dan detail
                    operasional dapat berbeda pada
                    setiap aktivitas perjalanan.
                  </p>
                </div>
              </div>

              <div className={styles.operationList}>
                {[
                  "Airport Jeddah → Hotel Madinah",
                  "City Tour Madinah",
                  "Madinah → Makkah",
                  "City Tour Makkah",
                  "Masyair",
                  "Hotel Makkah → Airport Jeddah",
                ].map((title, index) => (
                  <article key={title}>
                    <span className={styles.operationNo}>
                      {index + 1}
                    </span>

                    <div>
                      <strong>{title}</strong>
                      <small>
                        Detail bus, driver, waktu,
                        meeting point dan PIC akan
                        dilengkapi penyedia.
                      </small>
                    </div>

                    <StatusBadge status="WAITING" />
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className={styles.sidebar}>
            <section className={styles.sideCard}>
              <strong className={styles.sideTitle}>
                Status Pesanan
              </strong>

              <div className={styles.timeline}>
                {stages.map((stage, index) => (
                  <div
                    key={stage.key}
                    className={
                      stage.status === "ACTIVE"
                        ? styles.timelineActive
                        : stage.status === "DONE"
                          ? styles.timelineDone
                          : ""
                    }
                  >
                    <span>
                      {stage.status === "DONE" ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        index + 1
                      )}
                    </span>

                    <div>
                      <strong>
                        {stage.title}
                      </strong>

                      <small>
                        {stage.description}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.sideCard}>
              <strong className={styles.sideTitle}>
                Ringkasan
              </strong>

              <div className={styles.sideSummary}>
                <div>
                  <span>Tujuan</span>
                  <strong>
                    {orderSnapshot.destination}
                  </strong>
                </div>

                <div>
                  <span>Durasi</span>
                  <strong>
                    {orderSnapshot.duration}
                  </strong>
                </div>

                <div>
                  <span>Periode</span>
                  <strong>
                    {orderSnapshot.period}
                  </strong>
                </div>

                <div>
                  <span>Traveler</span>
                  <strong>
                    {orderSnapshot.travelers} orang
                  </strong>
                </div>

                <div>
                  <span>Kamar</span>
                  <strong>
                    {orderSnapshot.rooms}{" "}
                    {orderSnapshot.roomType}
                  </strong>
                </div>
              </div>
            </section>

            <section className={styles.infoCard}>
              <ShieldCheck size={19} />

              <div>
                <strong>
                  Riwayat tidak ditimpa
                </strong>

                <p>
                  Perubahan material seperti hotel,
                  periode atau tipe kamar akan melalui
                  persetujuan dan memiliki riwayat
                  perubahan.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}