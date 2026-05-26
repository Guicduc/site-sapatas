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
  }
};

export function calculateCommercialPrice({
  categorySlug,
  formatSlug,
  directUnitCostBrl,
  quantity = 1,
  channelFeeRate = pricingPolicy.channelFeeRate
}) {
  const safeQuantity = Math.max(1, Number(quantity || 1));
  const unitCost = roundMoney(Math.max(0, Number(directUnitCostBrl || 0)));
  const strategy = getPricingStrategy(categorySlug, formatSlug);
  const targetMarginRate = interpolateMargin(unitCost, pricingPolicy.marginCurves[strategy.marginCurve]);
  const priceBeforeMinimum = unitCost / (1 - targetMarginRate) / (1 - channelFeeRate);
  const minimumUnitPrice = strategy.applyUnitFloor ? pricingPolicy.minUnitPriceBrl : 0;
  const unitPriceBrl = roundMoney(Math.max(priceBeforeMinimum, minimumUnitPrice));
  const totalBeforeOrderFloor = unitPriceBrl * safeQuantity;
  const appliesOrderFloor = false;
  const totalPriceBrl = roundMoney(totalBeforeOrderFloor);

  return {
    unitPriceBrl: roundMoney(totalPriceBrl / safeQuantity),
    totalPriceBrl,
    targetMarginRate: roundRate(targetMarginRate),
    commercialStrategy: strategy.key,
    commercialPositioning: strategy.positioning,
    priceBeforeMinimumBrl: roundMoney(priceBeforeMinimum),
    minUnitPriceBrl: strategy.applyUnitFloor ? pricingPolicy.minUnitPriceBrl : 0,
    minOrderSubtotalBrl: strategy.applyOrderFloor ? pricingPolicy.minOrderSubtotalBrl : 0,
    orderFloorApplied: appliesOrderFloor
  };
}

export function getPricingStrategy(categorySlug, formatSlug) {
  if (categorySlug === "ponteira-interna-tubo") {
    return {
      key: "tube_internal_real_cost_plus_cover",
      marginCurve: "tubeInternal",
      positioning: pricingPolicy.marketPositioning.commodity,
      applyUnitFloor: false,
      applyOrderFloor: true
    };
  }

  if (categorySlug === "sapata-base-lisa" && formatSlug === "redonda") {
    return {
      key: "premium_small_round_base",
      marginCurve: "premiumSmallBase",
      positioning: pricingPolicy.marketPositioning.configurable,
      applyUnitFloor: true,
      applyOrderFloor: true
    };
  }

  return {
    key: "progressive_margin",
    marginCurve: "base",
    positioning: pricingPolicy.marketPositioning.configurable,
    applyUnitFloor: true,
    applyOrderFloor: true
  };
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
