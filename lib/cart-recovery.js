import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { calculateCommerceAdjustments, normalizeCouponCode } from "@/lib/commerce-adjustments";
import {
  calculateLeadTime,
  calculatePriceBreakdown,
  getCategoryBySlug,
  getFormat
} from "@/lib/configurator-data";

let pool = null;
let schemaReady = false;

const localRecoveryStorePath = path.join(process.cwd(), ".local-data", "cart-recovery.dev.json");
const maxLocalLeads = 500;
const defaultRetentionDays = 90;
const allowedStatuses = new Set(["active", "converted"]);

export function createCartRecoveryToken() {
  return randomBytes(32).toString("hex");
}

export async function saveCartRecoveryLead(payload, requestMeta = {}) {
  const now = new Date().toISOString();
  const existingLead = await findEditableLead(payload.recoveryId, payload.recoveryToken);
  const token = existingLead ? payload.recoveryToken : createCartRecoveryToken();
  const draft = buildCartRecoveryLead(payload, {
    id: existingLead?.id || crypto.randomUUID(),
    tokenHash: existingLead?.tokenHash || hashToken(token),
    firstSeenAt: existingLead?.firstSeenAt || now,
    createdAt: existingLead?.createdAt || now,
    now,
    requestMeta
  });

  if (getStoreMode() === "postgres") {
    await upsertPostgresLead(draft);
  } else {
    await upsertLocalLead(draft);
  }

  return {
    id: draft.id,
    token,
    status: draft.status,
    updatedAt: draft.updatedAt
  };
}

function buildCartRecoveryLead(payload, { id, tokenHash, firstSeenAt, createdAt, now, requestMeta }) {
  const items = sanitizeItems(payload.items);
  const customer = sanitizeCustomer(payload.customer);
  const shippingAddress = sanitizeAddress(payload.shippingAddress);
  const couponCode = normalizeCouponCode(payload.couponCode);
  const status = allowedStatuses.has(payload.status) ? payload.status : "active";
  const itemsSubtotalBrl = roundMoney(
    items.reduce((sum, item) => sum + Number(item.totalPriceBrl || item.priceBrl || 0), 0)
  );

  if (!items.length) {
    throw new Error("Carrinho vazio nao gera lead de recuperacao.");
  }

  if (!isValidEmail(customer.email) || !isUsefulContact(customer.contact)) {
    throw new Error("Informe e-mail e contato validos para salvar o carrinho.");
  }

  const commerce = calculateCommerceAdjustments({
    itemsSubtotalBrl,
    shippingAddress,
    couponCode
  });

  return {
    id,
    tokenHash,
    status,
    customer,
    shippingAddress,
    couponCode,
    items,
    commerce,
    cartHash: hashCart({ customer, items, shippingAddress, couponCode, commerce }),
    orderId: sanitizeText(payload.orderId, 80),
    source: sanitizeText(payload.source, 40) || "checkout",
    userAgent: sanitizeText(requestMeta.userAgent, 240),
    ipHash: requestMeta.ip ? hashToken(requestMeta.ip) : "",
    firstSeenAt,
    createdAt,
    updatedAt: now,
    convertedAt: status === "converted" ? now : null
  };
}

async function findEditableLead(id, token) {
  if (!id || !token) {
    return null;
  }

  const tokenHash = hashToken(token);

  if (getStoreMode() === "postgres") {
    await ensurePostgresSchema();
    const result = await query(
      `select id, token_hash, first_seen_at, created_at
       from cart_recovery_leads
       where id = $1 and token_hash = $2
       limit 1`,
      [id, tokenHash]
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          tokenHash: row.token_hash,
          firstSeenAt: row.first_seen_at,
          createdAt: row.created_at
        }
      : null;
  }

  const store = await readLocalStore();
  const lead = store.leads.find((item) => item.id === id && item.tokenHash === tokenHash);
  return lead
    ? {
        id: lead.id,
        tokenHash: lead.tokenHash,
        firstSeenAt: lead.firstSeenAt,
        createdAt: lead.createdAt
      }
    : null;
}

