export const MEASUREMENT_SYSTEMS = Object.freeze({
  METRIC: "metric",
  IMPERIAL: "imperial"
});

export const MILLIMETERS_PER_INCH = 25.4;
export const INCH_DECIMAL_PLACES = 3;
const CANONICAL_DECIMAL_PLACES = 6;

export function measurementSystemReducer(currentSystem, nextSystem) {
  return Object.values(MEASUREMENT_SYSTEMS).includes(nextSystem)
    ? nextSystem
    : currentSystem;
}

export function getDisplayUnit(canonicalUnit, measurementSystem) {
  return canonicalUnit === "mm" && measurementSystem === MEASUREMENT_SYSTEMS.IMPERIAL
    ? "pol"
    : canonicalUnit;
}

export function toDisplayMeasurement(value, canonicalUnit, measurementSystem) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  if (canonicalUnit === "mm" && measurementSystem === MEASUREMENT_SYSTEMS.IMPERIAL) {
    return roundTo(numericValue / MILLIMETERS_PER_INCH, INCH_DECIMAL_PLACES);
  }

  return numericValue;
}

export function formatMeasurementValue(value, canonicalUnit, measurementSystem) {
  const displayValue = toDisplayMeasurement(value, canonicalUnit, measurementSystem);

  if (displayValue === null) {
    return "";
  }

  if (canonicalUnit === "mm" && measurementSystem === MEASUREMENT_SYSTEMS.IMPERIAL) {
    return trimTrailingZeros(displayValue.toFixed(INCH_DECIMAL_PLACES));
  }

  return String(displayValue);
}

export function formatMeasurement(value, canonicalUnit, measurementSystem) {
  const formattedValue = formatMeasurementValue(value, canonicalUnit, measurementSystem);
  const displayUnit = getDisplayUnit(canonicalUnit, measurementSystem);

  return formattedValue ? `${formattedValue} ${displayUnit}` : displayUnit;
}

export function getDisplayRange(parameter, measurementSystem) {
  const usesInches = parameter.unit === "mm"
    && measurementSystem === MEASUREMENT_SYSTEMS.IMPERIAL;

  return {
    min: formatMeasurementValue(parameter.min, parameter.unit, measurementSystem),
    max: formatMeasurementValue(parameter.max, parameter.unit, measurementSystem),
    step: usesInches ? 10 ** -INCH_DECIMAL_PLACES : parameter.step,
    unit: getDisplayUnit(parameter.unit, measurementSystem)
  };
}

export function normalizeMeasurementInput(displayValue, parameter, measurementSystem) {
  return parseMeasurementInput(displayValue, parameter, measurementSystem).value;
}

export function parseMeasurementInput(displayValue, parameter, measurementSystem) {
  const numericValue = parseFlexibleNumber(displayValue);
  const displayRange = getDisplayRange(parameter, measurementSystem);

  if (!Number.isFinite(numericValue)) {
    return {
      value: "",
      error: measurementSystem === MEASUREMENT_SYSTEMS.IMPERIAL
        ? "Use um decimal ou fração, como 1,25 ou 1 1/4."
        : "Use um número, como 30 ou 30,5."
    };
  }

  const canonicalValue = parameter.unit === "mm"
    && measurementSystem === MEASUREMENT_SYSTEMS.IMPERIAL
    ? numericValue * MILLIMETERS_PER_INCH
    : numericValue;

  if (canonicalValue < parameter.min || canonicalValue > parameter.max) {
    return {
      value: "",
      error: `Informe entre ${displayRange.min} e ${displayRange.max} ${displayRange.unit}.`
    };
  }

  return {
    value: trimTrailingZeros(canonicalValue.toFixed(CANONICAL_DECIMAL_PLACES)),
    error: ""
  };
}

function roundTo(value, decimalPlaces) {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function trimTrailingZeros(value) {
  return value.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function parseFlexibleNumber(value) {
  const normalizedValue = String(value ?? "")
    .trim()
    .replaceAll(",", ".")
    .replace(/\s+/g, " ");

  if (!normalizedValue) {
    return Number.NaN;
  }

  const mixedFraction = normalizedValue.match(/^(\d+(?:\.\d+)?)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedFraction) {
    const denominator = Number(mixedFraction[3]);
    return denominator === 0
      ? Number.NaN
      : Number(mixedFraction[1]) + Number(mixedFraction[2]) / denominator;
  }

  const fraction = normalizedValue.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? Number.NaN : Number(fraction[1]) / denominator;
  }

  if (!/^\d+(?:\.\d+)?$/.test(normalizedValue)) {
    return Number.NaN;
  }

  return Number(normalizedValue);
}
