import { promises as fs } from "node:fs";
import path from "node:path";

import { CAD_STATUS, shouldRequireCad } from "@/lib/cad-contract";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/order-status";

let pool = null;
let schemaReady = false;
const localStorePath = path.join(process.cwd(), ".local-data", "orders.dev.json");

export function getStoreMode() {
  return process.env.DATABASE_URL ? "postgres" : "local";
}

export async function createOrder(orderDraft) {
  if (getStoreMode() === "postgres") {
    return createPostgresOrder(orderDraft);
  }

  const store = await readLocalStore();
  store.customers.push(orderDraft.customer);
  store.orders.push(buildStoredOrder(orderDraft));
  store.orderItems.push(...orderDraft.items.map((item) => ({ ...item, orderId: orderDraft.id })));

  if (orderDraft.technicalReview) {
    store.technicalReviews.push(buildStoredTechnicalReview(orderDraft));
  }

  await writeLocalStore(store);
  return getOrderById(orderDraft.id);
}

export async function getOrderById(id) {
  if (!id) {
    return null;
  }

  if (getStoreMode() === "postgres") {
    return getPostgresOrderById(id);
  }

  const store = await readLocalStore();
  return hydrateOrderFromLocal(store, store.orders.find((order) => order.id === id));
}

export async function listOrders({ limit = 50 } = {}) {
  if (getStoreMode() === "postgres") {
    await ensurePostgresSchema();
    const result = await query(
      `select o.*, c.name as customer_name, c.contact as customer_contact, c.email as customer_email
       from orders o
       left join customers c on c.id = o.customer_id
       order by o.created_at desc
       limit $1`,
      [limit]
    );

    const orders = [];
    for (const row of result.rows) {
      orders.push(await hydratePostgresOrder(row));
    }

    return orders;
  }

  const store = await readLocalStore();
  return store.orders
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .map((order) => hydrateOrderFromLocal(store, order));
}

export async function updateOrderCadState(orderId, { cadStatus, cadFileName, cadModelVersion } = {}) {
  const order = await getOrderById(orderId);

  if (!order) {
    return null;
  }

  const now = new Date().toISOString();
  const currentCad = order.metadata?.cad || {};
  const nextCad = {
    ...currentCad,
    status: cadStatus || currentCad.status || CAD_STATUS.PENDING,
    fileName: cadFileName ?? currentCad.fileName ?? "",
    generatedAt: cadFileName ? now : currentCad.generatedAt || null,
    modelVersion: cadModelVersion || currentCad.modelVersion || null
  };
  const nextMetadata = {
    ...(order.metadata || {}),
    cad: nextCad
  };
  const nextStatus = getOrderStatusForCad(order.status, nextCad.status);

  if (getStoreMode() === "postgres") {
    await ensurePostgresSchema();
    await query(
      `update orders set status = $1, metadata = $2::jsonb, updated_at = now() where id = $3`,
      [nextStatus, JSON.stringify(nextMetadata), orderId]
    );
    return getOrderById(orderId);
  }

  const store = await readLocalStore();
  const storedOrder = store.orders.find((item) => item.id === orderId);

  if (!storedOrder) {
    return null;
  }

  storedOrder.status = nextStatus;
  storedOrder.metadata = nextMetadata;
  storedOrder.updatedAt = now;
  await writeLocalStore(store);
  return getOrderById(orderId);
}

