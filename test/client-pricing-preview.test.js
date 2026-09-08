import assert from "node:assert/strict";
import test from "node:test";

import { calculateClientPricePreview } from "../lib/client-pricing-preview.js";
import { restoreClientCart, updateClientCartItem } from "../lib/client-cart.js";
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

test("preview resolves serialized false toggles like the order engine", () => {
  const format = productCategories.find((category) => category.slug === "sapata-base-lisa").formats[0];
  for (const pescoco of [false, 0, "0", "false", true, 1, "1", "true"]) {
    const values = { ...getInitialValues(format), pescoco };
    const preview = calculateClientPricePreview(format, values, 4);
    const authoritative = calculatePriceBreakdown(format, values, 4);
    assert.equal(preview.surfaceId, authoritative.surfaceId);
    assert.equal(preview.totalPriceBrl, authoritative.totalPriceBrl);
  }
});

test("saved carts reject non-arrays and refresh legacy prices, SKUs and quantities", () => {
  for (const saved of ["null", "{}", "42", '"cart"', "[null]"]) {
    assert.deepEqual(restoreClientCart(saved), []);
  }
  const category = productCategories[0];
  const format = category.formats[0];
  const values = getInitialValues(format);
  const [item] = restoreClientCart(JSON.stringify([{
    id: "legacy", categorySlug: category.slug, formatSlug: format.slug,
    values, sku: "old-sku", unitPriceBrl: 999, priceBrl: 999, quantity: 1
  }]));
  assert.match(item.sku, /-V2-/);
  assert.equal(item.priceBrl, calculateClientPricePreview(format, values).totalPriceBrl);
  const updated = updateClientCartItem(item, 30);
  assert.equal(updated.priceBrl, item.unitPriceBrl * 30);
  assert.equal(updated.priceBreakdown.quantity, 30);
  assert.equal(updated.leadTimeDays, format.leadTimeBaseDays + 2);
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
