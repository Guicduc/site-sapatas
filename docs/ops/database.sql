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
