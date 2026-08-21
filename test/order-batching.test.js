import assert from "node:assert/strict";
import test from "node:test";

import { hydratePostgresOrders } from "../lib/order-store.js";

test("hidrata qualquer quantidade de pedidos com tres consultas relacionadas", async () => {
  const calls = [];
  const rows = [orderRow("order-b", "BF-2"), orderRow("order-a", "BF-1")];
  const results = [
    { rows: [itemRow("item-b", "order-b"), itemRow("item-a", "order-a")] },
    { rows: [paymentRow("payment-b", "order-b"), paymentRow("payment-a", "order-a")] },
    { rows: [reviewRow("review-a", "order-a")] }
  ];
  const fakeQuery = async (sql, params) => {
    calls.push({ sql, params });
    return results[calls.length - 1];
  };

  const orders = await hydratePostgresOrders(rows, fakeQuery);

  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map((call) => call.params), [
    [["order-b", "order-a"]],
    [["order-b", "order-a"]],
    [["order-b", "order-a"]]
  ]);
  assert.match(calls[0].sql, /order_id = any\(\$1::text\[\]\)/);
  assert.deepEqual(orders.map((order) => order.id), ["order-b", "order-a"]);
  assert.deepEqual(orders[0].items.map((item) => item.id), ["item-b"]);
  assert.deepEqual(orders[0].payments.map((payment) => payment.id), ["payment-b"]);
  assert.deepEqual(orders[0].technicalReviews, []);
  assert.deepEqual(orders[1].technicalReviews.map((review) => review.id), ["review-a"]);
  assert.equal(orders[0].totalBrl, 42);
  assert.equal(orders[0].customer.document, "52998224725");
});

test("nao consulta relacoes quando a lista de pedidos esta vazia", async () => {
  let calls = 0;
  const orders = await hydratePostgresOrders([], async () => {
    calls += 1;
    return { rows: [] };
  });
  assert.deepEqual(orders, []);
  assert.equal(calls, 0);
});

function orderRow(id, orderNumber) {
  return {
    id,
    order_number: orderNumber,
    customer_id: `customer-${id}`,
    customer_name: "Cliente",
    customer_contact: "11999999999",
    customer_email: "cliente@example.com",
    customer_document: "52998224725",
    source: "configurator",
    status: "paid_ready_for_production",
    payment_status: "approved",
    total_brl: "42.00",
    lead_time_days: 5,
    notes: null,
    metadata: {},
    created_at: "2026-08-21T00:00:00.000Z",
    updated_at: "2026-08-21T00:00:00.000Z"
  };
}

function itemRow(id, orderId) {
  return {
    id,
    order_id: orderId,
    quantity: 2,
    unit_price_brl: "21.00",
    total_price_brl: "42.00",
    lead_time_days: 5,
    status: "valid"
  };
}

function paymentRow(id, orderId) {
  return {
    id,
    order_id: orderId,
    provider: "mercado_pago",
    status: "approved",
    amount_brl: "42.00",
    raw: {},
    created_at: "2026-08-21T00:00:00.000Z",
    updated_at: "2026-08-21T00:00:00.000Z"
  };
}

function reviewRow(id, orderId) {
  return {
    id,
    order_id: orderId,
    status: "open",
    payload: {},
    created_at: "2026-08-21T00:00:00.000Z",
    updated_at: "2026-08-21T00:00:00.000Z"
  };
}
