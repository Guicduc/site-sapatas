"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ParametricDrawing } from "@/components/parametric-drawing";
import { useCart } from "@/components/cart-provider";
import { formatCurrency } from "@/lib/format";
import {
  buildConfigurationSku,
  calculateLeadTime,
  calculatePriceBreakdown,
  getFormat,
  getInitialValues,
  validateConfiguration
} from "@/lib/configurator-data";

export function ProductConfigurator({ category }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFormat = searchParams.get("formato");
  const firstFormat = getFormat(category, initialFormat) || category.formats[0];
  const [formatSlug, setFormatSlug] = useState(firstFormat.slug);
  const format = getFormat(category, formatSlug) || category.formats[0];
  const [values, setValues] = useState(() => getInitialValues(format));
  const [activeKey, setActiveKey] = useState(format.parameters[0]?.key || "");
  const [color, setColor] = useState(category.colors[0]);
  const [finish, setFinish] = useState(category.finishes[0]);
  const [quantity, setQuantity] = useState(4);
  const [added, setAdded] = useState(false);
  const fieldsRef = useRef({});
  const { addItem } = useCart();

  useEffect(() => {
    const nextFormat = getFormat(category, formatSlug) || category.formats[0];
    setValues(getInitialValues(nextFormat));
    setActiveKey(nextFormat.parameters[0]?.key || "");
    setAdded(false);
  }, [category, formatSlug]);

  const issues = useMemo(() => validateConfiguration(format, values), [format, values]);
  const validForCart = issues.length === 0;
  const priceBreakdown = useMemo(
    () => calculatePriceBreakdown(format, values, quantity),
    [format, values, quantity]
  );
  const unitPrice = priceBreakdown.unitPriceBrl;
  const totalPrice = priceBreakdown.totalPriceBrl;
  const leadTime = useMemo(() => calculateLeadTime(format, quantity), [format, quantity]);
  const sku = useMemo(() => buildConfigurationSku(format, values), [format, values]);

  function handleFormatChange(nextSlug) {
    setFormatSlug(nextSlug);
    router.replace(`/configurar/${category.slug}?formato=${nextSlug}`, { scroll: false });
  }

  function handleValueChange(key, value) {
    setValues((current) => ({
      ...current,
      [key]: value
    }));
    setActiveKey(key);
    setAdded(false);
  }

  function handleSelectParameter(key) {
    setActiveKey(key);
    fieldsRef.current[key]?.focus();
  }

  function handleAddToCart() {
    if (!validForCart) {
      return;
    }

    addItem({
      categorySlug: category.slug,
      categoryName: category.name,
      formatSlug: format.slug,
      formatName: format.name,
      sku,
      values,
      color,
      finish,
      quantity,
      unitPriceBrl: unitPrice,
      priceBrl: totalPrice,
      leadTimeDays: leadTime,
      status: "valid"
    });
    setAdded(true);
    router.push("/carrinho");
  }

  return (
    <section className="configurator-shell">
      <div className="configurator-heading">
        <div>
          <p className="eyebrow">{category.name}</p>
          <h1>Configure a forma e medidas</h1>
          <p className="lead">{category.description}</p>
        </div>
        <Link className="button button-secondary" href="/">
          Voltar ao catálogo
        </Link>
      </div>

      <div className="configurator-grid">
        <div className="configurator-main">
          <FormatSelector
            category={category}
            selectedSlug={format.slug}
            onChange={handleFormatChange}
          />
          <ParametricDrawing
            format={format}
            values={values}
            activeKey={activeKey}
            onSelectParameter={handleSelectParameter}
          />
          <article className="integration-note">
            <strong>Preparado para 3D e Grasshopper</strong>
            <p>
              Esta vista SVG é o placeholder editável. A estrutura separa formato,
              parâmetros e desenho para substituir a visualização por modelo 3D e corte
              derivados do Grasshopper sem mudar o fluxo de compra.
            </p>
          </article>
        </div>

        <aside className="configurator-side">
          <ConfiguratorFields
            format={format}
            values={values}
            issues={issues}
            activeKey={activeKey}
            fieldsRef={fieldsRef}
            onChange={handleValueChange}
            onFocus={setActiveKey}
          />

          <ConfigurationSummary
            format={format}
            sku={sku}
            issues={issues}
            unitPrice={unitPrice}
            totalPrice={totalPrice}
            priceBreakdown={priceBreakdown}
            leadTime={leadTime}
            validForCart={validForCart}
            added={added}
            onAddToCart={handleAddToCart}
          />

          <div className="option-panel">
            <label className="field">
              <span>Cor</span>
              <select value={color} onChange={(event) => setColor(event.target.value)}>
                {category.colors.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Acabamento</span>
              <select value={finish} onChange={(event) => setFinish(event.target.value)}>
                {category.finishes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Quantidade</span>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))}
              />
            </label>
          </div>
        </aside>
      </div>
    </section>
  );
}

