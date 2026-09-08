import { buildConfigurationSku, calculateLeadTime, getCategoryBySlug, getFormat } from "./client-configurator-data.js";
import { calculateClientPricePreview } from "./client-pricing-preview.js";

// Refresh saved configurations without importing the server's detailed slice dataset.
export function updateClientCartItem(item, quantity = item.quantity) {
  const safeQuantity = Math.max(1, Number(quantity) || 1);
  const format = getFormat(getCategoryBySlug(item.categorySlug), item.formatSlug);
  if (!format) {
    return { ...item, quantity: safeQuantity, priceBrl: Math.round(Number(item.unitPriceBrl || 0) * safeQuantity * 100) / 100 };
  }
  const priceBreakdown = calculateClientPricePreview(format, item.values || {}, safeQuantity);
  return {
    ...item,
    sku: buildConfigurationSku(format, item.values || {}, { color: item.color }),
    quantity: safeQuantity,
    unitPriceBrl: priceBreakdown.unitPriceBrl,
    priceBrl: priceBreakdown.totalPriceBrl,
    priceBreakdown,
    leadTimeDays: calculateLeadTime(format, safeQuantity)
  };
}

export function restoreClientCart(saved) {
  const items = JSON.parse(saved);
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => updateClientCartItem(item));
}
