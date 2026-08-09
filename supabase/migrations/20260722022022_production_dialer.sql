-- Production outbound dialer: tenant-safe queues, calls, attempts, dispositions,
-- provider event audit, DNC protection, and transactional lifecycle RPCs.

alter table public.contacts
  add column phone_e164 text,
  add column do_not_call_at timestamptz,
  add column do_not_call_reason text,
  add column do_not_call_by_user_id uuid references auth.users(id) on delete set null;

create index contacts_account_phone_e164_idx
  on public.contacts (account_id, phone_e164)
  where phone_e164 is not null and deleted_at is null;

create table public.dialer_settings (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  max_active_calls integer not null default 10 check (max_active_calls between 1 and 100),
  max_calls_per_second integer not null default 1 check (max_calls_per_second between 1 and 20),
  default_max_attempts integer not null default 3 check (default_max_attempts between 1 and 10),
  default_retry_delay_seconds integer not null default 300 check (default_retry_delay_seconds between 30 and 86400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.call_dispositions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  category text not null default 'other' check (category in (
    'connected', 'callback', 'no_answer', 'busy', 'wrong_number', 'do_not_call', 'other'
  )),
  is_active boolean not null default true,
  display_order integer not null default 0,
  is_retryable boolean not null default false,
  marks_do_not_call boolean not null default false,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, name),
  check (not marks_do_not_call or category = 'do_not_call')
);

create index call_dispositions_account_order_idx
  on public.call_dispositions (account_id, display_order, name);

create table public.dialer_queues (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  owner_user_id uuid references auth.users(id) on delete cascade,
  lead_group_id uuid references public.lead_groups(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  max_active_calls integer not null default 5 check (max_active_calls between 1 and 100),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  retry_delay_seconds integer not null default 300 check (retry_delay_seconds between 30 and 86400),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_user_id is null or lead_group_id is null)
);

create index dialer_queues_account_status_idx
  on public.dialer_queues (account_id, status);

create table public.dialer_queue_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  queue_id uuid not null references public.dialer_queues(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  position integer not null default 0,
  status text not null default 'queued' check (status in (
    'queued', 'in_progress', 'completed', 'cancelled'
  )),
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  next_attempt_at timestamptz,
  cancelled_by_user_id uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dialer_queue_items_ready_idx
  on public.dialer_queue_items (queue_id, position, created_at)
  where status = 'queued';
create unique index dialer_queue_items_queue_lead_unique
  on public.dialer_queue_items (queue_id, lead_id)
  where lead_id is not null;
create unique index dialer_queue_items_queue_contact_only_unique
  on public.dialer_queue_items (queue_id, contact_id)
  where lead_id is null;

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete set null,
  queue_item_id uuid references public.dialer_queue_items(id) on delete set null,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  direction text not null default 'outbound' check (direction = 'outbound'),
  status text not null default 'queued' check (status in (
    'queued', 'initiating', 'ringing', 'answered', 'completed',
    'busy', 'no_answer', 'cancelled', 'failed'
  )),
  to_phone_e164 text not null,
  latest_disposition_id uuid references public.call_dispositions(id) on delete set null,
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calls_account_created_idx on public.calls (account_id, created_at desc);
create index calls_contact_created_idx on public.calls (contact_id, created_at desc);
create index calls_lead_created_idx on public.calls (lead_id, created_at desc) where lead_id is not null;
create index calls_queue_item_idx on public.calls (queue_item_id) where queue_item_id is not null;

create table public.call_attempts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  call_id uuid not null references public.calls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  idempotency_key uuid not null,
  provider text not null,
  status text not null default 'initiating' check (status in (
    'queued', 'initiating', 'ringing', 'answered', 'completed',
    'busy', 'no_answer', 'cancelled', 'failed'
  )),
  provider_parent_call_id text,
  provider_call_id text,
  last_provider_sequence integer not null default -1,
  disposition_id uuid references public.call_dispositions(id) on delete set null,
  notes text,
  failure_code text,
  failure_reason text,
  initiated_at timestamptz not null default now(),
  ringing_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, idempotency_key),
  unique (call_id, attempt_number)
);

create unique index call_attempts_provider_parent_unique
  on public.call_attempts (provider, provider_parent_call_id)
  where provider_parent_call_id is not null;
create unique index call_attempts_provider_call_unique
  on public.call_attempts (provider, provider_call_id)
  where provider_call_id is not null;
create unique index call_attempts_one_active_per_user
  on public.call_attempts (account_id, user_id)
  where status in ('initiating', 'ringing', 'answered');
