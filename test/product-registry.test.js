import assert from "node:assert/strict";
import test from "node:test";

import { legacyRuntimeProductCategories as legacyCategories } from "../lib/configurator-data.js";
import {
  buildRegistryProductCategories,
  getProductManifestByRoute,
  productManifests,
  resolveManifestVariant
} from "../lib/product-registry.js";

const registryCategories = buildRegistryProductCategories();

test("registry preserves the public category and format order", () => {
  assert.deepEqual(
    registryCategories.map((category) => [category.slug, category.formats.map((format) => format.slug)]),
    legacyCategories.map((category) => [category.slug, category.formats.map((format) => format.slug)])
  );
});

test("registry format contracts match the current public catalog", () => {
  for (const product of productManifests) {
    const category = registryCategories.find((item) => item.slug === product.category.slug);
    const registry = category?.formats.find((item) => item.slug === product.category.formatSlug);
    const legacyCategory = legacyCategories.find((item) => item.slug === product.category.slug);
    const legacy = legacyCategory?.formats.find((item) => item.slug === product.category.formatSlug);

    assert.ok(registry, `${product.productId}: registry format missing`);
    assert.ok(legacy, `${product.productId}: legacy format missing`);
    assert.deepEqual(
      pickFormatContract(registry),
      pickFormatContract(legacy),
      `${product.productId}: registry differs from runtime catalog`
    );
  }
});

test("route lookup and variant conditions are deterministic", () => {
  const product = getProductManifestByRoute("sapata-base-lisa", "redonda");

  assert.equal(product?.productId, "sapata-lisa-redonda");
  assert.equal(resolveManifestVariant(product, { pescoco: false })?.id, "sem-haste");
  assert.equal(resolveManifestVariant(product, { pescoco: true })?.id, "haste");
});

function pickFormatContract(format) {
  return {
    slug: format.slug,
    name: format.name,
    skuPrefix: format.skuPrefix,
    description: format.description,
    fixation: format.fixation,
    applications: format.applications,
    status: format.status,
    drawingType: format.drawingType,
    leadTimeBaseDays: format.leadTimeBaseDays,
    manufacturing: format.manufacturing,
    parameters: format.parameters.map((parameter) => ({
      key: parameter.key,
      label: parameter.label,
      min: parameter.min,
      max: parameter.max,
      defaultValue: parameter.defaultValue,
      unit: parameter.unit,
      step: parameter.step,
      required: parameter.required,
      type: parameter.type,
      dependsOn: parameter.dependsOn
    })),
    notes: format.notes
  };
}
