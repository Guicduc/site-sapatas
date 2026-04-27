"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export function ProductCatalog({ categories }) {
  const [application, setApplication] = useState("all");
  const [baseType, setBaseType] = useState("all");

  const applications = useMemo(
    () => Array.from(new Set(categories.flatMap((category) => category.applications))).sort(),
    [categories]
  );
  const baseTypes = useMemo(
    () => Array.from(new Set(categories.map((category) => category.baseType))).sort(),
    [categories]
  );

  const filteredCategories = categories.filter((category) => {
    const applicationMatch = application === "all" || category.applications.includes(application);
    const baseTypeMatch = baseType === "all" || category.baseType === baseType;

    return applicationMatch && baseTypeMatch;
  });

  return (
    <section className="shop-shell">
      <div className="shop-hero">
        <div className="shop-hero__copy">
          <p className="eyebrow">Configurador de compra</p>
          <h1>Escolha a sapata pela geometria real do movel.</h1>
          <p className="lead">
            Selecione uma categoria, escolha o formato e ajuste as cotas do produto antes de
            colocar no carrinho.
          </p>
        </div>
        <img
          className="shop-hero__image"
          src="/brand/traco-base-hero.png"
          alt="Sapatas e ponteiras Traco Base aplicadas em pes tubulares de mobiliario"
        />
        <div className="shop-hero__note">
          <strong>Pedido parametrico</strong>
          <span>Preco e prazo estimados antes de gerar pagamento e fila de producao.</span>
        </div>
      </div>

      <div className="filter-bar">
        <label className="field">
          <span>Aplicacao</span>
          <select value={application} onChange={(event) => setApplication(event.target.value)}>
            <option value="all">Todas</option>
            {applications.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tipo de base</span>
          <select value={baseType} onChange={(event) => setBaseType(event.target.value)}>
            <option value="all">Todos</option>
            {baseTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="category-grid">
        {filteredCategories.map((category) => (
          <article className="category-card" key={category.slug}>
            {category.image && (
              <img className="category-card__image" src={category.image.src} alt={category.image.alt} />
            )}
            <p className="eyebrow">{category.eyebrow}</p>
            <h2>{category.name}</h2>
            <p>{category.description}</p>
            <div className="meta-list">
              <span>{category.primaryFixation}</span>
              <span>{category.formats.map((format) => format.name).join(" / ")}</span>
            </div>
            <div className="format-preview">
              {category.formats.map((format) => (
                <Link key={format.slug} href={`/configurar/${category.slug}?formato=${format.slug}`}>
                  {format.name}
                </Link>
              ))}
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