function FormatSelector({ category, selectedSlug, onChange }) {
  return (
    <div className="format-selector" role="tablist" aria-label="Perfis disponiveis">
      {category.formats.map((format) => (
        <button
          key={format.slug}
          type="button"
          className={format.slug === selectedSlug ? "is-selected" : ""}
          aria-pressed={format.slug === selectedSlug}
          onClick={() => onChange(format.slug)}
        >
          <strong>{format.name}</strong>
          <span>{format.fixation}</span>
        </button>
      ))}
    </div>
  );
}

function ConfiguratorFields({ format, values, issues, activeKey, fieldsRef, onChange, onFocus }) {
  const [editingKey, setEditingKey] = useState("");

  return (
    <div className="parameter-panel">
      <div>
        <p className="eyebrow">Medidas</p>
        <h2>{format.name}</h2>
      </div>
      {format.parameters.map((parameter) => (
        <label className={`field parameter-field${activeKey === parameter.key ? " is-active" : ""}`} key={parameter.key}>
          <span>
            <span className="parameter-label">{parameter.label}</span>
            <small>
              {parameter.min}-{parameter.max} {parameter.unit}
            </small>
          </span>
          <div
            className="parameter-slider"
            style={{
              "--value-position": `${getValuePosition(values[parameter.key], parameter)}%`
            }}
            onDoubleClick={() => {
              setEditingKey(parameter.key);
              window.requestAnimationFrame(() => fieldsRef.current[parameter.key]?.select());
            }}
          >
            <input
              className="parameter-range"
              type="range"
              min={parameter.min}
              max={parameter.max}
              step={parameter.step}
              value={values[parameter.key] ?? parameter.min}
              onChange={(event) => onChange(parameter.key, event.target.value)}
              onFocus={() => onFocus(parameter.key)}
            />
            <input
              className={`parameter-value${editingKey === parameter.key ? " is-editing" : ""}`}
              ref={(element) => {
                fieldsRef.current[parameter.key] = element;
              }}
              type="number"
              min={parameter.min}
              max={parameter.max}
              step={parameter.step}
              value={values[parameter.key] ?? ""}
              readOnly={editingKey !== parameter.key}
              onChange={(event) => onChange(parameter.key, event.target.value)}
              onFocus={() => onFocus(parameter.key)}
              onBlur={() => setEditingKey("")}
              aria-label={parameter.label}
            />
          </div>
        </label>
      ))}
      <div className="note-list">
        {format.notes.map((note) => (
          <span key={note}>{note}</span>
        ))}
      </div>
      <div className={`validation-note${issues.length > 0 ? " has-issues" : ""}`}>
        {issues.length > 0
          ? issues.map((issue) => <span key={issue}>{issue}</span>)
          : <span>Medidas dentro dos limites.</span>}
      </div>
    </div>
  );
}

function getValuePosition(value, parameter) {
  const numericValue = Number(value ?? parameter.min);
  const range = parameter.max - parameter.min;

  if (!Number.isFinite(numericValue) || range <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, ((numericValue - parameter.min) / range) * 100));
}

function ConfigurationSummary({
  format,
  sku,
  issues,
  unitPrice,
  totalPrice,
  priceBreakdown,
  leadTime,
  validForCart,
  added,
  onAddToCart
}) {
  return (
    <div className="summary-panel">
      <p className="eyebrow">Resumo</p>
      <h2>{format.status === "review" ? "Sob avaliação" : format.name}</h2>
      <div className="summary-stats">
        <article>
          <strong>SKU</strong>
          <span>{sku}</span>
        </article>
        <article>
          <strong>Unidade</strong>
          <span>{formatCurrency(unitPrice)}</span>
        </article>
        <article>
          <strong>Total</strong>
          <span>{formatCurrency(totalPrice)}</span>
        </article>
        <article>
          <strong>TPU estimado</strong>
          <span>{priceBreakdown.materialGrams} g/un</span>
        </article>
        <article>
          <strong>Prazo</strong>
          <span>{leadTime} dias úteis</span>
        </article>
      </div>
      <button className="button button-primary button-block" type="button" disabled={!validForCart} onClick={onAddToCart}>
        Adicionar ao carrinho
      </button>
      {added && (
        <Link className="button button-secondary button-block" href="/carrinho">
          Ver carrinho
        </Link>
      )}
    </div>
  );
}
