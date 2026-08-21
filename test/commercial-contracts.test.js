import assert from "node:assert/strict";
import test from "node:test";

import {
  parseMercadoPagoPaymentPayload,
  parseMercadoPagoWebhookPayload
} from "../lib/commercial-contracts.js";

test("Mercado Pago webhook parser narrows untrusted fields", () => {
  assert.deepEqual(parseMercadoPagoWebhookPayload({
    type: "payment",
    amountBrl: "10.00",
    data: { id: 123, ignored: true },
    ignored: true
  }), {
    type: "payment",
    data: { id: 123 }
  });
  assert.deepEqual(parseMercadoPagoWebhookPayload(null), {});
});

test("Mercado Pago payment parser requires the provider payment id", () => {
  assert.deepEqual(parseMercadoPagoPaymentPayload({
    id: 123,
    status: "approved",
    metadata: { order_id: "order-1", ignored: true },
    transaction_amount: 42.5
  }), {
    id: 123,
    status: "approved",
    transaction_amount: 42.5,
    metadata: { order_id: "order-1" }
  });
  assert.throws(
    () => parseMercadoPagoPaymentPayload({ status: "approved" }),
    (error) => error.code === "mercado_pago_payment_invalid"
  );
});