export async function updateOrderPricingState(orderId, pricing) {
  const order = await getOrderById(orderId);

  if (!order) {
    return null;
  }

  const now = new Date().toISOString();
  const currentPricing = order.metadata?.pricing || {};
  const nextPricing = {
    ...currentPricing,
    ...pricing,
    previousResults: [
      ...(Array.isArray(currentPricing.previousResults) ? currentPricing.previousResults : []),
      ...(currentPricing.mode ? [withoutPreviousResults(currentPricing)] : [])
    ].slice(-5)
  };
  const nextMetadata = {
    ...(order.metadata || {}),
    pricing: nextPricing
  };

  if (getStoreMode() === "postgres") {
    await ensurePostgresSchema();
    await query(
      `update orders set metadata = $1::jsonb, updated_at = now() where id = $2`,
      [JSON.stringify(nextMetadata), orderId]
    );
    return getOrderById(orderId);
  }

  const store = await readLocalStore();
  const storedOrder = store.orders.find((item) => item.id === orderId);

  if (!storedOrder) {
    return null;
  }

  storedOrder.metadata = nextMetadata;
  storedOrder.updatedAt = now;
  await writeLocalStore(store);
  return getOrderById(orderId);
}

export async function createPayment(payment) {
  if (getStoreMode() === "postgres") {
    await ensurePostgresSchema();
    await query(
      `insert into payments (
        id, order_id, provider, provider_preference_id, provider_payment_id,
        status, checkout_url, amount_brl, raw
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [
        payment.id,
        payment.orderId,
        payment.provider,
        payment.providerPreferenceId,
        payment.providerPaymentId || null,
        payment.status,
        payment.checkoutUrl || null,
        payment.amountBrl,
        JSON.stringify(payment.raw || {})
      ]
    );

    return getLatestPaymentForOrder(payment.orderId);
  }

  const store = await readLocalStore();
  store.payments.push(payment);
  await writeLocalStore(store);
  return payment;
}

export async function getLatestPaymentForOrder(orderId) {
  if (getStoreMode() === "postgres") {
    await ensurePostgresSchema();
    const result = await query(
      `select * from payments where order_id = $1 order by created_at desc limit 1`,
      [orderId]
    );
    return result.rows[0] ? mapPaymentRow(result.rows[0]) : null;
  }

  const store = await readLocalStore();
  return (
    store.payments
      .filter((payment) => payment.orderId === orderId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null
  );
}

export async function recordMercadoPagoUpdate({ orderId, preferenceId, paymentId, status, amountBrl, raw }) {
  if (getStoreMode() === "postgres") {
    await ensurePostgresSchema();
    const existing = await query(
      `select * from payments
       where ($1::text is not null and provider_preference_id = $1)
          or ($2::text is not null and provider_payment_id = $2)
          or ($3::text is not null and order_id = $3)
       order by created_at desc
       limit 1`,
      [preferenceId || null, paymentId || null, orderId || null]
    );

    if (existing.rows[0]) {
      await query(
        `update payments
         set provider_payment_id = coalesce($1, provider_payment_id),
             status = $2,
             amount_brl = coalesce($3, amount_brl),
             raw = $4::jsonb,
             updated_at = now()
         where id = $5`,
        [paymentId || null, status, amountBrl ?? null, JSON.stringify(raw || {}), existing.rows[0].id]
      );
      orderId = orderId || existing.rows[0].order_id;
    } else if (orderId) {
      await createPayment({
        id: crypto.randomUUID(),
        orderId,
        provider: "mercado_pago",
        providerPreferenceId: preferenceId || null,
        providerPaymentId: paymentId || null,
        status,
        checkoutUrl: null,
        amountBrl: amountBrl || 0,
        raw,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (orderId) {
      await updateOrderPaymentState(orderId, status);
    }

    return orderId ? getOrderById(orderId) : null;
  }

  const store = await readLocalStore();
  const payment = store.payments.find((item) => {
    return (
      (preferenceId && item.providerPreferenceId === preferenceId) ||
      (paymentId && item.providerPaymentId === paymentId) ||
      (orderId && item.orderId === orderId)
    );
  });

  if (payment) {
    payment.providerPaymentId = paymentId || payment.providerPaymentId;
    payment.status = status;
    payment.amountBrl = amountBrl ?? payment.amountBrl;
    payment.raw = raw || payment.raw;
    payment.updatedAt = new Date().toISOString();
    orderId = orderId || payment.orderId;
  } else if (orderId) {
    store.payments.push({
      id: crypto.randomUUID(),
      orderId,
      provider: "mercado_pago",
      providerPreferenceId: preferenceId || null,
      providerPaymentId: paymentId || null,
      status,
      checkoutUrl: null,
      amountBrl: amountBrl || 0,
      raw,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  if (orderId) {
    const order = store.orders.find((item) => item.id === orderId);
    if (order) {
      applyPaymentStatusToOrder(order, status);
    }
  }

  await writeLocalStore(store);
  return orderId ? getOrderById(orderId) : null;
}

export async function recordShopifyUpdate({ orderId, draftOrderId, shopifyOrderId, status, amountBrl, raw }) {
  return recordProviderUpdate({
    provider: "shopify",
    orderId,
    preferenceId: draftOrderId || null,
    paymentId: shopifyOrderId || null,
    status,
    amountBrl,
    raw
  });
}

async function recordProviderUpdate({ provider, orderId, preferenceId, paymentId, status, amountBrl, raw }) {
  if (getStoreMode() === "postgres") {
    await ensurePostgresSchema();
    const existing = await query(
      `select * from payments
       where provider = $4
         and (
          ($1::text is not null and provider_preference_id = $1)
          or ($2::text is not null and provider_payment_id = $2)
          or ($3::text is not null and order_id = $3)
         )
       order by created_at desc
       limit 1`,
      [preferenceId || null, paymentId || null, orderId || null, provider]
    );

    if (existing.rows[0]) {
      await query(
        `update payments
         set provider_payment_id = coalesce($1, provider_payment_id),
             status = $2,
             amount_brl = coalesce($3, amount_brl),
             raw = $4::jsonb,
             updated_at = now()
         where id = $5`,
        [paymentId || null, status, amountBrl ?? null, JSON.stringify(raw || {}), existing.rows[0].id]
      );
      orderId = orderId || existing.rows[0].order_id;
    } else if (orderId) {
      await createPayment({
        id: crypto.randomUUID(),
        orderId,
        provider,
        providerPreferenceId: preferenceId || null,
        providerPaymentId: paymentId || null,
        status,
        checkoutUrl: null,
        amountBrl: amountBrl || 0,
        raw,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (orderId) {
      await updateOrderPaymentState(orderId, status);
    }

    return orderId ? getOrderById(orderId) : null;
  }

  const store = await readLocalStore();
  const payment = store.payments.find((item) => {
    return (
      item.provider === provider &&
      ((preferenceId && item.providerPreferenceId === preferenceId) ||
        (paymentId && item.providerPaymentId === paymentId) ||
        (orderId && item.orderId === orderId))
    );
  });

  if (payment) {
    payment.providerPaymentId = paymentId || payment.providerPaymentId;
    payment.status = status;
    payment.amountBrl = amountBrl ?? payment.amountBrl;
    payment.raw = raw || payment.raw;
    payment.updatedAt = new Date().toISOString();
    orderId = orderId || payment.orderId;
  } else if (orderId) {
    store.payments.push({
      id: crypto.randomUUID(),
      orderId,
      provider,
      providerPreferenceId: preferenceId || null,
      providerPaymentId: paymentId || null,
      status,
      checkoutUrl: null,
      amountBrl: amountBrl || 0,
      raw,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  if (orderId) {
    const order = store.orders.find((item) => item.id === orderId);
    if (order) {
      applyPaymentStatusToOrder(order, status);
    }
  }

  await writeLocalStore(store);
  return orderId ? getOrderById(orderId) : null;
}

async function updateOrderPaymentState(orderId, paymentStatus) {
  const order = await getOrderById(orderId);

  if (!order) {
    return;
  }

  const nextStatus = getNextOrderStatus(order, paymentStatus);
  updateCadStatusForPayment(order, paymentStatus);
  await query(
    `update orders set status = $1, payment_status = $2, metadata = $3::jsonb, updated_at = now() where id = $4`,
    [nextStatus, paymentStatus, JSON.stringify(order.metadata || {}), orderId]
  );
}

function applyPaymentStatusToOrder(order, paymentStatus) {
  updateCadStatusForPayment(order, paymentStatus);
  order.paymentStatus = paymentStatus;
  order.status = getNextOrderStatus(order, paymentStatus);
  order.updatedAt = new Date().toISOString();
}

function getNextOrderStatus(order, paymentStatus) {
  if (paymentStatus === PAYMENT_STATUS.APPROVED) {
    if (order.status === ORDER_STATUS.NEEDS_TECHNICAL_REVIEW) {
      return ORDER_STATUS.PAID_PENDING_REVIEW;
    }

    return shouldRequireCad(order)
      ? ORDER_STATUS.CAD_PENDING
      : ORDER_STATUS.PAID_READY_FOR_PRODUCTION;
  }

  if (paymentStatus === PAYMENT_STATUS.REJECTED || paymentStatus === PAYMENT_STATUS.CANCELLED) {
    return ORDER_STATUS.PAYMENT_FAILED;
  }

  if (paymentStatus === PAYMENT_STATUS.EXPIRED) {
    return ORDER_STATUS.PAYMENT_FAILED;
  }

  return ORDER_STATUS.PAYMENT_PENDING;
}

function getOrderStatusForCad(currentStatus, cadStatus) {
  if (cadStatus === CAD_STATUS.GENERATED || cadStatus === CAD_STATUS.READY_FOR_PRINT) {
    return ORDER_STATUS.READY_FOR_PRINT;
  }

  if (cadStatus === CAD_STATUS.PENDING) {
    return ORDER_STATUS.CAD_PENDING;
  }

  return currentStatus;
}

function getNextCadStatus(order, paymentStatus) {
  if (!shouldRequireCad(order)) {
    return order.metadata?.cad?.status || CAD_STATUS.NOT_REQUIRED;
  }

  if (paymentStatus === PAYMENT_STATUS.APPROVED) {
    return order.status === ORDER_STATUS.NEEDS_TECHNICAL_REVIEW
      ? CAD_STATUS.PENDING_PAYMENT
      : CAD_STATUS.PENDING;
  }

  return order.metadata?.cad?.status || CAD_STATUS.PENDING_PAYMENT;
}

function updateCadStatusForPayment(order, paymentStatus) {
  if (!order.metadata?.cad) {
    return;
  }

  order.metadata.cad = {
    ...order.metadata.cad,
    status: getNextCadStatus(order, paymentStatus)
  };
}

async function createPostgresOrder(orderDraft) {
  await ensurePostgresSchema();
  const database = await getPool();
  const client = await database.connect();

  try {
    await client.query("begin");
    await client.query(
      `insert into customers (id, name, contact, email)
       values ($1,$2,$3,$4)`,
      [
        orderDraft.customer.id,
        orderDraft.customer.name,
        orderDraft.customer.contact,
        orderDraft.customer.email || null
      ]
    );
    await client.query(
      `insert into orders (
        id, order_number, customer_id, source, status, payment_status,
        total_brl, lead_time_days, notes, metadata
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
      [
        orderDraft.id,
        orderDraft.orderNumber,
        orderDraft.customer.id,
        orderDraft.source,
        orderDraft.status,
        orderDraft.paymentStatus,
        orderDraft.totalBrl,
        orderDraft.leadTimeDays,
        orderDraft.notes || null,
        JSON.stringify(orderDraft.metadata || { validationErrors: orderDraft.validationErrors || [] })
      ]
    );

    for (const item of orderDraft.items) {
      await client.query(
        `insert into order_items (
          id, order_id, category_slug, category_name, format_slug, format_name,
          sku, values, color, finish, quantity, unit_price_brl, total_price_brl,
          lead_time_days, status, validation_issues, price_breakdown
        ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb)`,
        [
          item.id,
          orderDraft.id,
          item.categorySlug,
          item.categoryName,
          item.formatSlug,
          item.formatName,
          item.sku,
          JSON.stringify(item.values || {}),
          item.color || null,
          item.finish || null,
          item.quantity,
          item.unitPriceBrl,
          item.totalPriceBrl,
          item.leadTimeDays,
          item.status,
          JSON.stringify(item.validationIssues || []),
          JSON.stringify(item.priceBreakdown || {})
        ]
      );
    }

    if (orderDraft.technicalReview) {
      await client.query(
        `insert into technical_reviews (id, order_id, status, notes, payload)
         values ($1,$2,$3,$4,$5::jsonb)`,
        [
          crypto.randomUUID(),
          orderDraft.id,
          orderDraft.technicalReview.status,
          orderDraft.technicalReview.notes,
          JSON.stringify(orderDraft.technicalReview.payload || {})
        ]
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return getOrderById(orderDraft.id);
}

async function getPostgresOrderById(id) {
  await ensurePostgresSchema();
  const result = await query(
    `select o.*, c.name as customer_name, c.contact as customer_contact, c.email as customer_email
     from orders o
     left join customers c on c.id = o.customer_id
     where o.id = $1`,
    [id]
  );

  if (!result.rows[0]) {
    return null;
  }

  return hydratePostgresOrder(result.rows[0]);
}

async function hydratePostgresOrder(row) {
  const [items, payments, reviews] = await Promise.all([
    query(`select * from order_items where order_id = $1 order by created_at asc`, [row.id]),
    query(`select * from payments where order_id = $1 order by created_at desc`, [row.id]),
    query(`select * from technical_reviews where order_id = $1 order by created_at desc`, [row.id])
  ]);

  return {
    id: row.id,
    orderNumber: row.order_number,
    source: row.source,
    status: row.status,
    paymentStatus: row.payment_status,
    totalBrl: Number(row.total_brl || 0),
    leadTimeDays: Number(row.lead_time_days || 0),
    notes: row.notes || "",
    metadata: row.metadata || {},
    customer: {
      id: row.customer_id,
      name: row.customer_name || "",
      contact: row.customer_contact || "",
      email: row.customer_email || ""
    },
    items: items.rows.map(mapOrderItemRow),
    payments: payments.rows.map(mapPaymentRow),
    technicalReviews: reviews.rows.map(mapTechnicalReviewRow),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildStoredOrder(orderDraft) {
  return {
    id: orderDraft.id,
    orderNumber: orderDraft.orderNumber,
    customerId: orderDraft.customer.id,
    source: orderDraft.source,
    status: orderDraft.status,
    paymentStatus: orderDraft.paymentStatus,
    totalBrl: orderDraft.totalBrl,
    leadTimeDays: orderDraft.leadTimeDays,
    notes: orderDraft.notes || "",
    metadata: orderDraft.metadata || { validationErrors: orderDraft.validationErrors || [] },
    createdAt: orderDraft.createdAt,
    updatedAt: orderDraft.updatedAt
  };
}

function buildStoredTechnicalReview(orderDraft) {
  return {
    id: crypto.randomUUID(),
    orderId: orderDraft.id,
    status: orderDraft.technicalReview.status,
    notes: orderDraft.technicalReview.notes,
    payload: orderDraft.technicalReview.payload || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function withoutPreviousResults(pricing) {
  const { previousResults, ...result } = pricing;
  return result;
}

function hydrateOrderFromLocal(store, order) {
  if (!order) {
    return null;
  }

  const customer = store.customers.find((item) => item.id === order.customerId);

  return {
    ...order,
    customer: customer || { name: "", contact: "", email: "" },
    items: store.orderItems.filter((item) => item.orderId === order.id),
    payments: store.payments
      .filter((item) => item.orderId === order.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    technicalReviews: store.technicalReviews
      .filter((item) => item.orderId === order.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  };
}

function mapOrderItemRow(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    formatSlug: row.format_slug,
    formatName: row.format_name,
    sku: row.sku,
    values: row.values || {},
    color: row.color || "",
    finish: row.finish || "",
    quantity: Number(row.quantity || 0),
    unitPriceBrl: Number(row.unit_price_brl || 0),
    totalPriceBrl: Number(row.total_price_brl || 0),
    leadTimeDays: Number(row.lead_time_days || 0),
    status: row.status,
    validationIssues: row.validation_issues || [],
    priceBreakdown: row.price_breakdown || {}
  };
}

function mapPaymentRow(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    provider: row.provider,
    providerPreferenceId: row.provider_preference_id,
    providerPaymentId: row.provider_payment_id,
    status: row.status,
    checkoutUrl: row.checkout_url,
    amountBrl: Number(row.amount_brl || 0),
    raw: row.raw || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTechnicalReviewRow(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    notes: row.notes || "",
    payload: row.payload || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function query(sql, params = []) {
  const database = await getPool();
  return database.query(sql, params);
}

async function getPool() {
  if (!pool) {
    const { Pool } = await import("pg");
    const connectionString = process.env.DATABASE_URL;
    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString || "");

    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === "false" || isLocal ? false : { rejectUnauthorized: false }
    });
  }

  return pool;
}

async function ensurePostgresSchema() {
  if (schemaReady) {
    return;
  }

  await query(`
    create table if not exists customers (
      id text primary key,
      name text not null,
      contact text not null,
      email text,
      created_at timestamptz not null default now()
    );

    create table if not exists orders (
      id text primary key,
      order_number text not null unique,
      customer_id text references customers(id),
      source text not null default 'configurator',
      status text not null,
      payment_status text not null default 'pending',
      total_brl numeric(12,2) not null default 0,
      lead_time_days integer not null default 0,
      notes text,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists order_items (
      id text primary key,
      order_id text not null references orders(id) on delete cascade,
      category_slug text,
      category_name text,
      format_slug text,
      format_name text,
      sku text,
      values jsonb not null default '{}'::jsonb,
      color text,
      finish text,
      quantity integer not null default 1,
      unit_price_brl numeric(12,2) not null default 0,
      total_price_brl numeric(12,2) not null default 0,
      lead_time_days integer not null default 0,
      status text not null default 'valid',
      validation_issues jsonb not null default '[]'::jsonb,
      price_breakdown jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists payments (
      id text primary key,
      order_id text not null references orders(id) on delete cascade,
      provider text not null,
      provider_preference_id text,
      provider_payment_id text,
      status text not null,
      checkout_url text,
      amount_brl numeric(12,2) not null default 0,
      raw jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists technical_reviews (
      id text primary key,
      order_id text not null references orders(id) on delete cascade,
      status text not null default 'open',
      notes text,
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists orders_status_idx on orders(status);
    create index if not exists orders_created_at_idx on orders(created_at desc);
    create index if not exists payments_order_id_idx on payments(order_id);
    create index if not exists payments_provider_payment_idx on payments(provider_payment_id);
  `);

  schemaReady = true;
}

async function readLocalStore() {
  try {
    const raw = await fs.readFile(localStorePath, "utf8");
    return normalizeLocalStore(JSON.parse(raw));
  } catch {
    return normalizeLocalStore({});
  }
}

async function writeLocalStore(store) {
  await fs.mkdir(path.dirname(localStorePath), { recursive: true });
  await fs.writeFile(localStorePath, JSON.stringify(normalizeLocalStore(store), null, 2));
}

function normalizeLocalStore(store) {
  return {
    customers: Array.isArray(store.customers) ? store.customers : [],
    orders: Array.isArray(store.orders) ? store.orders : [],
    orderItems: Array.isArray(store.orderItems) ? store.orderItems : [],
    payments: Array.isArray(store.payments) ? store.payments : [],
    technicalReviews: Array.isArray(store.technicalReviews) ? store.technicalReviews : []
  };
}
