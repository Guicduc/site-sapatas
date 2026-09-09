-- Preserve tables previously created lazily by requests, before removing runtime DDL.
create table if not exists customers (
  id text primary key,
  name text not null,
  contact text not null,
  email text,
  document text check (document is null or document ~ '^([0-9]{11}|[0-9]{14})$'),
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

create table if not exists print_jobs (
  id text primary key,
  schema_version integer not null default 1,
  idempotency_key text not null unique,
  source text not null,
  source_id text not null,
  source_item_id text,
  source_label text,
  origin jsonb not null default '{}'::jsonb,
  material jsonb not null default '{}'::jsonb,
  contract jsonb not null default '{}'::jsonb,
  status text not null check (status in ('queued','processing','succeeded','failed','cancelled')),
  priority text not null default 'normal' check (priority in ('urgent','high','normal','low')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  worker_id text,
  lease_token_hash text,
  leased_until timestamptz,
  available_at timestamptz not null default now(),
  artifacts jsonb not null default '[]'::jsonb,
  error jsonb,
  last_event_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists print_jobs_claim_idx
  on print_jobs (status, available_at, priority, created_at);

create index if not exists print_jobs_origin_idx
  on print_jobs (source, source_id, source_item_id);


create table if not exists account_access_codes (
  id text primary key,
  email text not null,
  order_id text,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists account_access_codes_email_idx on account_access_codes(email, created_at desc);

-- Identidade de conta separada de customers, que continua sendo uma linha por pedido.
create table if not exists customer_accounts (
  id text primary key,
  email text not null unique,
  password_hash text,
  password_set_at timestamptz,
  password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists customer_account_orders (
  account_id text not null references customer_accounts(id) on delete cascade,
  order_id text not null references orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (account_id, order_id)
);
create table if not exists customer_account_sessions (
  id text primary key,
  account_id text not null references customer_accounts(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  recent_auth_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists customer_account_sessions_account_idx on customer_account_sessions(account_id, revoked_at, expires_at);
create table if not exists account_rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  attempts integer not null default 0
);
create index if not exists account_rate_limits_window_idx on account_rate_limits(window_started_at);


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


alter table account_access_codes add column if not exists order_id text;
alter table account_access_codes alter column order_id drop not null;
alter table account_access_codes add column if not exists attempts integer not null default 0;
