import test from "node:test";
import assert from "node:assert/strict";

import {
  formatBrTaxDocument,
  getBrTaxDocumentValidationMessage,
  isValidBrTaxDocument,
  normalizeBrTaxDocument
} from "../lib/br-tax-document.js";

test("normalizes CPF and CNPJ masks without losing valid documents", () => {
  assert.equal(normalizeBrTaxDocument(" 529.982.247-25 "), "52998224725");
  assert.equal(normalizeBrTaxDocument("11.222.333/0001-81"), "11222333000181");
  assert.equal(isValidBrTaxDocument("529.982.247-25"), true);
  assert.equal(isValidBrTaxDocument("11.222.333/0001-81"), true);
});

test("accepts valid unformatted CPF and CNPJ values", () => {
  assert.equal(isValidBrTaxDocument("11144477735"), true);
  assert.equal(isValidBrTaxDocument("11222333000181"), true);
});

test("rejects CPF and CNPJ values with invalid check digits", () => {
  assert.equal(isValidBrTaxDocument("52998224724"), false);
  assert.equal(isValidBrTaxDocument("11222333000182"), false);
});

test("rejects repeated sequences", () => {
  assert.equal(isValidBrTaxDocument("00000000000"), false);
  assert.equal(isValidBrTaxDocument("11111111111"), false);
  assert.equal(isValidBrTaxDocument("00000000000000"), false);
  assert.equal(isValidBrTaxDocument("99999999999999"), false);
});

test("rejects documents with the wrong length", () => {
  assert.equal(isValidBrTaxDocument("5299822472"), false);
  assert.equal(isValidBrTaxDocument("529982247250"), false);
  assert.equal(isValidBrTaxDocument("1122233300018"), false);
  assert.equal(isValidBrTaxDocument("112223330001810"), false);
  assert.equal(formatBrTaxDocument("112223330001810"), "112223330001810");
});

test("formats CPF and CNPJ values for the checkout field", () => {
  assert.equal(formatBrTaxDocument("52998224725"), "529.982.247-25");
  assert.equal(formatBrTaxDocument("11222333000181"), "11.222.333/0001-81");
  assert.equal(formatBrTaxDocument("529.982.247-25"), "529.982.247-25");
});

test("returns clear validation messages", () => {
  assert.equal(
    getBrTaxDocumentValidationMessage("", { required: true }),
    "Informe o CPF ou CNPJ para a emissão da nota fiscal."
  );
  assert.equal(
    getBrTaxDocumentValidationMessage("123"),
    "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos."
  );
  assert.equal(
    getBrTaxDocumentValidationMessage("52998224724"),
    "CPF inválido. Confira os números informados."
  );
  assert.equal(
    getBrTaxDocumentValidationMessage("11222333000182"),
    "CNPJ inválido. Confira os números informados."
  );
  assert.equal(getBrTaxDocumentValidationMessage("529.982.247-25"), "");
});
