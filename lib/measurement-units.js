export const MEASUREMENT_SYSTEMS = Object.freeze({
  METRIC: "metric",
  IMPERIAL: "imperial"
});

export const MILLIMETERS_PER_INCH = 25.4;
export const MILLIMETER_DECIMAL_PLACES = 1;
export const INCH_FRACTION_DENOMINATOR = 16;
export const INCH_FRACTION_STEP = 1 / INCH_FRACTION_DENOMINATOR;
const CANONICAL_DECIMAL_PLACES = 6;
const FLOATING_POINT_TOLERANCE = 1e-9;

export function measurementSystemReducer(currentSystem, nextSystem) {
  return Object.values(MEASUREMENT_SYSTEMS).includes(nextSystem)
    ? nextSystem
    : currentSystem;
}

export function getDisplayUnit(canonicalUnit, measurementSystem) {
  return usesFractionalInches(canonicalUnit, measurementSystem) ? "pol" : canonicalUnit;
}

export function toDisplayMeasurement(value, canonicalUnit, measurementSystem) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  if (usesFractionalInches(canonicalUnit, measurementSystem)) {
    return roundToInchFraction(numericValue / MILLIMETERS_PER_INCH);
  }

  if (canonicalUnit === "mm" && measurementSystem === MEASUREMENT_SYSTEMS.METRIC) {
    return roundToDecimalPlaces(numericValue, MILLIMETER_DECIMAL_PLACES);
  }

  return numericValue;
}

export function formatMeasurementValue(value, canonicalUnit, measurementSystem) {
  const displayValue = toDisplayMeasurement(value, canonicalUnit, measurementSystem);

  if (displayValue === null) {
    return "";
  }

  if (usesFractionalInches(canonicalUnit, measurementSystem)) {
    return formatInchFraction(displayValue);
  }

  return String(displayValue);
}

export function formatMeasurement(value, canonicalUnit, measurementSystem) {
  const formattedValue = formatMeasurementValue(value, canonicalUnit, measurementSystem);
  const displayUnit = getDisplayUnit(canonicalUnit, measurementSystem);

  return formattedValue ? `${formattedValue} ${displayUnit}` : displayUnit;
}

export function getDisplayRange(parameter, measurementSystem) {
  const canonicalRange = getCanonicalMeasurementRange(parameter, measurementSystem);

  return {
    min: formatMeasurementValue(canonicalRange.min, parameter.unit, measurementSystem),
    max: formatMeasurementValue(canonicalRange.max, parameter.unit, measurementSystem),
    step: usesFractionalInches(parameter.unit, measurementSystem)
      ? INCH_FRACTION_STEP
      : parameter.step,
    unit: getDisplayUnit(parameter.unit, measurementSystem)
  };
}

export function getCanonicalMeasurementRange(parameter, measurementSystem) {
  if (!usesFractionalInches(parameter.unit, measurementSystem)) {
    return { min: Number(parameter.min), max: Number(parameter.max) };
  }

  const canonicalStep = MILLIMETERS_PER_INCH * INCH_FRACTION_STEP;
  const minStep = Math.ceil(Number(parameter.min) / canonicalStep - FLOATING_POINT_TOLERANCE);
  const maxStep = Math.floor(Number(parameter.max) / canonicalStep + FLOATING_POINT_TOLERANCE);

  return {
    min: roundCanonicalValue(minStep * canonicalStep),
    max: roundCanonicalValue(maxStep * canonicalStep)
  };
}

export function snapMeasurementValue(value, parameter, measurementSystem) {
  const numericValue = Number(value);
  const range = getCanonicalMeasurementRange(parameter, measurementSystem);

  if (!Number.isFinite(numericValue)) {
    return formatCanonicalValue(range.min);
  }

  if (usesFractionalInches(parameter.unit, measurementSystem)) {
    const canonicalStep = MILLIMETERS_PER_INCH * INCH_FRACTION_STEP;
    const stepIndex = Math.round(numericValue / canonicalStep);
    return formatCanonicalValue(clamp(stepIndex * canonicalStep, range.min, range.max));
  }

  const step = Number(parameter.step || 1);
  const steppedValue = Math.round((numericValue - range.min) / step) * step + range.min;
  return formatCanonicalValue(clamp(steppedValue, range.min, range.max));
}

