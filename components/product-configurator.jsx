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
  getParameterMax,
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
      priceBreakdown,
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
            format={{ ...format, name: getSummaryProductName(category, format) }}
            sku={sku}
            issues={issues}
            unitPrice={unitPrice}
            totalPrice={totalPrice}
            priceBreakdown={priceBreakdown}
            leadTime={leadTime}
            showProductionInfo={category.slug !== "sapata-base-lisa"}
            validForCart={validForCart}
            added={added}
            onAddToCart={handleAddToCart}
          />
        </aside>
      </div>
    </section>
  );
}

function getConfiguratorDescription() {
  return "Configure as medidas conforme a necessidade do seu projeto.";
}

function getSummaryProductName(category, format) {
  if (category.slug === "ponteira-interna-tubo") {
    return `Sapata interna ${format.name.toLowerCase()}`;
  }

  return format.name;
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
          <span className="format-selector__copy">
            <strong>{format.name}</strong>
            <span>{format.fixation}</span>
          </span>
          <FormatIcon type={format.drawingType} />
        </button>
      ))}
    </div>
  );
}

function FormatIcon({ type }) {
  return (
    <svg className="format-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {type === "tube-round" && (
        <>
          <circle cx="24" cy="24" r="16" />
          <circle cx="24" cy="24" r="9" />
          <path d="M24 5 V43 M5 24 H43" />
        </>
      )}
      {type === "tube-rect" && (
        <>
          <rect x="10" y="10" width="28" height="28" rx="6" />
          <rect x="17" y="17" width="14" height="14" rx="3" />
          <path d="M24 5 V43 M5 24 H43" />
        </>
      )}
      {type === "tube-oblong" && (
        <>
          <rect x="7" y="14" width="34" height="20" rx="10" />
          <rect x="15" y="19" width="18" height="10" rx="5" />
          <path d="M24 6 V42 M5 24 H43" />
        </>
      )}
      {type === "base-round" && (
        <>
          <circle cx="24" cy="24" r="15" />
          <path d="M24 7 V41 M7 24 H41" />
        </>
      )}
      {type === "base-rect" && (
        <>
          <rect x="9" y="13" width="30" height="22" rx="5" />
          <path d="M24 7 V41 M6 24 H42" />
        </>
      )}
      {type === "base-oblong" && (
        <>
          <rect x="7" y="15" width="34" height="18" rx="9" />
          <path d="M24 7 V41 M5 24 H43" />
        </>
      )}
      {type === "base-u" && (
        <>
          <path d="M10 12 H38 V36 H29 V22 H19 V36 H10 Z" />
          <path d="M24 7 V41 M6 36 H42" />
        </>
      )}
    </svg>
  );
}

