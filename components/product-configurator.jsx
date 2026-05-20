"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ParametricDrawing } from "@/components/parametric-drawing";
import { useCart } from "@/components/cart-provider";
import { colorMap } from "@/lib/brand-colors";
import { formatCurrency } from "@/lib/format";
import {
  buildConfigurationSku,
  calculateLeadTime,
  calculatePriceBreakdown,
  getFormat,
  getInitialValues,
  validateConfiguration
} from "@/lib/configurator-data";

export function ProductConfigurator({ category, initialFormatSlug }) {
  const router = useRouter();
  const firstFormat = getFormat(category, initialFormatSlug) || category.formats[0];
  const [formatSlug, setFormatSlug] = useState(firstFormat.slug);
  const format = getFormat(category, formatSlug) || category.formats[0];
  const [values, setValues] = useState(() => getInitialValues(format));
  const [activeKey, setActiveKey] = useState(format.parameters[0]?.key || "");
  const [color, setColor] = useState(category.colors[0]);
  const [finish, setFinish] = useState(category.finishes[0] || "não se aplica");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const fieldsRef = useRef({});
  const { addItem } = useCart();

  useEffect(() => {
    const nextFormat = getFormat(category, formatSlug) || category.formats[0];
    setValues(getInitialValues(nextFormat));
    setActiveKey(nextFormat.parameters[0]?.key || "");
    setColor(category.colors[0]);
    setFinish(category.finishes[0] || "não se aplica");
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
  const headingDescription = getConfiguratorDescription(category);

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
          <h1>{category.name}</h1>
          <p className="lead">{headingDescription}</p>
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
          <div className="configurator-workbench">
            <ConfiguratorFields
              format={format}
              values={values}
              issues={issues}
              activeKey={activeKey}
              fieldsRef={fieldsRef}
              onChange={handleValueChange}
              onFocus={setActiveKey}
            />
            <ParametricPreview
              format={format}
              values={values}
              activeKey={activeKey}
              onSelectParameter={handleSelectParameter}
            />
          </div>
        </div>

        <aside className="configurator-side">
          <div className="option-panel">
            <p className="eyebrow">Escolhas</p>
            <ColorSelector colors={category.colors} value={color} onChange={setColor} />
            {category.finishes.length > 0 && (
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
            )}
            <div className="field quantity-field">
              <span>Quantidade</span>
              <div className="quantity-stepper" role="group" aria-label="Quantidade">
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  onClick={() => setQuantity((current) => Math.max(1, Number(current) - 1))}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))}
                  aria-label="Quantidade"
                />
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  onClick={() => setQuantity((current) => Number(current) + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>

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
        </aside>
      </div>
    </section>
  );
}

function getConfiguratorDescription(category) {
  const descriptions = {
    "ponteira-interna-tubo": "Escolha o perfil do tubo e ajuste as medidas internas reais.",
    "sapata-base-lisa": "Escolha o formato da base e ajuste as medidas de contato.",
    "ponteira-interna-tubos": "Escolha o perfil do tubo e ajuste as medidas internas reais.",
    "sapata-lisa": "Escolha o formato da sapata e ajuste as medidas da base.",
    "sapata-externa": "Escolha o perfil e ajuste as medidas externas do tubo."
  };

  return descriptions[category.slug] || "Escolha o formato e ajuste as medidas do produto.";
}

function ColorSelector({ colors, value, onChange }) {
  return (
    <div className="field color-field">
      <span>Cor</span>
      <div className="color-swatch-list" role="group" aria-label="Cor">
        {colors.map((item) => (
          <button
            key={item}
            type="button"
            className={`color-swatch${item === value ? " is-selected" : ""}`}
            style={{ "--swatch": colorMap[item] || "#808784" }}
            aria-label={item}
            aria-pressed={item === value}
            title={item}
            onClick={() => onChange(item)}
          >
            <span className="visually-hidden">{item}</span>
          </button>
        ))}
      </div>
      <span className="color-field__value">{value}</span>
    </div>
  );
}

function ParametricPreview({
  format,
  values,
  activeKey,
  onSelectParameter
}) {
  return (
    <div className="preview-panel">
      <ParametricDrawing
        format={format}
        values={values}
        activeKey={activeKey}
        onSelectParameter={onSelectParameter}
      />
    </div>
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
      {format.parameters.map((parameter) => {
        if (parameter.dependsOn && !values[parameter.dependsOn]) {
          return null;
        }

        const isBoolean = parameter.type === "boolean";

        return (
        <label className={`field parameter-field${isBoolean ? " parameter-field--toggle" : ""}${activeKey === parameter.key ? " is-active" : ""}`} key={parameter.key}>
          <div className="parameter-field__copy">
            <span>
              <span className="parameter-label">{parameter.label}</span>
              {parameter.type === "number" && (
                <small>
                  Min {parameter.min} / max {parameter.max} {parameter.unit}
                </small>
              )}
            </span>
          </div>
          {isBoolean ? (
            <span className="parameter-toggle">
              <input
                type="checkbox"
                checked={Boolean(values[parameter.key])}
                onChange={(event) => onChange(parameter.key, event.target.checked)}
                onFocus={() => onFocus(parameter.key)}
                aria-label={parameter.label}
              />
              <span aria-hidden="true" />
            </span>
          ) : (
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
              disabled={parameter.dependsOn && !values[parameter.dependsOn]}
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
              disabled={parameter.dependsOn && !values[parameter.dependsOn]}
              readOnly={editingKey !== parameter.key}
              onChange={(event) => onChange(parameter.key, event.target.value)}
              onFocus={() => onFocus(parameter.key)}
              onBlur={() => setEditingKey("")}
              aria-label={parameter.label}
            />
          </div>
          )}
        </label>
      );
      })}
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
      <div className="summary-heading">
        <p className="eyebrow">Resumo</p>
        <h2>{format.status === "review" ? "Sob avaliação" : format.name}</h2>
        <span>{sku}</span>
      </div>
      <div className="summary-stats">
        <article>
          <strong>Preço unitário</strong>
          <span>{formatCurrency(unitPrice)}</span>
        </article>
        <article className="summary-total">
          <strong>Total</strong>
          <span>{formatCurrency(totalPrice)}</span>
        </article>
        {priceBreakdown.pricingMode === "sliced" && (
          <article>
            <strong>Tempo Orca</strong>
            <span>{priceBreakdown.printMinutes} min/un</span>
          </article>
        )}
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