create index call_attempts_stale_idx
  on public.call_attempts (updated_at)
  where status in ('initiating', 'ringing', 'answered');

create table public.call_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  call_id uuid not null references public.calls(id) on delete cascade,
  attempt_id uuid references public.call_attempts(id) on delete cascade,
  event_type text not null,
  normalized_status text check (normalized_status is null or normalized_status in (
    'queued', 'initiating', 'ringing', 'answered', 'completed',
    'busy', 'no_answer', 'cancelled', 'failed'
  )),
  source text not null check (source in ('user', 'system', 'provider')),
  provider text,
  provider_event_key text,
  provider_sequence integer,
  payload jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index call_events_provider_key_unique
  on public.call_events (provider, provider_event_key)
  where provider is not null and provider_event_key is not null;
create index call_events_call_created_idx on public.call_events (call_id, created_at desc);

-- Seed tenant defaults without modifying the existing signup trigger.
create or replace function public.seed_dialer_account_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.dialer_settings (account_id)
  values (new.id)
  on conflict (account_id) do nothing;

  insert into public.call_dispositions
    (account_id, name, category, display_order, is_retryable, marks_do_not_call, is_system)
  values
    (new.id, 'Connected', 'connected', 10, false, false, true),
    (new.id, 'Callback requested', 'callback', 20, true, false, true),
    (new.id, 'No answer', 'no_answer', 30, true, false, true),
    (new.id, 'Busy', 'busy', 40, true, false, true),
    (new.id, 'Wrong number', 'wrong_number', 50, false, false, true),
    (new.id, 'Do not call', 'do_not_call', 60, false, true, true),
    (new.id, 'Other', 'other', 70, false, false, true)
  on conflict (account_id, name) do nothing;
  return new;
end;
$$;

revoke execute on function public.seed_dialer_account_defaults() from public, anon, authenticated;

create trigger seed_dialer_defaults_after_account_insert
  after insert on public.accounts
  for each row execute function public.seed_dialer_account_defaults();

insert into public.dialer_settings (account_id)
select id from public.accounts
on conflict (account_id) do nothing;

insert into public.call_dispositions
  (account_id, name, category, display_order, is_retryable, marks_do_not_call, is_system)
select a.id, d.name, d.category, d.display_order, d.is_retryable, d.marks_do_not_call, true
from public.accounts a
cross join (values
  ('Connected', 'connected', 10, false, false),
  ('Callback requested', 'callback', 20, true, false),
  ('No answer', 'no_answer', 30, true, false),
  ('Busy', 'busy', 40, true, false),
  ('Wrong number', 'wrong_number', 50, false, false),
  ('Do not call', 'do_not_call', 60, false, true),
  ('Other', 'other', 70, false, false)
) as d(name, category, display_order, is_retryable, marks_do_not_call)
on conflict (account_id, name) do nothing;

-- Client-portal users are account members for portal purposes, but must never
-- receive internal CRM dialer access.
create or replace function public.is_internal_account_member(p_account_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.account_members am
    where am.account_id = p_account_id
      and am.user_id = (select auth.uid())
      and am.role <> 'client'
  );
$$;

revoke execute on function public.is_internal_account_member(uuid) from public, anon;
grant execute on function public.is_internal_account_member(uuid) to authenticated;

