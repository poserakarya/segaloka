"use client";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  BriefcaseBusiness,
  Globe2,
  HeartHandshake,
  Lightbulb,
  MapPin,
  UsersRound,
} from "lucide-react";

import {
  useMarketplacePreferences,
} from "@/components/providers/MarketplacePreferencesProvider";

type CareerLanguage = "ID" | "EN" | "AR";

const copy = {
  ID: {
    eyebrow: "KARIER DI SEGALOKA",
    heroTitle: "Tumbuh Bersama Segaloka",
    heroDescription:
      "Bangun karya yang berarti dalam ekosistem perjalanan dan bantu menciptakan pengalaman perjalanan yang lebih mudah, terhubung, dan terpercaya.",
    explore: "Lihat Peluang Karier",

    aboutEyebrow: "TENTANG KAMI",
    aboutTitle: "Siapa Kami",
    aboutDescription:
      "Segaloka adalah platform perjalanan yang menghubungkan traveler, Travel, Vendor, dan berbagai layanan perjalanan dalam satu ekosistem.",
    aboutAction: "Kenali Segaloka",

    growthTitle: "Tempat untuk Bertumbuh",
    growthDescription:
      "Ruang untuk belajar, berkolaborasi, mengembangkan kemampuan, dan membangun karya yang berdampak.",

    innovationTitle: "Teknologi untuk Perjalanan",
    innovationDescription:
      "Kami membangun produk yang menyederhanakan proses perjalanan dan menghubungkan berbagai pelaku dalam satu ekosistem.",

    collaborationTitle: "Kolaborasi yang Beragam",
    collaborationDescription:
      "Kami percaya produk yang baik lahir dari kolaborasi berbagai keahlian, pengalaman, dan sudut pandang.",

    journeyEyebrow: "PERJALANAN KAMI",
    journeyTitle: "Membangun Ekosistem Perjalanan yang Terhubung",
    journeyDescription:
      "Segaloka terus dikembangkan untuk menghubungkan kebutuhan traveler dengan Travel, Vendor, dan jaringan layanan perjalanan.",

    ecosystem: "Ekosistem Terintegrasi",
    ecosystemText:
      "Traveler, Travel, Vendor, Affiliate, Agen, dan Mitra.",

    products: "Beragam Layanan",
    productsText:
      "Umrah, Haji, Halal Tour, Domestic, International, SegaDeals, Visa, dan Akomodasi.",

    technology: "Berbasis Teknologi",
    technologyText:
      "Marketplace dan sistem operasional perjalanan dalam satu ekosistem.",

    locationsEyebrow: "LOKASI KAMI",
    locationsTitle:
      "Tumbuh dari Indonesia untuk Perjalanan yang Lebih Luas",
    locationsDescription:
      "Segaloka dibangun di Indonesia dengan visi menghubungkan ekosistem perjalanan lintas destinasi.",

    peopleEyebrow: "TIM KAMI",
    peopleTitle: "Kenali Tim di Balik Segaloka",
    peopleDescription:
      "Produk, teknologi, desain, operasional, kemitraan, dan berbagai fungsi bekerja bersama membangun Segaloka.",

    teamProduct: "Produk",
    teamTechnology: "Teknologi",
    teamDesign: "Kreatif & Desain",
    teamOperations: "Operasional",
    teamPartnership: "Kemitraan",

    joinEyebrow: "BERGABUNG BERSAMA KAMI",
    joinTitle: "Jadilah Bagian dari Segaloka",
    joinDescription:
      "Kami membangun tim yang ingin tumbuh, berkolaborasi, dan ikut membentuk masa depan ekosistem perjalanan.",
    joinAction: "Lihat Posisi Tersedia",

    valueTitle: "Cara Kami Bekerja",
    valueInnovation: "Terus Berinovasi",
    valueCollaboration: "Tumbuh Bersama",
    valueImpact: "Menciptakan Dampak",
  },

  EN: {
    eyebrow: "CAREERS AT SEGALOKA",
    heroTitle: "Grow with Segaloka",
    heroDescription:
      "Build meaningful work in the travel ecosystem and help create journeys that are easier, more connected, and more trusted.",
    explore: "Explore Career Opportunities",

    aboutEyebrow: "ABOUT US",
    aboutTitle: "Who We Are",
    aboutDescription:
      "Segaloka is a travel platform connecting travelers, Travel businesses, Vendors, and various travel services in one ecosystem.",
    aboutAction: "Learn About Segaloka",

    growthTitle: "A Place to Grow",
    growthDescription:
      "A place to learn, collaborate, develop your capabilities, and build work that creates meaningful impact.",

    innovationTitle: "Technology for Travel",
    innovationDescription:
      "We build products that simplify travel processes and connect different participants within one ecosystem.",

    collaborationTitle: "Diverse Collaboration",
    collaborationDescription:
      "We believe strong products are created through collaboration across different skills, experiences, and perspectives.",

    journeyEyebrow: "OUR JOURNEY",
    journeyTitle: "Building a Connected Travel Ecosystem",
    journeyDescription:
      "Segaloka continues to evolve to connect traveler needs with Travel businesses, Vendors, and travel service networks.",

    ecosystem: "Integrated Ecosystem",
    ecosystemText:
      "Travelers, Travel businesses, Vendors, Affiliates, Agents, and Partners.",

    products: "Multiple Services",
    productsText:
      "Umrah, Hajj, Halal Tour, Domestic, International, SegaDeals, Visa, and Accommodation.",

    technology: "Technology Driven",
    technologyText:
      "A marketplace and travel operations system within one ecosystem.",

    locationsEyebrow: "OUR LOCATION",
    locationsTitle:
      "Growing from Indonesia for a Wider World of Travel",
    locationsDescription:
      "Segaloka is being built in Indonesia with a vision to connect the travel ecosystem across destinations.",

    peopleEyebrow: "OUR PEOPLE",
    peopleTitle: "Meet the Team Behind Segaloka",
    peopleDescription:
      "Product, technology, design, operations, partnerships, and other functions work together to build Segaloka.",

    teamProduct: "Product",
    teamTechnology: "Technology",
    teamDesign: "Creative & Design",
    teamOperations: "Operations",
    teamPartnership: "Partnerships",

    joinEyebrow: "JOIN OUR JOURNEY",
    joinTitle: "Be Part of Segaloka",
    joinDescription:
      "We are building a team that wants to grow, collaborate, and help shape the future of the travel ecosystem.",
    joinAction: "View Open Positions",

    valueTitle: "How We Work",
    valueInnovation: "Keep Innovating",
    valueCollaboration: "Grow Together",
    valueImpact: "Create Impact",
  },

  AR: {
    eyebrow: "الوظائف في سيجالوكا",
    heroTitle: "انمُ مع سيجالوكا",
    heroDescription:
      "ساهم في بناء أعمال ذات معنى ضمن منظومة السفر وساعد في إنشاء تجارب سفر أكثر سهولة وترابطاً وموثوقية.",
    explore: "استكشف فرص العمل",

    aboutEyebrow: "من نحن",
    aboutTitle: "من نحن",
    aboutDescription:
      "سيجالوكا منصة سفر تربط المسافرين وشركات السفر والموردين وخدمات السفر المختلفة ضمن منظومة واحدة.",
    aboutAction: "تعرّف على سيجالوكا",

    growthTitle: "مكان للنمو",
    growthDescription:
      "بيئة للتعلم والتعاون وتطوير القدرات وبناء أعمال تحقق أثراً ذا معنى.",

    innovationTitle: "تقنية من أجل السفر",
    innovationDescription:
      "نبني منتجات تبسط عمليات السفر وتربط مختلف الأطراف ضمن منظومة واحدة.",

    collaborationTitle: "تعاون متنوع",
    collaborationDescription:
      "نؤمن بأن المنتجات الجيدة تنشأ من التعاون بين الخبرات والمهارات ووجهات النظر المختلفة.",

    journeyEyebrow: "رحلتنا",
    journeyTitle: "بناء منظومة سفر مترابطة",
    journeyDescription:
      "تواصل سيجالوكا التطور لربط احتياجات المسافرين بشركات السفر والموردين وشبكات خدمات السفر.",

    ecosystem: "منظومة متكاملة",
    ecosystemText:
      "المسافرون وشركات السفر والموردون والمسوقون بالعمولة والوكلاء والشركاء.",

    products: "خدمات متعددة",
    productsText:
      "العمرة والحج والجولات الحلال والسفر المحلي والدولي وSegaDeals والتأشيرات والإقامة.",

    technology: "مدعومة بالتقنية",
    technologyText:
      "سوق ونظام لتشغيل خدمات السفر ضمن منظومة واحدة.",

    locationsEyebrow: "موقعنا",
    locationsTitle:
      "ننمو من إندونيسيا نحو عالم أوسع من السفر",
    locationsDescription:
      "يتم بناء سيجالوكا في إندونيسيا برؤية تهدف إلى ربط منظومة السفر عبر الوجهات المختلفة.",

    peopleEyebrow: "فريقنا",
    peopleTitle: "تعرّف على الفريق خلف سيجالوكا",
    peopleDescription:
      "تعمل فرق المنتجات والتقنية والتصميم والعمليات والشراكات وغيرها معاً لبناء سيجالوكا.",

    teamProduct: "المنتجات",
    teamTechnology: "التقنية",
    teamDesign: "الإبداع والتصميم",
    teamOperations: "العمليات",
    teamPartnership: "الشراكات",

    joinEyebrow: "انضم إلى رحلتنا",
    joinTitle: "كن جزءاً من سيجالوكا",
    joinDescription:
      "نبني فريقاً يسعى إلى النمو والتعاون والمساهمة في تشكيل مستقبل منظومة السفر.",
    joinAction: "عرض الوظائف المتاحة",

    valueTitle: "كيف نعمل",
    valueInnovation: "نواصل الابتكار",
    valueCollaboration: "ننمو معاً",
    valueImpact: "نصنع أثراً",
  },
} as const;

