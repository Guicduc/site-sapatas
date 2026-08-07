import assert from "node:assert/strict";
import test from "node:test";

import { shippingDimensionsForItem } from "../lib/shipping.js";

test("usa o envelope CAD da Sapata U na cotacao de frete", () => {
  const previousPadding = process.env.SHIPPING_PRODUCT_PADDING_CM;
  process.env.SHIPPING_PRODUCT_PADDING_CM = "0";

  try {
    assert.deepEqual(shippingDimensionsForItem({
      categorySlug: "sapata-u",
      values: {
        diametro: 60,
        espessura: 1.5,
        comprimento: 29.4,
        pescoco: true
      }
    }), {
      widthCm: 6.3,
      lengthCm: 2.94,
      heightCm: 6
    });
  } finally {
    if (previousPadding === undefined) {
      delete process.env.SHIPPING_PRODUCT_PADDING_CM;
    } else {
      process.env.SHIPPING_PRODUCT_PADDING_CM = previousPadding;
    }
  }
});
