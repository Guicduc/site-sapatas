import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getDatabaseMode, query, withTransaction } from "./db.js";
import { buildFulfillmentMetadata, getOrderStatusForFulfillment } from "./fulfillment.js";
import { isPayableOrder, ORDER_STATUS, PAYMENT_STATUS } from "./order-status.js";
import { buildPostPaymentOutboxEvents, enqueueOutboxEvents } from "./outbox-store.js";
import { getProductionSystemMode, PRODUCTION_SYSTEM_MODE } from "./production-handoff-auth.js";
import {
  claimProductionWorkRoute,
  PRODUCTION_WORK_ROUTE,
  stageProductionHandoff
} from "./production-handoff-store.js";
import { notifyInternalPaymentAlert } from "./transactional-email.js";

let localMutationTail = Promise.resolve();

function getLocalStorePath() {
  return process.env.ORDER_STORE_LOCAL_PATH
    ? path.resolve(process.env.ORDER_STORE_LOCAL_PATH)
    : path.join(process.cwd(), ".local-data", "orders.dev.json");
}

export function getStoreMode() {
  return getDatabaseMode();
}

export async function checkOrderStoreHealth() {
  const mode = getStoreMode();

  if (mode === "postgres") {
    await query("select 1 as ok");
  } else {
    await readLocalStore();
  }

  return {
    ok: true,
    mode
  };
}

export async function createOrder(orderDraft) {
  if (getStoreMode() === "postgres") {
    return createPostgresOrder(orderDraft);
  }

  return withLocalMutation(async () => {
    const store = await readLocalStore();
    claimLocalPromotion(store, orderDraft);
    store.customers.push(orderDraft.customer);
    store.orders.push(buildStoredOrder(orderDraft));
    store.orderItems.push(...orderDraft.items.map((item) => ({ ...item, orderId: orderDraft.id })));

    if (orderDraft.technicalReview) {
      store.technicalReviews.push(buildStoredTechnicalReview(orderDraft));
    }

    await writeLocalStore(store);
    return hydrateOrderFromLocal(store, store.orders.find((order) => order.id === orderDraft.id));
  });
}

export async function getPromotionEligibilityEvidence({ promotionId, identityHash, document }) {
  if (!promotionId || !identityHash || !document) {
    return { hasSuccessfulOrder: false, hasActiveClaim: false };
  }

  if (getStoreMode() === "postgres") {
    const [orders, claims] = await Promise.all([
      query(
        `select 1
         from orders o join customers c on c.id = o.customer_id
         where c.document = $1 and o.payment_status = $2
         limit 1`,
        [document, PAYMENT_STATUS.APPROVED]
      ),
      query(
        `select 1 from promotion_redemptions
         where promotion_id = $1 and identity_hash = $2
           and status in ('reserved', 'redeemed')
         limit 1`,
        [promotionId, identityHash]
      )
    ]);
    return { hasSuccessfulOrder: Boolean(orders.rows[0]), hasActiveClaim: Boolean(claims.rows[0]) };
  }

  const store = await readLocalStore();
  const customerIds = new Set(store.customers.filter((customer) => customer.document === document).map((customer) => customer.id));
  return {
    hasSuccessfulOrder: store.orders.some((order) => customerIds.has(order.customerId) && order.paymentStatus === PAYMENT_STATUS.APPROVED),
    hasActiveClaim: store.promotionRedemptions.some((claim) => claim.promotionId === promotionId && claim.identityHash === identityHash && ["reserved", "redeemed"].includes(claim.status))
  };
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

export async function listOrdersByEmail(email, { verifiedOnly = true } = {}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return [];

  if (getStoreMode() === "postgres") {
    const result = await query(
      `select o.*, c.name as customer_name, c.contact as customer_contact, c.email as customer_email,
              c.document as customer_document
       from orders o
       join customers c on c.id = o.customer_id
       where lower(c.email) = $1
         and ($2::boolean = false or o.metadata->'account'->>'emailVerifiedAt' is not null)
       order by o.created_at desc`,
      [normalizedEmail, verifiedOnly]
    );
    return hydratePostgresOrders(result.rows);
  }

  const store = await readLocalStore();
  const customerIds = new Set(
    store.customers
      .filter((customer) => String(customer.email || "").trim().toLowerCase() === normalizedEmail)
      .map((customer) => customer.id)
  );
  return store.orders
    .filter((order) => customerIds.has(order.customerId) && (!verifiedOnly || order.metadata?.account?.emailVerifiedAt))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((order) => hydrateOrderFromLocal(store, order));
}

export async function getOrderForEmail(id, email) {
  const order = await getOrderById(id);
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return order
    && order.metadata?.account?.emailVerifiedAt
    && String(order.customer?.email || "").trim().toLowerCase() === normalizedEmail
    ? order
    : null;
}

export async function getOrderByNumberAndEmail(orderNumber, email) {
  const normalizedNumber = String(orderNumber || "").trim().toUpperCase();
  const orders = await listOrdersByEmail(email, { verifiedOnly: false });
  return orders.find((order) => String(order.orderNumber || "").toUpperCase() === normalizedNumber) || null;
}

export async function saveAccountAccessCode({ email, orderId, codeHash, expiresAt }) {
  if (getStoreMode() === "postgres") {
    await query(`delete from account_access_codes where email = lower($1)`, [email]);
    await query(
      `insert into account_access_codes (id, email, order_id, code_hash, expires_at)
       values ($1, lower($2), $3, $4, $5)`,
      [crypto.randomUUID(), email, orderId, codeHash, expiresAt]
    );
    return;
  }

  const store = await readLocalStore();
  store.accountAccessCodes = store.accountAccessCodes
    .filter((item) => item.email !== String(email).toLowerCase() && new Date(item.expiresAt).getTime() > Date.now())
    .slice(-100);
  store.accountAccessCodes.push({
    id: crypto.randomUUID(), email: String(email).toLowerCase(), orderId, codeHash, expiresAt, createdAt: new Date().toISOString()
  });
  await writeLocalStore(store);
}

export async function hasRecentAccountAccessCode(email, seconds = 60) {
  if (getStoreMode() === "postgres") {
    const result = await query(
      `select 1 from account_access_codes
       where email = lower($1) and created_at > now() - ($2 * interval '1 second')
       limit 1`,
      [email, seconds]
    );
    return Boolean(result.rows[0]);
  }
  const store = await readLocalStore();
  return store.accountAccessCodes.some((item) =>
    item.email === String(email).toLowerCase()
    && Date.now() - new Date(item.createdAt).getTime() < seconds * 1000
  );
}

export async function consumeAccountAccessCode({ email, codeHash }) {
  if (getStoreMode() === "postgres") {
    const result = await query(
      `delete from account_access_codes
       where id = (
         select id from account_access_codes
         where email = lower($1) and code_hash = $2 and expires_at > now() and attempts < 5
         order by created_at desc limit 1
       ) returning order_id`,
      [email, codeHash]
    );
    if (result.rows[0]) return { orderId: result.rows[0].order_id || null };
    await query(
      `update account_access_codes
       set attempts = attempts + 1
       where id = (
         select id from account_access_codes
         where email = lower($1) and expires_at > now() and attempts < 5
         order by created_at desc limit 1
       )`,
      [email]
    );
    await query(`delete from account_access_codes where email = lower($1) and attempts >= 5`, [email]);
    return null;
  }

  const store = await readLocalStore();
  const index = store.accountAccessCodes.findIndex((item) =>
    item.email === String(email).toLowerCase()
    && item.codeHash === codeHash
    && Number(item.attempts || 0) < 5
    && new Date(item.expiresAt).getTime() > Date.now()
  );
  if (index < 0) {
    const challenge = store.accountAccessCodes
      .filter((item) => item.email === String(email).toLowerCase() && new Date(item.expiresAt).getTime() > Date.now())
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0];
    if (challenge) {
      challenge.attempts = Number(challenge.attempts || 0) + 1;
      if (challenge.attempts >= 5) {
        store.accountAccessCodes = store.accountAccessCodes.filter((item) => item.id !== challenge.id);
      }
      await writeLocalStore(store);
    }
    return null;
  }
  const [consumed] = store.accountAccessCodes.splice(index, 1);
  await writeLocalStore(store);
  return { orderId: consumed.orderId || null };
}

