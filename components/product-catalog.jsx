"use client";

import Link from "next/link";

import { colorMap } from "@/lib/brand-colors";

const moodTerms = [
  {
    text: "Peças 100% customizáveis a partir de sua necessidade"
  },
  {
    text: "Material resistente para área interna e externa"
  },
  {
    text: "Sem pedido mínimo, produção sob demanda"
  },
  {
    text: "Material 100% reciclável"
  },
  {
    text: "Se sentir falta de alguma forma, entre em contato para discutir seu projeto"
  }
];

export function ProductCatalog({ categories }) {
  return (
    <section className="shop-shell">
      <div className="shop-hero">
        <div className="shop-hero__copy">
          <h1>Sapatas plásticas customizáveis para o seu projeto</h1>
          <p className="lead">
            Sapatas feitas sob medida para encaixar no seu projeto, proteger melhor e dar um acabamento mais bonito.
          </p>
        </div>
        <div className="shop-hero__media">
          <img
            className="shop-hero__image"
            src="/brand/traco-base-hero.png"
            alt="Sapatas e ponteiras Traço Base aplicadas em pés tubulares de mobiliário"
          />
        </div>
      </div>

      <div className="brand-mood" aria-label="Pilares da identidade Traço Base">
        {moodTerms.map((term, index) => (
          <article key={term.text}>
            <strong>{String(index + 1).padStart(2, "0")}</strong>
            <p>{term.text}</p>
          </article>
        ))}
      </div>

      <div className="category-grid">
        {categories.map((category) => (
          <article className="category-card" key={category.slug}>
            {category.image && (
              <img className="category-card__image" src={category.image.src} alt={category.image.alt} />
            )}
            <div className="category-card__body">
              <p className="eyebrow">{category.eyebrow}</p>
              <h2>{category.name}</h2>
              <p>{category.description}</p>
              <div className="meta-list">
                <span>{category.primaryFixation}</span>
                {category.formats.length > 1 && (
                  <span>{category.formats.map((format) => format.name).join(" / ")}</span>
                )}
              </div>
              <div className="swatch-row" aria-label="Cores disponíveis">
                {category.colors.map((color) => (
                  <span
                    key={color}
                    className="swatch"
                    style={{ "--swatch": colorMap[color] || "#808784" }}
                    title={color}
                  >
                    <span className="visually-hidden">{color}</span>
                  </span>
                ))}
              </div>
            </div>
            <Link className="button button-primary" href={`/configurar/${category.slug}`}>
              Configurar
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
