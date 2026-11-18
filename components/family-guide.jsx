import { ContentSection, RichText } from "@/components/content-blocks";
import { getFamilyGuide } from "@/lib/family-content";

// Conteudo unico da pagina de familia (aplicacoes, como medir, medidas comuns, FAQ tecnica
// fica em family.faqs). Os dados vivem em lib/family-content.js.
export function FamilyGuide({ family }) {
  const guide = getFamilyGuide(family.slug);

  if (!guide) {
    return null;
  }

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
    </div>
  );
}