async function upsertPostgresLead(lead) {
  await ensurePostgresSchema();
  await prunePostgresLeads();
  await query(
    `insert into cart_recovery_leads (
      id, token_hash, status, customer, shipping_address, coupon_code, items,
      commerce, cart_hash, order_id, source, user_agent, ip_hash,
      first_seen_at, converted_at, created_at, updated_at
    ) values ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    on conflict (id) do update set
      status = excluded.status,
      customer = excluded.customer,
      shipping_address = excluded.shipping_address,
      coupon_code = excluded.coupon_code,
      items = excluded.items,
      commerce = excluded.commerce,
      cart_hash = excluded.cart_hash,
      order_id = coalesce(excluded.order_id, cart_recovery_leads.order_id),
      source = excluded.source,
      user_agent = excluded.user_agent,
      ip_hash = excluded.ip_hash,
      converted_at = coalesce(excluded.converted_at, cart_recovery_leads.converted_at),
      updated_at = excluded.updated_at
    where cart_recovery_leads.token_hash = excluded.token_hash`,
    [
      lead.id,
      lead.tokenHash,
      lead.status,
      JSON.stringify(lead.customer),
      JSON.stringify(lead.shippingAddress),
      lead.couponCode || null,
      JSON.stringify(lead.items),
      JSON.stringify(lead.commerce),
      lead.cartHash,
      lead.orderId || null,
      lead.source,
      lead.userAgent || null,
      lead.ipHash || null,
      lead.firstSeenAt,
      lead.convertedAt,
      lead.createdAt,
      lead.updatedAt
    ]
  );
}

async function upsertLocalLead(lead) {
  const store = await readLocalStore();
  store.leads = pruneLocalLeads(store.leads);
  const index = store.leads.findIndex((item) => item.id === lead.id && item.tokenHash === lead.tokenHash);

  if (index >= 0) {
    store.leads[index] = { ...store.leads[index], ...lead, createdAt: store.leads[index].createdAt };
  } else {
    store.leads.push(lead);
  }

  store.leads = store.leads
    .slice()
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
    .slice(0, maxLocalLeads);

  await writeLocalStore(store);
}

async function prunePostgresLeads() {
  const retentionDays = getCartRecoveryRetentionDays();
  if (!retentionDays) {
    return;
  }

  await query(
    `delete from cart_recovery_leads
     where updated_at < now() - ($1::integer * interval '1 day')`,
    [retentionDays]
  );
}

function pruneLocalLeads(leads = []) {
  const retentionDays = getCartRecoveryRetentionDays();
  if (!retentionDays) {
    return leads;
  }

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return leads.filter((lead) => {
    const updatedAt = new Date(lead.updatedAt || lead.createdAt || 0).getTime();
    return Number.isFinite(updatedAt) && updatedAt >= cutoff;
  });
}

function getCartRecoveryRetentionDays() {
  const value = Number(process.env.CART_RECOVERY_RETENTION_DAYS || defaultRetentionDays);
  if (!Number.isFinite(value) || value <= 0) {
    return defaultRetentionDays;
  }
  return Math.min(365, Math.round(value));
}

function sanitizeCustomer(customer = {}) {
  return {
    name: sanitizeText(customer.name, 120),
    email: normalizeEmail(customer.email),
    contact: sanitizeText(customer.contact, 40)
  };
}

function sanitizeAddress(address = {}) {
  return {
    postalCode: sanitizeText(address.postalCode, 16),
    street: sanitizeText(address.street, 140),
    number: sanitizeText(address.number, 30),
    complement: sanitizeText(address.complement, 80),
    district: sanitizeText(address.district, 80),
    city: sanitizeText(address.city, 80),
    state: sanitizeText(address.state, 2).toUpperCase()
  };
}