export function stepMeasurementValue(value, parameter, measurementSystem, stepOffset) {
  const numericValue = Number(value);
  const range = getCanonicalMeasurementRange(parameter, measurementSystem);
  const offset = Number(stepOffset);

  if (!Number.isFinite(numericValue) || !Number.isFinite(offset) || offset === 0) {
    return snapMeasurementValue(numericValue, parameter, measurementSystem);
  }

  if (usesFractionalInches(parameter.unit, measurementSystem)) {
    const canonicalStep = MILLIMETERS_PER_INCH * INCH_FRACTION_STEP;
    const currentStep = numericValue / canonicalStep;
    const nextStep = offset > 0
      ? Math.floor(currentStep + FLOATING_POINT_TOLERANCE) + offset
      : Math.ceil(currentStep - FLOATING_POINT_TOLERANCE) + offset;

    return formatCanonicalValue(clamp(nextStep * canonicalStep, range.min, range.max));
  }

  return snapMeasurementValue(
    numericValue + Number(parameter.step || 1) * offset,
    parameter,
    measurementSystem
  );
}

export function normalizeMeasurementInput(displayValue, parameter, measurementSystem) {
  return parseMeasurementInput(displayValue, parameter, measurementSystem).value;
}

export function parseMeasurementInput(displayValue, parameter, measurementSystem) {
  const numericValue = parseFlexibleNumber(displayValue);
  const displayRange = getDisplayRange(parameter, measurementSystem);
  const usesInches = usesFractionalInches(parameter.unit, measurementSystem);

  if (!Number.isFinite(numericValue)) {
    return {
      value: "",
      error: usesInches
        ? "Use uma fração em passos de 1/16, como 1/4, 3/8 ou 1 7/16."
        : "Use um número, como 30 ou 30,5."
    };
  }

  if (usesInches && !isStandardInchFraction(numericValue)) {
    return {
      value: "",
      error: "Use passos de 1/16 pol, como 1/4, 3/8 ou 1 7/16."
    };
  }

  const canonicalValue = usesInches
    ? numericValue * MILLIMETERS_PER_INCH
    : numericValue;
  const canonicalRange = getCanonicalMeasurementRange(parameter, measurementSystem);

  if (
    canonicalValue < canonicalRange.min - FLOATING_POINT_TOLERANCE
    || canonicalValue > canonicalRange.max + FLOATING_POINT_TOLERANCE
  ) {
    return {
      value: "",
      error: `Informe entre ${displayRange.min} e ${displayRange.max} ${displayRange.unit}.`
    };
  }

  return {
    value: formatCanonicalValue(canonicalValue),
    error: ""
  };
}

function usesFractionalInches(canonicalUnit, measurementSystem) {
  return canonicalUnit === "mm" && measurementSystem === MEASUREMENT_SYSTEMS.IMPERIAL;
}

function roundToInchFraction(value) {
  return Math.round((value + Number.EPSILON) * INCH_FRACTION_DENOMINATOR)
    / INCH_FRACTION_DENOMINATOR;
}

function roundToDecimalPlaces(value, decimalPlaces) {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatInchFraction(value) {
  const totalParts = Math.round(value * INCH_FRACTION_DENOMINATOR);
  const whole = Math.floor(totalParts / INCH_FRACTION_DENOMINATOR);
  const remainder = totalParts % INCH_FRACTION_DENOMINATOR;

  if (remainder === 0) {
    return String(whole);
  }

  const divisor = greatestCommonDivisor(remainder, INCH_FRACTION_DENOMINATOR);
  const fraction = `${remainder / divisor}/${INCH_FRACTION_DENOMINATOR / divisor}`;

  return whole > 0 ? `${whole} ${fraction}` : fraction;
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    [a, b] = [b, a % b];
  }

  return a;
}

function isStandardInchFraction(value) {
  const scaledValue = value * INCH_FRACTION_DENOMINATOR;
  return Math.abs(scaledValue - Math.round(scaledValue)) <= FLOATING_POINT_TOLERANCE;
}

function roundCanonicalValue(value) {
  return Number(Number(value).toFixed(CANONICAL_DECIMAL_PLACES));
}

function formatCanonicalValue(value) {
  return trimTrailingZeros(Number(value).toFixed(CANONICAL_DECIMAL_PLACES));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
