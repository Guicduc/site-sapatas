import { competitorMarketAnchors } from "./market-pricing-data.js";

const MAX_REFERENCE_DISTANCE = 0.45;

export function findMarketPricingReference({
  categorySlug,
  formatSlug,
  dimensions = {},
  hasNeck = false
}) {
  const candidates = competitorMarketAnchors
    .filter((anchor) => {
      return (
        anchor.categorySlug === categorySlug &&
        anchor.formatSlug === formatSlug &&
        neckMatches(anchor, hasNeck)
      );
    })
    .map((anchor) => ({
      anchor,
      distance: referenceDistance(anchor.dimensions, dimensions)
    }))
    .filter((item) => Number.isFinite(item.distance))
    .sort((left, right) => left.distance - right.distance);

  const best = candidates[0];

  if (!best || best.distance > MAX_REFERENCE_DISTANCE) {
    return null;
  }

  return {
    supplier: best.anchor.supplier,
    model: best.anchor.model,
    comparableStatus: best.anchor.comparableStatus,
    priceBrl: best.anchor.finalPriceBrl,
    pricingFloorBrl: best.anchor.pricingFloorBrl || best.anchor.finalPriceBrl,
    dimensions: best.anchor.dimensions,
    distance: roundMetric(best.distance),
    notes: best.anchor.notes
  };
}

function neckMatches(anchor, hasNeck) {
  if (anchor.dimensions.hasNeck === undefined) {
    return true;
  }

  return Boolean(anchor.dimensions.hasNeck) === Boolean(hasNeck);
}

function referenceDistance(anchorDimensions = {}, targetDimensions = {}) {
  if (anchorDimensions.diameterMm) {
    return scalarDistance(anchorDimensions.diameterMm, targetDimensions.diameterMm);
  }

  if (anchorDimensions.sizeXmm && anchorDimensions.sizeYmm) {
    const anchor = sortPair(anchorDimensions.sizeXmm, anchorDimensions.sizeYmm);
    const target = sortPair(targetDimensions.sizeXmm, targetDimensions.sizeYmm);

    if (!target[0] || !target[1]) {
      return Number.POSITIVE_INFINITY;
    }

    const x = scalarDistance(anchor[0], target[0]);
    const y = scalarDistance(anchor[1], target[1]);
    return Math.sqrt((x * x + y * y) / 2);
  }

  return Number.POSITIVE_INFINITY;
}

function scalarDistance(anchorValue, targetValue) {
  const anchor = Number(anchorValue || 0);
  const target = Number(targetValue || 0);

  if (!anchor || !target) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(anchor - target) / Math.max(anchor, target, 1);
}

function sortPair(left, right) {
  return [Number(left || 0), Number(right || 0)].sort((a, b) => a - b);
}

function roundMetric(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}