export async function verifyOrderEmail(orderId, email) {
  const order = await getOrderById(orderId);
  if (!order || String(order.customer?.email || "").toLowerCase() !== String(email || "").toLowerCase()) return false;
  const emailVerifiedAt = new Date().toISOString();

  if (getStoreMode() === "postgres") {
    await query(
      `update orders
       set metadata = jsonb_set(
         metadata,
         '{account}',
         coalesce(metadata->'account', '{}'::jsonb) || jsonb_build_object('emailVerifiedAt', $1::text),
         true
       ), updated_at = now()
       where id = $2`,
      [emailVerifiedAt, orderId]
    );
    return true;
  }
  return withLocalMutation(async () => {
    const store = await readLocalStore();
    const stored = store.orders.find((item) => item.id === orderId);
    if (!stored) return false;
    stored.metadata = {
      ...(stored.metadata || {}),
      account: { ...(stored.metadata?.account || {}), emailVerifiedAt }
    };
    stored.updatedAt = emailVerifiedAt;
    await writeLocalStore(store);
    return true;
  });
}

export async function getOrCreateCustomerAccount(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;
  if (getStoreMode() === "postgres") {
    const result = await query(`
      insert into customer_accounts (id, email) values ($1, $2)
      on conflict (email) do update set updated_at = now()
      returning id, email, password_hash, password_set_at, password_changed_at
    `, [randomUUID(), normalizedEmail]);
    return result.rows[0] || null;
  }
  const store = await readLocalStore();
  let account = store.customerAccounts.find((item) => item.email === normalizedEmail);
  if (!account) {
    account = { id: randomUUID(), email: normalizedEmail, passwordHash: null, passwordSetAt: null, passwordChangedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    store.customerAccounts.push(account);
    await writeLocalStore(store);
  }
  return account;
}

export async function findCustomerAccount(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;
  if (getStoreMode() === "postgres") {
    const result = await query(`select id, email, password_hash, password_set_at, password_changed_at from customer_accounts where email = $1`, [normalizedEmail]);
    return result.rows[0] || null;
  }
  const store = await readLocalStore();
  return store.customerAccounts.find((item) => item.email === normalizedEmail) || null;
}

export async function setCustomerAccountPassword(accountId, passwordHash) {
  const now = new Date().toISOString();
  if (getStoreMode() === "postgres") {
    const result = await query(`update customer_accounts set password_hash = $2, password_set_at = coalesce(password_set_at, now()), password_changed_at = now(), updated_at = now() where id = $1 returning id, email, password_hash, password_set_at, password_changed_at`, [accountId, passwordHash]);
    return result.rows[0] || null;
  }
  const store = await readLocalStore();
  const account = store.customerAccounts.find((item) => item.id === accountId);
  if (!account) return null;
  account.passwordHash = passwordHash;
  account.passwordSetAt ||= now;
  account.passwordChangedAt = now;
  account.updatedAt = now;
  await writeLocalStore(store);
  return account;
}

export async function createCustomerAccountSession({ accountId, tokenHash, expiresAt, recentAuthAt = null }) {
  if (getStoreMode() === "postgres") {
    await query(`insert into customer_account_sessions (id, account_id, token_hash, expires_at, recent_auth_at) values ($1, $2, $3, $4, $5)`, [randomUUID(), accountId, tokenHash, expiresAt, recentAuthAt]);
    return;
  }
  const store = await readLocalStore();
  store.accountSessions.push({ id: randomUUID(), accountId, tokenHash, expiresAt, recentAuthAt, createdAt: new Date().toISOString(), revokedAt: null });
  await writeLocalStore(store);
}

export async function getCustomerAccountSession(tokenHash) {
  if (getStoreMode() === "postgres") {
    const result = await query(`select s.*, a.email, a.password_hash from customer_account_sessions s join customer_accounts a on a.id = s.account_id where s.token_hash = $1 and s.revoked_at is null and s.expires_at > now()`, [tokenHash]);
    return result.rows[0] || null;
  }
  const store = await readLocalStore();
  const session = store.accountSessions.find((item) => item.tokenHash === tokenHash && !item.revokedAt && new Date(item.expiresAt).getTime() > Date.now());
  const account = session && store.customerAccounts.find((item) => item.id === session.accountId);
  return session && account ? { ...session, email: account.email, password_hash: account.passwordHash } : null;
}

export async function revokeCustomerAccountSessions(accountId, exceptTokenHash = null) {
  if (getStoreMode() === "postgres") {
    await query(`update customer_account_sessions set revoked_at = now() where account_id = $1 and revoked_at is null and ($2::text is null or token_hash <> $2)`, [accountId, exceptTokenHash]);
    return;
  }
  const store = await readLocalStore();
  for (const session of store.accountSessions) if (session.accountId === accountId && session.tokenHash !== exceptTokenHash) session.revokedAt = new Date().toISOString();
  await writeLocalStore(store);
}

export async function linkVerifiedOrderToAccount(accountId, orderId, email) {
  const order = await getOrderForEmail(orderId, email);
  if (!order || !order.metadata?.account?.emailVerifiedAt) return false;
  if (getStoreMode() === "postgres") {
    await query(`insert into customer_account_orders (account_id, order_id) values ($1, $2) on conflict do nothing`, [accountId, orderId]);
    return true;
  }
  const store = await readLocalStore();
  if (!store.accountOrders.some((item) => item.accountId === accountId && item.orderId === orderId)) store.accountOrders.push({ accountId, orderId, createdAt: new Date().toISOString() });
  await writeLocalStore(store);
  return true;
}

// Migra para a identidade nova os pedidos que ja tinham sido verificados no
// fluxo antigo por e-mail. Sem isso, um cliente perderia pedidos historicos
// ao entrar pela primeira vez depois da criacao de customer_accounts.
export async function linkVerifiedOrdersToAccount(accountId, email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!accountId || !normalizedEmail) return;
  if (getStoreMode() === "postgres") {
    await query(`
      insert into customer_account_orders (account_id, order_id)
      select $1, o.id
      from orders o
      join customers c on c.id = o.customer_id
      where lower(c.email) = $2
        and o.metadata->'account'->>'emailVerifiedAt' is not null
      on conflict do nothing
    `, [accountId, normalizedEmail]);
    return;
  }
  const store = await readLocalStore();
  const customerIds = new Set(
    store.customers
      .filter((customer) => String(customer.email || "").trim().toLowerCase() === normalizedEmail)
      .map((customer) => customer.id)
  );
  for (const order of store.orders) {
    if (!customerIds.has(order.customerId) || !order.metadata?.account?.emailVerifiedAt) continue;
    if (!store.accountOrders.some((item) => item.accountId === accountId && item.orderId === order.id)) {
      store.accountOrders.push({ accountId, orderId: order.id, createdAt: new Date().toISOString() });
    }
  }
  await writeLocalStore(store);
}

