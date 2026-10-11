-- Lifetime Team. A one-time Polar order may set source = lifetime with a plan.
-- That source stays writable for as long as a plan is set. It does not
-- consult trial_end. Grandfathered, Polar, none, and trial rows are unchanged.

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'billing_accounts'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) not ilike '%plan_key%'
      and (
        pg_get_constraintdef(con.oid) ilike '%source in (%'
        or pg_get_constraintdef(con.oid) ilike '%source = any%'
      )
  loop
    execute format(
      'alter table public.billing_accounts drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

alter table public.billing_accounts
  drop constraint if exists billing_accounts_source_check;

alter table public.billing_accounts
  add constraint billing_accounts_source_check
  check (source in ('polar', 'grandfathered', 'none', 'trial', 'lifetime'));

create or replace function billing_private.is_writable_account(p_account_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, billing_private, pg_temp
as $$
declare
  v_source text;
  v_plan_key text;
  v_provider_status text;
  v_past_due_since timestamptz;
  v_trial_end timestamptz;
begin
  select source, plan_key, provider_status, past_due_since, trial_end
  into v_source, v_plan_key, v_provider_status, v_past_due_since, v_trial_end
  from public.billing_accounts
  where account_id = p_account_id;

  if v_source = 'grandfathered' and v_plan_key is not null then
    return true;
  end if;

  if v_source = 'lifetime' and v_plan_key is not null then
    return true;
  end if;

  if v_source = 'trial'
    and v_plan_key is not null
    and v_trial_end is not null
    and v_trial_end > now()
  then
    return true;
  end if;

  return v_source = 'polar'
    and v_plan_key is not null
    and (
      v_provider_status in ('active', 'trialing')
      or (
        v_provider_status = 'past_due'
        and v_past_due_since is not null
        and now() < v_past_due_since + interval '7 days'
      )
    );
end;
$$;

revoke all on function billing_private.is_writable_account(uuid) from public, anon;
grant execute on function billing_private.is_writable_account(uuid) to authenticated;
