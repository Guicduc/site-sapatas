import assert from "node:assert/strict";
import test from "node:test";

import {
  INCH_FRACTION_DENOMINATOR,
  INCH_FRACTION_STEP,
  MEASUREMENT_SYSTEMS,
  formatMeasurement,
  formatMeasurementValue,
  getCanonicalMeasurementRange,
  getDisplayRange,
  measurementSystemReducer,
  normalizeMeasurementInput,
  parseMeasurementInput,
  snapMeasurementValue,
  stepMeasurementValue,
  toDisplayMeasurement
} from "../lib/measurement-units.js";
import { buildConfiguratorOrderPayload } from "../lib/order-payload.js";

const parameter = {
  min: 3,
  max: 150,
  step: 0.1,
  unit: "mm"
};

test("exibe polegadas como fracoes reduzidas em passos de dezesseis avos", () => {
  assert.equal(INCH_FRACTION_DENOMINATOR, 16);
  assert.equal(INCH_FRACTION_STEP, 0.0625);
  assert.equal(toDisplayMeasurement("", "mm", MEASUREMENT_SYSTEMS.IMPERIAL), null);
  assert.equal(toDisplayMeasurement(25.4, "mm", MEASUREMENT_SYSTEMS.IMPERIAL), 1);
  assert.equal(formatMeasurementValue(6.35, "mm", MEASUREMENT_SYSTEMS.IMPERIAL), "1/4");
  assert.equal(formatMeasurementValue(9.525, "mm", MEASUREMENT_SYSTEMS.IMPERIAL), "3/8");
  assert.equal(formatMeasurementValue(11.1125, "mm", MEASUREMENT_SYSTEMS.IMPERIAL), "7/16");
  assert.equal(formatMeasurementValue(31.75, "mm", MEASUREMENT_SYSTEMS.IMPERIAL), "1 1/4");
  assert.equal(formatMeasurement(31.75, "mm", MEASUREMENT_SYSTEMS.IMPERIAL), "1 1/4 pol");
});

test("aceita fracoes e equivalentes decimais alinhados ao passo imperial", () => {
  assert.equal(normalizeMeasurementInput("1.25", parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "31.75");
  assert.equal(normalizeMeasurementInput("1,25", parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "31.75");
  assert.equal(normalizeMeasurementInput("1 1/4", parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "31.75");
  assert.equal(normalizeMeasurementInput("7/16", parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "11.1125");
});

test("usa somente fracoes de 1/16 contidas nos limites fabricaveis", () => {
  const range = getDisplayRange(parameter, MEASUREMENT_SYSTEMS.IMPERIAL);

  assert.deepEqual(range, { min: "1/8", max: "5 7/8", step: 0.0625, unit: "pol" });
  assert.deepEqual(
    getCanonicalMeasurementRange(parameter, MEASUREMENT_SYSTEMS.IMPERIAL),
    { min: 3.175, max: 149.225 }
  );
  assert.equal(normalizeMeasurementInput(range.min, parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "3.175");
  assert.equal(normalizeMeasurementInput(range.max, parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "149.225");
  assert.equal(normalizeMeasurementInput("1/16", parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "");
  assert.equal(normalizeMeasurementInput("5 15/16", parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "");
  assert.match(
    parseMeasurementInput("5 15/16", parameter, MEASUREMENT_SYSTEMS.IMPERIAL).error,
    /entre 1\/8 e 5 7\/8 pol/
  );
});

test("rejeita fracoes fora do passo comercial sem arredondar silenciosamente", () => {
  assert.equal(normalizeMeasurementInput("30,37", parameter, MEASUREMENT_SYSTEMS.METRIC), "30.37");
  assert.equal(normalizeMeasurementInput("1/2", parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "12.7");
  assert.equal(normalizeMeasurementInput("1/3", parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "");
  assert.equal(normalizeMeasurementInput("1.3", parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "");
  assert.match(
    parseMeasurementInput("1/0", parameter, MEASUREMENT_SYSTEMS.IMPERIAL).error,
    /fração em passos de 1\/16/
  );
  assert.match(
    parseMeasurementInput("1/3", parameter, MEASUREMENT_SYSTEMS.IMPERIAL).error,
    /passos de 1\/16 pol/
  );
});

test("slider imperial encaixa e avanca no proximo dezesseis avos", () => {
  assert.equal(snapMeasurementValue(28, parameter, MEASUREMENT_SYSTEMS.IMPERIAL), "28.575");
  assert.equal(stepMeasurementValue(28, parameter, MEASUREMENT_SYSTEMS.IMPERIAL, 1), "28.575");
  assert.equal(stepMeasurementValue(28, parameter, MEASUREMENT_SYSTEMS.IMPERIAL, -1), "26.9875");
  assert.equal(stepMeasurementValue(28.575, parameter, MEASUREMENT_SYSTEMS.IMPERIAL, 1), "30.1625");
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