export async function listOrdersByAccountId(accountId) {
  if (getStoreMode() === "postgres") {
    const result = await query(`select o.*, c.name as customer_name, c.contact as customer_contact, c.email as customer_email, c.document as customer_document from customer_account_orders ao join orders o on o.id = ao.order_id join customers c on c.id = o.customer_id where ao.account_id = $1 and o.metadata->'account'->>'emailVerifiedAt' is not null order by o.created_at desc`, [accountId]);
    return hydratePostgresOrders(result.rows);
  }
  const store = await readLocalStore();
  return store.accountOrders.filter((item) => item.accountId === accountId).map((item) => store.orders.find((order) => order.id === item.orderId)).filter(Boolean).map((order) => hydrateOrderFromLocal(store, order));
}

export async function getOrderForAccountId(orderId, accountId) {
  if (!orderId || !accountId) return null;
  if (getStoreMode() === "postgres") {
    const result = await query(`select o.*, c.name as customer_name, c.contact as customer_contact, c.email as customer_email, c.document as customer_document from customer_account_orders ao join orders o on o.id = ao.order_id join customers c on c.id = o.customer_id where ao.account_id = $1 and ao.order_id = $2 and o.metadata->'account'->>'emailVerifiedAt' is not null`, [accountId, orderId]);
    return result.rows[0] ? hydratePostgresOrder(result.rows[0]) : null;
  }
  const store = await readLocalStore();
  const linked = store.accountOrders.some((item) => item.accountId === accountId && item.orderId === orderId);
  const order = linked && store.orders.find((item) => item.id === orderId);
  return order && order.metadata?.account?.emailVerifiedAt ? hydrateOrderFromLocal(store, order) : null;
}

export async function consumeAccountRateLimit(key, limit = 5, windowSeconds = 900) {
  if (getStoreMode() === "postgres") {
    await query(`delete from account_rate_limits where window_started_at < now() - ($1 * interval '1 second')`, [windowSeconds]);
    const result = await query(`insert into account_rate_limits (key, window_started_at, attempts) values ($1, now(), 1) on conflict (key) do update set attempts = case when account_rate_limits.window_started_at < now() - ($3 * interval '1 second') then 1 else account_rate_limits.attempts + 1 end, window_started_at = case when account_rate_limits.window_started_at < now() - ($3 * interval '1 second') then now() else account_rate_limits.window_started_at end returning attempts`, [key, limit, windowSeconds]);
    return Number(result.rows[0]?.attempts || 0) <= limit;
  }
  return withLocalMutation(async () => {
    const store = await readLocalStore();
    const now = Date.now();
    let item = store.accountRateLimits.find((entry) => entry.key === key);
    if (!item || now - new Date(item.windowStartedAt).getTime() > windowSeconds * 1000) {
      item = { key, attempts: 0, windowStartedAt: new Date().toISOString() };
      store.accountRateLimits = store.accountRateLimits.filter((entry) => entry.key !== key);
      store.accountRateLimits.push(item);
    }
    item.attempts += 1;
    await writeLocalStore(store);
    return item.attempts <= limit;
  });
}

