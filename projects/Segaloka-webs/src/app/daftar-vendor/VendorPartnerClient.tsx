"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BedDouble,
  Boxes,
  BusFront,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  Globe2,
  Handshake,
  Headphones,
  Hotel,
  MapPinned,
  PackageCheck,
  Plane,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  TicketCheck,
  UtensilsCrossed,
  WalletCards,
  Wifi,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";
import type { LanguageCode } from "@/data/preferences";

type VendorType = "all" | "product" | "service" | "composite";

type VendorItem = {
  type: Exclude<VendorType, "all">;
  title: string;
  description: string;
  icon: typeof Hotel;
};

const copy = {
  ID: {
    heroBadge: "Segaloka Vendor Partner",
    heroTitle: "Kembangkan Bisnis Vendor Anda Bersama Segaloka",
    heroDescription:
      "Hubungkan produk dan layanan Anda dengan ekosistem Travel Segaloka. Mulai dari akomodasi, transportasi, tiket, visa, layanan operasional hingga berbagai produk pendukung perjalanan.",

    floatingProduct: "Produk",
    floatingService: "Layanan",
    floatingInventory: "Inventory",
    floatingComposite: "Paket & Operasional",

    vendorLabel: "Kategori Vendor",
    vendorTitle: "Produk & Layanan Vendor di Segaloka",
    vendorDescription:
      "Vendor Segaloka tidak dibatasi hanya pada satu jenis usaha. Penyedia dapat menawarkan produk, layanan, maupun kombinasi layanan perjalanan sesuai bisnis dan kewenangannya.",

    tabs: {
      all: "Semua",
      product: "Produk",
      service: "Layanan",
      composite: "Paket & Operasional",
    },

    benefitLabel: "Mengapa Segaloka",
    benefitTitle: "Lebih Mudah Menjangkau Travel dan Mengelola Penjualan",
    benefitDescription:
      "Perluas distribusi produk dan layanan Anda melalui alur transaksi dan operasional yang lebih terstruktur.",

    portalLabel: "Vendor Portal & Tools",
    portalTitle: "Kelola Bisnis Vendor dari Satu Workspace",
    portalDescription:
      "Produk, layanan, inventori, pesanan, operasional, pembayaran, dan laporan dapat dikelola melalui Vendor Portal Segaloka.",

    stepsLabel: "Cara Bergabung",
    stepsTitle: "Mulai Menjadi Vendor Segaloka",
    stepsDescription:
      "Proses kemitraan dibuat sederhana agar bisnis Anda dapat mulai menawarkan produk dan layanan secara terstruktur.",

    ctaLabel: "Segaloka Vendor",
    ctaTitle: "Siap Memperluas Jaringan Bisnis Anda?",
    ctaDescription:
      "Daftarkan bisnis Vendor Anda dan siapkan produk maupun layanan terbaik untuk ekosistem Travel Segaloka.",
    ctaButton: "Mulai Pendaftaran Vendor",

    faqLabel: "FAQ",
    faqTitle: "Frequently Asked Questions",
    faqDescription:
      "Informasi dasar mengenai kemitraan Vendor di Segaloka.",

    vendorItems: [
      {
        type: "product",
        title: "Hotel & Akomodasi",
        description:
          "Hotel, resort, villa, penginapan, room allotment, dan produk akomodasi lainnya.",
        icon: Hotel,
      },
      {
        type: "product",
        title: "Tiket Pesawat",
        description:
          "Produk tiket penerbangan dan kebutuhan perjalanan udara sesuai kewenangan Vendor.",
        icon: Plane,
      },
      {
        type: "product",
        title: "Tiket Transportasi",
        description:
          "Tiket kereta, bus, ferry, dan produk transportasi lain yang dapat didistribusikan.",
        icon: TicketCheck,
      },
      {
        type: "product",
        title: "Aktivitas & Atraksi",
        description:
          "Tiket atraksi, aktivitas wisata, tur lokal, dan produk pengalaman perjalanan.",
        icon: Tag,
      },
      {
        type: "product",
        title: "SIM & eSIM",
        description:
          "Produk konektivitas perjalanan seperti SIM card, eSIM, dan paket data.",
        icon: Wifi,
      },
      {
        type: "product",
        title: "Produk Perjalanan",
        description:
          "Perlengkapan travel, merchandise, oleh-oleh, dan produk pendukung perjalanan lainnya.",
        icon: ShoppingBag,
      },

      {
        type: "service",
        title: "Transportasi Darat",
        description:
          "Bus, kendaraan, shuttle, transfer bandara, city transfer, dan transportasi operasional.",
        icon: BusFront,
      },
      {
        type: "service",
        title: "Visa & Dokumen",
        description:
          "Pengurusan visa dan layanan dokumen perjalanan sesuai cakupan layanan Vendor.",
        icon: ShieldCheck,
      },
      {
        type: "service",
        title: "Handling & Meet Assist",
        description:
          "Airport handling, meet & assist, porter, bagasi, dan dukungan kedatangan maupun keberangkatan.",
        icon: Handshake,
      },
      {
        type: "service",
        title: "Catering & Konsumsi",
        description:
          "Makanan, konsumsi grup, meal box, catering perjalanan, dan kebutuhan konsumsi lainnya.",
        icon: UtensilsCrossed,
      },
      {
        type: "service",
        title: "Guide & Pendamping",
        description:
          "Tour guide, local guide, muthowif, pendamping perjalanan, dan tenaga operasional terkait.",
        icon: Globe2,
      },
      {
        type: "service",
        title: "Layanan Pendukung",
        description:
          "Dokumentasi, layanan operasional, insurance service, dan jasa pendukung perjalanan lainnya.",
        icon: ClipboardCheck,
      },

      {
        type: "composite",
        title: "Land Arrangement",
        description:
          "Gabungkan hotel, transportasi, visa, handling, konsumsi, dan layanan darat menjadi satu paket LA.",
        icon: MapPinned,
      },
      {
        type: "composite",
        title: "Ground Handling",
        description:
          "Rangkaian layanan darat dan operasional untuk kebutuhan perjalanan grup maupun individual.",
        icon: PackageCheck,
      },
      {
        type: "composite",
        title: "Custom Travel Services",
        description:
          "Kombinasi produk dan layanan Vendor yang disusun sesuai kebutuhan Travel.",
        icon: Boxes,
      },
    ] satisfies VendorItem[],

    benefits: [
      {
        title: "Jangkauan Pasar Lebih Luas",
        description:
          "Produk dan layanan Vendor dapat ditemukan oleh Travel yang membutuhkan kebutuhan operasional perjalanan.",
        icon: Globe2,
      },
      {
        title: "Permintaan dari Travel",
        description:
          "Terima kebutuhan dan pesanan dari Travel yang aktif di ekosistem Segaloka.",
        icon: Store,
      },
      {
        title: "Sistem Terintegrasi",
        description:
          "Kelola produk, layanan, inventori, pesanan, dan operasional dalam satu platform.",
        icon: Boxes,
      },
      {
        title: "Dukungan Ekosistem",
        description:
          "Bangun hubungan bisnis jangka panjang dengan Travel melalui Segaloka.",
        icon: Headphones,
      },
    ],

    tools: [
      {
        title: "Produk & Layanan",
        description: "Kelola katalog produk dan layanan yang Anda tawarkan.",
        icon: PackageCheck,
      },
      {
        title: "Harga & Kuota",
        description: "Atur harga, periode, kapasitas, kuota, dan ketentuan penjualan.",
        icon: Tag,
      },
      {
        title: "Inventory & Ketersediaan",
        description: "Pantau ketersediaan produk atau layanan sesuai periode.",
        icon: Boxes,
      },
      {
        title: "Pesanan",
        description: "Terima dan kelola transaksi dari Travel.",
        icon: ReceiptText,
      },
      {
        title: "Operasional",
        description: "Kelola detail pelaksanaan layanan dan pembaruan operasional.",
        icon: ClipboardCheck,
      },
      {
        title: "Pembayaran & Settlement",
        description: "Pantau pembayaran, settlement, dan status dana Vendor.",
        icon: CreditCard,
      },
      {
        title: "Withdrawal",
        description: "Kelola penarikan saldo yang telah tersedia.",
        icon: WalletCards,
      },
      {
        title: "Laporan",
        description: "Pantau performa penjualan dan aktivitas bisnis Vendor.",
        icon: BarChart3,
      },
    ],

    steps: [
      {
        number: "01",
        title: "Daftarkan Bisnis",
        description:
          "Lengkapi identitas perusahaan, PIC, kategori Vendor, dan informasi dasar.",
      },
      {
        number: "02",
        title: "Verifikasi Vendor",
        description:
          "Data dan dokumen bisnis ditinjau sebelum akses Vendor diaktifkan.",
      },
      {
        number: "03",
        title: "Tambahkan Produk & Layanan",
        description:
          "Atur produk, layanan, harga, periode, kapasitas, dan ketentuan.",
      },
      {
        number: "04",
        title: "Mulai Terima Pesanan",
        description:
          "Kelola permintaan dan transaksi Travel melalui Vendor Portal Segaloka.",
      },
    ],

    faq: [
      {
        q: "Siapa yang dapat bergabung sebagai Vendor Segaloka?",
        a: "Penyedia produk maupun layanan yang mendukung industri perjalanan dapat mengajukan kemitraan, sepanjang kategori dan aktivitas bisnisnya sesuai dengan ketentuan Segaloka.",
      },
      {
        q: "Apakah Vendor hanya untuk hotel, transportasi, dan visa?",
        a: "Tidak. Vendor Segaloka mencakup penyedia produk, penyedia layanan, serta penyedia paket atau layanan operasional gabungan.",
      },
      {
        q: "Apakah satu Vendor dapat memiliki beberapa kategori?",
        a: "Ya. Satu Vendor dapat menawarkan beberapa kategori produk dan layanan sesuai bisnis, kemampuan operasional, dan hasil verifikasi.",
      },
      {
        q: "Apakah Vendor dapat menawarkan Land Arrangement?",
        a: "Ya. Vendor dapat menawarkan Land Arrangement dan layanan gabungan lainnya sesuai produk serta layanan yang dimiliki.",
      },
      {
        q: "Bagaimana Vendor menerima pesanan dari Travel?",
        a: "Produk dan layanan Vendor dapat ditemukan melalui ekosistem Segaloka. Pesanan kemudian dikelola melalui Vendor Portal.",
      },
      {
        q: "Apakah Vendor dapat mengatur harga dan kuota sendiri?",
        a: "Vendor dapat mengatur harga, periode, kapasitas, kuota, dan ketentuan produk sesuai konfigurasi dan kewenangan yang diberikan.",
      },
      {
        q: "Bagaimana pembayaran dan penarikan dana Vendor?",
        a: "Status pembayaran, settlement, saldo tersedia, dan withdrawal nantinya dikelola melalui sistem keuangan Vendor Segaloka sesuai transaksi.",
      },
      {
        q: "Apakah pendaftaran langsung membuat akun Vendor aktif?",
        a: "Tidak. Data dan dokumen Vendor harus melalui proses verifikasi sebelum akses penuh diaktifkan.",
      },
    ],
  },

  EN: {
    heroBadge: "Segaloka Vendor Partner",
    heroTitle: "Grow Your Vendor Business with Segaloka",
    heroDescription:
      "Connect your products and services with the Segaloka Travel ecosystem, from accommodation, transportation, tickets and visas to operational services and travel-related products.",

    floatingProduct: "Products",
    floatingService: "Services",
    floatingInventory: "Inventory",
    floatingComposite: "Packages & Operations",

    vendorLabel: "Vendor Categories",
    vendorTitle: "Vendor Products & Services on Segaloka",
    vendorDescription:
      "Segaloka Vendors are not limited to one business type. Providers may offer products, services, or combined travel solutions according to their business capabilities.",

    tabs: {
      all: "All",
      product: "Products",
      service: "Services",
      composite: "Packages & Operations",
    },

    benefitLabel: "Why Segaloka",
    benefitTitle: "Reach More Travel Businesses and Manage Sales Efficiently",
    benefitDescription:
      "Expand the distribution of your products and services through a more structured transaction and operational workflow.",

    portalLabel: "Vendor Portal & Tools",
    portalTitle: "Manage Your Vendor Business from One Workspace",
    portalDescription:
      "Products, services, inventory, orders, operations, payments, and reports can be managed through the Segaloka Vendor Portal.",

    stepsLabel: "How to Join",
    stepsTitle: "Become a Segaloka Vendor",
    stepsDescription:
      "A straightforward partnership process designed to help your business start offering products and services efficiently.",

    ctaLabel: "Segaloka Vendor",
    ctaTitle: "Ready to Expand Your Business Network?",
    ctaDescription:
      "Register your Vendor business and prepare your best products and services for the Segaloka Travel ecosystem.",
    ctaButton: "Start Vendor Registration",

    faqLabel: "FAQ",
    faqTitle: "Frequently Asked Questions",
    faqDescription:
      "Essential information about becoming a Segaloka Vendor.",

    vendorItems: [
      { type: "product", title: "Hotels & Accommodation", description: "Hotels, resorts, villas, lodging, room allotments, and other accommodation products.", icon: Hotel },
      { type: "product", title: "Flight Tickets", description: "Flight ticket products and air travel requirements according to Vendor capabilities.", icon: Plane },
      { type: "product", title: "Transport Tickets", description: "Train, bus, ferry, and other transport ticket products.", icon: TicketCheck },
      { type: "product", title: "Activities & Attractions", description: "Attraction tickets, local activities, tours, and travel experiences.", icon: Tag },
      { type: "product", title: "SIM & eSIM", description: "Travel connectivity products including SIM cards, eSIM, and data packages.", icon: Wifi },
      { type: "product", title: "Travel Products", description: "Travel equipment, merchandise, souvenirs, and other supporting products.", icon: ShoppingBag },

      { type: "service", title: "Ground Transportation", description: "Buses, vehicles, shuttles, airport transfers, city transfers, and operational transport.", icon: BusFront },
      { type: "service", title: "Visa & Documents", description: "Visa processing and travel document services according to Vendor scope.", icon: ShieldCheck },
      { type: "service", title: "Handling & Meet Assist", description: "Airport handling, meet and assist, porter, baggage, arrival and departure support.", icon: Handshake },
      { type: "service", title: "Catering & Meals", description: "Group meals, meal boxes, travel catering, and other consumption services.", icon: UtensilsCrossed },
      { type: "service", title: "Guides & Assistance", description: "Tour guides, local guides, muthowif, travel assistants, and related personnel.", icon: Globe2 },
      { type: "service", title: "Supporting Services", description: "Documentation, operational services, insurance services, and other travel support.", icon: ClipboardCheck },

      { type: "composite", title: "Land Arrangement", description: "Combine accommodation, transportation, visa, handling, meals, and ground services into an LA package.", icon: MapPinned },
      { type: "composite", title: "Ground Handling", description: "Integrated ground and operational services for groups and individual travelers.", icon: PackageCheck },
      { type: "composite", title: "Custom Travel Services", description: "Custom combinations of Vendor products and services based on Travel requirements.", icon: Boxes },
    ] satisfies VendorItem[],

    benefits: [
      { title: "Wider Market Reach", description: "Make your products and services discoverable by Travel businesses that need operational services.", icon: Globe2 },
      { title: "Demand from Travel", description: "Receive needs and orders from active Travel businesses in the Segaloka ecosystem.", icon: Store },
      { title: "Integrated System", description: "Manage products, services, inventory, orders, and operations in one platform.", icon: Boxes },
      { title: "Ecosystem Support", description: "Build long-term business relationships with Travel partners through Segaloka.", icon: Headphones },
    ],

    tools: [
      { title: "Products & Services", description: "Manage the products and services you offer.", icon: PackageCheck },
      { title: "Pricing & Quota", description: "Configure pricing, periods, capacity, quotas, and sales terms.", icon: Tag },
      { title: "Inventory & Availability", description: "Monitor product and service availability by period.", icon: Boxes },
      { title: "Orders", description: "Receive and manage Travel transactions.", icon: ReceiptText },
      { title: "Operations", description: "Manage service execution details and operational updates.", icon: ClipboardCheck },
      { title: "Payments & Settlement", description: "Monitor payments, settlement, and Vendor fund status.", icon: CreditCard },
      { title: "Withdrawal", description: "Manage withdrawals from available balances.", icon: WalletCards },
      { title: "Reports", description: "Monitor sales performance and Vendor business activity.", icon: BarChart3 },
    ],

    steps: [
      { number: "01", title: "Register Your Business", description: "Provide company identity, PIC, Vendor categories, and essential information." },
      { number: "02", title: "Vendor Verification", description: "Business information and documents are reviewed before Vendor access is activated." },
      { number: "03", title: "Add Products & Services", description: "Configure products, services, pricing, periods, capacity, and terms." },
      { number: "04", title: "Start Receiving Orders", description: "Manage Travel requests and transactions through the Segaloka Vendor Portal." },
    ],

    faq: [
      { q: "Who can become a Segaloka Vendor?", a: "Providers of products or services supporting the travel industry may apply, subject to Segaloka requirements and verification." },
      { q: "Are Vendors limited to hotels, transportation, and visas?", a: "No. Segaloka supports product providers, service providers, and providers of combined operational travel solutions." },
      { q: "Can one Vendor have multiple categories?", a: "Yes. A Vendor may offer multiple product and service categories according to its business scope and verified capabilities." },
      { q: "Can Vendors offer Land Arrangement?", a: "Yes. Vendors may offer Land Arrangement and other combined services according to their available products and services." },
      { q: "How do Vendors receive orders from Travel businesses?", a: "Vendor products and services can be discovered within the Segaloka ecosystem and orders are managed through the Vendor Portal." },
      { q: "Can Vendors manage their own pricing and quotas?", a: "Vendors can configure pricing, periods, capacity, quotas, and applicable product terms based on their permissions." },
      { q: "How do payments and Vendor withdrawals work?", a: "Payment status, settlement, available balance, and withdrawals will be managed through Segaloka's Vendor financial workflow." },
      { q: "Does registration immediately activate the Vendor account?", a: "No. Vendor data and documents must be verified before full access is activated." },
    ],
  },
} as const;