-- Central authorization predicate used by RLS and transactional RPCs.
create or replace function public.can_access_dialer_lead(p_account_id uuid, p_lead_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_internal_account_member(p_account_id)
    and exists (
      select 1
      from public.leads l
      where l.id = p_lead_id
        and l.account_id = p_account_id
        and l.deleted_at is null
        and (
          l.owner_user_id = (select auth.uid())
          or public.is_account_admin(p_account_id)
          or not exists (
            select 1 from public.account_members am
            where am.account_id = p_account_id
              and am.user_id = (select auth.uid())
              and am.lead_visibility = 'assigned_only'
          )
        )
    );
$$;

revoke execute on function public.can_access_dialer_lead(uuid, uuid) from public, anon;
grant execute on function public.can_access_dialer_lead(uuid, uuid) to authenticated;

-- Atomically reserve a logical call and provider attempt. Destination numbers
-- are normalized by the trusted server and checked again against the contact.
create or replace function public.prepare_dialer_call(
  p_contact_id uuid,
  p_lead_id uuid,
  p_queue_item_id uuid,
  p_phone_e164 text,
  p_idempotency_key uuid,
  p_provider text,
  p_max_calls_per_second integer
)
returns table (call_id uuid, attempt_id uuid, attempt_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_call_id uuid;
  v_attempt_id uuid;
  v_attempt_number integer;
  v_queue public.dialer_queues%rowtype;
  v_queue_item public.dialer_queue_items%rowtype;
  v_settings public.dialer_settings%rowtype;
  v_active_count integer;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;
  if p_phone_e164 !~ '^\\+[1-9][0-9]{6,14}$' then
    raise exception 'Invalid E.164 phone number';
  end if;
  if p_max_calls_per_second is null or p_max_calls_per_second not between 1 and 20 then
    raise exception 'Invalid provider rate limit';
  end if;

  select c.account_id into v_account_id
  from public.contacts c
  where c.id = p_contact_id and c.deleted_at is null;

  if v_account_id is null or not public.is_internal_account_member(v_account_id) then
    raise exception 'Contact not found or inaccessible';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_account_id::text, 0));

  select * into v_settings from public.dialer_settings where account_id = v_account_id;
  if not found then
    raise exception 'Dialer settings are missing';
  end if;

  select ca.call_id, ca.id, ca.status
  into v_call_id, v_attempt_id, attempt_status
  from public.call_attempts ca
  where ca.account_id = v_account_id
    and ca.idempotency_key = p_idempotency_key
    and ca.user_id = v_user_id;
  if found then
    call_id := v_call_id;
    attempt_id := v_attempt_id;
    return next;
    return;
  end if;

  if p_lead_id is not null then
    if not public.can_access_dialer_lead(v_account_id, p_lead_id) then
      raise exception 'Lead not found or inaccessible';
    end if;
    perform 1 from public.leads
    where id = p_lead_id and account_id = v_account_id and contact_id = p_contact_id;
    if not found then
      raise exception 'Lead and contact do not match';
    end if;
  end if;

  if exists (
    select 1 from public.contacts c
    where c.account_id = v_account_id
      and c.phone_e164 = p_phone_e164
      and c.do_not_call_at is not null
      and c.deleted_at is null
  ) then
    raise exception 'This phone number is marked Do Not Call';
  end if;

  update public.contacts
  set phone_e164 = p_phone_e164, updated_at = now()
  where id = p_contact_id and account_id = v_account_id;

  if exists (
    select 1 from public.call_attempts ca
    where ca.account_id = v_account_id
      and ca.user_id = v_user_id
      and ca.status in ('initiating', 'ringing', 'answered')
  ) then
    raise exception 'You already have an active call';
  end if;

  select count(*) into v_active_count
  from public.call_attempts ca
  where ca.account_id = v_account_id
    and ca.status in ('initiating', 'ringing', 'answered');
  if v_active_count >= v_settings.max_active_calls then
    raise exception 'Workspace active-call limit reached';
  end if;

  if (
    select count(*) from public.call_attempts ca
    where ca.account_id = v_account_id
      and ca.created_at >= now() - interval '1 second'
  ) >= least(v_settings.max_calls_per_second, p_max_calls_per_second) then
    raise exception 'Provider call rate limit reached';
  end if;

  if p_queue_item_id is not null then
    select * into v_queue_item from public.dialer_queue_items where id = p_queue_item_id for update;
    if not found or v_queue_item.account_id <> v_account_id
      or v_queue_item.contact_id <> p_contact_id
      or v_queue_item.lead_id is distinct from p_lead_id then
      raise exception 'Queue item does not match the call target';
    end if;
    if v_queue_item.status <> 'queued'
      or (v_queue_item.next_attempt_at is not null and v_queue_item.next_attempt_at > now()) then
      raise exception 'Queue item is not ready';
    end if;

    select * into v_queue from public.dialer_queues where id = v_queue_item.queue_id for update;
    if not found or v_queue.status <> 'active' then
      raise exception 'Queue is not active';
    end if;
    if v_queue.owner_user_id is not null and v_queue.owner_user_id <> v_user_id
      and not public.is_account_admin(v_account_id) then
      raise exception 'Personal queue is not accessible';
    end if;
    if v_queue.lead_group_id is not null
      and not public.is_account_admin(v_account_id)
      and not exists (
        select 1 from public.lead_group_members gm
        where gm.group_id = v_queue.lead_group_id and gm.user_id = v_user_id
      ) then
      raise exception 'Queue is restricted to another group';
    end if;
    if (
      select count(*) from public.dialer_queue_items qi
      where qi.queue_id = v_queue.id and qi.status = 'in_progress'
    ) >= v_queue.max_active_calls then
      raise exception 'Queue active-call limit reached';
    end if;

    select c.id into v_call_id
    from public.calls c
    where c.queue_item_id = p_queue_item_id
    order by c.created_at desc
    limit 1;
  end if;

  if v_call_id is null then
    insert into public.calls (
      account_id, contact_id, lead_id, queue_item_id, owner_user_id,
      status, to_phone_e164, started_at
    ) values (
      v_account_id, p_contact_id, p_lead_id, p_queue_item_id, v_user_id,
      'initiating', p_phone_e164, now()
    ) returning id into v_call_id;
  else
    update public.calls
    set owner_user_id = v_user_id, status = 'initiating', failure_reason = null,
        started_at = now(), answered_at = null, ended_at = null, updated_at = now()
    where id = v_call_id;
  end if;

  select coalesce(max(ca.attempt_number), 0) + 1 into v_attempt_number
  from public.call_attempts ca where ca.call_id = v_call_id;

  insert into public.call_attempts (
    account_id, call_id, user_id, attempt_number, idempotency_key, provider, status
  ) values (
    v_account_id, v_call_id, v_user_id, v_attempt_number, p_idempotency_key,
    p_provider, 'initiating'
  ) returning id into v_attempt_id;

  if p_queue_item_id is not null then
    update public.dialer_queue_items
    set status = 'in_progress', claimed_by_user_id = v_user_id,
        claimed_at = now(), updated_at = now()
    where id = p_queue_item_id;
  end if;

  insert into public.call_events (
    account_id, call_id, attempt_id, event_type, normalized_status,
    source, actor_user_id
  ) values (
    v_account_id, v_call_id, v_attempt_id, 'call_initiated', 'initiating',
    'user', v_user_id
  );

  call_id := v_call_id;
  attempt_id := v_attempt_id;
  attempt_status := 'initiating';
  return next;
