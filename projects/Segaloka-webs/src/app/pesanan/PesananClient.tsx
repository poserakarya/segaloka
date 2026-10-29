"use client";

import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileText,
  Headphones,
  Search,
  ShieldCheck,
  ShoppingBag,
  TicketCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "./pesanan.module.css";

type OrderStatus =
  | "all"
  | "waiting"
  | "active"
  | "completed"
  | "cancelled";

type TabItem = {
  id: OrderStatus;
  label: string;
};

const tabs: TabItem[] = [
  {
    id: "all",
    label: "Semua",
  },
  {
    id: "waiting",
    label: "Menunggu Pembayaran",
  },
  {
    id: "active",
    label: "Aktif",
  },
  {
    id: "completed",
    label: "Selesai",
  },
  {
    id: "cancelled",
    label: "Dibatalkan",
  },
];

const benefits = [
  {
    icon: TicketCheck,
    title: "Semua perjalanan dalam satu tempat",
    description:
      "Booking paket, akomodasi, dan layanan Segaloka dapat dipantau dari halaman ini.",
  },
  {
    icon: WalletCards,
    title: "Status pembayaran lebih jelas",
    description:
      "Lihat status tagihan, pembayaran, dan tahapan transaksi tanpa berpindah halaman.",
  },
  {
    icon: FileText,
    title: "Dokumen perjalanan terhubung",
    description:
      "Saat sistem transaksi aktif, dokumen dan kebutuhan traveler akan mengikuti pesanan.",
  },
];

export function PesananClient() {
  const [activeTab, setActiveTab] =
    useState<OrderStatus>("all");

  const [searchQuery, setSearchQuery] =
    useState("");

  /*
   * UI foundation:
   * Data pesanan belum dibuat secara lokal/dummy.
   * Saat persistence booking diaktifkan, data ini
   * harus berasal dari backend berdasarkan user login.
   */
  const orders = useMemo(() => [], []);

  const visibleOrders = useMemo(() => {
    return orders;
  }, [orders]);

  const hasOrders = visibleOrders.length > 0;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>
              <ShoppingBag size={15} />
              Pesanan Saya
            </span>

            <h1>
              Kelola perjalanan Anda
              <br />
              dalam satu tempat
            </h1>

            <p>
              Pantau status booking, pembayaran,
              traveler, dan kebutuhan perjalanan
              Segaloka dengan lebih mudah.
            </p>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroCard}>
              <div className={styles.heroCardIcon}>
                <TicketCheck size={25} />
              </div>

              <div>
                <span>Pesanan Segaloka</span>

                <strong>
                  Mudah dipantau dari awal
                  hingga perjalanan selesai
                </strong>
              </div>
            </div>

            <div className={styles.heroMiniGrid}>
              <div>
                <Clock3 size={18} />
                <span>Status</span>
                <strong>Realtime</strong>
              </div>

              <div>
                <ShieldCheck size={18} />
                <span>Transaksi</span>
                <strong>Aman</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className={styles.contentShell}>
          <div className={styles.headingRow}>
            <div>
              <span className={styles.sectionLabel}>
                PUSAT PESANAN
              </span>

              <h2>Pesanan Anda</h2>

              <p>
                Temukan dan pantau semua transaksi
                perjalanan yang dibuat melalui Segaloka.
              </p>
            </div>

            <Link
              className={styles.exploreButton}
              href="/search"
              prefetch={false}
            >
              Cari perjalanan
              <ChevronRight size={17} />
            </Link>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.tabs}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={[
                    styles.tab,
                    activeTab === tab.id
                      ? styles.tabActive
                      : "",
                  ].join(" ")}
                  onClick={() =>
                    setActiveTab(tab.id)
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <label className={styles.searchBox}>
              <Search size={17} />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value,
                  )
                }
                placeholder="Cari nomor atau nama pesanan"
                aria-label="Cari pesanan"
              />
            </label>
          </div>

          {!hasOrders && (
            <section className={styles.emptyCard}>
              <div className={styles.emptyIllustration}>
                <div
                  className={
                    styles.emptyIllustrationGlow
                  }
                />

                <div className={styles.emptyIcon}>
                  <ShoppingBag size={37} />
                </div>

                <span
                  className={styles.emptyFloatingOne}
                >
                  <CalendarDays size={17} />
                </span>

                <span
                  className={styles.emptyFloatingTwo}
                >
                  <CircleCheck size={17} />
                </span>
              </div>

              <div className={styles.emptyContent}>
                <span className={styles.emptyBadge}>
                  {activeTab === "all"
                    ? "Belum ada pesanan"
                    : "Tidak ada pesanan pada status ini"}
                </span>

                <h2>
                  Perjalanan Anda akan muncul
                  di sini
                </h2>

                <p>
                  Setelah Anda menyelesaikan
                  pemesanan melalui Segaloka,
                  status perjalanan dan transaksi
                  dapat dipantau dari halaman ini.
                </p>

                <div className={styles.emptyActions}>
                  <Link
                    href="/search"
                    prefetch={false}
                    className={styles.primaryButton}
                  >
                    Cari Perjalanan
                    <ChevronRight size={17} />
                  </Link>

                  <Link
                    href="/segadeals"
                    prefetch={false}
                    className={
                      styles.secondaryButton
                    }
                  >
                    Coba SegaDeals
                  </Link>
                </div>
              </div>
            </section>
          )}

          <div className={styles.benefitGrid}>
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article
                  key={benefit.title}
                  className={styles.benefitCard}
                >
                  <span
                    className={
                      styles.benefitIcon
                    }
                  >
                    <Icon size={21} />
                  </span>

                  <div>
                    <strong>
                      {benefit.title}
                    </strong>

                    <p>
                      {benefit.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <section className={styles.helpCard}>
            <div className={styles.helpIcon}>
              <Headphones size={24} />
            </div>

            <div className={styles.helpContent}>
              <strong>
                Butuh bantuan terkait pesanan?
              </strong>

              <p>
                Pusat bantuan Segaloka akan
                menangani informasi transaksi
                dan perjalanan sesuai pesanan
                Anda.
              </p>
            </div>

            <a
              href="/"
              className={styles.helpButton}
            >
              Pusat Bantuan
              <ChevronRight size={16} />
            </a>
          </section>
        </div>
      </section>
    </main>
  );
}
