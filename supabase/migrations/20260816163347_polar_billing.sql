-- Polar billing state, idempotent webhook receipts, and atomic Starter quota.
-- Provider writes use the service role through the webhook route. Account
-- members may read only their own billing summary and usage.

create schema if not exists billing_private;

create table public.billing_accounts (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  source text not null default 'none'
    check (source in ('polar', 'grandfathered', 'none')),
  plan_key text
    check (plan_key is null or plan_key in ('starter', 'team', 'scale')),
  provider_status text
    check (provider_status is null or provider_status in (
      'incomplete', 'incomplete_expired', 'trialing', 'active',
      'past_due', 'canceled', 'unpaid', 'revoked', 'paused'
    )),
  polar_customer_id text,
  polar_subscription_id text,
  polar_product_id text,
  seats integer not null default 1 check (seats between 1 and 1000),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  past_due_since timestamptz,
  last_provider_modified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_accounts_source_plan_check check (
    (source = 'none' and plan_key is null)
    or (source <> 'none' and plan_key is not null)
  ),
  constraint billing_accounts_subscription_unique unique (polar_subscription_id)
);

create index billing_accounts_polar_customer_idx
  on public.billing_accounts (polar_customer_id)
  where polar_customer_id is not null;

create table public.billing_webhook_events (
  provider_event_id text primary key,
  event_type text not null,
  account_id uuid references public.accounts(id) on delete set null,
  provider_modified_at timestamptz,
  payload jsonb not null,
  processing_status text not null default 'processing'
    check (processing_status in ('processing', 'processed', 'failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index billing_webhook_events_account_idx
  on public.billing_webhook_events (account_id, received_at desc);

create table public.billing_usage_periods (
  account_id uuid not null references public.accounts(id) on delete cascade,
  period_start date not null,
  leads_created integer not null default 0 check (leads_created >= 0),
  updated_at timestamptz not null default now(),
  primary key (account_id, period_start)
);

alter table public.billing_accounts enable row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.billing_usage_periods enable row level security;

revoke all on public.billing_accounts from anon, authenticated;
grant select on public.billing_accounts to authenticated;
revoke all on public.billing_webhook_events from anon, authenticated;
revoke all on public.billing_usage_periods from anon, authenticated;
grant select on public.billing_usage_periods to authenticated;

create policy "select own billing account"
  on public.billing_accounts
  for select
  to authenticated
  using (public.is_account_member(account_id));

create policy "select own billing usage"
  on public.billing_usage_periods
  for select
  to authenticated
  using (public.is_account_member(account_id));

-- Existing workspaces retain Starter-level access while owners are prompted
-- to connect a paid Polar subscription. New accounts start billing-required.
insert into public.billing_accounts (account_id, source, plan_key, provider_status)
select id, 'grandfathered', 'starter', 'active'
from public.accounts
on conflict (account_id) do nothing;

create or replace function billing_private.create_billing_account()
returns trigger
language plpgsql
security definer
set search_path = public, billing_private, pg_temp
as $$
begin
  insert into public.billing_accounts (account_id, source)
  values (new.id, 'none')
  on conflict (account_id) do nothing;
  return new;
end;
$$;

create trigger create_billing_account
  after insert on public.accounts
  for each row execute function billing_private.create_billing_account();

create or replace function billing_private.enforce_lead_quota()
returns trigger
language plpgsql
security definer
set search_path = public, billing_private, pg_temp
as $$
declare
  v_source text;
  v_plan_key text;
  v_period_start date;
  v_leads_created integer;
begin
  select source, plan_key
  into v_source, v_plan_key
  from public.billing_accounts
  where account_id = new.account_id
  for update;

  if not found or v_source = 'none' then
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

create trigger enforce_billing_lead_quota
  before insert on public.leads
  for each row execute function billing_private.enforce_lead_quota();

-- Server actions perform the normal entitlement checks, while restrictive RLS
-- policies make the same read-only boundary hold for direct authenticated
-- Data API writes. Service-role webhooks and trusted provisioning continue to
-- bypass RLS as intended.
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
begin
  select source, plan_key, provider_status, past_due_since
  into v_source, v_plan_key, v_provider_status, v_past_due_since
  from public.billing_accounts
  where account_id = p_account_id;

  if v_source = 'grandfathered' and v_plan_key is not null then
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

create or replace function billing_private.enforce_invite_seat_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, billing_private, pg_temp
as $$
declare
  v_seats integer;
  v_members integer;
  v_pending_invites integer;
begin
  if not billing_private.is_writable_account(new.account_id) then
    raise exception 'Billing is read-only until the subscription is restored';
  end if;

  select seats
  into v_seats
  from public.billing_accounts
  where account_id = new.account_id
  for update;

  select count(*)
  into v_members
  from public.account_members
  where account_id = new.account_id;

  select count(*)
  into v_pending_invites
  from public.invites
  where account_id = new.account_id
    and id <> new.id
    and redeemed_at is null
    and expires_at > now();

  if v_members + v_pending_invites >= coalesce(v_seats, 0) then
    raise exception 'Workspace seat capacity exceeded';
  end if;

  return new;
end;
$$;

create trigger enforce_billing_invite_capacity
  before insert on public.invites
  for each row execute function billing_private.enforce_invite_seat_capacity();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'contacts', 'pipeline_stages', 'leads', 'tags', 'lead_tags',
    'lead_properties', 'lead_tasks', 'activities', 'sequences',
    'sequence_steps', 'lead_sequence_enrollments', 'sequence_step_sends',
    'lead_groups', 'lead_group_members', 'workflows', 'workflow_actions',
    'invites', 'clients', 'lead_client_comments', 'dialer_settings',
    'call_dispositions', 'dialer_queues', 'dialer_queue_items', 'calls',
    'call_attempts', 'call_events', 'dialer_provider_credentials',
    'account_phone_numbers'
  ] loop
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated with check (billing_private.is_writable_account(account_id))',
      'billing writable insert',
      table_name
    );
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated using (billing_private.is_writable_account(account_id)) with check (billing_private.is_writable_account(account_id))',
      'billing writable update',
      table_name
    );
    execute format(
      'create policy %I on public.%I as restrictive for delete to authenticated using (billing_private.is_writable_account(account_id))',
      'billing writable delete',
      table_name
    );
  end loop;
end $$;

revoke all on schema billing_private from public;
revoke execute on function billing_private.create_billing_account() from public, anon, authenticated;
revoke execute on function billing_private.enforce_lead_quota() from public, anon, authenticated;
revoke execute on function billing_private.enforce_invite_seat_capacity() from public, anon, authenticated;
grant usage on schema billing_private to authenticated;
grant execute on function billing_private.is_writable_account(uuid) to authenticated;

notify pgrst, 'reload schema';
