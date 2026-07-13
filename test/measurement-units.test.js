import assert from "node:assert/strict";
import test from "node:test";

import {
  INCH_DECIMAL_PLACES,
  MEASUREMENT_SYSTEMS,
  formatMeasurement,
  formatMeasurementValue,
  getDisplayRange,
  measurementSystemReducer,
  normalizeMeasurementInput,
  toDisplayMeasurement
} from "../lib/measurement-units.js";
import { buildConfiguratorOrderPayload } from "../lib/order-payload.js";

const parameter = {
  min: 3,
  max: 150,
  step: 0.1,
  unit: "mm"
};

test("converte milimetros para polegadas com precisao explicita", () => {
  assert.equal(INCH_DECIMAL_PLACES, 3);
  assert.equal(toDisplayMeasurement(25.4, "mm", MEASUREMENT_SYSTEMS.IMPERIAL), 1);
  assert.equal(formatMeasurementValue(31.75, "mm", MEASUREMENT_SYSTEMS.IMPERIAL), "1.25");
  assert.equal(formatMeasurement(31.75, "mm", MEASUREMENT_SYSTEMS.IMPERIAL), "1.25 pol");
  assert.equal(normalizeMeasurementInput("1.25", parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "31.8");
});

test("limita entradas em polegadas aos ranges e ao passo canonicos", () => {
  const range = getDisplayRange(parameter, MEASUREMENT_SYSTEMS.IMPERIAL);

  assert.deepEqual(range, { min: "0.118", max: "5.906", step: 0.001, unit: "pol" });
  assert.equal(normalizeMeasurementInput("0", parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "3.0");
  assert.equal(normalizeMeasurementInput("999", parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "150.0");
  assert.equal(normalizeMeasurementInput("not-a-number", parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "");
});

test("alternancia repetida muda somente a apresentacao", () => {
  const canonicalValues = Object.freeze({ diametro: 31.8, alturaBase: 6 });
  let system = MEASUREMENT_SYSTEMS.METRIC;

  for (let index = 0; index < 100; index += 1) {
    system = measurementSystemReducer(
      system,
      system === MEASUREMENT_SYSTEMS.METRIC
        ? MEASUREMENT_SYSTEMS.IMPERIAL
        : MEASUREMENT_SYSTEMS.METRIC
    );
    formatMeasurementValue(canonicalValues.diametro, "mm", system);
  }

  assert.equal(system, MEASUREMENT_SYSTEMS.METRIC);
  assert.deepEqual(canonicalValues, { diametro: 31.8, alturaBase: 6 });
});

test("payload do pedido conserva medidas canonicas e remove estado de apresentacao", () => {
  const values = { diametro: 31.8, alturaBase: 6, pescoco: false };
  const payload = buildConfiguratorOrderPayload({
    customer: { name: "Cliente" },
    shippingAddress: { state: "SP" },
    couponCode: "",
    items: [{
      categorySlug: "sapata-base-lisa",
      formatSlug: "redonda",
      values,
      measurementSystem: MEASUREMENT_SYSTEMS.IMPERIAL,
      quantity: 1
    }]
  });

  assert.equal(payload.source, "configurator");
  assert.deepEqual(payload.items[0].values, values);
  assert.notEqual(payload.items[0].values, values);
  assert.equal("measurementSystem" in payload.items[0], false);
});
