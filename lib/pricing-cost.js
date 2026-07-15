export const pricingCostAssumptions = {
  tpuFilamentBrlPerKg: 170,
  printWasteRate: 0.05,
  printerPurchasePriceBrl: 7000,
  printerLifetimeHours: 7000,
  annualOperatingHours: 2000,
  annualMaintenanceBrl: 600,
  averagePowerDrawW: 200,
  electricityTariffBrlPerKwh: 0.95
};

export function calculateUnitProductionCost({ materialGrams, printMinutes }, assumptions = pricingCostAssumptions) {
  const safeMaterialGrams = Math.max(0, Number(materialGrams || 0));
  const safePrintMinutes = Math.max(0, Number(printMinutes || 0));
  const materialWithWasteGrams = safeMaterialGrams * (1 + assumptions.printWasteRate);
  const printHours = safePrintMinutes / 60;
  const energyKwh =
    (assumptions.averagePowerDrawW / 1000) *
    printHours *
    (1 + assumptions.printWasteRate);
  const materialCostBrl = materialWithWasteGrams * (assumptions.tpuFilamentBrlPerKg / 1000);
  const energyCostBrl = energyKwh * assumptions.electricityTariffBrlPerKwh;
  const maintenanceCostBrl =
    (assumptions.annualMaintenanceBrl / assumptions.annualOperatingHours) * printHours;
  const printerWearCostBrl =
    (assumptions.printerPurchasePriceBrl / assumptions.printerLifetimeHours) *
    printHours *
    (1 + assumptions.printWasteRate);
  const machineCostBrl = maintenanceCostBrl + printerWearCostBrl;

  return {
    materialWithWasteGrams,
    printHours,
    energyKwh,
    materialCostBrl,
    energyCostBrl,
    maintenanceCostBrl,
    printerWearCostBrl,
    machineCostBrl,
    productionCostBrl: materialCostBrl + energyCostBrl + machineCostBrl
  };
}
