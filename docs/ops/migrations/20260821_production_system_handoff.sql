create table if not exists production_work_routes (
  order_id text primary key references orders(id) on delete cascade,
  route text not null check (route in ('legacy_print_queue', 'external')),
  reason text,
  decided_at timestamptz not null default now()
);

-- Qualquer pedido que ja entrou na ponte tecnica continua nela ate reconciliacao
-- deliberada. A chave por pedido impede que a rota externa concorra com ela.
insert into production_work_routes (order_id, route, reason)
select distinct p.source_id, 'legacy_print_queue', 'migration_existing_print_job'
from print_jobs p
join orders o on o.id = p.source_id
where p.source = 'site_order'
on conflict (order_id) do nothing;

-- Producao fisica e print_jobs sao filas independentes. Pedidos que ja foram
-- iniciados manualmente tambem permanecem legados, mesmo sem job de arquivo.
insert into production_work_routes (order_id, route, reason)
select o.id, 'legacy_print_queue', 'migration_existing_manual_production'
from orders o
where o.status in ('in_production', 'cad_pending', 'cad_generated', 'ready_for_print', 'shipped')
   or coalesce(o.metadata->'fulfillment'->'production'->>'status', '') in (
     'in_production', 'quality_check', 'blocked', 'ready_to_ship', 'shipped'
   )
on conflict (order_id) do nothing;

create index if not exists production_work_routes_route_idx
  on production_work_routes(route, decided_at);

create table if not exists production_handoffs (
  id text primary key,
  order_id text not null unique references orders(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  snapshot jsonb not null,
  snapshot_sha256 text not null,
  available_at timestamptz,
  delivery_count integer not null default 0,
  first_delivered_at timestamptz,
  last_delivered_at timestamptz,
  acknowledged_at timestamptz,
  acknowledgement_idempotency_key text unique,
  acknowledged_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(snapshot) = 'object'),
  check (delivery_count >= 0)
);

create index if not exists production_handoffs_pull_idx
  on production_handoffs(available_at, created_at, id)
  where available_at is not null and acknowledged_at is null;

create index if not exists production_handoffs_staged_idx
  on production_handoffs(created_at, id)
  where available_at is null and acknowledged_at is null;

-- Um snapshot historico malformado nao pode bloquear todo o pull. A rejeicao
-- guarda somente codigo e contagem tecnica, sem copiar o pedido ou o cliente.
create table if not exists production_handoff_rejections (
  order_id text primary key references orders(id) on delete cascade,
  code text not null check (code in ('invalid_snapshot')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function reject_production_handoff_snapshot_update()
returns trigger
language plpgsql
as $$
begin
  if new.order_id is distinct from old.order_id
     or new.schema_version is distinct from old.schema_version
     or new.snapshot is distinct from old.snapshot
     or new.snapshot_sha256 is distinct from old.snapshot_sha256 then
    raise exception 'production_handoff_snapshot_is_immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists production_handoff_snapshot_immutable on production_handoffs;
create trigger production_handoff_snapshot_immutable
before update on production_handoffs
for each row execute function reject_production_handoff_snapshot_update();

create table if not exists production_milestone_events (
  id text primary key,
  external_event_id text not null unique,
  handoff_id text not null references production_handoffs(id) on delete cascade,
  order_id text not null references orders(id) on delete cascade,
  milestone text not null check (milestone in ('accepted', 'produced', 'failed')),
  occurred_at timestamptz not null,
  request_hash text not null,
  failure_reason text check (
    failure_reason is null or failure_reason in (
      'production_error', 'quality_issue', 'material_unavailable',
      'capacity_unavailable', 'unknown'
    )
  ),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists production_milestone_events_order_idx
  on production_milestone_events(order_id, occurred_at, created_at);
