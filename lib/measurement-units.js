export const MEASUREMENT_SYSTEMS = Object.freeze({
  METRIC: "metric",
  IMPERIAL: "imperial"
});

export const MILLIMETERS_PER_INCH = 25.4;
export const INCH_DECIMAL_PLACES = 3;

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
  const numericValue = Number(displayValue);

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  const canonicalValue = parameter.unit === "mm"
    && measurementSystem === MEASUREMENT_SYSTEMS.IMPERIAL
    ? numericValue * MILLIMETERS_PER_INCH
    : numericValue;
  const step = Number(parameter.step || 1);
  const steppedValue = Math.round((canonicalValue - parameter.min) / step) * step + parameter.min;
  const clampedValue = Math.min(parameter.max, Math.max(parameter.min, steppedValue));
  const decimals = getStepDecimals(step);

  return decimals > 0 ? clampedValue.toFixed(decimals) : String(Math.round(clampedValue));
}

function roundTo(value, decimalPlaces) {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function trimTrailingZeros(value) {
  return value.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function getStepDecimals(step) {
  const text = String(step);

  return text.includes(".") ? text.split(".")[1].length : 0;
}
