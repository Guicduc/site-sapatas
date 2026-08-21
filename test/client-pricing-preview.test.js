import assert from "node:assert/strict";
import test from "node:test";

import { calculateClientPricePreview } from "../lib/client-pricing-preview.js";
import {
  calculatePriceBreakdown,
  getInitialValues,
  productCategories
} from "../lib/configurator-data.js";

// One public price step is the maximum acceptable display difference. Both engines
// currently share the same fitted model and should normally match exactly.
const toleranceBrl = 0.25;

test("compact client previews track authoritative prices across public surfaces", () => {
  for (const category of productCategories) {
    for (const format of category.formats.filter((item) => item.status === "active")) {
      for (const values of representativeConfigurations(format)) {
        const preview = calculateClientPricePreview(format, values, 7);
        const authoritative = calculatePriceBreakdown(format, values, 7);

        assert.equal(preview.pricingAvailable, authoritative.pricingAvailable, `${category.slug}:${format.slug}`);
        assert.equal(preview.surfaceId, authoritative.surfaceId, `${category.slug}:${format.slug}`);
        assert.ok(
          Math.abs(preview.unitPriceBrl - authoritative.unitPriceBrl) <= toleranceBrl,
          `${category.slug}:${format.slug} differs by more than one R$ 0.25 sale-price step`
        );
        assert.ok(
          Math.abs(preview.totalPriceBrl - authoritative.totalPriceBrl) <= toleranceBrl * 7,
          `${category.slug}:${format.slug} total exceeds the per-unit tolerance`
        );
      }
    }
  }
});

function representativeConfigurations(format) {
  const defaults = getInitialValues(format);
  const configurations = [defaults];

  for (const useMaximum of [false, true]) {
    const values = { ...defaults };
    for (const parameter of format.parameters) {
      if (parameter.type === "boolean") {
        values[parameter.key] = useMaximum;
      } else {
        values[parameter.key] = useMaximum ? parameter.max : parameter.min;
      }
    }
    configurations.push(values);
  }

  return configurations;
}
