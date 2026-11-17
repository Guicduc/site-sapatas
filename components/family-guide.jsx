import Link from "next/link";

import { ContentSection, RichText } from "@/components/content-blocks";
import styles from "@/components/content-blocks.module.css";
import { getFamilyGuide } from "@/lib/family-content";
import { getGuideBySlug, guidePath } from "@/lib/guides";

// Conteudo unico da pagina de familia (aplicacoes, como medir, medidas comuns, FAQ tecnica
// fica em family.faqs). Os dados vivem em lib/family-content.js.
export function FamilyGuide({ family }) {
  const guide = getFamilyGuide(family.slug);

  if (!guide) {
    return null;
  }

  const relatedGuides = (guide.guides || []).map(getGuideBySlug).filter(Boolean);

  return (
    <div className="legal-page family-guide">
      <section className="page-panel legal-section" aria-labelledby="family-guide-title">
        <div>
          <h2 id="family-guide-title">{guide.title}</h2>
        </div>
        <div className="legal-copy">
          {guide.intro.map((paragraph, index) => (
            <p key={index}>
              <RichText value={paragraph} />
            </p>
          ))}
        </div>
      </section>

      {guide.sections.map((section) => (
        <ContentSection key={section.id} section={section} idPrefix="guia-" />
      ))}

      {relatedGuides.length > 0 ? (
        <section className="page-panel legal-section" aria-labelledby="family-guide-related">
          <div>
            <h2 id="family-guide-related">Guias relacionados</h2>
          </div>
          <div className="legal-copy">
            <ul className={styles.guideList}>
              {relatedGuides.map((item) => (
                <li key={item.slug}>
                  <Link href={guidePath(item.slug)}>{item.heading}</Link>
                  <br />
                  {item.description}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
