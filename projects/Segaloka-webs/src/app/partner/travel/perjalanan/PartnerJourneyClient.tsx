"use client";

import {
  ArrowRight,
  Building2,
  Check,
  Flag,
  Plane,
  Rocket,
  Sparkles,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";

type JourneyKind =
  | "free"
  | "starter"
  | "growth"
  | "enterprise";

const copy = {
  ID: {
    badge: "Segaloka Travel Partner",
    eyebrow: "Perjalanan bisnis Anda dimulai",
    step1: "Mulai",
    step2: "Siapkan Travel",
    step3: "Bergabung",
    progress: "Anda sedang menuju langkah berikutnya",
    safe:
      "Proses berikutnya akan memandu Anda menyiapkan Travel secara bertahap.",
    free: {
      title: "Perjalanan Anda bersama Segaloka segera dimulai",
      description:
        "Siapkan bisnis Travel Anda. Kami sedang membawa Anda menuju proses pendaftaran Segaloka.",
      button: "Lanjut Daftar Gratis",
    },
    starter: {
      title: "Anda sedang menuju Paket Starter",
      description:
        "Langkah awal untuk membawa bisnis Travel Anda ke ekosistem Segaloka dengan fitur dasar yang dibutuhkan untuk mulai berjualan.",
      button: "Lanjut dengan Starter",
    },
    growth: {
      title: "Saatnya membawa Travel Anda tumbuh lebih jauh",
      description:
        "Anda sedang menuju Paket Growth dengan Website Travel Gratis, Omnichannel, SegaDeals, dan fitur pengembangan bisnis lainnya.",
      button: "Lanjut dengan Growth",
    },
    enterprise: {
      title: "Mari siapkan solusi Enterprise untuk Travel Anda",
      description:
        "Untuk kebutuhan bisnis skala besar, multi cabang, integrasi API, dan dukungan prioritas dari Segaloka.",
      button: "Lihat Enterprise",
    },
  },

  EN: {
    badge: "Segaloka Travel Partner",
    eyebrow: "Your business journey starts here",
    step1: "Start",
    step2: "Prepare Travel",
    step3: "Join",
    progress: "You are heading to the next step",
    safe:
      "The next process will guide you through setting up your Travel business step by step.",
    free: {
      title: "Your journey with Segaloka is about to begin",
      description:
        "Prepare your Travel business. We are taking you to the Segaloka registration process.",
      button: "Continue Free Registration",
    },
    starter: {
      title: "You are heading to the Starter Plan",
      description:
        "A first step to bring your Travel business into the Segaloka ecosystem with the essential tools to start selling.",
      button: "Continue with Starter",
    },
    growth: {
      title: "Take your Travel business further",
      description:
        "You are heading to the Growth Plan with a Free Travel Website, Omnichannel, SegaDeals, and more business growth tools.",
      button: "Continue with Growth",
    },
    enterprise: {
      title: "Let's prepare an Enterprise solution for your Travel business",
      description:
        "Designed for larger operations that need multiple branches, API integration, and priority Segaloka support.",
      button: "View Enterprise",
    },
  },

  AR: {
    badge: "شريك Segaloka للسفر",
    eyebrow: "رحلة أعمالك تبدأ من هنا",
    step1: "ابدأ",
    step2: "جهّز نشاط السفر",
    step3: "انضم",
    progress: "أنت في طريقك إلى الخطوة التالية",
    safe:
      "سترشدك الخطوة التالية إلى إعداد نشاط السفر الخاص بك بصورة تدريجية.",
    free: {
      title: "رحلتك مع Segaloka على وشك أن تبدأ",
      description:
        "جهّز نشاط السفر الخاص بك. نحن نأخذك الآن إلى عملية التسجيل في Segaloka.",
      button: "متابعة التسجيل المجاني",
    },
    starter: {
      title: "أنت في طريقك إلى باقة Starter",
      description:
        "خطوتك الأولى للانضمام إلى منظومة Segaloka بالأدوات الأساسية لبدء البيع.",
      button: "المتابعة مع Starter",
    },
    growth: {
      title: "حان الوقت لتنمية نشاط السفر بشكل أكبر",
      description:
        "أنت في طريقك إلى باقة Growth مع موقع سفر مجاني وOmnichannel وSegaDeals وأدوات أخرى للنمو.",
      button: "المتابعة مع Growth",
    },
    enterprise: {
      title: "لنجهز حل Enterprise لنشاط السفر الخاص بك",
      description:
        "للعمليات الكبيرة التي تحتاج إلى فروع متعددة وتكامل API ودعم Segaloka ذي الأولوية.",
      button: "عرض Enterprise",
    },
  },
} as const;

function getJourneyKind(value: string | null): JourneyKind {
  if (
    value === "starter" ||
    value === "growth" ||
    value === "enterprise"
  ) {
    return value;
  }

  return "free";
}

export default function PartnerJourneyClient() {
  const searchParams = useSearchParams();
  const { language } = useMarketplacePreferences();

  const lang =
    language === "EN" || language === "AR"
      ? language
      : "ID";

  const kind = getJourneyKind(searchParams.get("type"));

  const t = copy[lang];
  const current = t[kind];

  const destination =
    kind === "starter"
      ? "/partner/travel/daftar?plan=starter"
      : kind === "growth"
        ? "/partner/travel/daftar?plan=growth"
        : kind === "enterprise"
          ? "/partner/travel/enterprise"
          : "/partner/travel/daftar";

  const Icon =
    kind === "growth"
      ? Sparkles
      : kind === "enterprise"
        ? Building2
        : Rocket;

  return (
    <main className="partner-journey-page">
      <div className="partner-journey-orb partner-journey-orb-one" />
      <div className="partner-journey-orb partner-journey-orb-two" />

      <div className="partner-journey-shell">
        <section className="partner-journey-copy">
          <div className="partner-journey-badge">
            <Plane size={15} />
            <span>{t.badge}</span>
          </div>

          <span className="partner-journey-eyebrow">
            {t.eyebrow}
          </span>

          <h1>{current.title}</h1>

          <p className="partner-journey-description">
            {current.description}
          </p>

          <div className="partner-journey-status">
            <span className="partner-journey-status-icon">
              <Check size={15} />
            </span>

            <span>{t.safe}</span>
          </div>

          <a
            className="partner-journey-button"
            href={destination}
          >
            <span>{current.button}</span>
            <ArrowRight size={17} />
          </a>
        </section>

        <section
          className="partner-journey-visual"
          aria-label={t.progress}
        >
          <div className="partner-journey-scene">
            <div className="partner-journey-sun" />

            <div className="partner-journey-cloud cloud-one">
              <span />
              <span />
              <span />
            </div>

            <div className="partner-journey-cloud cloud-two">
              <span />
              <span />
              <span />
            </div>

            <div className="partner-journey-plane">
              <Plane size={22} />
            </div>

            <div className="partner-journey-destination">
              <div className="partner-journey-pin-ring">
                <Flag size={19} />
              </div>
            </div>

            <div className="partner-journey-ground">
              <div className="partner-journey-road">
                <span className="road-dot dot-one" />
                <span className="road-dot dot-two" />
                <span className="road-dot dot-three" />
                <span className="road-dot dot-four" />
              </div>

              <div className="walking-traveler">
                <div className="traveler-head" />

                <div className="traveler-body">
                  <Icon size={15} />
                </div>

                <div className="traveler-arm traveler-arm-left" />
                <div className="traveler-arm traveler-arm-right" />

                <div className="traveler-leg traveler-leg-left" />
                <div className="traveler-leg traveler-leg-right" />

                <div className="traveler-suitcase">
                  <span className="suitcase-handle" />
                  <span className="suitcase-wheel wheel-left" />
                  <span className="suitcase-wheel wheel-right" />
                </div>
              </div>
            </div>
          </div>

          <div className="partner-journey-progress-card">
            <div className="journey-progress-copy">
              <span>{t.progress}</span>
              <strong>Segaloka</strong>
            </div>

            <div className="journey-progress-track">
              <span />
            </div>

            <div className="journey-progress-steps">
              <span>{t.step1}</span>
              <span>{t.step2}</span>
              <span>{t.step3}</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}