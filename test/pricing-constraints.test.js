import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePriceBreakdown,
  getCategoryBySlug,
  getFormat,
  getInitialValues,
  validateConfiguration
} from "../lib/configurator-data.js";

function tubeFormat(slug) {
  return getFormat(getCategoryBySlug("ponteira-interna-tubo"), slug);
}

test("configuracoes padrao dos tubos continuam fabricaveis e precificadas", () => {
  for (const slug of ["redondo", "quadrado", "oblongo"]) {
    const format = tubeFormat(slug);
    const values = getInitialValues(format);
    assert.deepEqual(validateConfiguration(format, values), []);
    assert.equal(calculatePriceBreakdown(format, values).pricingAvailable, true);
  }
});

test("parede que consome o vao interno bloqueia preco e carrinho", () => {
  const format = tubeFormat("quadrado");
  const values = {
    ...getInitialValues(format),
    tamanhoBaseX: 8,
    tamanhoBaseY: 29,
    paredeTubo: 5.2
  };
  const issues = validateConfiguration(format, values);
  const breakdown = calculatePriceBreakdown(format, values);

  assert.match(issues.join(" "), /menos de 5 mm/);
  assert.equal(breakdown.pricingAvailable, false);
  assert.equal(breakdown.pricingMode, "invalid_configuration");
  assert.equal(breakdown.unitPriceBrl, 0);
  assert.equal(breakdown.totalPriceBrl, 0);
});

test("limite exato de 5 mm continua vendavel e campo vazio nao duplica erro", () => {
  const format = tubeFormat("quadrado");
  const boundaryValues = {
    ...getInitialValues(format),
    tamanhoBaseX: 8,
    paredeTubo: 1.5
  };
  const emptyValues = { ...boundaryValues, tamanhoBaseX: "" };

  assert.deepEqual(validateConfiguration(format, boundaryValues), []);
  assert.equal(calculatePriceBreakdown(format, boundaryValues).pricingAvailable, true);
  assert.equal(validateConfiguration(format, emptyValues).length, 1);
  assert.match(validateConfiguration(format, emptyValues)[0], /precisa ser informado/);
});

test("tubo redondo calcula o vão pela medida externa, sem somar a flange", () => {
  const format = tubeFormat("redondo");
  const minimumValues = {
    ...getInitialValues(format),
    diametroBase: 7,
    paredeTubo: 0.8
  };
  const invalidValues = {
    ...getInitialValues(format),
    diametroBase: 6,
    paredeTubo: 0.8
  };

  assert.deepEqual(validateConfiguration(format, minimumValues), []);
  assert.match(validateConfiguration(format, invalidValues).join(" "), /menos de 5 mm/);
});

test("modelo monotono nao volta ao custo IDW quando a previsao parte de zero", () => {
  const category = getCategoryBySlug("sapata-base-lisa");
  const format = getFormat(category, "redonda");
  const defaults = { ...getInitialValues(format), pescoco: false };
  const diameterPrices = [3, 4, 5, 6].map((diametro) => {
    return calculatePriceBreakdown(format, { ...defaults, alturaBase: 10, diametro }).unitPriceBrl;
  });
  const heightPrices = [4, 5, 6, 7, 8, 9].map((alturaBase) => {
    return calculatePriceBreakdown(format, { ...defaults, diametro: 3, alturaBase }).unitPriceBrl;
  });

  assert.deepEqual(diameterPrices, [...diameterPrices].sort((left, right) => left - right));
  assert.deepEqual(heightPrices, [...heightPrices].sort((left, right) => left - right));
});
