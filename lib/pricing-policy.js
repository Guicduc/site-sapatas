export const pricingPolicy = {
  channelFeeRate: 0.06,
  minUnitPriceBrl: 1.9,
  minOrderSubtotalBrl: 24.9,
  marketPositioning: {
    commodity: "real_cost_plus_cover",
    configurable: "progressive_margin"
  },
  marginCurves: {
    base: [
      [0.25, 0.82],
      [0.5, 0.78],
      [1.5, 0.68],
      [4, 0.55],
      [10, 0.45],
      [25, 0.38]
    ],
    tubeInternal: [
      [0.25, 0.55],
      [0.5, 0.48],
      [1.5, 0.35],
      [4, 0.28],
      [10, 0.22],
      [25, 0.18]
    ],
    premiumSmallBase: [
      [0.25, 0.86],
      [0.5, 0.82],
      [1.5, 0.72],
      [4, 0.58],
      [10, 0.46],
      [25, 0.38]
    ]
  },
  marketRules: {
    tubeInternal: {
      marketFloorMultiplier: 0.75,
      marketCeilingMultiplier: 1.35,
      minimumSustainableMarginRate: 0.12,
      capToMarketWhenSustainable: false
    },
    configurableBase: {
      marketFloorMultiplier: 0.85,
      marketCeilingMultiplier: 0,
      minimumSustainableMarginRate: 0.32,
      capToMarketWhenSustainable: false
    },
    default: {
      marketFloorMultiplier: 0.75,
      marketCeilingMultiplier: 0,
      minimumSustainableMarginRate: 0.25,
      capToMarketWhenSustainable: false
    }
  }
};

export function calculateCommercialPrice({
  categorySlug,
  formatSlug,
  directUnitCostBrl,
  quantity = 1,
  channelFeeRate = pricingPolicy.channelFeeRate,
  marketReference = null
}) {
  const safeQuantity = Math.max(1, Number(quantity || 1));
  const unitCost = roundMoney(Math.max(0, Number(directUnitCostBrl || 0)));
  const strategy = getPricingStrategy(categorySlug, formatSlug);
  const targetMarginRate = interpolateMargin(unitCost, pricingPolicy.marginCurves[strategy.marginCurve]);
  const marketRule = pricingPolicy.marketRules[strategy.marketRule] || pricingPolicy.marketRules.default;
  const priceBeforeMinimum = unitCost / (1 - targetMarginRate) / (1 - channelFeeRate);
  const minimumUnitPrice = strategy.applyUnitFloor ? pricingPolicy.minUnitPriceBrl : 0;
  const market = normalizeMarketReference(marketReference);
  const marketFloorPrice = market ? market.pricingFloorBrl * marketRule.marketFloorMultiplier : 0;
  const marketCeilingPrice = market ? market.priceBrl * marketRule.marketCeilingMultiplier : 0;
  const sustainableFloorPrice =
    unitCost / (1 - marketRule.minimumSustainableMarginRate) / (1 - channelFeeRate);
  const marketAdjusted = applyMarketRule({
    priceBeforeMinimum,
    minimumUnitPrice,
    marketFloorPrice,
    marketCeilingPrice,
    sustainableFloorPrice,
    marketRule,
    hasMarket: Boolean(market)
  });
  const unitPriceBrl = roundMoney(marketAdjusted.unitPriceBrl);
  const totalBeforeOrderFloor = unitPriceBrl * safeQuantity;
  const appliesOrderFloor = false;
  const totalPriceBrl = roundMoney(totalBeforeOrderFloor);
  const effectiveMarginRate = effectiveMargin({
    unitCost,
    unitPriceBrl,
    channelFeeRate
  });

  return {
    unitPriceBrl: roundMoney(totalPriceBrl / safeQuantity),
    totalPriceBrl,
    targetMarginRate: roundRate(targetMarginRate),
    effectiveMarginRate: roundRate(effectiveMarginRate),
    commercialStrategy: strategy.key,
    commercialPositioning: strategy.positioning,
    priceBeforeMinimumBrl: roundMoney(priceBeforeMinimum),
    minUnitPriceBrl: strategy.applyUnitFloor ? pricingPolicy.minUnitPriceBrl : 0,
    minOrderSubtotalBrl: strategy.applyOrderFloor ? pricingPolicy.minOrderSubtotalBrl : 0,
    orderFloorApplied: appliesOrderFloor,
    marketReference: market,
    marketReferencePriceBrl: market?.priceBrl || 0,
    marketFloorPriceBrl: roundMoney(marketFloorPrice),
    marketCeilingPriceBrl: roundMoney(marketCeilingPrice),
    sustainableFloorPriceBrl: roundMoney(sustainableFloorPrice),
    marketAdjustment: marketAdjusted.adjustment
  };
}