export async function listOrders({ limit = 50 } = {}) {
  if (getStoreMode() === "postgres") {
    const result = await query(
      `select o.*, c.name as customer_name, c.contact as customer_contact, c.email as customer_email,
              c.document as customer_document
       from orders o
       left join customers c on c.id = o.customer_id
       order by o.created_at desc
       limit $1`,
      [limit]
    );

    return hydratePostgresOrders(result.rows);
  }

  const store = await readLocalStore();
  return store.orders
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .map((order) => hydrateOrderFromLocal(store, order));
}

export async function updateOrderPricingState(orderId, pricing) {
  if (getStoreMode() === "postgres") {
    const updated = await withPostgresTransaction(async (client) => {
      const order = await getLockedPostgresOrder(client, orderId);
      if (!order) return false;
      const nextMetadata = buildPricingMetadata(order.metadata, pricing);
      await client.query(
        `update orders set metadata = $1::jsonb, updated_at = now() where id = $2`,
        [JSON.stringify(nextMetadata), orderId]
      );
      return true;
    });
    if (!updated) return null;
    return getOrderById(orderId);
  }

  return withLocalMutation(async () => {
    const store = await readLocalStore();
    const storedOrder = store.orders.find((item) => item.id === orderId);
    if (!storedOrder) return null;
    storedOrder.metadata = buildPricingMetadata(storedOrder.metadata, pricing);
    storedOrder.updatedAt = new Date().toISOString();
    await writeLocalStore(store);
    return hydrateOrderFromLocal(store, storedOrder);
  });
}

export async function consumeOrderCreationRateLimit(key, limit = 8, windowSeconds = 900) {
  if (getStoreMode() === "postgres") {
    await query(
      `delete from request_rate_limits where window_started_at < now() - ($1 * interval '1 second')`,
      [windowSeconds]
    );
    const result = await query(
      `insert into request_rate_limits (key, window_started_at, attempts)
       values ($1, now(), 1)
       on conflict (key) do update set
         attempts = case
           when request_rate_limits.window_started_at < now() - ($2 * interval '1 second') then 1
           else request_rate_limits.attempts + 1
         end,
         window_started_at = case
           when request_rate_limits.window_started_at < now() - ($2 * interval '1 second') then now()
           else request_rate_limits.window_started_at
         end
       returning attempts`,
      [key, windowSeconds]
    );
    return Number(result.rows[0]?.attempts || 0) <= limit;
  }

  return withLocalMutation(async () => {
    const store = await readLocalStore();
    const now = Date.now();
    store.requestRateLimits = store.requestRateLimits.filter(
      (entry) => now - new Date(entry.windowStartedAt).getTime() <= windowSeconds * 1000
    );
    let item = store.requestRateLimits.find((entry) => entry.key === key);
    if (!item || now - new Date(item.windowStartedAt).getTime() > windowSeconds * 1000) {
      item = { key, attempts: 0, windowStartedAt: new Date().toISOString() };
      store.requestRateLimits = store.requestRateLimits.filter((entry) => entry.key !== key);
      store.requestRateLimits.push(item);
    }
    item.attempts += 1;
    await writeLocalStore(store);
    return item.attempts <= limit;
  });
}

export async function updateOrderFulfillmentState(orderId, fulfillmentPatch) {
  if (getStoreMode() === "postgres") {
    const updated = await withPostgresTransaction(async (client) => {
      const order = await getLockedPostgresOrder(client, orderId, { includeItems: true });
      if (!order) return false;
      if (["in_production", "quality_check", "blocked", "ready_to_ship", "shipped"]
        .includes(fulfillmentPatch?.production?.status)) {
        await claimProductionWorkRoute(
          orderId,
          PRODUCTION_WORK_ROUTE.LEGACY_PRINT_QUEUE,
          "manual_fulfillment_transition",
          client
        );
      }
      const now = new Date().toISOString();
      const nextFulfillment = buildFulfillmentMetadata(order, fulfillmentPatch, now);
      const nextMetadata = { ...(order.metadata || {}), fulfillment: nextFulfillment };
      const nextStatus = getOrderStatusForFulfillment(order.status, nextFulfillment);
      await client.query(
        `update orders set status = $1, metadata = $2::jsonb, updated_at = now() where id = $3`,
        [nextStatus, JSON.stringify(nextMetadata), orderId]
      );
      return true;
    });
    if (!updated) return null;
    return getOrderById(orderId);
  }

  return withLocalMutation(async () => {
    const store = await readLocalStore();
    const storedOrder = store.orders.find((item) => item.id === orderId);
    if (!storedOrder) return null;
    const order = hydrateOrderFromLocal(store, storedOrder);
    const now = new Date().toISOString();
    const nextFulfillment = buildFulfillmentMetadata(order, fulfillmentPatch, now);
    storedOrder.status = getOrderStatusForFulfillment(order.status, nextFulfillment);
    storedOrder.metadata = { ...(storedOrder.metadata || {}), fulfillment: nextFulfillment };
    storedOrder.updatedAt = now;
    await writeLocalStore(store);
    return hydrateOrderFromLocal(store, storedOrder);
  });
}

function buildPricingMetadata(metadata = {}, pricing = {}) {
  const currentPricing = metadata.pricing || {};
  return {
    ...metadata,
    pricing: {
      ...currentPricing,
      ...pricing,
      previousResults: [
        ...(Array.isArray(currentPricing.previousResults) ? currentPricing.previousResults : []),
        ...(currentPricing.mode ? [withoutPreviousResults(currentPricing)] : [])
      ].slice(-5)
    }
  };
}

