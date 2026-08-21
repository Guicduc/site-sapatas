begin;

alter table customers add column if not exists document text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'customers_document_format_check'
      and conrelid = 'customers'::regclass
  ) then
    alter table customers
      add constraint customers_document_format_check
      check (document is null or document ~ '^([0-9]{11}|[0-9]{14})$') not valid;
  end if;
end $$;

alter table customers validate constraint customers_document_format_check;

with ranked_pending_preferences as (
  select id, row_number() over (
    partition by order_id, provider order by created_at desc, id desc
  ) as preference_rank
  from payments
  where provider = 'mercado_pago'
    and status = 'pending'
    and provider_payment_id is null
    and checkout_url is not null
)
update payments
  set status = 'expired', updated_at = now()
  where id in (
    select id from ranked_pending_preferences where preference_rank > 1
  );

create unique index if not exists payments_one_active_mp_preference_idx
  on payments(order_id)
  where provider = 'mercado_pago'
    and status = 'pending'
    and provider_payment_id is null
    and checkout_url is not null;

create table if not exists request_rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  attempts integer not null default 0
);

create index if not exists request_rate_limits_window_idx
  on request_rate_limits(window_started_at);

commit;