const teamImages = [
  {
    key: "teamProduct",
    src: "/images/karier/team-product.png",
  },
  {
    key: "teamTechnology",
    src: "/images/karier/team-technology.png",
  },
  {
    key: "teamDesign",
    src: "/images/karier/team-design.png",
  },
  {
    key: "teamOperations",
    src: "/images/karier/team-operations.png",
  },
  {
    key: "teamPartnership",
    src: "/images/karier/team-partnership.png",
  },
] as const;

export default function CareerClient() {
  const { language, direction } =
    useMarketplacePreferences();

  const lang = language as CareerLanguage;
  const t = copy[lang] ?? copy.ID;

  return (
    <main
      className="career-page"
      lang={
        lang === "ID"
          ? "id"
          : lang === "EN"
            ? "en"
            : "ar"
      }
      dir={direction}
    >
      <section className="career-hero">
        <Image
          unoptimized
            className="career-hero-photo"
          src="/images/karier/hero-team.png"
          alt=""
          fill
          priority
          sizes="100vw"
        />

        <div className="career-hero-overlay" />

        <div className="career-shell career-hero-inner">
          <div className="career-hero-copy">
            <span className="career-kicker">
              {t.eyebrow}
            </span>

            <h1>{t.heroTitle}</h1>
            <p>{t.heroDescription}</p>

            <a
              className="career-primary-button"
              href="#open-positions"
            >
              {t.explore}
              <ArrowRight size={17} />
            </a>
          </div>
        </div>
      </section>

      <section className="career-section">
        <div className="career-shell career-about">
          <div className="career-about-copy">
            <span className="career-kicker">
              {t.aboutEyebrow}
            </span>

            <h2>{t.aboutTitle}</h2>
            <p>{t.aboutDescription}</p>

            <Link
              className="career-outline-button"
              href="/tentang-kami"
            >
              {t.aboutAction}
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="career-photo-collage">
            <div className="career-photo career-about-photo-1">
              <Image
                unoptimized
            src="/images/karier/about-1.png"
                alt=""
                fill
                sizes="(max-width: 900px) 100vw, 35vw"
              />
            </div>

            <div className="career-photo career-about-photo-2">
              <Image
                unoptimized
            src="/images/karier/about-2.png"
                alt=""
                fill
                sizes="(max-width: 900px) 50vw, 18vw"
              />
            </div>

            <div className="career-photo career-about-photo-3">
              <Image
                unoptimized
            src="/images/karier/about-3.png"
                alt=""
                fill
                sizes="(max-width: 900px) 50vw, 18vw"
              />
            </div>

            <div className="career-photo career-about-photo-4">
              <Image
                unoptimized
            src="/images/karier/about-4.png"
                alt=""
                fill
                sizes="(max-width: 900px) 100vw, 35vw"
              />
            </div>
          </div>
        </div>

        <div className="career-shell career-about-values">
          <article className="career-value-card">
            <span className="career-icon">
              <Lightbulb size={22} />
            </span>
            <h3>{t.growthTitle}</h3>
            <p>{t.growthDescription}</p>
          </article>

          <article className="career-value-card">
            <span className="career-icon">
              <Globe2 size={22} />
            </span>
            <h3>{t.innovationTitle}</h3>
            <p>{t.innovationDescription}</p>
          </article>

          <article className="career-value-card">
            <span className="career-icon">
              <HeartHandshake size={22} />
            </span>
            <h3>{t.collaborationTitle}</h3>
            <p>{t.collaborationDescription}</p>
          </article>
        </div>
      </section>

      <section className="career-journey">
        <div className="career-shell career-journey-grid">
          <div>
            <span className="career-kicker">
              {t.journeyEyebrow}
            </span>

            <h2>{t.journeyTitle}</h2>
            <p>{t.journeyDescription}</p>
          </div>

          <div className="career-facts">
            <article>
              <Globe2 size={25} />
              <strong>{t.ecosystem}</strong>
              <span>{t.ecosystemText}</span>
            </article>

            <article>
              <BriefcaseBusiness size={25} />
              <strong>{t.products}</strong>
              <span>{t.productsText}</span>
            </article>

            <article>
              <Lightbulb size={25} />
              <strong>{t.technology}</strong>
              <span>{t.technologyText}</span>
            </article>
          </div>
        </div>
      </section>

      <section className="career-section">
        <div className="career-shell">
          <span className="career-kicker">
            {t.locationsEyebrow}
          </span>

          <div className="career-heading-row">
            <div>
              <h2>{t.locationsTitle}</h2>
              <p>{t.locationsDescription}</p>
            </div>
          </div>

          <div className="career-location-card">
            <Image
              unoptimized
            className="career-location-photo"
              src="/images/karier/location-indonesia.png"
              alt=""
              fill
              sizes="(max-width: 900px) 100vw, 1180px"
            />

            <div className="career-location-overlay" />

            <div className="career-location-label">
              <MapPin size={25} />
              <div>
                <strong>Indonesia</strong>
                <span>Segaloka</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="career-team">
        <div className="career-shell">
          <span className="career-kicker career-kicker-light">
            {t.peopleEyebrow}
          </span>

          <div className="career-team-heading">
            <div>
              <h2>{t.peopleTitle}</h2>
              <p>{t.peopleDescription}</p>
            </div>
          </div>

          <div className="career-team-grid">
            {teamImages.map((item) => (
              <article key={item.key}>
                <Image
                  unoptimized
                  src={item.src}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 20vw"
                />

                <div className="career-team-card-overlay" />

                <div className="career-team-card-label">
                  <UsersRound size={20} />
                  <strong>{t[item.key]}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="open-positions"
        className="career-section career-join"
      >
        <div className="career-shell career-join-card">
          <Image
            unoptimized
            className="career-join-photo"
            src="/images/karier/join-team.png"
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 1180px"
          />

          <div className="career-join-overlay" />

          <div className="career-join-copy">
            <span className="career-kicker">
              {t.joinEyebrow}
            </span>

            <h2>{t.joinTitle}</h2>
            <p>{t.joinDescription}</p>
          </div>

          <button
            type="button"
            className="career-primary-button career-join-action"
          >
            {t.joinAction}
            <ArrowRight size={17} />
          </button>
        </div>

        <div className="career-shell career-values">
          <h2>{t.valueTitle}</h2>

          <div>
            <span>
              <Lightbulb size={20} />
              {t.valueInnovation}
            </span>

            <span>
              <UsersRound size={20} />
              {t.valueCollaboration}
            </span>

            <span>
              <HeartHandshake size={20} />
              {t.valueImpact}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}