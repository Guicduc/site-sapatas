import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentSection } from "@/components/content-blocks";
import { StructuredData } from "@/components/structured-data";
import { buildGuideArticleJsonLd, getGuideBySlug, guidePath, guides } from "@/lib/guides";
import { buildPageMetadata } from "@/lib/page-metadata";
import { brand, siteUrl } from "@/lib/site-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return {};
  }

  return buildPageMetadata({
    title: guide.title,
    description: guide.description,
    path: guidePath(guide.slug)
  });
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export default async function GuidePage({ params }) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const updatedAt = guide.dateModified || guide.datePublished;

  return (
    <>
      <StructuredData data={buildGuideArticleJsonLd(guide, { siteUrl, brand })} />

      <article className="legal-page">
        <header className="page-panel legal-hero">
          <p className="eyebrow">
            <Link href="/guias">Guias Baseforma</Link>
          </p>
          <h1>{guide.heading}</h1>
          <p className="lead">{guide.lead}</p>
          <p className="legal-hero__updated">
            Atualizado em <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>.
          </p>
        </header>

        {guide.sections.map((section) => (
          <ContentSection key={section.id} section={section} />
        ))}
      </article>

      <section className="cta-banner">
        <div>
          <p className="eyebrow">Próximo passo</p>
          <h2>Configure a peça na medida do seu móvel</h2>
          <p>Informe as medidas, escolha a cor e veja preço e prazo na hora. Sem pedido mínimo.</p>
        </div>
        <div className="action-row">
          {guide.cta.map((item) => (
            <Link
              key={item.href}
              className={`button ${item.primary ? "button-primary" : "button-secondary"}`}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
