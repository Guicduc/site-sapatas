import { StructuredData } from "@/components/structured-data";
import { faqSections } from "@/lib/site-data";

export const metadata = {
  title: "FAQ técnico e comercial",
  description:
    "Perguntas frequentes sobre sapatas 3D para mobiliário: medida, compatibilidade, cor, material, prazo, recompra e projeto especial.",
  alternates: {
    canonical: "/faq"
  }
};

export default function FaqPage() {
  const mainEntity = faqSections.flatMap((section) =>
    section.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  );

  return (
    <>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity
        }}
      />

      <section className="page-panel narrow-panel">
        <p className="eyebrow">FAQ técnico-comercial</p>
        <h1>Perguntas que reduzem atrito antes de chegar no comercial.</h1>
        <p className="lead">
          As respostas abaixo ajudam o cliente a entender como escolher família, quando seguir
          na linha padrão e quando abrir um projeto especial.
        </p>
      </section>

      <section className="grid-three">
        {faqSections.map((section) => (
          <article key={section.title} className="surface-card faq-column">
            <h3>{section.title}</h3>
            <div className="faq-stack">
              {section.items.map((item, index) => (
                <details key={item.question} open={index === 0}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
