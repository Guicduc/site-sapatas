import { pricingAssumptions } from "@/lib/configurator-data";

export const PRICING_MODE = {
  SLICED: "sliced"
};

export const PRICING_SOURCE = {
  ORCA_SLICER: "orca_slicer"
};

export const pricingCostAssumptions = {
  tpuFilamentBrlPerKg: pricingAssumptions.tpuFilamentBrlPerKg,
  printWasteRate: pricingAssumptions.printWasteRate,
  printerPurchasePriceBrl: pricingAssumptions.printerPurchasePriceBrl,
  printerLifetimeHours: pricingAssumptions.printerLifetimeHours,
  annualOperatingHours: pricingAssumptions.annualOperatingHours,
  annualMaintenanceBrl: pricingAssumptions.annualMaintenanceBrl,
  averagePowerDrawW: pricingAssumptions.averagePowerDrawW,
  electricityTariffBrlPerKwh: pricingAssumptions.electricityTariffBrlPerKwh,
  channelFeeRate: pricingAssumptions.channelFeeRate,
  markupRate: pricingAssumptions.markupRate,
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
  const materialCostBrl =
    materialWithWasteGrams * (assumptions.tpuFilamentBrlPerKg / 1000) * safeQuantity;
  const energyCostBrl =
    (assumptions.averagePowerDrawW / 1000) *
    printHours *
    assumptions.electricityTariffBrlPerKwh *
    (1 + assumptions.printWasteRate) *
    safeQuantity;
  const maintenanceCostBrl =
    (assumptions.annualMaintenanceBrl / assumptions.annualOperatingHours) *
    printHours *
    safeQuantity;
  const printerWearCostBrl =
    (assumptions.printerPurchasePriceBrl / assumptions.printerLifetimeHours) *
    printHours *
    (1 + assumptions.printWasteRate) *
    safeQuantity;
  const directCostBrl =
    materialCostBrl +
    energyCostBrl +
    maintenanceCostBrl +
    printerWearCostBrl;
  const targetPriceBeforeFeeBrl = directCostBrl * (1 + assumptions.markupRate);
  const suggestedBeforeMinimumBrl = targetPriceBeforeFeeBrl / (1 - assumptions.channelFeeRate);
  const channelFeeBrl = suggestedBeforeMinimumBrl * assumptions.channelFeeRate;
  const suggestedPriceBrl = Math.max(
    assumptions.minOrderPriceBrl,
    suggestedBeforeMinimumBrl
  );

  return {
    materialCostBrl: roundMoney(materialCostBrl / safeQuantity),
    machineCostBrl: roundMoney((maintenanceCostBrl + printerWearCostBrl) / safeQuantity),
    energyCostBrl: roundMoney(energyCostBrl / safeQuantity),
    maintenanceCostBrl: roundMoney(maintenanceCostBrl / safeQuantity),
    printerWearCostBrl: roundMoney(printerWearCostBrl / safeQuantity),
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