function sanitizeItems(items = []) {
  return (Array.isArray(items) ? items : []).slice(0, 30).map((item) => {
    const categorySlug = sanitizeText(item.categorySlug, 80);
    const formatSlug = sanitizeText(item.formatSlug, 80);
    const category = getCategoryBySlug(categorySlug);
    const format = category ? getFormat(category, formatSlug) : null;
    const values = sanitizeValues(item.values);
    const quantity = Math.max(1, Math.min(999, Number(item.quantity || 1)));
    const priceBreakdown = format
      ? calculatePriceBreakdown(format, values, quantity)
      : null;

    return {
      id: sanitizeText(item.id, 80),
      categorySlug,
      categoryName: category?.name || sanitizeText(item.categoryName, 120),
      formatSlug,
      formatName: format?.name || sanitizeText(item.formatName, 120),
      sku: sanitizeText(item.sku, 120),
      values,
      color: sanitizeText(item.color, 60),
      finish: sanitizeText(item.finish, 60),
      quantity,
      unitPriceBrl: roundMoney(priceBreakdown?.unitPriceBrl ?? item.unitPriceBrl),
      totalPriceBrl: roundMoney(priceBreakdown?.totalPriceBrl ?? item.priceBrl ?? item.totalPriceBrl),
      leadTimeDays: format
        ? calculateLeadTime(format, quantity)
        : Math.max(0, Math.min(120, Number(item.leadTimeDays || 0))),
      status: format ? "valid" : sanitizeText(item.status, 40) || "unverified"
    };
  });
}

function sanitizeValues(values = {}) {
  return Object.fromEntries(
    Object.entries(values || {})
      .slice(0, 20)
      .map(([key, value]) => [sanitizeText(key, 60), sanitizeText(value, 60)])
  );
}

function sanitizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeEmail(value) {
  return sanitizeText(value, 160).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUsefulContact(value) {
  return String(value || "").replace(/\D/g, "").length >= 8;
}

function hashCart(value) {
  return hashToken(JSON.stringify(value));
}

function hashToken(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function getStoreMode() {
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL precisa estar configurada em producao.");
  }
  return process.env.DATABASE_URL ? "postgres" : "local";
}

async function readLocalStore() {
  try {
    const raw = await fs.readFile(localRecoveryStorePath, "utf8");
    return normalizeLocalStore(JSON.parse(raw));
  } catch {
    return normalizeLocalStore({});
  }
}

async function writeLocalStore(store) {
  await fs.mkdir(path.dirname(localRecoveryStorePath), { recursive: true });
  await fs.writeFile(localRecoveryStorePath, JSON.stringify(normalizeLocalStore(store), null, 2));
}

function normalizeLocalStore(store) {
  return {
    leads: Array.isArray(store.leads) ? store.leads : []
  };
}

async function ensurePostgresSchema() {
  if (schemaReady) {
    return;
  }

  await query(`
    create table if not exists cart_recovery_leads (
      id text primary key,
      token_hash text not null,
      status text not null default 'active',
      customer jsonb not null default '{}'::jsonb,
      shipping_address jsonb not null default '{}'::jsonb,
      coupon_code text,
      items jsonb not null default '[]'::jsonb,
      commerce jsonb not null default '{}'::jsonb,
      cart_hash text not null,
      order_id text,
      source text not null default 'checkout',
      user_agent text,
      ip_hash text,
      first_seen_at timestamptz not null default now(),
      converted_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists cart_recovery_leads_status_idx
      on cart_recovery_leads(status, updated_at desc);
    create index if not exists cart_recovery_leads_email_idx
      on cart_recovery_leads((lower(customer->>'email')), updated_at desc);
    create index if not exists cart_recovery_leads_order_id_idx
      on cart_recovery_leads(order_id);
  `);

  schemaReady = true;
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
