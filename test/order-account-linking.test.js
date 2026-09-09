import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createOrder,
  getOrCreateCustomerAccount,
  getOrderById,
  getOrderForAccountId,
  listOrdersByAccountId
} from "../lib/order-store.js";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalStorePath = process.env.ORDER_STORE_LOCAL_PATH;
const localDirectory = await mkdtemp(path.join(os.tmpdir(), "baseforma-order-account-"));
process.env.DATABASE_URL = "";
process.env.ORDER_STORE_LOCAL_PATH = path.join(localDirectory, "orders.json");

test.after(async () => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalStorePath === undefined) delete process.env.ORDER_STORE_LOCAL_PATH;
  else process.env.ORDER_STORE_LOCAL_PATH = originalStorePath;
  await rm(localDirectory, { recursive: true, force: true });
});

test("links a new order when the verified account email matches", async () => {
  const account = await getOrCreateCustomerAccount("buyer@example.com");
  const draft = buildDraft("matching", "buyer@example.com");

  const order = await createOrder(draft, {
    verifiedAccount: { accountId: account.id, email: "  BUYER@example.com " }
  });

  assert.ok(order.metadata.account.emailVerifiedAt);
  assert.deepEqual((await listOrdersByAccountId(account.id)).map((item) => item.id), [draft.id]);
  assert.equal((await getOrderForAccountId(draft.id, account.id)).id, draft.id);
});

test("does not link when the verified account email differs from the order", async () => {
  const account = await getOrCreateCustomerAccount("owner@example.com");
  const draft = buildDraft("different-email", "buyer@example.com");

  await createOrder(draft, {
    verifiedAccount: { accountId: account.id, email: account.email }
  });

  assert.equal((await getOrderById(draft.id)).metadata.account?.emailVerifiedAt, undefined);
  assert.deepEqual(await listOrdersByAccountId(account.id), []);
});

test("does not link an anonymous order", async () => {
  const account = await getOrCreateCustomerAccount("anonymous-buyer@example.com");
  const draft = buildDraft("anonymous", account.email);

  await createOrder(draft);

  assert.equal((await getOrderById(draft.id)).metadata.account?.emailVerifiedAt, undefined);
  assert.deepEqual(await listOrdersByAccountId(account.id), []);
});

test("does not trust an email paired with another account id", async () => {
  const account = await getOrCreateCustomerAccount("real-owner@example.com");
  const draft = buildDraft("forged-account", "buyer@example.com");

  await createOrder(draft, {
    verifiedAccount: { accountId: account.id, email: draft.customer.email }
  });

  assert.equal((await getOrderById(draft.id)).metadata.account?.emailVerifiedAt, undefined);
  assert.deepEqual(await listOrdersByAccountId(account.id), []);
});

function buildDraft(suffix, email) {
  const now = new Date().toISOString();
  return {
    id: `order-${suffix}`,
    orderNumber: `BF-${suffix}`,
    source: "configurator",
    status: "pending_payment",
    paymentStatus: "pending",
    totalBrl: 42,
    leadTimeDays: 5,
    notes: "",
    customer: {
      id: `customer-${suffix}`,
      name: "Cliente Teste",
      contact: email,
      email,
      document: "52998224725"
    },
    items: [{
      id: `item-${suffix}`,
      categorySlug: "sapata-lisa",
      categoryName: "Sapata lisa",
      formatSlug: "redonda",
      formatName: "Redonda",
      sku: `SKU-${suffix}`,
      values: { diametro: 30 },
      color: "Preto",
      finish: "",
      quantity: 2,
      unitPriceBrl: 21,
      totalPriceBrl: 42,
      leadTimeDays: 5,
      status: "valid",
      validationIssues: [],
      priceBreakdown: { printMinutes: 10 }
    }],
    metadata: { commerce: { source: "test" } },
    createdAt: now,
    updatedAt: now
  };
}
