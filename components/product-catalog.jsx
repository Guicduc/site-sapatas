"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getCategoryCardImage, homeHeroImages } from "@/lib/product-visuals";

const moodTerms = [
  {
    icon: "fit",
    label: "Sob medida",
    emphasis: "Customização total",
    text: "pela medida do seu projeto"
  },
  {
    icon: "shield",
    label: "Uso real",
    emphasis: "Material resistente",
    text: "para uso interno e externo"
  },
  {
    icon: "batch",
    label: "Sem travas",
    emphasis: "Sem pedido mínimo",
    text: "com produção sob demanda"
  },
  {
    icon: "cycle",
    label: "Ciclo inteligente",
    emphasis: "Material reciclável",
    text: "com descarte mais consciente"
  },
  {
    icon: "spark",
    label: "Projeto especial",
    question: "Forma fora do catálogo?",
    cta: "entre em contato",
    href: "/projeto-especial"
  }
];

const moodIcons = {
  fit: (
    <>
      <path d="M7 7h7v7H7z" />
      <path d="M14 10h5v9h-9v-5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.2-2.7 7.3-7 9-4.3-1.7-7-4.8-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-5" />
    </>
  ),
  batch: (
    <>
      <path d="M6 7h12" />
      <path d="M6 12h12" />
      <path d="M6 17h7" />
      <path d="M17 16l2 2 3-4" />
    </>
  ),
  cycle: (
    <>
      <path d="M8 8a6 6 0 0 1 9.8 2" />
      <path d="M18 6v4h-4" />
      <path d="M16 16a6 6 0 0 1-9.8-2" />
      <path d="M6 18v-4h4" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9L12 3z" />
      <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15z" />
    </>
  )
};

export function ProductCatalog({ categories }) {
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    if (homeHeroImages.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % homeHeroImages.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="shop-shell">
      <div className="shop-hero">
        <div className="shop-hero__copy">
          <h1>Sapatas plásticas customizáveis para o seu projeto</h1>
          <p className="lead">
            Sapatas feitas sob medida para encaixar no seu projeto, proteger melhor e dar um acabamento mais bonito.
          </p>
        </div>
        <div className="shop-hero__media" aria-label="Imagens de produtos Baseforma">
          {homeHeroImages.map((image, index) => (
            <img
              className={`shop-hero__image${index === heroIndex ? " is-active" : ""}`}
              key={image.src}
              src={image.src}
              alt={index === heroIndex ? image.alt : ""}
              aria-hidden={index === heroIndex ? undefined : "true"}
            />
          ))}
        </div>
      </div>

      <div className="brand-mood" aria-label="Pilares da identidade Baseforma">
        {moodTerms.map((term, index) => (
          <article key={term.label}>
            <span className="brand-mood__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                {moodIcons[term.icon]}
              </svg>
            </span>
            <div>
              <span className="brand-mood__label">
                {String(index + 1).padStart(2, "0")} / {term.label}
              </span>
              {term.question ? (
                <p>
                  <strong>{term.question}</strong>{" "}
                  <Link className="brand-mood__cta" href={term.href}>
                    {term.cta}
                  </Link>
                </p>
              ) : (
                <p>
                  <strong>{term.emphasis}</strong> {term.text}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="category-grid">
        {categories.map((category) => {
          const cardImage = getCategoryCardImage(category.slug, category.image);

          return (
            <article className="category-card" key={category.slug}>
              {cardImage && (
                <img className="category-card__image" src={cardImage.src} alt={cardImage.alt} />
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
              </div>
              <Link className="button button-primary" href={`/configurar/${category.slug}`}>
                Configurar
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