export function VendorPartnerClient() {
  const { language } = useMarketplacePreferences();

  const lang: "ID" | "EN" =
    language === "EN" ? "EN" : "ID";

  const t = copy[lang];

  const [activeType, setActiveType] =
    useState<VendorType>("all");

  const [openFaq, setOpenFaq] =
    useState<number | null>(0);

  const visibleItems = useMemo(() => {
    if (activeType === "all") return t.vendorItems;
    return t.vendorItems.filter((item) => item.type === activeType);
  }, [activeType, t.vendorItems]);

  return (
    <main className="vendor-partner-page">
      <section className="vendor-hero">
        <div className="vendor-shell vendor-hero-grid">
          <div className="vendor-hero-copy">
            <div className="vendor-eyebrow">
              <Sparkles size={14} />
              {t.heroBadge}
            </div>

            <h1>{t.heroTitle}</h1>
            <p>{t.heroDescription}</p>

            <div className="vendor-hero-points">
              <span>✓ Produk</span>
              <span>✓ Layanan</span>
              <span>✓ B2B Travel</span>
              <span>✓ Operasional Terintegrasi</span>
            </div>
          </div>

          <div className="vendor-hero-visual" aria-hidden="true">
            <div className="vendor-visual-orbit vendor-orbit-one" />
            <div className="vendor-visual-orbit vendor-orbit-two" />

            <div className="vendor-main-visual">
              <div className="vendor-main-icon">
                <Store size={46} strokeWidth={1.7} />
              </div>

              <strong>Vendor Segaloka</strong>
              <span>Travel Supply Ecosystem</span>
            </div>

            <div className="vendor-floating-card vendor-floating-hotel">
              <ShoppingBag size={18} />
              <span>{t.floatingProduct}</span>
            </div>

            <div className="vendor-floating-card vendor-floating-bus">
              <Handshake size={18} />
              <span>{t.floatingService}</span>
            </div>

            <div className="vendor-floating-card vendor-floating-visa">
              <Boxes size={18} />
              <span>{t.floatingInventory}</span>
            </div>

            <div className="vendor-floating-card vendor-floating-la">
              <MapPinned size={18} />
              <span>{t.floatingComposite}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="vendor-section vendor-categories">
        <div className="vendor-shell">
          <div className="vendor-section-heading">
            <span>{t.vendorLabel}</span>
            <h2>{t.vendorTitle}</h2>
            <p>{t.vendorDescription}</p>
          </div>

          <div className="vendor-filter-tabs">
            {(
              [
                ["all", t.tabs.all],
                ["product", t.tabs.product],
                ["service", t.tabs.service],
                ["composite", t.tabs.composite],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={activeType === value ? "is-active" : ""}
                onClick={() => setActiveType(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="vendor-category-grid">
            {visibleItems.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  className={`vendor-category-card vendor-type-${item.type}`}
                  key={`${item.type}-${item.title}`}
                >
                  <div className="vendor-category-card-top">
                    <div className="vendor-category-icon">
                      <Icon size={22} />
                    </div>

                    <span className="vendor-category-type">
                      {item.type === "product"
                        ? t.tabs.product
                        : item.type === "service"
                          ? t.tabs.service
                          : t.tabs.composite}
                    </span>
                  </div>

                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="vendor-section vendor-benefits-section">
        <div className="vendor-shell">
          <div className="vendor-section-heading">
            <span>{t.benefitLabel}</span>
            <h2>{t.benefitTitle}</h2>
            <p>{t.benefitDescription}</p>
          </div>

          <div className="vendor-benefit-grid">
            {t.benefits.map((item) => {
              const Icon = item.icon;

              return (
                <article className="vendor-benefit-card" key={item.title}>
                  <div className="vendor-benefit-icon">
                    <Icon size={22} />
                  </div>

                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="vendor-section vendor-tools-section">
        <div className="vendor-shell">
          <div className="vendor-tools-layout">
            <div className="vendor-tools-copy">
              <div className="vendor-section-heading vendor-section-heading-left">
                <span>{t.portalLabel}</span>
                <h2>{t.portalTitle}</h2>
                <p>{t.portalDescription}</p>
              </div>

              <div className="vendor-tool-list">
                {t.tools.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <article className="vendor-tool-row" key={tool.title}>
                      <span className="vendor-tool-icon">
                        <Icon size={18} />
                      </span>

                      <div>
                        <strong>{tool.title}</strong>
                        <p>{tool.description}</p>
                      </div>

                      <ArrowRight size={16} />
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="vendor-dashboard-preview">
              <div className="vendor-dashboard-topbar">
                <div>
                  <span className="vendor-dashboard-logo">S</span>
                  <strong>segaloka</strong>
                </div>

                <span>Vendor Portal</span>
              </div>

              <div className="vendor-dashboard-body">
                <aside>
                  <span className="active">Dashboard</span>
                  <span>Produk & Layanan</span>
                  <span>Pesanan</span>
                  <span>Inventory</span>
                  <span>Keuangan</span>
                  <span>Laporan</span>
                </aside>

                <div className="vendor-dashboard-content">
                  <div className="vendor-dashboard-welcome">
                    <span>Vendor Workspace</span>
                    <strong>Ringkasan Bisnis</strong>
                  </div>

                  <div className="vendor-dashboard-metrics">
                    <article>
                      <span>Produk Aktif</span>
                      <strong>—</strong>
                    </article>

                    <article>
                      <span>Pesanan</span>
                      <strong>—</strong>
                    </article>

                    <article>
                      <span>Saldo Tersedia</span>
                      <strong>—</strong>
                    </article>
                  </div>

                  <div className="vendor-dashboard-chart">
                    <div className="vendor-chart-head">
                      <strong>Performa Penjualan</strong>
                      <span>Overview</span>
                    </div>

                    <div className="vendor-chart-bars">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>

                  <div className="vendor-dashboard-orders">
                    <strong>Pesanan Terbaru</strong>

                    <div>
                      <span className="vendor-order-icon">
                        <BedDouble size={15} />
                      </span>
                      <p>
                        <strong>Produk / Layanan Vendor</strong>
                        <span>Menunggu transaksi nyata</span>
                      </p>
                      <em>—</em>
                    </div>

                    <div>
                      <span className="vendor-order-icon">
                        <BusFront size={15} />
                      </span>
                      <p>
                        <strong>Operasional</strong>
                        <span>Belum ada data</span>
                      </p>
                      <em>—</em>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="vendor-section vendor-steps-section">
        <div className="vendor-shell">
          <div className="vendor-section-heading">
            <span>{t.stepsLabel}</span>
            <h2>{t.stepsTitle}</h2>
            <p>{t.stepsDescription}</p>
          </div>

          <div className="vendor-step-grid">
            {t.steps.map((step, index) => (
              <article className="vendor-step-card" key={step.number}>
                <div className="vendor-step-top">
                  <span>{step.number}</span>
                  {index < t.steps.length - 1 ? (
                    <div className="vendor-step-line" />
                  ) : null}
                </div>

                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="vendor-cta-wrap">
        <div className="vendor-shell">
          <div className="vendor-cta">
            <div>
              <span>{t.ctaLabel}</span>
              <h2>{t.ctaTitle}</h2>
              <p>{t.ctaDescription}</p>
            </div>

            <Link
              href="/daftar-vendor/registrasi"
              className="vendor-button vendor-button-white"
            >
              {t.ctaButton}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="vendor-section vendor-faq-section">
        <div className="vendor-shell vendor-faq-layout">
          <div className="vendor-faq-heading">
            <span>{t.faqLabel}</span>
            <h2>{t.faqTitle}</h2>
            <p>{t.faqDescription}</p>

            <a
              className="vendor-help-card vendor-help-card-link"
              href="mailto:vendor@segaloka.com"
              aria-label="Email Vendor Support Segaloka"
            >
              <span className="vendor-help-icon">
                <Headphones size={21} />
              </span>

              <div>
                <strong>Vendor Support</strong>
                <span>vendor@segaloka.com</span>
                <small>Hubungi tim Segaloka untuk bantuan kemitraan Vendor.</small>
              </div>

              <ArrowRight size={17} className="vendor-help-arrow" />
            </a>
          </div>

          <div className="vendor-faq-list">
            {t.faq.map((item, index) => {
              const active = openFaq === index;

              return (
                <article
                  className={`vendor-faq-item ${active ? "is-open" : ""}`}
                  key={item.q}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaq(active ? null : index)
                    }
                    aria-expanded={active}
                  >
                    <span>{item.q}</span>
                    <ChevronDown size={18} />
                  </button>

                  {active ? <p>{item.a}</p> : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
