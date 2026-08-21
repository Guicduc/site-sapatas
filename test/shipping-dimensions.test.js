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

test("usa o hemisfério e o encaixe da sapata esférica no frete", () => {
  const previousPadding = process.env.SHIPPING_PRODUCT_PADDING_CM;
  process.env.SHIPPING_PRODUCT_PADDING_CM = "0";

  try {
    assert.deepEqual(shippingDimensionsForItem({
      categorySlug: "sapata-esferica",
      formatSlug: "esferica",
      values: {
        diametroBase: 30,
        paredeTubo: 2,
        alturaPescoco: 17
      }
    }), {
      widthCm: 3,
      lengthCm: 3,
      heightCm: 3.2
    });
  } finally {
    if (previousPadding === undefined) {
      delete process.env.SHIPPING_PRODUCT_PADDING_CM;
    } else {
      process.env.SHIPPING_PRODUCT_PADDING_CM = previousPadding;
    }
  }
});
