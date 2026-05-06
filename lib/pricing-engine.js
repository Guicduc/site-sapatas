import { pricingAssumptions } from "@/lib/configurator-data";

export const PRICING_MODE = {
  ESTIMATED: "estimated",
  SLICED: "sliced"
};

export const PRICING_SOURCE = {
  GEOMETRIC_ESTIMATE: "geometric_estimate",
  ORCA_SLICER: "orca_slicer"
};

export const pricingCostAssumptions = {
  tpuFilamentBrlPerKg: pricingAssumptions.tpuFilamentBrlPerKg,
  printWasteRate: pricingAssumptions.printWasteRate,
  machineCostBrlPerHour: pricingAssumptions.machineCostBrlPerHour,
  energyCostBrlPerHour: pricingAssumptions.energyCostBrlPerHour,
  packagingBrlPerOrder: pricingAssumptions.packagingBrlPerOrder,
  operatorCostBrlPerHour: 18,
  operatorMinutesPerOrder: 12,
  channelFeeRate: 0.06,
  markup: pricingAssumptions.markup,
  minOrderPriceBrl: pricingAssumptions.minOrderPriceBrl
};

export function buildSlicedPricingResult({
  materialGrams,
  printMinutes,
  quantity = 1,
  orcaVersion = "",
  profileId = "",
  gcodeFileName = "",
  raw = {}
}) {
  const safeMaterialGrams = Math.max(0, Number(materialGrams || 0));
  const safePrintMinutes = Math.max(0, Number(printMinutes || 0));
  const safeQuantity = Math.max(1, Number(quantity || 1));
  const cost = calculateSlicedCost({
    materialGrams: safeMaterialGrams,
    printMinutes: safePrintMinutes,
    quantity: safeQuantity
  });

  return {
    mode: PRICING_MODE.SLICED,
    source: PRICING_SOURCE.ORCA_SLICER,
    orcaVersion,
    profileId,
    materialGrams: roundMetric(safeMaterialGrams),
    printMinutes: roundMetric(safePrintMinutes),
    directCostBrl: cost.directCostBrl,
    suggestedPriceBrl: cost.suggestedPriceBrl,
    calculatedAt: new Date().toISOString(),
    gcodeFileName,
    quantity: safeQuantity,
    costBreakdown: cost,
    raw
  };
}

export function calculateSlicedCost({ materialGrams, printMinutes, quantity = 1 }) {
  const assumptions = pricingCostAssumptions;
  const safeQuantity = Math.max(1, Number(quantity || 1));
  const materialWithWasteGrams = Number(materialGrams || 0) * (1 + assumptions.printWasteRate);
  const printHours = Number(printMinutes || 0) / 60;
  const operatorHours = assumptions.operatorMinutesPerOrder / 60;
  const materialCostBrl = materialWithWasteGrams * (assumptions.tpuFilamentBrlPerKg / 1000);
  const machineCostBrl = printHours * assumptions.machineCostBrlPerHour;
  const energyCostBrl = printHours * assumptions.energyCostBrlPerHour;
  const operatorCostBrl = operatorHours * assumptions.operatorCostBrlPerHour;
  const packagingCostBrl = assumptions.packagingBrlPerOrder;
  const directCostBrl =
    materialCostBrl + machineCostBrl + energyCostBrl + operatorCostBrl + packagingCostBrl;
  const preFeePriceBrl = directCostBrl * assumptions.markup;
  const channelFeeBrl = preFeePriceBrl * assumptions.channelFeeRate;
  const suggestedPriceBrl = Math.max(
    assumptions.minOrderPriceBrl,
    preFeePriceBrl + channelFeeBrl
  );

  return {
    materialCostBrl: roundMoney(materialCostBrl),
    machineCostBrl: roundMoney(machineCostBrl),
    energyCostBrl: roundMoney(energyCostBrl),
    operatorCostBrl: roundMoney(operatorCostBrl),
    packagingCostBrl: roundMoney(packagingCostBrl),
    channelFeeBrl: roundMoney(channelFeeBrl),
    directCostBrl: roundMoney(directCostBrl),
    suggestedPriceBrl: roundMoney(suggestedPriceBrl),
    unitSuggestedPriceBrl: roundMoney(suggestedPriceBrl / safeQuantity),
    assumptions
  };
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function roundMetric(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}