export async function createPayment(payment) {
  if (getStoreMode() === "postgres") {
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

  return withLocalMutation(async () => {
    const store = await readLocalStore();
    store.payments.push(payment);
    await writeLocalStore(store);
    return payment;
  });
}

// Serializa a chamada externa e a gravacao. A chave de idempotencia do provedor
// cobre a rara falha em que o Mercado Pago responde, mas o commit local falha.
export async function getOrCreatePendingMercadoPagoPayment(orderId, createPendingPayment) {
  if (getStoreMode() === "postgres") {
    return withPostgresTransaction(async (client) => {
      const order = await getLockedPostgresOrder(client, orderId);
      if (!order) return null;
      assertOrderCanCreatePayment(order);

      const existing = await findActiveMercadoPagoPreference(client, orderId);
      if (existing) return { payment: mapPaymentRow(existing), reused: true };

      const payment = await createPendingPayment();
      await insertPayment(client, payment);
      return { payment: mapPaymentRow(toPaymentRow(payment)), reused: false };
    });
  }

  return withLocalMutation(async () => {
    const store = await readLocalStore();
    const storedOrder = store.orders.find((item) => item.id === orderId);
    if (!storedOrder) return null;
    assertOrderCanCreatePayment(storedOrder);
    const existing = store.payments
      .filter((payment) => isActiveMercadoPagoPreference(payment, orderId))
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0];
    if (existing) return { payment: existing, reused: true };

    const payment = await createPendingPayment();
    store.payments.push(payment);
    await writeLocalStore(store);
    return { payment, reused: false };
  });
}

function assertOrderCanCreatePayment(order) {
  if (!isPayableOrder(order.status)) {
    const error = new Error("Este pedido não aceita uma nova cobrança.");
    error.code = "order_not_payable";
    throw error;
  }
}

async function findActiveMercadoPagoPreference(client, orderId) {
  const result = await client.query(
    `select * from payments
     where order_id = $1 and provider = 'mercado_pago'
       and status = 'pending' and provider_payment_id is null and checkout_url is not null
     order by created_at desc limit 1`,
    [orderId]
  );
  return result.rows[0] || null;
}

function isActiveMercadoPagoPreference(payment, orderId) {
  return payment.orderId === orderId
    && payment.provider === "mercado_pago"
    && payment.status === PAYMENT_STATUS.PENDING
    && !payment.providerPaymentId
    && Boolean(payment.checkoutUrl);
}

