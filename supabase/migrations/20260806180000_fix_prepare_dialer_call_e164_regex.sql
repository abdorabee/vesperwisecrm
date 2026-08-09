-- Fixes a live bug in prepare_dialer_call (20260722022022_production_dialer.sql:321).
--
-- The E.164 check used '^\\+[1-9][0-9]{6,14}$'. With standard_conforming_strings
-- on (Postgres default), that literal is two backslashes followed by a plus, so
-- the compiled regex requires one-or-more literal backslash characters where a
-- real E.164 number has a single '+'. Every correctly formatted number (e.g.
-- '+14155552671') was rejected -- the dialer could never place a call. This
-- reissues the function unchanged except for that single-character fix.

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
  if p_phone_e164 !~ '^\+[1-9][0-9]{6,14}$' then
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

notify pgrst, 'reload schema';