function ConfiguratorFields({ format, values, issues, activeKey, fieldsRef, onChange, onFocus }) {
  function handleRangePointer(event, parameter) {
    if (event.type === "pointermove" && event.buttons !== 1) {
      return;
    }

    event.preventDefault();

    if (event.type === "pointerdown") {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    const nextValue = getPointerValue(event, parameter, getParameterMax(format, values, parameter));
    onFocus(parameter.key);

    if (String(values[parameter.key] ?? "") !== nextValue) {
      onChange(parameter.key, nextValue);
    }
  }

  function handleRangeKeyDown(event, parameter) {
    const parameterMax = getParameterMax(format, values, parameter);
    const currentValue = Number(values[parameter.key] ?? parameter.defaultValue ?? parameter.min);
    const step = Number(parameter.step || 1);
    const largeStep = step * 10;
    const keyHandlers = {
      ArrowLeft: currentValue - step,
      ArrowDown: currentValue - step,
      ArrowRight: currentValue + step,
      ArrowUp: currentValue + step,
      PageDown: currentValue - largeStep,
      PageUp: currentValue + largeStep,
      Home: parameter.min,
      End: parameterMax
    };

    if (!(event.key in keyHandlers)) {
      return;
    }

    event.preventDefault();
    const nextValue = formatParameterValue(keyHandlers[event.key], parameter, parameterMax);

    if (String(values[parameter.key] ?? "") !== nextValue) {
      onChange(parameter.key, nextValue);
    }
  }

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
        const parameterMax = getParameterMax(format, values, parameter);

        return (
        <label className={`field parameter-field${isBoolean ? " parameter-field--toggle" : ""}${activeKey === parameter.key ? " is-active" : ""}`} key={parameter.key}>
          <div className="parameter-field__copy">
            <span>
              <span className="parameter-label">{parameter.label}</span>
              {parameter.type === "number" && (
                <small>
                  Min {parameter.min} / max {parameterMax} {parameter.unit}
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
              "--value-position": `${getValuePosition(values[parameter.key], parameter, parameterMax)}%`
            }}
          >
            <div
              className="parameter-range"
              role="slider"
              tabIndex={parameter.dependsOn && !values[parameter.dependsOn] ? -1 : 0}
              aria-label={parameter.label}
              aria-valuemin={parameter.min}
              aria-valuemax={parameterMax}
              aria-valuenow={Number(values[parameter.key] ?? parameter.min)}
              aria-valuetext={`${values[parameter.key] ?? parameter.min} ${parameter.unit}`}
              aria-disabled={parameter.dependsOn && !values[parameter.dependsOn] ? "true" : undefined}
              onFocus={() => onFocus(parameter.key)}
              onKeyDown={(event) => handleRangeKeyDown(event, parameter)}
              onPointerDown={(event) => handleRangePointer(event, parameter)}
              onPointerMove={(event) => handleRangePointer(event, parameter)}
            >
              <span className="parameter-range__track" aria-hidden="true">
                <span className="parameter-range__fill" />
                <span className="parameter-range__thumb" />
              </span>
            </div>
            <input
              className="parameter-value"
              ref={(element) => {
                fieldsRef.current[parameter.key] = element;
              }}
              type="number"
              min={parameter.min}
              max={parameterMax}
              step={parameter.step}
              value={values[parameter.key] ?? ""}
              disabled={parameter.dependsOn && !values[parameter.dependsOn]}
              onChange={(event) => onChange(parameter.key, event.target.value)}
              onFocus={(event) => {
                onFocus(parameter.key);
                event.target.select();
              }}
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

function getValuePosition(value, parameter, parameterMax = parameter.max) {
  const numericValue = Number(value ?? parameter.min);
  const range = parameterMax - parameter.min;

  if (!Number.isFinite(numericValue) || range <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, ((numericValue - parameter.min) / range) * 100));
}

function getPointerValue(event, parameter, parameterMax = parameter.max) {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = rect.width > 0
    ? Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    : 0;
  const rawValue = parameter.min + ratio * (parameterMax - parameter.min);

  return formatParameterValue(rawValue, parameter, parameterMax);
}

function formatParameterValue(value, parameter, parameterMax = parameter.max) {
  const step = Number(parameter.step || 1);
  const decimals = getStepDecimals(step);
  const steppedValue = Math.round((Number(value) - parameter.min) / step) * step + parameter.min;
  const clampedValue = Math.min(parameterMax, Math.max(parameter.min, steppedValue));

  return decimals > 0 ? clampedValue.toFixed(decimals) : String(Math.round(clampedValue));
}

function getStepDecimals(step) {
  const text = String(step);

  if (!text.includes(".")) {
    return 0;
  }

  return text.split(".")[1].length;
}

function ConfigurationSummary({
  format,
  sku,
  issues,
  unitPrice,
  totalPrice,
  priceBreakdown,
  leadTime,
  showProductionInfo,
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
        {showProductionInfo && (
          <article>
            <strong>Prazo</strong>
          <span>{leadTime} dias úteis</span>
          </article>
        )}
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
