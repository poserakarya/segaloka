import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  Building2,
  Compass,
  Handshake,
  Landmark,
  LogIn,
  MapPinned,
  Sparkles,
  UserPlus,
} from "lucide-react";

export type PublicPageKind =
  | "attractions"
  | "register"
  | "register-travel"
  | "destinations"
  | "inspiration"
  | "login"
  | "partner"
  | "notifications"
  | "about";

type PageDefinition = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  items: Array<{
    title: string;
    description: string;
  }>;
};

const pages: Record<PublicPageKind, PageDefinition> = {
  attractions: {
    eyebrow: "Atraksi Segaloka",
    title: "Temukan aktivitas dan atraksi untuk perjalanan Anda",
    description:
      "Jelajahi pilihan aktivitas, tempat menarik, dan pengalaman perjalanan yang dapat melengkapi itinerary Anda.",
    icon: Landmark,
    primaryLabel: "Jelajahi destinasi",
    primaryHref: "/destinasi",
    items: [
      {
        title: "Aktivitas pilihan",
        description:
          "Temukan aktivitas yang sesuai dengan tujuan dan kebutuhan perjalanan.",
      },
      {
        title: "Mudah direncanakan",
        description:
          "Susun atraksi bersama akomodasi dan kebutuhan perjalanan lainnya.",
      },
      {
        title: "Untuk berbagai perjalanan",
        description:
          "Dirancang untuk perjalanan domestik, internasional, halal tour, Umrah, dan perjalanan lainnya.",
      },
    ],
  },

  register: {
    eyebrow: "Akun Segaloka",
    title: "Buat akun Segaloka",
    description:
      "Satu akun untuk mengakses layanan Segaloka sesuai peran dan kebutuhan Anda.",
    icon: UserPlus,
    primaryLabel: "Masuk",
    primaryHref: "/masuk",
    items: [
      {
        title: "Traveler",
        description:
          "Kelola pencarian, pemesanan, perjalanan, dan layanan traveler.",
      },
      {
        title: "Partner",
        description:
          "Akses layanan sesuai peran Travel, Vendor, Affiliate, Agen, atau Mitra.",
      },
      {
        title: "Terintegrasi",
        description:
          "Akun akan digunakan secara konsisten pada ekosistem Segaloka.",
      },
    ],
  },

  "register-travel": {
    eyebrow: "Segaloka for Travel",
    title: "Daftarkan bisnis Travel Anda",
    description:
      "Bangun operasional dan distribusi bisnis travel melalui ekosistem Segaloka.",
    icon: Building2,
    primaryLabel: "Daftar Travel",
    primaryHref: "/partner/travel/daftar",
    secondaryLabel: "Pelajari Segaloka for Travel",
    secondaryHref: "/partner/travel",
    items: [
      {
        title: "Operasional terintegrasi",
        description:
          "Kelola produk, pemesanan, pelanggan, dan operasional dalam satu ekosistem.",
      },
      {
        title: "Distribusi produk",
        description:
          "Siapkan produk perjalanan untuk ditemukan melalui kanal Segaloka.",
      },
      {
        title: "Skalabel",
        description:
          "Dirancang untuk kebutuhan Travel dan jaringan bisnis yang berkembang.",
      },
    ],
  },

  destinations: {
    eyebrow: "Destinasi",
    title: "Temukan destinasi untuk perjalanan berikutnya",
    description:
      "Jelajahi inspirasi tujuan perjalanan domestik, internasional, Umrah, Haji, dan halal tour.",
    icon: MapPinned,
    primaryLabel: "Cari perjalanan",
    primaryHref: "/search",
    items: [
      {
        title: "Domestik",
        description:
          "Jelajahi berbagai tujuan perjalanan menarik di Indonesia.",
      },
      {
        title: "Internasional",
        description:
          "Temukan pilihan perjalanan ke berbagai negara dan kota.",
      },
      {
        title: "Perjalanan Muslim",
        description:
          "Temukan kebutuhan Umrah, Haji, dan halal tour dalam ekosistem Segaloka.",
      },
    ],
  },

  inspiration: {
    eyebrow: "Inspirasi Perjalanan",
    title: "Ide perjalanan untuk membantu Anda menentukan tujuan",
    description:
      "Temukan inspirasi destinasi, pengalaman, dan jenis perjalanan sebelum menentukan pilihan.",
    icon: Sparkles,
    primaryLabel: "Lihat destinasi",
    primaryHref: "/destinasi",
    items: [
      {
        title: "Ide destinasi",
        description:
          "Temukan tujuan perjalanan berdasarkan pengalaman yang ingin Anda dapatkan.",
      },
      {
        title: "Rencana perjalanan",
        description:
          "Gunakan inspirasi sebagai titik awal untuk menyusun perjalanan.",
      },
      {
        title: "Pilihan beragam",
        description:
          "Dari perjalanan keluarga hingga perjalanan religi dan internasional.",
      },
    ],
  },

  login: {
    eyebrow: "Akun Segaloka",
    title: "Masuk ke Segaloka",
    description:
      "Akses akun dan layanan Segaloka sesuai peran Anda.",
    icon: LogIn,
    primaryLabel: "Daftar akun",
    primaryHref: "/daftar",
    items: [
      {
        title: "Traveler",
        description:
          "Akses pemesanan, perjalanan, dan layanan traveler.",
      },
      {
        title: "Travel & Vendor",
        description:
          "Akses dashboard bisnis melalui akun yang telah terdaftar.",
      },
      {
        title: "Affiliate, Agen & Mitra",
        description:
          "Kelola aktivitas jaringan sesuai hak akses masing-masing.",
      },
    ],
  },

  partner: {
    eyebrow: "Mitra Segaloka",
    title: "Bertumbuh bersama ekosistem Segaloka",
    description:
      "Segaloka menghubungkan berbagai peran dalam ekosistem perjalanan melalui sistem yang terintegrasi.",
    icon: Handshake,
    primaryLabel: "Segaloka for Travel",
    primaryHref: "/partner/travel",
    secondaryLabel: "Program Affiliate",
    secondaryHref: "/affiliate",
    items: [
      {
        title: "Travel",
        description:
          "Kelola operasional, produk, jaringan, dan distribusi perjalanan.",
      },
      {
        title: "Vendor",
        description:
          "Hubungkan layanan pendukung perjalanan dengan Travel dalam ekosistem Segaloka.",
      },
      {
        title: "Affiliate, Agen & Mitra",
        description:
          "Bangun jaringan penjualan dan distribusi sesuai model kerja sama.",
      },
    ],
  },

  notifications: {
    eyebrow: "Notifikasi",
    title: "Pusat notifikasi Segaloka",
    description:
      "Informasi pemesanan, perjalanan, pembayaran, dan aktivitas akun akan tersedia di sini setelah Anda masuk.",
    icon: Bell,
    primaryLabel: "Masuk",
    primaryHref: "/masuk",
    items: [
      {
        title: "Pemesanan",
        description:
          "Pantau perubahan dan informasi penting terkait pesanan.",
      },
      {
        title: "Perjalanan",
        description:
          "Dapatkan informasi yang berkaitan dengan perjalanan Anda.",
      },
      {
        title: "Akun & layanan",
        description:
          "Notifikasi akun dan layanan Segaloka tersedia dalam satu tempat.",
      },
    ],
  },

  about: {
    eyebrow: "Tentang Segaloka",
    title: "Ekosistem perjalanan dalam satu platform",
    description:
      "Segaloka menghubungkan Traveler, Travel, Vendor, Affiliate, Agen, dan Mitra melalui pengalaman perjalanan dan operasional yang terintegrasi.",
    icon: Compass,
    primaryLabel: "Jelajahi Segaloka",
    primaryHref: "/",
    secondaryLabel: "Segaloka for Travel",
    secondaryHref: "/partner/travel",
    items: [
      {
        title: "Untuk Traveler",
        description:
          "Temukan dan kelola kebutuhan perjalanan melalui pengalaman yang terhubung.",
      },
      {
        title: "Untuk bisnis Travel",
        description:
          "Kelola operasional dan distribusi produk melalui ekosistem Segaloka.",
      },
      {
        title: "Untuk ekosistem",
        description:
          "Hubungkan Travel, Vendor, dan jaringan penjualan dalam satu platform.",
      },
    ],
  },
};

export default function PublicInfoPage({
  kind,
}: {
  kind: PublicPageKind;
}) {
  const page = pages[kind];
  const Icon = page.icon;

  return (
    <main className="seg-public-page">
      <section className="seg-public-hero">
        <div className="seg-public-container">
          <div className="seg-public-icon" aria-hidden="true">
            <Icon size={28} strokeWidth={1.9} />
          </div>

          <p className="seg-public-eyebrow">{page.eyebrow}</p>

          <h1>{page.title}</h1>

          <p className="seg-public-description">
            {page.description}
          </p>

          <div className="seg-public-actions">
            {page.primaryHref && page.primaryLabel ? (
              <Link
                href={page.primaryHref}
                className="seg-public-primary"
              >
                {page.primaryLabel}
                <ArrowRight size={17} />
              </Link>
            ) : null}

            {page.secondaryHref && page.secondaryLabel ? (
              <Link
                href={page.secondaryHref}
                className="seg-public-secondary"
              >
                {page.secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="seg-public-content">
        <div className="seg-public-container">
          <div className="seg-public-grid">
            {page.items.map((item) => (
              <article
                className="seg-public-card"
                key={item.title}
              >
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
