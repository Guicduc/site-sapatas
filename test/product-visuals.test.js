import assert from "node:assert/strict";
import test from "node:test";

import {
  getCategoryCardGallery,
  getConfiguratorVisuals,
  getFamilyGallery
} from "../lib/product-visuals.js";

test("configurator selects variant visuals without product-specific conditionals", () => {
  const withoutStem = getConfiguratorVisuals("sapata-base-lisa", "redonda", { pescoco: false });
  const withStem = getConfiguratorVisuals("sapata-base-lisa", "redonda", { pescoco: true });

  assert.equal(withoutStem[0].src, "/products/final/sapata-lisa-redonda-sem-haste.png");
  assert.equal(withStem[0].src, "/products/final/sapata-lisa-redonda-com-haste.png");
  assert.equal(withoutStem.some((image) => image.type === "manual"), false);
  assert.equal(withStem.some((image) => image.type === "manual"), true);
  assert.equal(withStem.some((image) => image.type === "usage"), true);
});

test("family and category galleries are derived from manifest roles", () => {
  const family = getFamilyGallery("sapata-u");
  const category = getCategoryCardGallery("ponteira-interna-tubo");

  assert.equal(family[0].type, "family");
  assert.equal(family.filter((image) => image.type === "product").length, 2);
  assert.equal(category[0].src, "/products/final/sapata-tubo-quadrado-family.png");
  assert.equal(new Set(category.map((image) => image.src)).size, category.length);
});
