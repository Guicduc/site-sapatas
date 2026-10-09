import assert from "node:assert/strict";
import test from "node:test";

import { getInvoiceConfig, INVOICE_PROVIDERS } from "../lib/invoice-config.js";

function withEnv(values, callback) {
  const previous = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  try {
    return callback();
  } finally {
    for (const key of Object.keys(values)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("pausa a emissao automatica da Focus NFe sem INVOICE_AUTOMATION_ENABLED", () => {
  const config = withEnv(
    { INVOICE_PROVIDER: "focus_nfe", INVOICE_AUTOMATION_ENABLED: undefined },
    getInvoiceConfig
  );

  assert.equal(config.provider, INVOICE_PROVIDERS.MANUAL);
  assert.equal(config.configuredProvider, INVOICE_PROVIDERS.FOCUS_NFE);
  assert.equal(config.automationPaused, true);
});

test("mantem a Focus NFe ativa quando a automacao e religada", () => {
  const config = withEnv(
    { INVOICE_PROVIDER: "focus_nfe", INVOICE_AUTOMATION_ENABLED: "true", FOCUS_NFE_ENV: "homologacao" },
    getInvoiceConfig
  );

  assert.equal(config.provider, INVOICE_PROVIDERS.FOCUS_NFE);
  assert.equal(config.automationPaused, false);
  assert.equal(config.environment, "homologacao");
});

test("provider manual nao e marcado como pausado", () => {
  const config = withEnv(
    { INVOICE_PROVIDER: "manual", INVOICE_AUTOMATION_ENABLED: undefined },
    getInvoiceConfig
  );

  assert.equal(config.provider, INVOICE_PROVIDERS.MANUAL);
  assert.equal(config.automationPaused, false);
});
