import assert from "node:assert/strict";
import test from "node:test";

import {
  BRAZILIAN_STATES,
  getPostalCodeStateValidationMessage,
  getStateFromPostalCode,
  isBrazilianState
} from "../lib/postal-code-region.js";

test("lista as 27 UFs brasileiras", () => {
  assert.equal(BRAZILIAN_STATES.length, 27);
  assert.equal(new Set(BRAZILIAN_STATES).size, 27);
  assert.equal(isBrazilianState("sp"), true);
  assert.equal(isBrazilianState(" df "), true);
  assert.equal(isBrazilianState("XX"), false);
  assert.equal(isBrazilianState(""), false);
});

test("mapeia os limites de cada faixa de CEP para a UF", () => {
  const edges = [
    ["01000000", "SP"], ["19999999", "SP"],
    ["20000000", "RJ"], ["28999999", "RJ"],
    ["29000000", "ES"], ["29999999", "ES"],
    ["30000000", "MG"], ["39999999", "MG"],
    ["40000000", "BA"], ["48999999", "BA"],
    ["49000000", "SE"], ["49999999", "SE"],
    ["50000000", "PE"], ["56999999", "PE"],
    ["57000000", "AL"], ["57999999", "AL"],
    ["58000000", "PB"], ["58999999", "PB"],
    ["59000000", "RN"], ["59999999", "RN"],
    ["60000000", "CE"], ["63999999", "CE"],
    ["64000000", "PI"], ["64999999", "PI"],
    ["65000000", "MA"], ["65999999", "MA"],
    ["66000000", "PA"], ["68899999", "PA"],
    ["68900000", "AP"], ["68999999", "AP"],
    ["69000000", "AM"], ["69299999", "AM"],
    ["69300000", "RR"], ["69399999", "RR"],
    ["69400000", "AM"], ["69899999", "AM"],
    ["69900000", "AC"], ["69999999", "AC"],
    ["70000000", "DF"], ["72799999", "DF"],
    ["72800000", "GO"], ["72999999", "GO"],
    ["73000000", "DF"], ["73699999", "DF"],
    ["73700000", "GO"], ["76799999", "GO"],
    ["76800000", "RO"], ["76999999", "RO"],
    ["77000000", "TO"], ["77999999", "TO"],
    ["78000000", "MT"], ["78899999", "MT"],
    ["78900000", "RO"], ["78999999", "RO"],
    ["79000000", "MS"], ["79999999", "MS"],
    ["80000000", "PR"], ["87999999", "PR"],
    ["88000000", "SC"], ["89999999", "SC"],
    ["90000000", "RS"], ["99999999", "RS"]
  ];

  for (const [postalCode, state] of edges) {
    assert.equal(getStateFromPostalCode(postalCode), state, postalCode);
  }
});

test("aceita CEP formatado e rejeita CEP incompleto ou fora das faixas", () => {
  assert.equal(getStateFromPostalCode("01001-000"), "SP");
  assert.equal(getStateFromPostalCode("0100100"), "");
  assert.equal(getStateFromPostalCode("00999999"), "");
  assert.equal(getStateFromPostalCode("00000000"), "");
  assert.equal(getStateFromPostalCode(""), "");
});

test("valida o par CEP/UF", () => {
  assert.equal(getPostalCodeStateValidationMessage({ postalCode: "01001-000", state: "SP" }), "");
  assert.equal(getPostalCodeStateValidationMessage({ postalCode: "70040010", state: "df" }), "");
  assert.match(
    getPostalCodeStateValidationMessage({ postalCode: "01001-000", state: "RJ" }),
    /pertence a SP.*informada é RJ/
  );
  assert.match(getPostalCodeStateValidationMessage({ postalCode: "01001000", state: "XX" }), /UF de entrega válida/);
  assert.match(getPostalCodeStateValidationMessage({ postalCode: "00500000", state: "SP" }), /CEP de entrega válido/);
  // UF ausente ou CEP incompleto ficam para a validacao de obrigatoriedade.
  assert.equal(getPostalCodeStateValidationMessage({ postalCode: "01001000", state: "" }), "");
  assert.equal(getPostalCodeStateValidationMessage({ postalCode: "0100", state: "SP" }), "");
});
