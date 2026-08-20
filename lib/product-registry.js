import categoriesDocument from "../catalog/categories.json" with { type: "json" };
import screwSquare from "../catalog/products/sapata-com-parafuso-quadrada.json" with { type: "json" };
import screwRound from "../catalog/products/sapata-com-parafuso-redonda.json" with { type: "json" };
import baseSquare from "../catalog/products/sapata-lisa-quadrada.json" with { type: "json" };
import baseRound from "../catalog/products/sapata-lisa-redonda.json" with { type: "json" };
import tubeOblong from "../catalog/products/sapata-tubo-oblongo.json" with { type: "json" };
import tubeSquare from "../catalog/products/sapata-tubo-quadrado.json" with { type: "json" };
import tubeRound from "../catalog/products/sapata-tubo-redondo.json" with { type: "json" };
import baseU from "../catalog/products/sapata-u.json" with { type: "json" };

// Ordem editorial dentro de cada categoria. Não usar leitura de filesystem no bundle cliente.
export const productManifests = Object.freeze([
  tubeRound,
  tubeSquare,
  tubeOblong,
  baseRound,
  baseSquare,
  screwRound,
  screwSquare,
  baseU
]);

export function buildRegistryProductCategories({ includeDrafts = false } = {}) {
  const visibleProducts = productManifests.filter((product) => includeDrafts || product.status === "active");

  return categoriesDocument.categories
    .map((category) => {
      const products = visibleProducts.filter((product) => product.category.slug === category.slug);

      return {
        ...category,
        colors: unique(products.flatMap((product) => product.colors || [])),
        finishes: unique(products.flatMap((product) => product.finishes || [])),
        formats: products.map(normalizeProductFormat)
      };
    })
    .filter((category) => category.formats.length > 0);
}

export function getProductManifestById(productId) {
  return productManifests.find((product) => product.productId === productId);
}

export function getProductManifestByRoute(categorySlug, formatSlug) {
  return productManifests.find((product) => {
    return product.category.slug === categorySlug && product.category.formatSlug === formatSlug;
  });
}

export function resolveManifestVariant(product, values = {}) {
  const publicVariants = (product?.variants || []).filter((variant) => variant.public);

  return publicVariants.find((variant) => conditionMatches(variant.condition, values)) ||
    publicVariants.find((variant) => !variant.condition) ||
    publicVariants[0];
}

function normalizeProductFormat(product) {
  const publicVariants = product.variants.filter((variant) => variant.public);
  const singleVariant = publicVariants.length === 1 ? publicVariants[0] : null;

  return {
    productId: product.productId,
    familySlug: product.seo.familySlug,
    slug: product.category.formatSlug,
    name: product.name,
    skuPrefix: product.skuPrefix,
    sku: product.sku,
    description: product.description,
    fixation: product.ui.fixation,
    summaryName: product.ui.summaryName,
    applications: product.ui.applications,
    status: product.status,
    drawingType: product.drawingType,
    leadTimeBaseDays: product.leadTimeBaseDays,
    material: product.material,
    manufacturing: product.manufacturing,
    calibratedPricingCategorySlug: product.category.slug,
    calibratedPricingFamilySlug: product.seo.familySlug,
    pricingVariantSlug: singleVariant?.id,
    pricingParameterKeys: singleVariant?.pricing?.parameterKeys,
    parameters: product.parameters.map(normalizeParameter),
    variants: publicVariants,
    visuals: product.visuals,
    notes: product.notes || []
  };
}

function normalizeParameter(parameter) {
  return {
    key: parameter.key,
    label: parameter.label,
    min: parameter.min,
    max: parameter.max,
    defaultValue: parameter.default,
    unit: parameter.unit,
    step: parameter.step,
    required: parameter.type === "dimension",
    type: parameter.type === "dimension" ? "number" : "boolean",
    role: parameter.role,
    dependsOn: parameter.dependsOn
  };
}

function conditionMatches(condition, values) {
  if (!condition) {
    return false;
  }

  return Object.entries(condition).every(([key, expected]) => {
    const actual = values[key];
    if (typeof expected === "boolean") {
      return normalizeBoolean(actual) === expected;
    }
    return actual === expected;
  });
}

function normalizeBoolean(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function unique(values) {
  return [...new Set(values)];
}
