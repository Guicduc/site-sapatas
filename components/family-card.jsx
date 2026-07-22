import Link from "next/link";

import { ProductImageCarousel } from "@/components/product-image-carousel";
import { formatCurrency } from "@/lib/format";

export function FamilyCard({ family }) {
  const hasPublicPricing = Number.isFinite(Number(family.priceFromBrl)) && Number(family.priceFromBrl) > 0;

  return (
    <article className="family-card surface-card">
      {family.images?.length > 0 || family.image ? (
        <ProductImageCarousel
          className="family-card__carousel"
          images={family.images || [family.image]}
          label={`Fotos de ${family.name}`}
          aspectRatio="1.55 / 1"
        />
      ) : null}
      <div className="family-card__header">
        <div>
          <p className="eyebrow">{family.eyebrow}</p>
          <h3>{family.name}</h3>
          <p>{family.tagline}</p>
        </div>
        <div className="price-note">
          {hasPublicPricing ? (
            <>
              <span>A partir de</span>
              <strong>{formatCurrency(family.priceFromBrl)}</strong>
              <small>{family.salesUnit}</small>
            </>
          ) : (
            <>
              <span>Disponibilidade</span>
              <strong>Em validação</strong>
              <small>sem preço publicado</small>
            </>
          )}
        </div>
      </div>

      <div className="chip-row">
        {family.applications.slice(0, 3).map((application) => (
          <span key={application} className="chip">
            {application}
          </span>
        ))}
      </div>

      <ul className="feature-list">
        {family.highlights.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className="action-row">
        <Link className="button button-primary" href={family.url}>
          Ver família
        </Link>
        <Link
          className="button button-secondary"
          href={`/projeto-especial?family=${family.slug}`}
        >
          Projeto especial
        </Link>
      </div>
    </article>
  );
}
