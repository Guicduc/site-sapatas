import { predictMonotoneProductionCost } from "./monotone-pricing-model.js";
import { validateManufacturingConstraints } from "./product-constraints.js";
import { slicerPricingPreviewModels } from "./slicer-pricing-preview-data.js";
import { resolveVariant } from "./client-configurator-data.js";

const salePriceRoundingIncrementBrl = 0.25;
const minimumPriceBrl = 0.3;

/** Fast browser-only estimate. Orders are always repriced by the authoritative server engine. */
export function calculateClientPricePreview(format, values, quantity = 1) {
  const safeQuantity = Math.max(1, Number(quantity || 1));
  const variant = resolveVariant(format, values);
  const surfaceId = variant?.pricing?.surfaceId || "";
  const model = slicerPricingPreviewModels[surfaceId];
  const manufacturingIssue = validateManufacturingConstraints(format, values)[0];

  if (manufacturingIssue || !model) {
    return {
      pricingAvailable: false,
      pricingUnavailableReason: manufacturingIssue ||
        "Preço indisponível: a base de slice não cobre esta configuração. O item segue para avaliação técnica.",
      unitPriceBrl: 0,
      totalPriceBrl: 0,
      quantity: safeQuantity,
      surfaceId
    };
  }

  const params = Object.fromEntries(format.parameters.map((parameter) => [
    parameter.key, values?.[parameter.key] ?? parameter.defaultValue
  ]));
  const directUnitCostBrl = predictMonotoneProductionCost(model, params);
  const saleMultiplier = Number(variant?.pricing?.saleMultiplier) ||
    (format.skuPrefix?.includes("PI") ? 1.7 : 4);
  const unitPriceBrl = Math.max(
    minimumPriceBrl,
    roundSalePrice(directUnitCostBrl * saleMultiplier)
  );

  return {
    pricingAvailable: true,
    pricingUnavailableReason: "",
    unitPriceBrl,
    totalPriceBrl: roundMoney(unitPriceBrl * safeQuantity),
    quantity: safeQuantity,
    surfaceId
  };
}

function roundSalePrice(value) {
  return roundMoney(Math.ceil(Number(value || 0) / salePriceRoundingIncrementBrl) * salePriceRoundingIncrementBrl);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
