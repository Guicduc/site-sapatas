import assert from "node:assert/strict";
import test from "node:test";

import { buildMailtoUrl, buildWhatsAppUrl } from "../lib/format.js";

test("buildMailtoUrl encodes subject and body using RFC 6068-compatible spaces", () => {
  assert.equal(
    buildMailtoUrl(
      "atendimento@baseforma.com.br",
      "Condições de venda",
      "Olá, pedido BF-123"
    ),
    "mailto:atendimento@baseforma.com.br?subject=Condi%C3%A7%C3%B5es%20de%20venda&body=Ol%C3%A1%2C%20pedido%20BF-123"
  );
});

test("buildMailtoUrl omits the query when no message fields are provided", () => {
  assert.equal(
    buildMailtoUrl("atendimento@baseforma.com.br"),
    "mailto:atendimento@baseforma.com.br"
  );
});

test("buildWhatsAppUrl remains available to older callers", () => {
  assert.equal(
    buildWhatsAppUrl("5511999990000", "Olá, Baseforma"),
    "https://wa.me/5511999990000?text=Ol%C3%A1%2C%20Baseforma"
  );
});
