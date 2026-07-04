import Link from "next/link";

import { formatCurrency } from "@/lib/format";

export function FamilyCard({ family }) {
  return (
    <article className="family-card surface-card">
      {family.image && (
        <img className="family-card__image" src={family.image.src} alt={family.image.alt} />
      )}
      <div className="family-card__header">
        <div>
          <p className="eyebrow">{family.eyebrow}</p>
          <h3>{family.name}</h3>
          <p>{family.tagline}</p>
        </div>
        <div className="price-note">
          <span>A partir de</span>
          <strong>{formatCurrency(family.priceFromBrl)}</strong>
          <small>{family.salesUnit}</small>
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
