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

create table if not exists account_access_codes (
  id text primary key,
  email text not null,
  order_id text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists account_access_codes_email_idx on account_access_codes(email, created_at desc);

-- Fulfillment operacional fica em orders.metadata->'fulfillment'.
-- Estrutura atual:
-- {
--   "schemaVersion": 1,
--   "production": {
--     "status": "waiting_payment|waiting_cad|queued|scheduled|in_production|quality_check|ready_to_ship|blocked|shipped|cancelled",
--     "priority": "normal|high|urgent|low",
--     "scheduledDate": "YYYY-MM-DD",
--     "machine": "P2S-04",
--     "operator": "nome",
--     "notes": "observacoes"
--   },
--   "invoice": {
--     "status": "pending|manual_pending|manual_issued|not_required|cancelled",
--     "mode": "manual",
--     "number": "000123",
--     "series": "1",
--     "accessKey": "chave NF-e se houver",
--     "issuedAt": "ISO datetime",
--     "notes": "pendencias ou observacoes fiscais",
--     "updatedAt": "ISO datetime"
--   },
--   "shipment": {
--     "status": "pending|packing|ready_for_pickup|shipped|delivered|cancelled",
--     "carrier": "transportadora/manual/retirada",
--     "trackingCode": "codigo",
--     "shippedAt": "ISO datetime"
--   },
--   "capacity": {
--     "model": "made_to_order_queue",
--     "units": 0,
--     "workUnits": 0,
--     "printMinutes": 0,
--     "dailyCapacityUnits": 120
--   }
-- }
-- Nao ha baixa de estoque tradicional: capacidade e fila por pedido sob demanda.
create index if not exists orders_fulfillment_production_status_idx
  on orders ((metadata->'fulfillment'->'production'->>'status'));

create index if not exists orders_fulfillment_invoice_status_idx
  on orders ((metadata->'fulfillment'->'invoice'->>'status'));

create index if not exists orders_fulfillment_shipment_status_idx
  on orders ((metadata->'fulfillment'->'shipment'->>'status'));

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

-- Retencao operacional:
-- a aplicacao remove leads antigos de recuperacao de carrinho usando
-- CART_RECOVERY_RETENTION_DAYS, com padrao de 90 dias e limite maximo de 365 dias.

create table if not exists competitor_product_prices (
  id text primary key,
  supplier text not null,
  competitor_type text not null,
  competitor_model text not null,
  quote_date date,
  unit_price_brl numeric(12,2),
  ipi_percent numeric(5,2),
  final_price_brl numeric(12,2),
  image_ref text,
  competitor_notes text,
  own_comparable_family_slug text,
  own_comparable_family_name text,
  comparison_status text not null check (
    comparison_status in ('comparavel', 'comparavel_parcial', 'sem_comparativo')
  ),
  comparison_criteria text,
  confidence text not null default 'media' check (confidence in ('baixa', 'media', 'alta')),
  source text not null default 'imagem_orcamento_concorrente',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists competitor_product_prices_supplier_idx
  on competitor_product_prices(supplier);

create index if not exists competitor_product_prices_comparison_status_idx
  on competitor_product_prices(comparison_status);

create index if not exists competitor_product_prices_own_family_idx
  on competitor_product_prices(own_comparable_family_slug);
