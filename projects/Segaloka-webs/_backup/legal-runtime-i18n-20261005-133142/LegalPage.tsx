"use client";

import type {
  LegalDocument,
} from "@/data/legal-content";

import {
  legalUiTranslations,
} from "@/data/legal-i18n";

import {
  useMarketplacePreferences,
} from "@/components/providers/MarketplacePreferencesProvider";

type LegalPageProps = {
  document: LegalDocument;
};

export function LegalPage({
  document,
}: LegalPageProps) {
  const {
    language,
    direction,
  } = useMarketplacePreferences();

  const ui = legalUiTranslations[language];

  return (
    <main
      className="legal-page"
      lang={
        language === "ID"
          ? "id"
          : language === "EN"
            ? "en"
            : "ar"
      }
      dir={direction}
    >

      <section className="legal-hero">
        <div className="legal-shell">
          <span className="legal-eyebrow">
            {document.eyebrow}
          </span>

          <h1>
            {document.title}
          </h1>

          <p>
            {document.summary}
          </p>

          <div className="legal-meta">
            <span>
              {ui.version} {document.version}
            </span>

            <span>
              {ui.effective} {document.effectiveDate}
            </span>

            <span>
              {ui.updated} {document.lastUpdated}
            </span>
          </div>
        </div>
      </section>

      <div className="legal-shell legal-layout">
        <aside className="legal-toc">
          <strong>
            {ui.tableOfContents}
          </strong>

          <nav>
            {document.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <article className="legal-content">
          {document.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="legal-section"
            >
              <h2>
                {section.title}
              </h2>

              {section.paragraphs?.map(
                (paragraph, index) => (
                  <p key={`${section.id}-p-${index}`}>
                    {paragraph}
                  </p>
                ),
              )}

              {section.bullets && (
                <ul>
                  {section.bullets.map(
                    (bullet, index) => (
                      <li
                        key={`${section.id}-b-${index}`}
                      >
                        {bullet}
                      </li>
                    ),
                  )}
                </ul>
              )}
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}