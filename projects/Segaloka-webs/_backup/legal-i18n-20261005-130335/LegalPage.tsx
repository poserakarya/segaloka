import Image from "next/image";

import type {
  LegalDocument,
} from "@/data/legal-content";

type LegalPageProps = {
  document: LegalDocument;
};

export function LegalPage({
  document,
}: LegalPageProps) {
  return (
    <main className="legal-page">

      <header className="legal-header">
        <div className="legal-shell legal-header-inner">
          <a href="/" className="legal-logo">
            <Image
              src="/images/brand/segaloka-logo.png"
              alt="Segaloka"
              width={130}
              height={42}
              priority
            />
          </a>

          <a href="/" className="legal-back">
            Kembali ke Segaloka
          </a>
        </div>
      </header>


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
              Versi {document.version}
            </span>

            <span>
              Berlaku {document.effectiveDate}
            </span>

            <span>
              Diperbarui {document.lastUpdated}
            </span>
          </div>

        </div>
      </section>


      <div className="legal-shell legal-layout">

        <aside className="legal-toc">
          <strong>
            Daftar Isi
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
                (paragraph) => (
                  <p key={paragraph}>
                    {paragraph}
                  </p>
                ),
              )}

              {section.bullets && (
                <ul>
                  {section.bullets.map(
                    (bullet) => (
                      <li key={bullet}>
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