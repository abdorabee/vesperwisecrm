-- 60-day Team trial. New workspaces and unpaid source=none rows get Team
-- access until trial_end. Grandfathered and Polar rows are unchanged.
-- After trial_end, writes fail the same way as billing required.

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
  check (source in ('polar', 'grandfathered', 'none', 'trial'));

create or replace function billing_private.create_billing_account()
returns trigger
language plpgsql
security definer
set search_path = public, billing_private, pg_temp
as $$
begin
  insert into public.billing_accounts (
    account_id,
    source,
    plan_key,
    provider_status,
    trial_start,
    trial_end
  )
  values (
    new.id,
    'trial',
    'team',
    'trialing',
    now(),
    now() + interval '60 days'
  )
  on conflict (account_id) do nothing;
  return new;
end;
$$;

create or replace function billing_private.enforce_lead_quota()
returns trigger
language plpgsql
security definer
set search_path = public, billing_private, pg_temp
as $$
declare
  v_source text;
  v_plan_key text;
  v_trial_end timestamptz;
  v_period_start date;
  v_leads_created integer;
begin
  select source, plan_key, trial_end
  into v_source, v_plan_key, v_trial_end
  from public.billing_accounts
  where account_id = new.account_id
  for update;

  if not found or v_source = 'none' then
    raise exception 'Billing required for this workspace';
  end if;

  if v_source = 'trial' and (
    v_plan_key is null
    or v_trial_end is null
    or v_trial_end <= now()
  ) then
    raise exception 'Billing required for this workspace';
  end if;

  if v_source = 'polar' and not (
    v_plan_key is not null
    and exists (
      select 1
      from public.billing_accounts
      where account_id = new.account_id
        and (
          provider_status in ('active', 'trialing')
          or (
            provider_status = 'past_due'
            and past_due_since is not null
            and now() < past_due_since + interval '7 days'
          )
        )
    )
  ) then
    raise exception 'Billing is read-only until the subscription is restored';
  end if;

  if v_plan_key in ('team', 'scale') then
    return new;
  end if;

  v_period_start := date_trunc('month', timezone('UTC', now()))::date;

  insert into public.billing_usage_periods (account_id, period_start)
  values (new.account_id, v_period_start)
  on conflict (account_id, period_start) do nothing;

  update public.billing_usage_periods
  set leads_created = leads_created + 1,
      updated_at = now()
  where account_id = new.account_id
    and period_start = v_period_start
    and leads_created < 1000
  returning leads_created into v_leads_created;

  if v_leads_created is null then
    raise exception 'Starter lead quota exceeded';
  end if;

  return new;
end;
$$;

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

revoke all on schema billing_private from public;
revoke execute on function billing_private.create_billing_account() from public, anon, authenticated;
revoke execute on function billing_private.enforce_lead_quota() from public, anon, authenticated;
grant usage on schema billing_private to authenticated;
grant execute on function billing_private.is_writable_account(uuid) to authenticated;

update public.billing_accounts as billing
set
  source = 'trial',
  plan_key = 'team',
  provider_status = 'trialing',
  trial_start = accounts.created_at,
  trial_end = accounts.created_at + interval '60 days',
  updated_at = now()
from public.accounts as accounts
where billing.account_id = accounts.id
  and billing.source = 'none';
