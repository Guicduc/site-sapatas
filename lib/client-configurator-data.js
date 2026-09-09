import { validateManufacturingConstraints } from "./product-constraints.js";
import { buildRegistryProductCategories } from "./product-registry.js";

export const productCategories = buildRegistryProductCategories();

export function getCategoryBySlug(slug) {
  return productCategories.find((category) => category.slug === slug);
}

export function getFormat(category, formatSlug) {
  return category?.formats.find((format) => format.slug === formatSlug);
}

export function getInitialValues(format) {
  return Object.fromEntries(format.parameters.map((parameter) => [parameter.key, parameter.defaultValue]));
}

export function validateConfiguration(format, values) {
  const issues = [];

  for (const parameter of format.parameters) {
    if (parameter.dependsOn && !values?.[parameter.dependsOn]) continue;
    if (parameter.type === "boolean") continue;

    const rawValue = values?.[parameter.key];
    const value = Number(rawValue);
    if (parameter.required && (rawValue === "" || rawValue === null || Number.isNaN(value))) {
      issues.push(`${parameter.label} precisa ser informado.`);
      continue;
    }
    if (value < parameter.min || value > parameter.max) {
      issues.push(`${parameter.label} deve ficar entre ${parameter.min} e ${parameter.max} ${parameter.unit}.`);
    }
  }

  issues.push(...validateManufacturingConstraints(format, values));
  return issues;
}

export function calculateLeadTime(format, quantity = 1) {
  return format.leadTimeBaseDays + (Number(quantity || 1) > 24 ? 2 : 0) +
    (format.status === "review" ? 3 : 0);
}

const defaultParameterCodes = {
  diametroBase: "DB", alturaBase: "AB", alturaPescoco: "AP", paredeTubo: "PT",
  tamanhoBaseX: "BX", tamanhoBaseY: "BY", diametro: "DI", diametroPescoco: "DP",
  diametroParafuso: "PF"
};
const defaultVariantCodes = { "sem-haste": "SH", haste: "HA", "com-parafuso": "CP" };
const defaultColorCodes = {
  Preta: "PR", Preto: "PR", Branco: "BR", Cinza: "CZ", Marrom: "MR", Areia: "AR",
  Terracota: "TE", "Verde mineral": "VM"
};

export function buildConfigurationSku(format, values, options = {}) {
  const variant = resolveVariant(format, values);
  const variantSlug = variant?.id || (Boolean(values?.pescoco) ? "haste" : "sem-haste");
  const variantCode = variant?.code || defaultVariantCodes[variantSlug] ||
    variantSlug.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 2);
  const parameterCodes = format.sku?.parameterCodes || defaultParameterCodes;
  const parameterOrder = format.sku?.parameterOrder || format.parameters.map(({ key }) => key);
  const parts = format.parameters
    .filter((parameter) => parameter.type !== "boolean" &&
      (!parameter.dependsOn || Boolean(values?.[parameter.dependsOn])))
    .sort((left, right) => parameterOrder.indexOf(left.key) - parameterOrder.indexOf(right.key))
    .map((parameter) => {
      const code = parameterCodes[parameter.key] || parameter.key.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 2);
      const value = values?.[parameter.key] ?? parameter.defaultValue;
      return `${code}${String(value ?? "").replace(",", ".").replace(".", "P")}`;
    });
  const colorCode = format.sku?.colorCodes?.[options.color] || defaultColorCodes[options.color] || "";

  return [format.skuPrefix, format.sku?.versionMarker || "V2", variantCode, ...parts, colorCode]
    .filter(Boolean)
    .join("-");
}

export function resolveVariant(format, values = {}) {
  const variants = format.variants || [];
  return variants.find((variant) => variant.condition && Object.entries(variant.condition).every(([key, expected]) => {
    return typeof expected === "boolean"
      ? normalizeBoolean(values[key]) === expected
      : values[key] === expected;
  })) || variants.find((variant) => !variant.condition) || variants[0];
}

function normalizeBoolean(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}