export function getPricingStrategy(categorySlug, formatSlug) {
  if (categorySlug === "ponteira-interna-tubo") {
    return {
      key: "tube_internal_real_cost_plus_cover",
      marginCurve: "tubeInternal",
      marketRule: "tubeInternal",
      positioning: pricingPolicy.marketPositioning.commodity,
      applyUnitFloor: false,
      applyOrderFloor: true
    };
  }

  if (categorySlug === "sapata-base-lisa" && formatSlug === "redonda") {
    return {
      key: "premium_small_round_base",
      marginCurve: "premiumSmallBase",
      marketRule: "configurableBase",
      positioning: pricingPolicy.marketPositioning.configurable,
      applyUnitFloor: true,
      applyOrderFloor: true
    };
  }

  return {
    key: "progressive_margin",
    marginCurve: "base",
    marketRule: "configurableBase",
    positioning: pricingPolicy.marketPositioning.configurable,
    applyUnitFloor: true,
    applyOrderFloor: true
  };
}

function applyMarketRule({
  priceBeforeMinimum,
  minimumUnitPrice,
  marketFloorPrice,
  marketCeilingPrice,
  sustainableFloorPrice,
  marketRule,
  hasMarket
}) {
  let unitPriceBrl = Math.max(priceBeforeMinimum, minimumUnitPrice, marketFloorPrice);
  let adjustment = hasMarket ? "market_reference_observed" : "no_market_reference";

  if (
    hasMarket &&
    marketRule.capToMarketWhenSustainable &&
    marketCeilingPrice > 0 &&
    unitPriceBrl > marketCeilingPrice
  ) {
    unitPriceBrl = Math.max(sustainableFloorPrice, minimumUnitPrice);
    adjustment =
      sustainableFloorPrice <= marketCeilingPrice
        ? "market_ceiling_reduced_margin"
        : "sustainable_price_above_market";
  }

  if (hasMarket && marketFloorPrice > 0 && unitPriceBrl === marketFloorPrice) {
    adjustment = "market_floor_lifted_small_part";
  }

  return { unitPriceBrl, adjustment };
}

function normalizeMarketReference(marketReference) {
  if (!marketReference || !Number(marketReference.priceBrl)) {
    return null;
  }

  return {
    ...marketReference,
    priceBrl: roundMoney(marketReference.priceBrl),
    pricingFloorBrl: roundMoney(marketReference.pricingFloorBrl ?? marketReference.priceBrl)
  };
}

function effectiveMargin({ unitCost, unitPriceBrl, channelFeeRate }) {
  const netRevenue = Number(unitPriceBrl || 0) * (1 - Number(channelFeeRate || 0));

  if (netRevenue <= 0) {
    return 0;
  }

  return 1 - Number(unitCost || 0) / netRevenue;
}

function interpolateMargin(cost, points) {
  const safeCost = Math.max(0.01, Number(cost || 0));
  const sorted = points.slice().sort((left, right) => left[0] - right[0]);

  if (safeCost <= sorted[0][0]) {
    return sorted[0][1];
  }

  for (let index = 1; index < sorted.length; index += 1) {
    const [rightCost, rightMargin] = sorted[index];
    const [leftCost, leftMargin] = sorted[index - 1];

    if (safeCost <= rightCost) {
      const ratio =
        (Math.log(safeCost) - Math.log(leftCost)) /
        (Math.log(rightCost) - Math.log(leftCost));

      return leftMargin + (rightMargin - leftMargin) * ratio;
    }
  }

  return sorted[sorted.length - 1][1];
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function roundRate(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}