export async function getLatestPaymentForOrder(orderId) {
  if (getStoreMode() === "postgres") {
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

// Cancela um pedido que foi substituído por um novo checkout (fingerprint do
// carrinho mudou). Só age em pedidos ainda pagáveis e sem pagamento aprovado;
// se o cliente pagar a preferência antiga mesmo assim, o webhook/reconciliação
// marca revisão manual via buildPaymentReview.
export async function cancelSupersededOrder(orderId, { reason = "superseded_by_new_checkout" } = {}) {
  if (getStoreMode() === "postgres") {
    const found = await withPostgresTransaction(async (client) => {
      const order = await getLockedPostgresOrder(client, orderId);
      if (!order) return false;
      if (!isPayableOrder(order.status) || order.paymentStatus === PAYMENT_STATUS.APPROVED) return true;
      const nextMetadata = {
        ...(order.metadata || {}),
        cancellation: { reason, cancelledAt: new Date().toISOString() }
      };
      await client.query(
        `update orders set status = $1, metadata = $2::jsonb, updated_at = now() where id = $3`,
        [ORDER_STATUS.CANCELLED, JSON.stringify(nextMetadata), orderId]
      );
      await client.query(`delete from promotion_redemptions where order_id = $1 and status = 'reserved'`, [orderId]);
      return true;
    });
    if (!found) return null;
    return getOrderById(orderId);
  }

  return withLocalMutation(async () => {
    const store = await readLocalStore();
    const storedOrder = store.orders.find((item) => item.id === orderId);
    if (!storedOrder) return null;
    if (isPayableOrder(storedOrder.status) && storedOrder.paymentStatus !== PAYMENT_STATUS.APPROVED) {
      const now = new Date().toISOString();
      storedOrder.status = ORDER_STATUS.CANCELLED;
      storedOrder.metadata = {
        ...(storedOrder.metadata || {}),
        cancellation: { reason, cancelledAt: now }
      };
      storedOrder.updatedAt = now;
      store.promotionRedemptions = store.promotionRedemptions.filter((claim) => claim.orderId !== orderId || claim.status !== "reserved");
      await writeLocalStore(store);
    }
    return hydrateOrderFromLocal(store, storedOrder);
  });
}

export async function recordMercadoPagoUpdate({ orderId, preferenceId, paymentId, status, amountBrl, raw }) {
  if (getStoreMode() === "postgres") {
    const transition = await withPostgresTransaction(async (client) => {
      let existingPayment = await findPostgresPaymentForProviderUpdate(
        { preferenceId, paymentId, orderId },
        client
      );
      const resolvedOrderId = existingPayment?.order_id || orderId || null;
      if (!resolvedOrderId) return { orderId: null, reviewIsNew: false };

      const orderForUpdate = await getLockedPostgresOrder(client, resolvedOrderId);
      if (!orderForUpdate) return { orderId: null, reviewIsNew: false };
      existingPayment = await findPostgresPaymentForProviderUpdate(
        { preferenceId, paymentId, orderId: resolvedOrderId },
        client,
        { forUpdate: true }
      );

      if (isStalePaymentUpdate(existingPayment, raw)) {
        return { orderId: resolvedOrderId, reviewIsNew: false };
      }
      const effectiveStatus = normalizePaymentStatusForAmount(orderForUpdate, status, amountBrl);
      const review = buildPaymentReview(orderForUpdate, status, amountBrl, paymentId);
      const reviewIsNew = Boolean(review && !isSamePaymentReview(orderForUpdate.metadata?.paymentReview, review));

      if (existingPayment) {
        await client.query(
          `update payments
           set provider_payment_id = coalesce($1, provider_payment_id),
               status = $2,
               amount_brl = coalesce($3, amount_brl),
               raw = $4::jsonb,
               updated_at = now()
           where id = $5`,
          [paymentId || null, effectiveStatus, amountBrl ?? null, JSON.stringify(raw || {}), existingPayment.id]
        );
      } else {
        await insertPayment(client, {
          id: crypto.randomUUID(),
          orderId: resolvedOrderId,
          provider: "mercado_pago",
          providerPreferenceId: preferenceId || null,
          providerPaymentId: paymentId || null,
          status: effectiveStatus,
          checkoutUrl: null,
          amountBrl: amountBrl || 0,
          raw
        });
      }

      const approvedPayments = await client.query(
        `select 1 from payments where order_id = $1 and status = 'approved' limit 1`,
        [resolvedOrderId]
      );
      const orderPaymentStatus = approvedPayments.rows.length ? PAYMENT_STATUS.APPROVED : effectiveStatus;
      const nextStatus = await updateLockedOrderPaymentState(
        client,
        orderForUpdate,
        orderPaymentStatus,
        orderPaymentStatus === PAYMENT_STATUS.APPROVED ? orderForUpdate.totalBrl : amountBrl,
        reviewIsNew ? review : null
      );
      if (effectiveStatus === PAYMENT_STATUS.APPROVED) {
        await client.query(
          `update promotion_redemptions set status = 'redeemed', redeemed_at = now(), updated_at = now() where order_id = $1`,
          [resolvedOrderId]
        );
      }
      const productionItems = effectiveStatus === PAYMENT_STATUS.APPROVED
        && getProductionSystemMode() !== PRODUCTION_SYSTEM_MODE.DISABLED
        ? (await client.query(
            `select * from order_items where order_id = $1 order by created_at asc`,
            [resolvedOrderId]
          )).rows.map(mapOrderItemRow)
        : [];
      await stageProductionHandoff(client, {
        ...orderForUpdate,
        status: nextStatus,
        paymentStatus: effectiveStatus,
        items: productionItems
      });
      await enqueueOutboxEvents(client, buildPostPaymentOutboxEvents({
        orderId: resolvedOrderId,
        orderStatus: nextStatus,
        paymentStatus: effectiveStatus,
        paymentId,
        preferenceId,
        hasPaymentReview: Boolean(orderForUpdate.metadata?.paymentReview),
        review: reviewIsNew ? review : null
      }));
      return { orderId: resolvedOrderId, reviewIsNew };
    });

    const updatedOrder = transition.orderId ? await getOrderById(transition.orderId) : null;

    return updatedOrder;
  }

  const transition = await withLocalMutation(async () => {
    const store = await readLocalStore();
    const payment = findLocalPaymentForProviderUpdate(store.payments, { preferenceId, paymentId, orderId });
    const resolvedOrderId = payment?.orderId || orderId || null;
    const localOrder = store.orders.find((item) => item.id === resolvedOrderId);
    if (!localOrder) return { order: null, reviewIsNew: false };
    if (isStalePaymentUpdate(payment, raw)) {
      return { order: hydrateOrderFromLocal(store, localOrder), reviewIsNew: false };
    }
    const effectiveStatus = normalizePaymentStatusForAmount(localOrder, status, amountBrl);
    const review = buildPaymentReview(localOrder, status, amountBrl, paymentId);
    const reviewIsNew = Boolean(review && !isSamePaymentReview(localOrder.metadata?.paymentReview, review));

    if (payment) {
      payment.providerPaymentId = paymentId || payment.providerPaymentId;
      payment.status = effectiveStatus;
      payment.amountBrl = amountBrl ?? payment.amountBrl;
      payment.raw = raw || payment.raw;
      payment.updatedAt = new Date().toISOString();
    } else {
      store.payments.push({
        id: crypto.randomUUID(),
        orderId: resolvedOrderId,
        provider: "mercado_pago",
        providerPreferenceId: preferenceId || null,
        providerPaymentId: paymentId || null,
        status: effectiveStatus,
        checkoutUrl: null,
        amountBrl: amountBrl || 0,
        raw,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (reviewIsNew) localOrder.metadata = { ...(localOrder.metadata || {}), paymentReview: review };
    const hasApprovedPayment = store.payments.some((item) => item.orderId === resolvedOrderId && item.status === PAYMENT_STATUS.APPROVED);
    applyPaymentStatusToOrder(
      localOrder,
      hasApprovedPayment ? PAYMENT_STATUS.APPROVED : effectiveStatus,
      hasApprovedPayment ? localOrder.totalBrl : amountBrl
    );
    if (effectiveStatus === PAYMENT_STATUS.APPROVED) {
      for (const claim of store.promotionRedemptions.filter((item) => item.orderId === resolvedOrderId)) {
        claim.status = "redeemed";
        claim.redeemedAt = new Date().toISOString();
        claim.updatedAt = claim.redeemedAt;
      }
    }
    await writeLocalStore(store);
    return { order: hydrateOrderFromLocal(store, localOrder), reviewIsNew };
  });
  const updatedOrder = transition.order;

  if (updatedOrder && transition.reviewIsNew) {
    await notifyInternalPaymentAlert(updatedOrder, updatedOrder.metadata?.paymentReview);
  }

  return updatedOrder;
}

async function updateLockedOrderPaymentState(client, order, paymentStatus, amountBrl, review = null) {
  if (review) {
    order.metadata = { ...(order.metadata || {}), paymentReview: review };
  }

  paymentStatus = normalizePaymentStatusForAmount(order, paymentStatus, amountBrl);
  const nextStatus = getNextOrderStatus(order, paymentStatus);
  await client.query(
    `update orders set status = $1, payment_status = $2, metadata = $3::jsonb, updated_at = now() where id = $4`,
    [nextStatus, paymentStatus, JSON.stringify(order.metadata || {}), order.id]
  );
  return nextStatus;
}

function applyPaymentStatusToOrder(order, paymentStatus, amountBrl) {
  paymentStatus = normalizePaymentStatusForAmount(order, paymentStatus, amountBrl);
  order.paymentStatus = paymentStatus;
  order.status = getNextOrderStatus(order, paymentStatus);
  order.updatedAt = new Date().toISOString();
}

function getNextOrderStatus(order, paymentStatus) {
  if ([ORDER_STATUS.IN_PRODUCTION, ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED].includes(order.status)) {
    return order.status;
  }

  if (paymentStatus === PAYMENT_STATUS.APPROVED) {
    if (order.status === ORDER_STATUS.NEEDS_TECHNICAL_REVIEW) {
      return ORDER_STATUS.PAID_PENDING_REVIEW;
    }

    return ORDER_STATUS.PAID_READY_FOR_PRODUCTION;
  }

  if (paymentStatus === PAYMENT_STATUS.REJECTED || paymentStatus === PAYMENT_STATUS.CANCELLED) {
    return ORDER_STATUS.PAYMENT_FAILED;
  }

  if (paymentStatus === PAYMENT_STATUS.EXPIRED) {
    return ORDER_STATUS.PAYMENT_FAILED;
  }

  return ORDER_STATUS.PAYMENT_PENDING;
}

async function findPostgresPaymentForProviderUpdate(
  { preferenceId, paymentId, orderId },
  executor = { query },
  { forUpdate = false } = {}
) {
  const lockClause = forUpdate ? " for update" : "";
  const byPaymentId = paymentId
    ? await executor.query(`select * from payments where provider_payment_id = $1 order by created_at desc limit 1${lockClause}`, [paymentId])
    : { rows: [] };
  if (byPaymentId.rows[0]) return byPaymentId.rows[0];

  const byPreferenceId = preferenceId
    ? await executor.query(`select * from payments where provider_preference_id = $1 and provider_payment_id is null order by created_at desc limit 1${lockClause}`, [preferenceId])
    : { rows: [] };
  if (byPreferenceId.rows[0]) return byPreferenceId.rows[0];

  const byOrderId = orderId
    ? await executor.query(`select * from payments where order_id = $1 and provider_payment_id is null order by created_at desc limit 1${lockClause}`, [orderId])
    : { rows: [] };
  return byOrderId.rows[0] || null;
}

function findLocalPaymentForProviderUpdate(payments, { preferenceId, paymentId, orderId }) {
  if (paymentId) {
    const payment = payments.find((item) => item.providerPaymentId === paymentId);
    if (payment) return payment;
  }

  if (preferenceId) {
    const payment = payments.find((item) => item.providerPreferenceId === preferenceId && !item.providerPaymentId);
    if (payment) return payment;
  }

  if (orderId) {
    return payments
      .filter((item) => item.orderId === orderId && !item.providerPaymentId)
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0] || null;
  }

  return null;
}

// Webhooks can fetch different versions concurrently. Keep the newer provider snapshot.
function isStalePaymentUpdate(payment, raw) {
  const previous = Date.parse(payment?.raw?.date_last_updated || "");
  const incoming = Date.parse(raw?.date_last_updated || "");
  return Number.isFinite(previous) && Number.isFinite(incoming) && incoming < previous;
}

function normalizePaymentStatusForAmount(order, paymentStatus, amountBrl) {
  if (!order || paymentStatus !== PAYMENT_STATUS.APPROVED || amountBrl == null) {
    return paymentStatus;
  }

  const paidAmount = Number(amountBrl || 0);
  const expectedAmount = Number(order.totalBrl || 0);
  return Math.abs(paidAmount - expectedAmount) <= 0.01
    ? paymentStatus
    : PAYMENT_STATUS.UNKNOWN;
}

// Casos em que dinheiro entrou mas o pedido não pode avançar sozinho:
// valor divergente do total ou pagamento aprovado de um pedido já cancelado
// (ex.: preferência antiga de um pedido substituído no checkout).
function buildPaymentReview(order, paymentStatus, amountBrl, paymentId) {
  if (!order || paymentStatus !== PAYMENT_STATUS.APPROVED) {
    return null;
  }

  const base = {
    providerPaymentId: paymentId ? String(paymentId) : null,
    paidAmountBrl: amountBrl == null ? null : Number(amountBrl || 0),
    expectedAmountBrl: Number(order.totalBrl || 0),
    flaggedAt: new Date().toISOString()
  };

  if (order.status === ORDER_STATUS.CANCELLED) {
    return { ...base, reason: "approved_payment_on_cancelled_order" };
  }

  if (amountBrl != null && Math.abs(Number(amountBrl || 0) - Number(order.totalBrl || 0)) > 0.01) {
    return { ...base, reason: "amount_mismatch" };
  }

  return null;
}

function isSamePaymentReview(existing, review) {
  return Boolean(
    existing
      && review
      && existing.reason === review.reason
      && String(existing.providerPaymentId || "") === String(review.providerPaymentId || "")
  );
}

async function createPostgresOrder(orderDraft) {
  await withTransaction(async (client) => {
    await client.query(
      `insert into customers (id, name, contact, email, document)
       values ($1,$2,$3,$4,$5)`,
      [
        orderDraft.customer.id,
        orderDraft.customer.name,
        orderDraft.customer.contact,
        orderDraft.customer.email || null,
        orderDraft.customer.document || null
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
        JSON.stringify(withoutPromotionClaim(orderDraft.metadata || { validationErrors: orderDraft.validationErrors || [] }))
      ]
    );
    await claimPostgresPromotion(client, orderDraft);

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

  });

  return getOrderById(orderDraft.id);
}

async function getPostgresOrderById(id) {
  const result = await query(
    `select o.*, c.name as customer_name, c.contact as customer_contact, c.email as customer_email,
            c.document as customer_document
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
  return (await hydratePostgresOrders([row]))[0] || null;
}

export async function hydratePostgresOrders(rows, queryExecutor = query) {
  if (!rows.length) return [];

  const orderIds = rows.map((row) => row.id);
  const [items, payments, reviews] = await Promise.all([
    queryExecutor(
      `select * from order_items where order_id = any($1::text[]) order by order_id, created_at asc`,
      [orderIds]
    ),
    queryExecutor(
      `select * from payments where order_id = any($1::text[]) order by order_id, created_at desc`,
      [orderIds]
    ),
    queryExecutor(
      `select * from technical_reviews where order_id = any($1::text[]) order by order_id, created_at desc`,
      [orderIds]
    )
  ]);

  const itemsByOrder = groupRowsByOrderId(items.rows);
  const paymentsByOrder = groupRowsByOrderId(payments.rows);
  const reviewsByOrder = groupRowsByOrderId(reviews.rows);

  return rows.map((row) => ({
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
      email: row.customer_email || "",
      document: row.customer_document || ""
    },
    items: (itemsByOrder.get(row.id) || []).map(mapOrderItemRow),
    payments: (paymentsByOrder.get(row.id) || []).map(mapPaymentRow),
    technicalReviews: (reviewsByOrder.get(row.id) || []).map(mapTechnicalReviewRow),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

function groupRowsByOrderId(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const group = grouped.get(row.order_id) || [];
    group.push(row);
    grouped.set(row.order_id, group);
  }
  return grouped;
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
    metadata: withoutPromotionClaim(orderDraft.metadata || { validationErrors: orderDraft.validationErrors || [] }),
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

function toPaymentRow(payment) {
  return {
    id: payment.id,
    order_id: payment.orderId,
    provider: payment.provider,
    provider_preference_id: payment.providerPreferenceId || null,
    provider_payment_id: payment.providerPaymentId || null,
    status: payment.status,
    checkout_url: payment.checkoutUrl || null,
    amount_brl: payment.amountBrl,
    raw: payment.raw || {},
    created_at: payment.createdAt || new Date().toISOString(),
    updated_at: payment.updatedAt || new Date().toISOString()
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

async function insertPayment(executor, payment) {
  return executor.query(
    `insert into payments (
      id, order_id, provider, provider_preference_id, provider_payment_id,
      status, checkout_url, amount_brl, raw
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
    [
      payment.id,
      payment.orderId,
      payment.provider,
      payment.providerPreferenceId || null,
      payment.providerPaymentId || null,
      payment.status,
      payment.checkoutUrl || null,
      payment.amountBrl,
      JSON.stringify(payment.raw || {})
    ]
  );
}

async function withPostgresTransaction(operation) {
  return withTransaction(operation);
}

async function getLockedPostgresOrder(client, orderId, { includeItems = false } = {}) {
  const result = await client.query(`select * from orders where id = $1 for update`, [orderId]);
  const row = result.rows[0];
  if (!row) return null;
  const items = includeItems
    ? (await client.query(`select * from order_items where order_id = $1 order by created_at asc`, [orderId])).rows.map(mapOrderItemRow)
    : [];
  return {
    id: row.id,
    orderNumber: row.order_number,
    source: row.source,
    status: row.status,
    paymentStatus: row.payment_status,
    totalBrl: Number(row.total_brl || 0),
    leadTimeDays: Number(row.lead_time_days || 0),
    metadata: row.metadata || {},
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function withLocalMutation(operation) {
  const previous = localMutationTail;
  let release;
  localMutationTail = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}


async function readLocalStore() {
  try {
    const raw = await fs.readFile(getLocalStorePath(), "utf8");
    return normalizeLocalStore(JSON.parse(raw));
  } catch {
    return normalizeLocalStore({});
  }
}

async function writeLocalStore(store) {
  const localStorePath = getLocalStorePath();
  await fs.mkdir(path.dirname(localStorePath), { recursive: true });
  await fs.writeFile(localStorePath, JSON.stringify(normalizeLocalStore(store), null, 2));
}

function normalizeLocalStore(store) {
  return {
    customers: Array.isArray(store.customers) ? store.customers : [],
    orders: Array.isArray(store.orders) ? store.orders : [],
    orderItems: Array.isArray(store.orderItems) ? store.orderItems : [],
    payments: Array.isArray(store.payments) ? store.payments : [],
    technicalReviews: Array.isArray(store.technicalReviews) ? store.technicalReviews : [],
    accountAccessCodes: Array.isArray(store.accountAccessCodes) ? store.accountAccessCodes : [],
    customerAccounts: Array.isArray(store.customerAccounts) ? store.customerAccounts : [],
    accountOrders: Array.isArray(store.accountOrders) ? store.accountOrders : [],
    accountSessions: Array.isArray(store.accountSessions) ? store.accountSessions : [],
    accountRateLimits: Array.isArray(store.accountRateLimits) ? store.accountRateLimits : [],
    requestRateLimits: Array.isArray(store.requestRateLimits) ? store.requestRateLimits : [],
    promotionRedemptions: Array.isArray(store.promotionRedemptions) ? store.promotionRedemptions : []
  };
}

function withoutPromotionClaim(metadata = {}) {
  const { promotionClaim: _promotionClaim, ...safeMetadata } = metadata;
  return safeMetadata;
}

async function claimPostgresPromotion(client, orderDraft) {
  const claim = orderDraft.metadata?.promotionClaim;
  if (!claim) return;
  const result = await client.query(
    `insert into promotion_redemptions (promotion_id, identity_hash, order_id, status)
     values ($1, $2, $3, 'reserved')
     on conflict (promotion_id, identity_hash) do nothing
     returning order_id`,
    [claim.promotionId, claim.identityHash, orderDraft.id]
  );
  if (!result.rows[0]) throw promotionUnavailableError();
}

function claimLocalPromotion(store, orderDraft) {
  const claim = orderDraft.metadata?.promotionClaim;
  if (!claim) return;
  const duplicate = store.promotionRedemptions.some((item) =>
    item.promotionId === claim.promotionId
    && item.identityHash === claim.identityHash
    && ["reserved", "redeemed"].includes(item.status)
  );
  if (duplicate) throw promotionUnavailableError();
  const now = new Date().toISOString();
  store.promotionRedemptions.push({
    promotionId: claim.promotionId,
    identityHash: claim.identityHash,
    orderId: orderDraft.id,
    status: "reserved",
    redeemedAt: null,
    createdAt: now,
    updatedAt: now
  });
}

function promotionUnavailableError() {
  const error = new Error("Este cupom não pode ser aplicado a este pedido.");
  error.code = "promotion_not_eligible";
  error.status = 409;
  return error;
}