end;
$$;

revoke execute on function public.prepare_dialer_call(uuid, uuid, uuid, text, uuid, text, integer)
  from public, anon;
grant execute on function public.prepare_dialer_call(uuid, uuid, uuid, text, uuid, text, integer)
  to authenticated;

create or replace function public.attach_dialer_provider_call(
  p_attempt_id uuid,
  p_provider_parent_call_id text,
  p_provider_event_key text,
  p_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.call_attempts%rowtype;
begin
  select * into v_attempt from public.call_attempts where id = p_attempt_id for update;
  if not found or v_attempt.status not in ('initiating', 'ringing') then
    return false;
  end if;
  if v_attempt.provider_parent_call_id is not null
    and v_attempt.provider_parent_call_id <> p_provider_parent_call_id then
    return false;
  end if;

  update public.call_attempts
  set provider_parent_call_id = p_provider_parent_call_id, updated_at = now()
  where id = p_attempt_id;

  insert into public.call_events (
    account_id, call_id, attempt_id, event_type, normalized_status, source,
    provider, provider_event_key, payload
  ) values (
    v_attempt.account_id, v_attempt.call_id, v_attempt.id, 'provider_call_attached',
    'initiating', 'provider', v_attempt.provider, p_provider_event_key,
    coalesce(p_payload, '{}'::jsonb)
  ) on conflict (provider, provider_event_key) where provider is not null and provider_event_key is not null
    do nothing;
  return true;
end;
$$;

revoke execute on function public.attach_dialer_provider_call(uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.attach_dialer_provider_call(uuid, text, text, jsonb)
  to service_role;

create or replace function public.process_dialer_provider_event(
  p_attempt_id uuid,
  p_provider_call_id text,
  p_provider_event_key text,
  p_provider_sequence integer,
  p_event_type text,
  p_status text,
  p_failure_code text,
  p_failure_reason text,
  p_payload jsonb,
  p_occurred_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.call_attempts%rowtype;
  v_call public.calls%rowtype;
  v_was_terminal boolean;
  v_is_terminal boolean;
begin
  if p_status not in (
    'queued', 'initiating', 'ringing', 'answered', 'completed',
    'busy', 'no_answer', 'cancelled', 'failed'
  ) then
    raise exception 'Invalid normalized call status';
  end if;

  select * into v_attempt from public.call_attempts where id = p_attempt_id for update;
  if not found then
    return 'not_found';
  end if;

  insert into public.call_events (
    account_id, call_id, attempt_id, event_type, normalized_status, source,
    provider, provider_event_key, provider_sequence, payload, occurred_at
  ) values (
    v_attempt.account_id, v_attempt.call_id, v_attempt.id, p_event_type,
    p_status, 'provider', v_attempt.provider, p_provider_event_key,
    p_provider_sequence, coalesce(p_payload, '{}'::jsonb), coalesce(p_occurred_at, now())
  ) on conflict (provider, provider_event_key) where provider is not null and provider_event_key is not null
    do nothing;

  if not found then
    return 'duplicate';
  end if;

  v_was_terminal := v_attempt.status in ('completed', 'busy', 'no_answer', 'cancelled', 'failed');
  v_is_terminal := p_status in ('completed', 'busy', 'no_answer', 'cancelled', 'failed');

  if v_was_terminal or p_provider_sequence <= v_attempt.last_provider_sequence then
    return 'stored';
  end if;

  update public.call_attempts
  set provider_call_id = coalesce(provider_call_id, nullif(p_provider_call_id, '')),
      status = p_status,
      last_provider_sequence = p_provider_sequence,
      ringing_at = case when p_status = 'ringing' then coalesce(ringing_at, p_occurred_at, now()) else ringing_at end,
      answered_at = case when p_status = 'answered' then coalesce(answered_at, p_occurred_at, now()) else answered_at end,
      ended_at = case when v_is_terminal then coalesce(ended_at, p_occurred_at, now()) else ended_at end,
      failure_code = p_failure_code,
      failure_reason = p_failure_reason,
      updated_at = now()
  where id = p_attempt_id;

  select * into v_call from public.calls where id = v_attempt.call_id for update;
  update public.calls
  set status = p_status,
      answered_at = case when p_status = 'answered' then coalesce(answered_at, p_occurred_at, now()) else answered_at end,
      ended_at = case when v_is_terminal then coalesce(ended_at, p_occurred_at, now()) else ended_at end,
      failure_reason = p_failure_reason,
      updated_at = now()
  where id = v_attempt.call_id;

  if p_status = 'ringing' and v_call.lead_id is not null then
    insert into public.activities (account_id, lead_id, type, actor_user_id, payload)
    values (
      v_attempt.account_id, v_call.lead_id, 'call_started', v_attempt.user_id,
      jsonb_build_object('call_id', v_call.id, 'attempt_id', v_attempt.id)
    );
  elsif v_is_terminal and v_call.lead_id is not null then
    insert into public.activities (account_id, lead_id, type, actor_user_id, payload)
    values (
      v_attempt.account_id, v_call.lead_id, 'call_completed', v_attempt.user_id,
      jsonb_build_object(
        'call_id', v_call.id, 'attempt_id', v_attempt.id, 'status', p_status,
        'failure_reason', p_failure_reason
      )
    );
  end if;

  return 'processed';
end;
$$;

revoke execute on function public.process_dialer_provider_event(
  uuid, text, text, integer, text, text, text, text, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.process_dialer_provider_event(
  uuid, text, text, integer, text, text, text, text, jsonb, timestamptz
) to service_role;

create or replace function public.set_dialer_disposition(
  p_attempt_id uuid,
  p_disposition_id uuid,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt public.call_attempts%rowtype;
  v_call public.calls%rowtype;
  v_disposition public.call_dispositions%rowtype;
  v_queue_item public.dialer_queue_items%rowtype;
  v_queue public.dialer_queues%rowtype;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if length(coalesce(p_notes, '')) > 10000 then raise exception 'Notes are too long'; end if;

  select * into v_attempt from public.call_attempts where id = p_attempt_id for update;
  if not found then raise exception 'Call attempt not found'; end if;
  if v_attempt.user_id <> v_user_id and not public.is_account_admin(v_attempt.account_id) then
    raise exception 'Not authorized to disposition this call';
  end if;
  if v_attempt.status not in ('completed', 'busy', 'no_answer', 'cancelled', 'failed') then
    raise exception 'End the call before saving a disposition';
  end if;

  select * into v_disposition from public.call_dispositions
  where id = p_disposition_id and account_id = v_attempt.account_id and is_active;
  if not found then raise exception 'Disposition not found'; end if;

  select * into v_call from public.calls where id = v_attempt.call_id for update;
  update public.call_attempts
  set disposition_id = v_disposition.id, notes = nullif(btrim(p_notes), ''), updated_at = now()
  where id = v_attempt.id;
  update public.calls
  set latest_disposition_id = v_disposition.id, updated_at = now()
  where id = v_call.id;

  if v_disposition.marks_do_not_call then
    update public.contacts
    set phone_e164 = v_call.to_phone_e164,
        do_not_call_at = now(),
        do_not_call_reason = v_disposition.name,
        do_not_call_by_user_id = v_user_id,
        updated_at = now()
    where account_id = v_attempt.account_id
      and phone_e164 = v_call.to_phone_e164;
    update public.contacts
    set phone_e164 = v_call.to_phone_e164,
        do_not_call_at = now(),
        do_not_call_reason = v_disposition.name,
        do_not_call_by_user_id = v_user_id,
        updated_at = now()
    where id = v_call.contact_id;
  end if;

  if v_call.queue_item_id is not null then
    select * into v_queue_item from public.dialer_queue_items where id = v_call.queue_item_id for update;
    select * into v_queue from public.dialer_queues where id = v_queue_item.queue_id;
    if v_disposition.is_retryable and v_attempt.attempt_number < v_queue.max_attempts then
      update public.dialer_queue_items
      set status = 'queued', claimed_by_user_id = null, claimed_at = null,
          next_attempt_at = now() + make_interval(secs => least(
            86400,
            v_queue.retry_delay_seconds * power(2, greatest(v_attempt.attempt_number - 1, 0))::integer
          )),
          updated_at = now()
      where id = v_queue_item.id;
    else
      update public.dialer_queue_items
      set status = 'completed', next_attempt_at = null, updated_at = now()
      where id = v_queue_item.id;
    end if;
  end if;

  insert into public.call_events (
    account_id, call_id, attempt_id, event_type, normalized_status, source,
    actor_user_id, payload
  ) values (
    v_attempt.account_id, v_call.id, v_attempt.id, 'disposition_set',
    v_attempt.status, 'user', v_user_id,
    jsonb_build_object('disposition_id', v_disposition.id, 'disposition_name', v_disposition.name)
  );

  if v_call.lead_id is not null then
    insert into public.activities (account_id, lead_id, type, actor_user_id, payload)
    values (
      v_attempt.account_id, v_call.lead_id, 'call_disposition_set', v_user_id,
      jsonb_build_object(
        'call_id', v_call.id, 'attempt_id', v_attempt.id,
        'disposition', v_disposition.name, 'status', v_attempt.status
      )
    );
  end if;
end;
$$;

revoke execute on function public.set_dialer_disposition(uuid, uuid, text) from public, anon;
grant execute on function public.set_dialer_disposition(uuid, uuid, text) to authenticated;

-- User-driven terminal transitions cover local SDK failures and explicit
-- hangups. Provider callbacks may subsequently be stored, but cannot overwrite
-- this terminal state.
create or replace function public.finalize_dialer_attempt(
  p_attempt_id uuid,
  p_status text,
  p_failure_code text,
  p_failure_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt public.call_attempts%rowtype;
  v_call public.calls%rowtype;
  v_queue_item public.dialer_queue_items%rowtype;
  v_queue public.dialer_queues%rowtype;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if p_status not in ('cancelled', 'failed') then
    raise exception 'Invalid user terminal status';
  end if;
  if length(coalesce(p_failure_code, '')) > 100
    or length(coalesce(p_failure_reason, '')) > 500 then
    raise exception 'Failure details are too long';
  end if;

  select * into v_attempt from public.call_attempts where id = p_attempt_id for update;
  if not found then raise exception 'Call attempt not found'; end if;
  if v_attempt.user_id <> v_user_id and not public.is_account_admin(v_attempt.account_id) then
    raise exception 'Not authorized to end this call';
  end if;
  if v_attempt.status in ('completed', 'busy', 'no_answer', 'cancelled', 'failed') then
    return;
  end if;

  update public.call_attempts
  set status = p_status,
      ended_at = coalesce(ended_at, now()),
      failure_code = nullif(btrim(p_failure_code), ''),
      failure_reason = nullif(btrim(p_failure_reason), ''),
      updated_at = now()
  where id = p_attempt_id;

  select * into v_call from public.calls where id = v_attempt.call_id for update;
  update public.calls
  set status = p_status,
      ended_at = coalesce(ended_at, now()),
      failure_reason = nullif(btrim(p_failure_reason), ''),
      updated_at = now()
  where id = v_attempt.call_id;

  if p_status = 'failed' and v_call.queue_item_id is not null then
    select * into v_queue_item
    from public.dialer_queue_items
    where id = v_call.queue_item_id
    for update;
    if found then
      select * into v_queue from public.dialer_queues where id = v_queue_item.queue_id;
      if v_attempt.attempt_number < v_queue.max_attempts then
        update public.dialer_queue_items
        set status = 'queued', claimed_by_user_id = null, claimed_at = null,
            next_attempt_at = now() + make_interval(secs => least(
              86400,
              v_queue.retry_delay_seconds * power(2, greatest(v_attempt.attempt_number - 1, 0))::integer
            )),
            updated_at = now()
        where id = v_queue_item.id;
      else
        update public.dialer_queue_items
        set status = 'completed', next_attempt_at = null, updated_at = now()
        where id = v_queue_item.id;
      end if;
    end if;
  end if;

  insert into public.call_events (
    account_id, call_id, attempt_id, event_type, normalized_status,
    source, actor_user_id, payload
  ) values (
    v_attempt.account_id, v_attempt.call_id, v_attempt.id,
    case when p_status = 'cancelled' then 'call_cancelled' else 'call_failed' end,
    p_status, 'user', v_user_id,
    jsonb_build_object('failure_code', nullif(btrim(p_failure_code), ''))
  );

  if v_call.lead_id is not null then
    insert into public.activities (account_id, lead_id, type, actor_user_id, payload)
    values (
      v_attempt.account_id, v_call.lead_id, 'call_completed', v_user_id,
      jsonb_build_object(
        'call_id', v_call.id, 'attempt_id', v_attempt.id, 'status', p_status,
        'failure_reason', nullif(btrim(p_failure_reason), '')
      )
    );
  end if;
end;
$$;

revoke execute on function public.finalize_dialer_attempt(uuid, text, text, text)
  from public, anon;
grant execute on function public.finalize_dialer_attempt(uuid, text, text, text)
  to authenticated;

create or replace function public.save_dialer_attempt_notes(
  p_attempt_id uuid,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt public.call_attempts%rowtype;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if length(coalesce(p_notes, '')) > 10000 then raise exception 'Notes are too long'; end if;

  select * into v_attempt from public.call_attempts where id = p_attempt_id;
  if not found then raise exception 'Call attempt not found'; end if;
  if v_attempt.user_id <> v_user_id and not public.is_account_admin(v_attempt.account_id) then
    raise exception 'Not authorized to edit this call';
  end if;

  update public.call_attempts
  set notes = nullif(btrim(p_notes), ''), updated_at = now()
  where id = p_attempt_id;
end;
$$;

revoke execute on function public.save_dialer_attempt_notes(uuid, text) from public, anon;
grant execute on function public.save_dialer_attempt_notes(uuid, text) to authenticated;

create or replace function public.clear_contact_do_not_call(p_contact_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  select account_id into v_account_id from public.contacts where id = p_contact_id;
  if v_account_id is null or not public.is_account_admin(v_account_id) then
    raise exception 'Admin access required';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'A clear reason is required';
  end if;
  update public.contacts
  set do_not_call_at = null, do_not_call_reason = null,
      do_not_call_by_user_id = null, updated_at = now()
  where id = p_contact_id;
  insert into public.call_events (
    account_id, call_id, event_type, source, actor_user_id, payload
  )
  select v_account_id, c.id, 'do_not_call_cleared', 'user', auth.uid(),
    jsonb_build_object('contact_id', p_contact_id, 'reason', btrim(p_reason))
  from public.calls c
  where c.contact_id = p_contact_id
  order by c.created_at desc
  limit 1;
end;
$$;

revoke execute on function public.clear_contact_do_not_call(uuid, text) from public, anon;
grant execute on function public.clear_contact_do_not_call(uuid, text) to authenticated;

-- RLS and explicit Data API privileges.
alter table public.dialer_settings enable row level security;
alter table public.call_dispositions enable row level security;
alter table public.dialer_queues enable row level security;
alter table public.dialer_queue_items enable row level security;
alter table public.calls enable row level security;
alter table public.call_attempts enable row level security;
alter table public.call_events enable row level security;

create policy "members select dialer settings" on public.dialer_settings
  for select to authenticated using (public.is_internal_account_member(account_id));
create policy "admins update dialer settings" on public.dialer_settings
  for update to authenticated using (public.is_account_admin(account_id))
  with check (public.is_account_admin(account_id));

create policy "members select call dispositions" on public.call_dispositions
  for select to authenticated using (public.is_internal_account_member(account_id));
create policy "admins insert call dispositions" on public.call_dispositions
  for insert to authenticated with check (public.is_account_admin(account_id));
create policy "admins update call dispositions" on public.call_dispositions
  for update to authenticated using (public.is_account_admin(account_id))
  with check (public.is_account_admin(account_id));
create policy "admins delete call dispositions" on public.call_dispositions
  for delete to authenticated using (public.is_account_admin(account_id) and not is_system);

create policy "members select accessible dialer queues" on public.dialer_queues
  for select to authenticated using (
    public.is_internal_account_member(account_id)
    and (
      public.is_account_admin(account_id)
      or owner_user_id is null
      or owner_user_id = (select auth.uid())
    )
    and (
      lead_group_id is null
      or public.is_account_admin(account_id)
      or exists (
        select 1 from public.lead_group_members gm
        where gm.group_id = lead_group_id and gm.user_id = (select auth.uid())
      )
    )
  );
create policy "members insert allowed dialer queues" on public.dialer_queues
  for insert to authenticated with check (
    public.is_internal_account_member(account_id)
    and (
      (owner_user_id = (select auth.uid()) and lead_group_id is null)
      or (owner_user_id is null and public.is_account_admin(account_id))
    )
  );
create policy "owners update dialer queues" on public.dialer_queues
  for update to authenticated using (
    public.is_account_admin(account_id) or owner_user_id = (select auth.uid())
  ) with check (
    public.is_account_admin(account_id) or owner_user_id = (select auth.uid())
  );
create policy "owners delete dialer queues" on public.dialer_queues
  for delete to authenticated using (
    public.is_account_admin(account_id) or owner_user_id = (select auth.uid())
  );

create policy "members select accessible queue items" on public.dialer_queue_items
  for select to authenticated using (
    public.is_internal_account_member(account_id)
    and (lead_id is null or public.can_access_dialer_lead(account_id, lead_id))
    and exists (select 1 from public.dialer_queues q where q.id = queue_id)
  );
create policy "queue owners insert queue items" on public.dialer_queue_items
  for insert to authenticated with check (
    public.is_internal_account_member(account_id)
    and (lead_id is null or public.can_access_dialer_lead(account_id, lead_id))
    and exists (
      select 1 from public.dialer_queues q
      where q.id = queue_id and q.account_id = account_id
        and (public.is_account_admin(account_id) or q.owner_user_id = (select auth.uid()))
    )
  );
create policy "queue owners update queue items" on public.dialer_queue_items
  for update to authenticated using (
    exists (
      select 1 from public.dialer_queues q
      where q.id = queue_id
        and (public.is_account_admin(account_id) or q.owner_user_id = (select auth.uid()))
    )
  ) with check (public.is_internal_account_member(account_id));
create policy "queue owners delete queue items" on public.dialer_queue_items
  for delete to authenticated using (
    exists (
      select 1 from public.dialer_queues q
      where q.id = queue_id
        and (public.is_account_admin(account_id) or q.owner_user_id = (select auth.uid()))
    )
  );

create policy "members select accessible calls" on public.calls
  for select to authenticated using (
    public.is_internal_account_member(account_id)
    and (
      owner_user_id = (select auth.uid())
      or public.is_account_admin(account_id)
      or lead_id is null
      or public.can_access_dialer_lead(account_id, lead_id)
    )
  );
create policy "members select accessible attempts" on public.call_attempts
  for select to authenticated using (
    public.is_internal_account_member(account_id)
    and exists (select 1 from public.calls c where c.id = call_id)
  );
create policy "members select accessible call events" on public.call_events
  for select to authenticated using (
    public.is_internal_account_member(account_id)
    and exists (select 1 from public.calls c where c.id = call_id)
  );

grant select, update on public.dialer_settings to authenticated;
grant select, insert, update, delete on public.call_dispositions to authenticated;
grant select, insert, update, delete on public.dialer_queues to authenticated;
grant select, insert, update, delete on public.dialer_queue_items to authenticated;
grant select on public.calls, public.call_attempts, public.call_events to authenticated;

-- Protect DNC columns from the broad legacy contact UPDATE grant. Existing
-- application columns retain their current write behavior.
revoke update on public.contacts from authenticated;
grant update (
  first_name, last_name, email, phone, company, source, notes, deleted_at,
  updated_at, email_opted_out_at
) on public.contacts to authenticated;

alter table public.activities drop constraint activities_type_check;
alter table public.activities add constraint activities_type_check check (type in (
  'stage_changed', 'tag_added', 'tag_removed', 'email_sent', 'email_received',
  'sms_sent', 'sms_received',
  'note_added', 'lead_created', 'sequence_enrolled', 'sequence_step_sent',
  'lead_assigned', 'lead_unassigned', 'workflow_triggered',
  'task_created', 'task_completed',
  'lead_qualified', 'lead_rejected', 'lead_needs_info',
  'report_generated',
  'client_assigned', 'client_interest_updated',
  'call_started', 'call_completed', 'call_disposition_set'
));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'calls'
  ) then
    alter publication supabase_realtime add table public.calls;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'call_attempts'
  ) then
    alter publication supabase_realtime add table public.call_attempts;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dialer_queue_items'
  ) then
    alter publication supabase_realtime add table public.dialer_queue_items;
  end if;
end;
$$;

notify pgrst, 'reload schema';
