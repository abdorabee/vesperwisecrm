-- Email polish: per-member sender identity, reply routing, health metrics,
-- platform suspend, sequence compliance, delivery events.

-- Per-member sender identity
alter table public.account_members
  add column from_display_name text,
  add column from_email_local_part text;

-- Account email settings extensions
alter table public.account_email_settings
  add column reply_routing_mode text not null default 'shared_inbox'
    check (reply_routing_mode in ('shared_inbox', 'agent_direct')),
  add column default_reply_to_email text,
  add column last_test_sent_at timestamptz,
  add column outbound_suspended boolean not null default false,
  add column suspended_at timestamptz,
  add column suspended_reason text;

-- Sequence / contact compliance
alter table public.contacts
  add column email_opted_out_at timestamptz;

alter table public.sequences
  add column is_marketing boolean not null default false;

-- Delivery event tracking (bounces, complaints, failures)
create table public.email_delivery_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  resend_email_id text not null,
  event_type text not null check (event_type in ('bounced', 'complained', 'failed')),
  recipient text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index email_delivery_events_account_created_idx
  on public.email_delivery_events (account_id, created_at desc);

alter table public.email_delivery_events enable row level security;

create policy "admin select email delivery events"
  on public.email_delivery_events
  for select
  using (public.is_account_admin(account_id));

-- Extend member profiles RPC with sender identity fields
-- (DROP required: return type change is not allowed via CREATE OR REPLACE)
drop function if exists public.get_account_member_profiles(uuid);

create function public.get_account_member_profiles(p_account_id uuid)
returns table (
  user_id uuid,
  email text,
  role text,
  lead_visibility text,
  max_open_leads integer,
  from_display_name text,
  from_email_local_part text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    am.user_id,
    u.email,
    am.role,
    am.lead_visibility,
    am.max_open_leads,
    am.from_display_name,
    am.from_email_local_part
  from public.account_members am
  join auth.users u on u.id = am.user_id
  where am.account_id = p_account_id
    and public.is_account_member(p_account_id);
$$;

revoke execute on function public.get_account_member_profiles(uuid) from public, anon;
grant execute on function public.get_account_member_profiles(uuid) to authenticated;

-- Resolve lead owner email for agent_direct reply routing
create or replace function public.get_lead_owner_email(p_lead_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select u.email
  from public.leads l
  join auth.users u on u.id = l.owner_user_id
  where l.id = p_lead_id
    and l.owner_user_id is not null;
$$;

revoke execute on function public.get_lead_owner_email(uuid) from public, anon;
grant execute on function public.get_lead_owner_email(uuid) to authenticated, service_role;
