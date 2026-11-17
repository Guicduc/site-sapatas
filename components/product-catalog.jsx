"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ProductImageCarousel } from "@/components/product-image-carousel";
import { getCategoryCardGallery, homeHeroImages } from "@/lib/product-visuals";

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
    label: "Configuração",
    question: "Configure seu produto",
    cta: "abrir catálogo",
    href: "/catalogo"
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

// Coluna de midia do hero: metade do conteudo (max 1500px) no desktop, largura total ate 980px.
const HERO_IMAGE_SIZES = "(max-width: 980px) 100vw, (max-width: 1540px) 50vw, 740px";

export function ProductCatalog({ categories, catalogOnly = false }) {
  const [heroIndex, setHeroIndex] = useState(0);
  // So a 1a foto do hero entra no HTML inicial (LCP); as demais sao montadas depois do load.
  const [heroQueueReady, setHeroQueueReady] = useState(false);
  // No /catalogo o 1o card fica acima da dobra e costuma ser o LCP.
  const priorityCardSlug = catalogOnly ? categories[0]?.slug : null;

  useEffect(() => {
    if (catalogOnly || homeHeroImages.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    let queueTimer;
    const mountQueue = () => {
      queueTimer = window.setTimeout(() => setHeroQueueReady(true), 1500);
    };

    if (document.readyState === "complete") {
      mountQueue();
    } else {
      window.addEventListener("load", mountQueue, { once: true });
    }

    const timer = window.setInterval(() => {
      setHeroQueueReady(true);
      setHeroIndex((current) => (current + 1) % homeHeroImages.length);
    }, 6500);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(queueTimer);
      window.removeEventListener("load", mountQueue);
    };
  }, [catalogOnly]);

  return (
    <section className={`shop-shell${catalogOnly ? " shop-shell--catalog" : ""}`}>
      {!catalogOnly && (
        <>
          <div className="shop-hero">
            <div className="shop-hero__copy">
              <h1>Ponteiras e sapatas sob medida para pés de móveis</h1>
              <p className="lead">
                Ponteira interna para tubo redondo, metalon e tubo oblongo, e sapatas para pés de mesa,
                cadeira, sofá e poltrona. Feitas em TPU pela medida real do seu móvel, a partir de 1 unidade.
              </p>
            </div>
            <div className="shop-hero__media" aria-label="Imagens de produtos Baseforma">
              {homeHeroImages.map((image, index) =>
                index === heroIndex || heroQueueReady ? (
                  <Image
                    className={`shop-hero__image${index === heroIndex ? " is-active" : ""}`}
                    key={image.src}
                    src={image.src}
                    style={{ "--hero-image-position": image.objectPosition }}
                    alt={image.alt}
                    aria-hidden={index === heroIndex ? undefined : "true"}
                    fill
                    sizes={HERO_IMAGE_SIZES}
                    preload={index === 0}
                    fetchPriority={index === 0 ? "high" : undefined}
                    loading={index === 0 ? undefined : "lazy"}
                  />
                ) : null
              )}
            </div>
          </div>

          <div className="brand-mood" aria-label="Pilares da identidade Baseforma">
            {moodTerms.map((term, index) => (
              <article key={term.label} className={term.cta ? "is-cta" : undefined}>
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
        </>
      )}

      <section className="category-section" aria-labelledby="products-heading">
        <div className="category-section__heading">
          {catalogOnly ? (
            <>
              <p className="eyebrow">Produtos Baseforma</p>
              <h1 id="products-heading">Catálogo de ponteiras e sapatas sob medida</h1>
              <p>
                Escolha pelo tipo de encaixe: dentro do tubo, sob um pé plano, com parafuso ou abraçando
                o tubo da base trenó. Depois informe as medidas e veja preço e prazo na hora.
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow">Catálogo</p>
              <h2 id="products-heading">Ponteiras e sapatas por tipo de encaixe</h2>
            </>
          )}
        </div>

        <div className="category-grid">
          {categories.map((category) => {
            const cardImages = getCategoryCardGallery(category.slug, category.image);

            return (
              <article className="category-card" key={category.slug}>
                {cardImages.length > 0 && (
                  <ProductImageCarousel
                    className="category-card__carousel"
                    images={cardImages}
                    label={`Fotos de ${category.name}`}
                    aspectRatio="1.65 / 1"
                    priority={category.slug === priorityCardSlug}
                  />
                )}
                <div className="category-card__body">
                  <h2>{category.publicName || category.name}</h2>
                  <p>{category.description}</p>
                  <div className="meta-list">
                    <span>{category.primaryFixation}</span>
                  </div>
                  <CategoryFamilyLinks category={category} />
                </div>
                <Link className="button button-primary" href={`/configurar/${category.slug}`}>
                  Configurar
                </Link>
              </article>
            );
          })}
          <SpecialProjectCard />
        </div>
      </section>
    </section>
  );
}

// Links rastreaveis para as paginas de familia de cada formato da categoria.
function CategoryFamilyLinks({ category }) {
  const formats = category.formats.filter((format) => format.familySlug);

  if (formats.length === 0) {
    return null;
  }

  return (
    <nav className="category-card__families" aria-label={`Detalhes de ${category.name}`}>
      {formats.length > 1 ? (
        <>
          <span>Detalhes e medidas:</span>
          {formats.map((format) => (
            <Link key={format.slug} href={`/familias/${format.familySlug}`}>
              {format.name}
            </Link>
          ))}
        </>
      ) : (
        <Link href={`/familias/${formats[0].familySlug}`}>Ver detalhes e medidas</Link>
      )}
    </nav>
  );
}

function SpecialProjectCard() {
  return (
    <article className="category-card category-card--special">
      <div className="category-card__special-visual" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          {moodIcons.spark}
        </svg>
      </div>
      <div className="category-card__body">
        <h2>Forma fora do catálogo?</h2>
        <p>Conte o que precisa e desenvolvemos uma solução técnica para o seu projeto.</p>
        <div className="meta-list">
          <span>desenvolvimento sob medida</span>
          <span>análise técnica / projeto exclusivo</span>
        </div>
      </div>
      <Link className="button button-primary" href="/projeto-especial">
        Entre em contato
      </Link>
    </article>
  );
}
