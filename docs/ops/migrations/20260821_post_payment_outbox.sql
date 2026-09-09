create table if not exists post_payment_outbox (
  id text primary key,
  event_type text not null check (
    event_type in ('payment_customer_email', 'payment_review_email', 'focus_nfe_invoice')
  ),
  order_id text not null references orders(id) on delete cascade,
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (
    status in ('queued', 'processing', 'succeeded', 'failed')
  ),
  attempts integer not null default 0,
  max_attempts integer not null default 8,
  available_at timestamptz not null default now(),
  worker_id text,
  lease_token_hash text,
  leased_until timestamptz,
  last_error jsonb,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists post_payment_outbox_claim_idx
  on post_payment_outbox(status, available_at, created_at);

create index if not exists post_payment_outbox_order_idx
  on post_payment_outbox(order_id, created_at desc);
