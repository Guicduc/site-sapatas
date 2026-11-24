import assert from "node:assert/strict";
import test from "node:test";

import { calculateClientPricePreview } from "../lib/client-pricing-preview.js";
import {
  calculateLeadTime,
  calculateOrderLeadTime,
  calculatePriceBreakdown,
  getInitialValues,
  productCategories
} from "../lib/configurator-data.js";
import {
  buildDeliveryEstimate,
  calculateProductionLeadTime,
  MIN_PRODUCTION_DAYS,
  PRODUCTION_BUFFER_DAYS,
  REVIEW_EXTRA_DAYS
} from "../lib/production-lead-time.js";

const dailyPrintMinutes = 30 * 60;

test("small orders keep the seven business-day floor", () => {
  assert.equal(calculateProductionLeadTime([], { dailyPrintMinutes }).days, MIN_PRODUCTION_DAYS);
  const result = calculateProductionLeadTime(
    [{ printMinutesPerUnit: 40, quantity: 100 }],
    { dailyPrintMinutes }
  );
  assert.equal(result.printMinutes, 4000);
  assert.equal(result.days, MIN_PRODUCTION_DAYS);
  assert.equal(result.capacityBound, false);
});

test("orders that do not fit in the floor add the print days plus one buffer day", () => {
  // 600 x 60 min = 36000 min = 20 dias de impressao a 30 h/dia.
  const result = calculateProductionLeadTime(
    [{ printMinutesPerUnit: 60, quantity: 600 }],
    { dailyPrintMinutes }
  );
  assert.equal(result.printDays, 20);
  assert.equal(result.days, 20 + PRODUCTION_BUFFER_DAYS);
  assert.equal(result.capacityBound, true);
});

test("print time is summed across every item of the order", () => {
  const single = calculateProductionLeadTime([{ printMinutesPerUnit: 60, quantity: 150 }], { dailyPrintMinutes });
  const combined = calculateProductionLeadTime([
    { printMinutesPerUnit: 60, quantity: 150 },
    { printMinutesPerUnit: 60, quantity: 150 }
  ], { dailyPrintMinutes });
  assert.equal(single.days, MIN_PRODUCTION_DAYS);
  assert.equal(combined.printMinutes, 18000);
  assert.equal(combined.days, 10 + PRODUCTION_BUFFER_DAYS);
});

test("formats under review add three days on top of the floor", () => {
  const result = calculateProductionLeadTime([{ printMinutesPerUnit: 10, quantity: 1, review: true }], { dailyPrintMinutes });
  assert.equal(result.days, MIN_PRODUCTION_DAYS + REVIEW_EXTRA_DAYS);
});

test("delivery estimate adds shipping only when the carrier returned a positive time", () => {
  assert.deepEqual(buildDeliveryEstimate(7, 5), {
    unit: "business_days",
    startsAt: "payment_approved",
    productionDays: 7,
    shippingDays: 5,
    totalDays: 12
  });
  assert.equal(buildDeliveryEstimate(7, 0).totalDays, null);
  assert.equal(buildDeliveryEstimate(7, null).shippingDays, null);
});

test("configurator and order engines agree on the default configuration of every public format", () => {
  for (const category of productCategories) {
    for (const format of category.formats.filter((item) => item.status === "active")) {
      const values = getInitialValues(format);
      const preview = calculateClientPricePreview(format, values, 1);
      const authoritative = calculatePriceBreakdown(format, values, 1);
      assert.ok(preview.printMinutes > 0, `${category.slug}:${format.slug} sem tempo de impressao na previa`);
      assert.equal(calculateLeadTime(format, 1, preview.printMinutes), MIN_PRODUCTION_DAYS);
      assert.equal(calculateLeadTime(format, 1, authoritative.printMinutes), MIN_PRODUCTION_DAYS);
    }
  }
});

test("order lead time uses the server print minutes of each item", () => {
  const category = productCategories[0];
  const format = category.formats[0];
  const values = getInitialValues(format);
  const priceBreakdown = calculatePriceBreakdown(format, values, 999);
  const items = [{ categorySlug: category.slug, formatSlug: format.slug, quantity: 999, priceBreakdown }];
  const result = calculateOrderLeadTime(items);
  assert.equal(result.printMinutes, Math.round(priceBreakdown.printMinutes * 999));
  assert.ok(result.days >= MIN_PRODUCTION_DAYS);
});
