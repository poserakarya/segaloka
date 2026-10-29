"use client";

import "../partner-feature-detail.css";

import { Building2, Check, Mail } from "lucide-react";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";

export default function EnterprisePage() {
  const { language } = useMarketplacePreferences();

  const title =
    language === "EN"
      ? "Segaloka Enterprise"
      : language === "AR"
        ? "Segaloka للمؤسسات"
        : "Segaloka Enterprise";

  const description =
    language === "EN"
      ? "For larger Travel businesses that need unlimited active packages, multi-branch operations, API integration, and priority support."
      : language === "AR"
        ? "للشركات الكبيرة التي تحتاج إلى باقات نشطة غير محدودة وفروع متعددة وتكامل API ودعم ذي أولوية."
        : "Untuk bisnis Travel skala besar yang membutuhkan paket aktif tanpa batas, multi cabang, integrasi API, dan dukungan prioritas.";

  return (
    <main className="partner-feature-detail">
      <div className="partner-feature-detail-shell">
        <section className="partner-feature-hero">
          <div className="partner-feature-hero-icon">
            <Building2 size={30} />
          </div>

          <div>
            <span className="partner-feature-eyebrow">
              SEGALOKA ENTERPRISE
            </span>

            <h1>{title}</h1>
            <p className="partner-feature-lead">{description}</p>
          </div>
        </section>

        <section className="partner-feature-content">
          <div className="partner-feature-benefits">
            {[
              "Semua fitur Growth",
              "Paket aktif tanpa batas",
              "Multi cabang",
              "Integrasi API",
              "Account manager",
              "Support prioritas",
            ].map((item) => (
              <div className="partner-feature-benefit" key={item}>
                <span><Check size={16} /></span>
                <p>{item}</p>
              </div>
            ))}
          </div>

          <a
            className="partner-feature-cta"
            href="mailto:partnership@segaloka.com?subject=Segaloka%20Enterprise"
          >
            <Mail size={16} style={{ marginRight: 7 }} />
            partnership@segaloka.com
          </a>
        </section>
      </div>
    </main>
  );
}