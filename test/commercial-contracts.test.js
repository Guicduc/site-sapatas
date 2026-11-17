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

test("Mercado Pago parser preserves boleto fields without exposing payer details", () => {
  const parsed = parseMercadoPagoPaymentPayload({
    id: 123,
    payment_type_id: "ticket",
    date_of_expiration: "2026-11-20T23:59:59-03:00",
    transaction_details: { external_resource_url: "https://www.mercadopago.com.br/payments/123/ticket", ignored: true },
    payer: { identification: { number: "private-document" } }
  });
  assert.deepEqual(parsed, {
    id: 123,
    payment_type_id: "ticket",
    date_of_expiration: "2026-11-20T23:59:59-03:00",
    transaction_details: { external_resource_url: "https://www.mercadopago.com.br/payments/123/ticket" }
  });
  assert.deepEqual(parseMercadoPagoPaymentPayload({
    id: 123, payment_type_id: [], date_of_expiration: 1, transaction_details: { external_resource_url: {} }
  }), { id: 123 });
});
