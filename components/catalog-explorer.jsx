"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { FamilyCard } from "@/components/family-card";
import { buildWhatsAppUrl, formatCurrency } from "@/lib/format";
import {
  applications,
  brand,
  buildFamilyMeasureKey,
  buildFamilyMeasureLabel,
  fixations
} from "@/lib/site-data";

function buildVariantMessage(family, variant) {
  return `Oi, quero confirmar a compra da variante ${variant.sku} da família ${family.name}.`;
}

export function CatalogExplorer({ families }) {
  const [application, setApplication] = useState("all");
  const [fixation, setFixation] = useState("all");
  const [familySlug, setFamilySlug] = useState("");
  const [measureKey, setMeasureKey] = useState("");
  const [color, setColor] = useState("");

  const deferredApplication = useDeferredValue(application);
  const deferredFixation = useDeferredValue(fixation);
  const publicFamilies = families.filter((family) => family.status !== "draft");

  const filteredFamilies = publicFamilies.filter((family) => {
    const applicationMatch =
      deferredApplication === "all" || family.applications.includes(deferredApplication);
    const fixationMatch =
      deferredFixation === "all" || family.fixation === deferredFixation;

    return applicationMatch && fixationMatch;
  });

  const selectedFamily = publicFamilies.find((family) => family.slug === familySlug);
  const measures = selectedFamily
    ? Array.from(
        new Map(
          selectedFamily.variants.map((variant) => [
            buildFamilyMeasureKey(variant),
            {
              value: buildFamilyMeasureKey(variant),
              label: buildFamilyMeasureLabel(variant)
            }
          ])
        ).values()
      )
    : [];

  const availableColors = selectedFamily
    ? selectedFamily.variants
        .filter((variant) => buildFamilyMeasureKey(variant) === measureKey)
        .map((variant) => variant.color)
    : [];

  const selectedVariant = selectedFamily?.variants.find(
    (variant) =>
      buildFamilyMeasureKey(variant) === measureKey &&
      (color ? variant.color === color : false)
  );

  return (
    <div className="catalog-layout">
      <aside className="surface-card catalog-tools">
        <div className="tool-block">
          <p className="eyebrow">Fluxo guiado</p>
          <h2>Escolha por modelo, medida e cor.</h2>
          <p>
            A ideia aqui é reduzir erro de compra logo no começo. Se a combinação não existir,
            o próprio fluxo empurra para projeto especial.
          </p>
        </div>

        <div className="field-grid">
          <label className="field">
            <span>Modelo</span>
            <select
              value={familySlug}
              onChange={(event) => {
                setFamilySlug(event.target.value);
                setMeasureKey("");
                setColor("");
              }}
            >
              <option value="">Selecione um modelo</option>
              {publicFamilies.map((family) => (
                <option key={family.slug} value={family.slug}>
                  {family.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Medida</span>
            <select
              value={measureKey}
              disabled={!selectedFamily}
              onChange={(event) => {
                setMeasureKey(event.target.value);
                setColor("");
              }}
            >
              <option value="">
                {selectedFamily ? "Selecione uma medida" : "Escolha um modelo primeiro"}
              </option>
              {measures.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Cor</span>
            <select
              value={color}
              disabled={!measureKey}
              onChange={(event) => setColor(event.target.value)}
            >
              <option value="">
                {measureKey ? "Selecione uma cor" : "Escolha uma medida primeiro"}
              </option>
              {availableColors.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="catalog-result">
          {!selectedFamily && (
            <>
              <p className="eyebrow">Seleção atual</p>
              <h3>Escolha um modelo para ver as combinações válidas.</h3>
              <p>
                O catálogo foi desenhado para expor apenas combinações defendidas técnica e
                comercialmente.
              </p>
            </>
          )}

          {selectedFamily && !selectedVariant && (
            <>
              <p className="eyebrow">Seleção atual</p>
              <h3>{selectedFamily.name}</h3>
              <p>Agora refine por medida e cor para chegar a uma variante ativa do catálogo.</p>
              <div className="action-row">
                <Link className="button button-secondary" href={selectedFamily.url}>
                  Ver família completa
                </Link>
                <Link
                  className="button button-primary"
                  href={`/projeto-especial?family=${selectedFamily.slug}`}
                >
                  Pedir combinação especial
                </Link>
              </div>
            </>
          )}

          {selectedFamily && selectedVariant && (
            <>
              <p className="eyebrow">Variante encontrada</p>
              <h3>{selectedVariant.label}</h3>
              <p>{selectedFamily.tagline}</p>
              <div className="result-stats">
                <article>
                  <strong>SKU</strong>
                  <span>{selectedVariant.sku}</span>
                </article>
                <article>
                  <strong>Preço</strong>
                  <span>{formatCurrency(selectedVariant.priceBrl)}</span>
                </article>
                <article>
                  <strong>Prazo</strong>
                  <span>{selectedVariant.leadTimeDays} dias úteis</span>
                </article>
                <article>
                  <strong>Cor</strong>
                  <span>{selectedVariant.color}</span>
                </article>
              </div>
              <div className="action-row">
                <Link className="button button-secondary" href={selectedFamily.url}>
                  Abrir página da família
                </Link>
                <a
                  className="button button-primary"
                  href={buildWhatsAppUrl(
                    brand.whatsappNumber,
                    buildVariantMessage(selectedFamily, selectedVariant)
                  )}
                  rel="noreferrer"
                  target="_blank"
                >
                  Confirmar por WhatsApp
                </a>
              </div>
            </>
          )}
        </div>

        <div className="tool-block">
          <p className="eyebrow">Filtros do catálogo</p>
          <div className="field-grid">
            <label className="field">
              <span>Aplicação</span>
              <select value={application} onChange={(event) => setApplication(event.target.value)}>
                <option value="all">Todas as aplicações</option>
                {applications.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Fixação</span>
              <select value={fixation} onChange={(event) => setFixation(event.target.value)}>
                <option value="all">Todas as fixações</option>
                {fixations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Link className="button button-dark button-block" href="/projeto-especial">
            Não encontrou a combinação?
          </Link>
        </div>
      </aside>

      <div className="catalog-grid">
        {filteredFamilies.length ? (
          filteredFamilies.map((family) => <FamilyCard key={family.slug} family={family} />)
        ) : (
          <article className="surface-card empty-card">
            <h3>Nenhuma família corresponde aos filtros atuais.</h3>
            <p>
              Isso costuma ser um bom sinal para abrir um briefing especial com aplicação,
              medida e referência de linguagem.
            </p>
          </article>
        )}
      </div>
    </div>
  );
}
