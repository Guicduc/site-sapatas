begin;

alter table customers add column if not exists document text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'customers_document_format_check'
  ) then
    alter table customers
      add constraint customers_document_format_check
      check (document is null or document ~ '^([0-9]{11}|[0-9]{14})$') not valid;
  end if;
end $$;

alter table customers validate constraint customers_document_format_check;

commit;
