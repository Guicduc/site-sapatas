create table if not exists promotion_redemptions (
  promotion_id text not null,
  identity_hash text not null,
  order_id text not null references orders(id) on delete cascade,
  status text not null default 'reserved' check (status in ('reserved', 'redeemed')),
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (promotion_id, identity_hash),
  unique (order_id, promotion_id)
);

create index if not exists promotion_redemptions_order_id_idx
  on promotion_redemptions(order_id);
