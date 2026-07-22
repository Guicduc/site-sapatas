import Link from "next/link";
import { notFound } from "next/navigation";

import { FamilyCard } from "@/components/family-card";
import { StructuredData } from "@/components/structured-data";
import { buildWhatsAppUrl, formatCurrency } from "@/lib/format";
import {
  brand,
  colorMap,
  families,
  getFamilyBySlug,
  getRelatedFamilies
} from "@/lib/site-data";

export function generateStaticParams() {
  return families.filter(isPublicFamily).map((family) => ({ slug: family.slug }));
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const family = getFamilyBySlug(resolvedParams.slug);

  if (!family || !isPublicFamily(family)) {
    return {};
  }

  return {
    title: family.seoTitle,
    description: family.seoDescription,
    alternates: {
      canonical: family.url
    }
  };
}

export default async function FamilyPage({ params }) {
  const resolvedParams = await params;
  const family = getFamilyBySlug(resolvedParams.slug);

  if (!family || !isPublicFamily(family)) {
    notFound();
  }

  const relatedFamilies = getRelatedFamilies(family.slug);
  const hasPublicPricing = Number.isFinite(Number(family.priceFromBrl)) && Number(family.priceFromBrl) > 0;
  const whatsappMessage = `Oi, quero comprar a família ${family.name} e confirmar a melhor variante para o meu projeto.`;

  return (
    <>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: family.name,
          brand: {
            "@type": "Brand",
            name: brand.name
          },
          category: "Sapata para mobiliário",
          description: family.seoDescription,
          ...(hasPublicPricing ? {
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "BRL",
              lowPrice: family.priceFromBrl,
              highPrice: Math.max(...family.variants.map((variant) => variant.priceBrl)),
              offerCount: family.variants.length
            }
          } : {})
        }}
      />

      <section className="page-panel narrow-panel">
        <p className="eyebrow">Família SEO | {family.keyword}</p>
        <h1>{family.heroTitle}</h1>
        <p className="lead">{family.heroDescription}</p>
        <div className="chip-row">
          {family.parameterSummary.map((item) => (
            <span key={item} className="chip">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="family-layout">
        <div className="family-content">
          <div className="grid-two">
            <article className="surface-card spec-card">
              <strong>Fixação</strong>
              <p>{family.fixation}</p>
            </article>
            <article className="surface-card spec-card">
              <strong>Material base</strong>
              <p>{family.defaultMaterial}</p>
            </article>
            <article className="surface-card spec-card">
              <strong>Lead time</strong>
              <p>{family.leadTimeDays} dias úteis</p>
            </article>
            <article className="surface-card spec-card">
              <strong>Venda</strong>
              <p>{hasPublicPricing
                ? `A partir de ${formatCurrency(family.priceFromBrl)} por ${family.salesUnit}`
                : "Em validação técnica, sem preço publicado."}
              </p>
            </article>
          </div>

          <article className="surface-card panel-copy">
            <strong>{family.fitTitle}</strong>
            <p>{family.fitDescription}</p>
          </article>

          <article className="surface-card panel-copy">
            <strong>Cores padrão</strong>
            <div className="chip-row">
              {family.availableColors.map((color) => (
                <span
                  key={color}
                  className="chip chip-swatch"
                  style={{ "--swatch": colorMap[color] || "#b76447" }}
                >
                  {color}
                </span>
              ))}
            </div>
          </article>

          <article className="surface-card table-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Compatibilidade</th>
                    <th>Altura</th>
                    <th>Cor</th>
                    <th>Preço</th>
                    <th>Lead time</th>
                  </tr>
                </thead>
                <tbody>
                  {family.variants.map((variant) => (
                    <tr key={variant.sku}>
                      <td>
                        <strong>{variant.sku}</strong>
                        <br />
                        {variant.label}
                      </td>
                      <td>{variant.dimensions.compatibleRangeMm}</td>
                      <td>{variant.dimensions.heightMm} mm</td>
                      <td>{variant.color}</td>
                      <td>{hasPublicPricing ? <><strong>{formatCurrency(variant.priceBrl)}</strong><br />{variant.salesUnit}</> : "Em validação"}</td>
                      <td>{variant.leadTimeDays} dias úteis</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <aside className="family-sidebar">
          <div className="hero-panel sticky-panel">
            <strong>{family.asideTitle}</strong>
            <p>{family.asideDescription}</p>
            <div className="action-column">
              <a
                className="button button-primary button-block"
                href={buildWhatsAppUrl(brand.whatsappNumber, whatsappMessage)}
                rel="noreferrer"
                target="_blank"
              >
                Confirmar a variante por WhatsApp
              </a>
              <Link
                className="button button-secondary button-block"
                href={`/projeto-especial?family=${family.slug}`}
              >
                Pedir medida fora da matriz
              </Link>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid-two">
        <article className="surface-card faq-column">
          <h3>Perguntas frequentes</h3>
          <div className="faq-stack">
            {family.faqs.map((item, index) => (
              <details key={item.question} open={index === 0}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </article>

        <article className="surface-card faq-column">
          <h3>Famílias relacionadas</h3>
          <div className="related-grid">
            {relatedFamilies.map((item) => (
              <FamilyCard key={item.slug} family={item} />
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

function isPublicFamily(family) {
  return family.status !== "draft";
}
