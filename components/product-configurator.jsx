"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useReducer, useRef, useState } from "react";

import { ParametricDrawing } from "@/components/parametric-drawing";
import { useCart } from "@/components/cart-provider";
import { colorMap } from "@/lib/brand-colors";
import { formatCurrency } from "@/lib/format";
import {
  INCH_DECIMAL_PLACES,
  MEASUREMENT_SYSTEMS,
  formatMeasurement,
  formatMeasurementValue,
  getDisplayRange,
  measurementSystemReducer,
  normalizeMeasurementInput,
  toDisplayMeasurement
} from "@/lib/measurement-units";
import { getConfiguratorVisuals } from "@/lib/product-visuals";
import {
  buildConfigurationSku,
  calculateLeadTime,
  calculatePriceBreakdown,
  getFormat,
  getInitialValues,
  productCategories,
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
  const [previewMode, setPreviewMode] = useState("drawing");
  const [activeVisualIndex, setActiveVisualIndex] = useState(0);
  const [measurementSystem, setMeasurementSystem] = useReducer(
    measurementSystemReducer,
    MEASUREMENT_SYSTEMS.METRIC
  );
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
  const hasColorChoices = category.colors.length > 1;
  const hasFinishChoices = category.finishes.length > 0;
  const relatedCategories = useMemo(
    () => productCategories.filter((item) => item.slug !== category.slug).slice(0, 3),
    [category.slug]
  );
  const visualImages = useMemo(
    () => getConfiguratorVisuals(category.slug, format.slug, values),
    [category.slug, format.slug, values]
  );

  useEffect(() => {
    setActiveVisualIndex(0);
  }, [category.slug, format.slug, values.pescoco]);

  useEffect(() => {
    if (previewMode === "image" && visualImages.length === 0) {
      setPreviewMode("drawing");
    }

    setActiveVisualIndex((current) => Math.min(current, Math.max(visualImages.length - 1, 0)));
  }, [previewMode, visualImages.length]);

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
              measurementSystem={measurementSystem}
              onMeasurementSystemChange={setMeasurementSystem}
              onChange={handleValueChange}
              onFocus={setActiveKey}
            />
            <ParametricPreview
              format={format}
              values={values}
              activeKey={activeKey}
              visualImages={visualImages}
              previewMode={previewMode}
              activeVisualIndex={activeVisualIndex}
              measurementSystem={measurementSystem}
              onPreviewModeChange={setPreviewMode}
              onActiveVisualChange={setActiveVisualIndex}
              onSelectParameter={handleSelectParameter}
            />
          </div>
        </div>

        <aside className="configurator-side">
          <div className={`option-panel${!hasColorChoices && !hasFinishChoices ? " option-panel--compact" : ""}`}>
            <p className="eyebrow">{hasColorChoices || hasFinishChoices ? "Escolhas" : "Pedido"}</p>
            {hasColorChoices ? (
              <ColorSelector colors={category.colors} value={color} onChange={setColor} />
            ) : (
              <div className="field option-static">
                <span>Cor</span>
                <strong>{color}</strong>
              </div>
            )}
            {hasFinishChoices && (
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
            validForCart={validForCart}
            added={added}
            onAddToCart={handleAddToCart}
          />
        </aside>
      </div>

      {relatedCategories.length > 0 && (
        <RelatedProducts categories={relatedCategories} />
      )}
    </section>
  );
}

function RelatedProducts({ categories }) {
  return (
    <section className="configurator-related" aria-labelledby="configurator-related-title">
      <div className="configurator-related__heading">
        <p className="eyebrow">Produtos semelhantes</p>
        <h2 id="configurator-related-title">Outras sapatas para comparar</h2>
      </div>
      <div className="configurator-related__grid">
        {categories.map((item) => (
          <article className="category-card configurator-related-card" key={item.slug}>
            {item.image && (
              <img className="category-card__image" src={item.image.src} alt={item.image.alt} />
            )}
            <div className="category-card__body">
              <p className="eyebrow">{item.eyebrow}</p>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <div className="meta-list">
                <span>{item.primaryFixation}</span>
                {item.formats.length > 1 && (
                  <span>{item.formats.map((format) => format.name).join(" / ")}</span>
                )}
              </div>
            </div>
            <Link className="button button-primary" href={`/configurar/${item.slug}`}>
              Configurar
            </Link>
          </article>
        ))}
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
  visualImages,
  previewMode,
  activeVisualIndex,
  measurementSystem,
  onPreviewModeChange,
  onActiveVisualChange,
  onSelectParameter
}) {
  const hasVisualImages = visualImages.length > 0;
  const activeVisual = visualImages[activeVisualIndex] || visualImages[0];
  const shouldShowImage = previewMode === "image" && hasVisualImages;

  return (
    <div className="preview-panel">
      <div className="preview-panel__toolbar">
        <div>
          <p className="eyebrow">{shouldShowImage ? "Produto final" : "Desenho técnico"}</p>
          <strong>{format.name}</strong>
        </div>
        <div className="preview-toggle" role="tablist" aria-label="Visualização do produto">
          <button
            type="button"
            className={previewMode === "drawing" ? "is-selected" : ""}
            aria-pressed={previewMode === "drawing"}
            onClick={() => onPreviewModeChange("drawing")}
          >
            Desenho
          </button>
          <button
            type="button"
            className={previewMode === "image" ? "is-selected" : ""}
            aria-pressed={previewMode === "image"}
            disabled={!hasVisualImages}
            onClick={() => onPreviewModeChange("image")}
          >
            Foto
          </button>
        </div>
      </div>

      {shouldShowImage ? (
        <ProductVisualPreview
          images={visualImages}
          activeImage={activeVisual}
          activeIndex={activeVisualIndex}
          onChange={onActiveVisualChange}
        />
      ) : (
        <ParametricDrawing
          format={format}
          values={values}
          activeKey={activeKey}
          measurementSystem={measurementSystem}
          onSelectParameter={onSelectParameter}
        />
      )}
    </div>
  );
}

function ProductVisualPreview({ images, activeImage, activeIndex, onChange }) {
  return (
    <figure className="product-visual">
      <div className="product-visual__stage">
        <img className="product-visual__image" src={activeImage.src} alt={activeImage.alt} />
      </div>
      <figcaption>
        <span>{activeImage.label}</span>
      </figcaption>
      {images.length > 1 && (
        <div className="product-visual__thumbs" aria-label="Imagens disponíveis">
          {images.map((image, index) => (
            <button
              key={image.src}
              type="button"
              className={index === activeIndex ? "is-selected" : ""}
              aria-label={`Ver ${image.label}`}
              aria-pressed={index === activeIndex}
              onClick={() => onChange(index)}
            >
              <img src={image.src} alt="" aria-hidden="true" />
              <span>{image.label}</span>
            </button>
          ))}
        </div>
      )}
    </figure>
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

function ConfiguratorFields({
  format,
  values,
  issues,
  activeKey,
  fieldsRef,
  measurementSystem,
  onMeasurementSystemChange,
  onChange,
  onFocus
}) {
  const measurementUnitLabelId = useId();

  function handleRangePointer(event, parameter) {
    if (event.type === "pointermove" && event.buttons !== 1) {
      return;
    }

    event.preventDefault();

    if (event.type === "pointerdown") {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    const nextValue = getPointerValue(event, parameter);
    onFocus(parameter.key);

    if (String(values[parameter.key] ?? "") !== nextValue) {
      onChange(parameter.key, nextValue);
    }
  }

  function handleRangeKeyDown(event, parameter) {
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
      End: parameter.max
    };

    if (!(event.key in keyHandlers)) {
      return;
    }

    event.preventDefault();
    const nextValue = formatParameterValue(keyHandlers[event.key], parameter);

    if (String(values[parameter.key] ?? "") !== nextValue) {
      onChange(parameter.key, nextValue);
    }
  }

  return (
    <div className="parameter-panel">
      <div className="parameter-panel__heading">
        <div>
          <p className="eyebrow">Medidas</p>
          <h2>{format.name}</h2>
        </div>
        <div className="measurement-unit-control">
          <span id={measurementUnitLabelId}>Unidade</span>
          <div role="group" aria-labelledby={measurementUnitLabelId}>
            <button
              type="button"
              className={measurementSystem === MEASUREMENT_SYSTEMS.METRIC ? "is-selected" : ""}
              aria-pressed={measurementSystem === MEASUREMENT_SYSTEMS.METRIC}
              onClick={() => onMeasurementSystemChange(MEASUREMENT_SYSTEMS.METRIC)}
            >
              mm
            </button>
            <button
              type="button"
              className={measurementSystem === MEASUREMENT_SYSTEMS.IMPERIAL ? "is-selected" : ""}
              aria-pressed={measurementSystem === MEASUREMENT_SYSTEMS.IMPERIAL}
              onClick={() => onMeasurementSystemChange(MEASUREMENT_SYSTEMS.IMPERIAL)}
            >
              pol
            </button>
          </div>
        </div>
      </div>
      <p className="measurement-unit-note">
        {measurementSystem === MEASUREMENT_SYSTEMS.IMPERIAL
          ? `Polegadas com até ${INCH_DECIMAL_PLACES} casas; ao confirmar, a medida segue o passo técnico e é salva em mm.`
          : "As medidas técnicas e o pedido são salvos em milímetros."}
      </p>
      {format.parameters.map((parameter) => {
        if (parameter.dependsOn && !values[parameter.dependsOn]) {
          return null;
        }

        const isBoolean = parameter.type === "boolean";
        const displayRange = isBoolean ? null : getDisplayRange(parameter, measurementSystem);

        return (
        <label className={`field parameter-field${isBoolean ? " parameter-field--toggle" : ""}${activeKey === parameter.key ? " is-active" : ""}`} key={parameter.key}>
          <div className="parameter-field__copy">
            <span>
              <span className="parameter-label">{parameter.label}</span>
              {parameter.type === "number" && (
                <small>
                  Min {displayRange.min} / max {displayRange.max} {displayRange.unit}
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
          >
            <div
              className="parameter-range"
              role="slider"
              tabIndex={parameter.dependsOn && !values[parameter.dependsOn] ? -1 : 0}
              aria-label={parameter.label}
              aria-valuemin={toDisplayMeasurement(parameter.min, parameter.unit, measurementSystem)}
              aria-valuemax={toDisplayMeasurement(parameter.max, parameter.unit, measurementSystem)}
              aria-valuenow={toDisplayMeasurement(values[parameter.key] ?? parameter.min, parameter.unit, measurementSystem)}
              aria-valuetext={formatMeasurement(values[parameter.key] ?? parameter.min, parameter.unit, measurementSystem)}
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
            <MeasurementInput
              parameter={parameter}
              value={values[parameter.key]}
              measurementSystem={measurementSystem}
              disabled={parameter.dependsOn && !values[parameter.dependsOn]}
              inputRef={(element) => {
                fieldsRef.current[parameter.key] = element;
              }}
              onChange={(nextValue) => onChange(parameter.key, nextValue)}
              onFocus={() => onFocus(parameter.key)}
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

function MeasurementInput({
  parameter,
  value,
  measurementSystem,
  disabled,
  inputRef,
  onChange,
  onFocus
}) {
  const [draftValue, setDraftValue] = useState(null);
  const displayRange = getDisplayRange(parameter, measurementSystem);
  const displayValue = draftValue ?? formatMeasurementValue(
    value ?? parameter.defaultValue ?? parameter.min,
    parameter.unit,
    measurementSystem
  );

  useEffect(() => {
    setDraftValue(null);
  }, [measurementSystem, value]);

  function commitValue(rawValue) {
    setDraftValue(null);

    if (String(rawValue).trim() === "") {
      return;
    }

    const nextValue = normalizeMeasurementInput(rawValue, parameter, measurementSystem);

    if (nextValue && String(value ?? "") !== nextValue) {
      onChange(nextValue);
    }
  }

  return (
    <input
      className="parameter-value"
      ref={inputRef}
      type="number"
      inputMode="decimal"
      min={displayRange.min}
      max={displayRange.max}
      step={displayRange.step}
      value={displayValue}
      disabled={disabled}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={(event) => commitValue(event.target.value)}
      onFocus={(event) => {
        onFocus();
        event.target.select();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      aria-label={`${parameter.label} em ${displayRange.unit}`}
    />
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

function getPointerValue(event, parameter) {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = rect.width > 0
    ? Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    : 0;
  const rawValue = parameter.min + ratio * (parameter.max - parameter.min);

  return formatParameterValue(rawValue, parameter);
}

function formatParameterValue(value, parameter) {
  const step = Number(parameter.step || 1);
  const decimals = getStepDecimals(step);
  const steppedValue = Math.round((Number(value) - parameter.min) / step) * step + parameter.min;
  const clampedValue = Math.min(parameter.max, Math.max(parameter.min, steppedValue));

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
