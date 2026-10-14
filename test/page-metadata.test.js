import assert from "node:assert/strict";
import test from "node:test";

import { buildPageMetadata, withBrandSuffix } from "../lib/page-metadata.js";
import { families } from "../lib/site-data.js";

test("buildPageMetadata declara canonical, og:url e titulos proprios da pagina", () => {
  const metadata = buildPageMetadata({
    title: "Catálogo configurável",
    description: "Descrição do catálogo.",
    path: "/catalogo"
  });

  assert.deepEqual(metadata.title, { absolute: "Catálogo configurável | Baseforma" });
  assert.equal(metadata.alternates.canonical, "/catalogo");
  assert.equal(metadata.openGraph.url, "/catalogo");
  assert.equal(metadata.openGraph.title, "Catálogo configurável | Baseforma");
  assert.equal(metadata.openGraph.description, "Descrição do catálogo.");
  assert.equal(metadata.openGraph.siteName, "Baseforma");
  assert.equal(metadata.openGraph.locale, "pt_BR");
  assert.ok(metadata.openGraph.images.length > 0);
  assert.equal(metadata.twitter.title, "Catálogo configurável | Baseforma");
});

test("withBrandSuffix nao duplica a marca", () => {
  assert.equal(withBrandSuffix("Sapata | Baseforma"), "Sapata | Baseforma");
  assert.equal(withBrandSuffix("Sapata"), "Sapata | Baseforma");
});

test("seoTitle das familias nao carrega a marca, que vem do template do layout", () => {
  for (const family of families) {
    assert.ok(!family.seoTitle.includes("Baseforma"), family.seoTitle);
  }
});
