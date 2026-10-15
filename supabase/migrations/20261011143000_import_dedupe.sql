-- Import dedupe counts. Skip and merge are successful row outcomes, separate
-- from leads created on this run.

alter table public.import_jobs
  add column if not exists duplicate_count integer not null default 0
    check (duplicate_count >= 0);

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'import_job_rows'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%';

  if constraint_name is not null then
    execute format(
      'alter table public.import_job_rows drop constraint %I',
      constraint_name
    );
  end if;
end $$;

alter table public.import_job_rows
  add constraint import_job_rows_status_check
  check (status in ('pending', 'imported', 'failed', 'skipped', 'merged'));

grant execute on function public.smart_search_digits(text) to authenticated, service_role;
grant execute on function public.get_related_leads(uuid, uuid, integer) to service_role;
