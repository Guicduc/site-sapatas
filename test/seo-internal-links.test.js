import assert from "node:assert/strict";
import test from "node:test";

import robots from "../app/robots.js";
import sitemap from "../app/sitemap.js";
import { buildBreadcrumbJsonLd, buildCatalogTrail } from "../lib/breadcrumbs.js";
import { productCategories } from "../lib/client-configurator-data.js";
import { families, getFamilyBySlug, getRelatedFamilies, siteUrl } from "../lib/site-data.js";

test("sitemap inclui todas as familias ativas com imagens absolutas", () => {
  const entries = sitemap();
  const urls = new Set(entries.map((entry) => entry.url));

  for (const slug of ["sapata-esferica", "sapata-u"]) {
    assert.ok(getFamilyBySlug(slug), `familia ${slug} deve estar ativa`);
  }

  for (const family of families) {
    const entry = entries.find((item) => item.url === `${siteUrl}${family.url}`);
    assert.ok(entry, `sitemap sem ${family.url}`);
    assert.ok(entry.images.length > 0, `sitemap sem imagens para ${family.url}`);
    for (const image of entry.images) {
      assert.ok(image.startsWith(`${siteUrl}/`), `imagem nao absoluta: ${image}`);
    }
    assert.equal(entry.lastModified, undefined);
  }

  for (const category of productCategories) {
    const entry = entries.find((item) => item.url === `${siteUrl}/configurar/${category.slug}`);
    assert.ok(entry, `sitemap sem configurador ${category.slug}`);
    assert.ok(entry.images.length > 0, `configurador ${category.slug} sem imagens`);
  }

  assert.equal(urls.size, entries.length, "sitemap nao deve repetir URLs");
});

test("todo formato ativo do catalogo aponta para uma pagina de familia existente", () => {
  for (const category of productCategories) {
    for (const format of category.formats) {
      assert.ok(format.familySlug, `${category.slug}/${format.slug} sem familySlug`);
      assert.ok(getFamilyBySlug(format.familySlug), `familia ausente: ${format.familySlug}`);
    }
  }
});

test("robots libera paginas transacionais com noindex e bloqueia areas privadas", () => {
  const { disallow } = robots().rules[0];

  for (const path of ["/carrinho", "/conta", "/pedido-confirmado"]) {
    assert.ok(!disallow.includes(path), `${path} nao deve ficar bloqueado`);
  }

  for (const path of ["/admin", "/api", "/demonstracao"]) {
    assert.ok(disallow.includes(path), `${path} deve continuar bloqueado`);
  }
});

test("familias relacionadas sao no maximo 3 e priorizam a mesma categoria", () => {
  for (const family of families) {
    const related = getRelatedFamilies(family.slug);
    assert.ok(related.length <= 3);
    assert.ok(!related.some((item) => item.slug === family.slug));

    const sameCategoryCount = families.filter((item) => {
      return item.slug !== family.slug && item.categorySlug && item.categorySlug === family.categorySlug;
    }).length;
    const expectedLeading = Math.min(sameCategoryCount, 3);
    for (const item of related.slice(0, expectedLeading)) {
      assert.equal(item.categorySlug, family.categorySlug);
    }
  }
});

test("breadcrumb JSON-LD usa URLs absolutas e posicoes em ordem", () => {
  const data = buildBreadcrumbJsonLd(buildCatalogTrail("Sapata U", "/familias/sapata-u"));

  assert.equal(data["@type"], "BreadcrumbList");
  assert.deepEqual(
    data.itemListElement.map((item) => [item.position, item.name, item.item]),
    [
      [1, "Início", `${siteUrl}/`],
      [2, "Catálogo", `${siteUrl}/catalogo`],
      [3, "Sapata U", `${siteUrl}/familias/sapata-u`]
    ]
  );
});
