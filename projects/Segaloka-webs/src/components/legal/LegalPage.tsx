"use client";

import {
  getLegalDocument,
  type LegalDocument,
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

  /*
   * Route hanya menentukan slug/base document.
   * Konten aktual mengikuti preference bahasa global.
   */
  const localizedDocument = getLegalDocument(
    document.slug,
    language,
  );

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
            {localizedDocument.eyebrow}
          </span>

          <h1>
            {localizedDocument.title}
          </h1>

          <p>
            {localizedDocument.summary}
          </p>

          <div className="legal-meta">
            <span>
              {ui.version} {localizedDocument.version}
            </span>

            <span>
              {ui.effective}{" "}
              {localizedDocument.effectiveDate}
            </span>

            <span>
              {ui.updated}{" "}
              {localizedDocument.lastUpdated}
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
            {localizedDocument.sections.map(
              (section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                >
                  {section.title}
                </a>
              ),
            )}
          </nav>
        </aside>

        <article className="legal-content">
          {localizedDocument.sections.map(
            (section) => (
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
                    <p
                      key={`${section.id}-p-${index}`}
                    >
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
            ),
          )}
        </article>
      </div>
    </main>
  );
}