-- Security findings: token column grants, enrollment account binding,
-- round-robin visibility, invite acceptance, intake token hashes,
-- client-comment assignment, and inbound SMS dedupe.
-- Apply this migration before merging. Do not run it against production
-- from the agent; operators apply it to the target database.

-- ---------------------------------------------------------------------------
-- Google OAuth tokens: authenticated sessions cannot read or write them.
-- Service role keeps the table grants it already has.
-- ---------------------------------------------------------------------------

revoke select, insert, update, delete on table public.google_integrations from anon, authenticated;

grant select (
  account_id,
  token_expires_at,
  connected_email,
  drive_folder_id,
  connected_by_user_id,
  connected_at,
  updated_at
) on table public.google_integrations to authenticated;

-- ---------------------------------------------------------------------------
-- Enrollment, lead, and sequence must share one account_id, including
-- when the service role inserts the row.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_enrollment_same_account()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  lead_account uuid;
  sequence_account uuid;
begin
  select account_id into lead_account
  from public.leads
  where id = new.lead_id;

  select account_id into sequence_account
  from public.sequences
  where id = new.sequence_id;

  if lead_account is null
     or sequence_account is null
     or lead_account is distinct from new.account_id
     or sequence_account is distinct from new.account_id then
    raise exception 'Enrollment, lead, and sequence must share one account';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_enrollment_same_account() from public;
grant execute on function public.enforce_enrollment_same_account() to authenticated, service_role;

drop trigger if exists enrollment_same_account on public.lead_sequence_enrollments;
create trigger enrollment_same_account
  before insert or update of account_id, lead_id, sequence_id
  on public.lead_sequence_enrollments
  for each row
  execute function public.enforce_enrollment_same_account();

-- ---------------------------------------------------------------------------
-- Round robin: the caller must be able to see the lead, and the group
-- must belong to that lead's account.
-- ---------------------------------------------------------------------------

create or replace function public.assign_lead_round_robin(p_lead_id uuid, p_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_total_weight numeric;
  v_winner_user_id uuid;
  v_eligible_user_ids uuid[];
begin
  select account_id into v_account_id from public.leads where id = p_lead_id;

  if v_account_id is null or not public.can_access_lead(p_lead_id) then
    raise exception 'Lead not found or not accessible';
  end if;

  perform 1 from public.lead_groups
  where id = p_group_id and account_id = v_account_id;
  if not found then
    raise exception 'Routing group not found for this account';
  end if;

  perform 1 from public.lead_group_members
  where group_id = p_group_id and account_id = v_account_id
  for update;

  select coalesce(array_agg(gm.user_id), '{}')
  into v_eligible_user_ids
  from public.lead_group_members gm
  join public.account_members am
    on am.account_id = gm.account_id and am.user_id = gm.user_id
  where gm.group_id = p_group_id
    and gm.account_id = v_account_id
    and gm.weight > 0
    and (
      am.max_open_leads is null
      or (
        select count(*) from public.leads l
        where l.account_id = v_account_id
          and l.owner_user_id = gm.user_id
          and l.status = 'open'
          and l.deleted_at is null
      ) < am.max_open_leads
    );

  select coalesce(sum(weight), 0)
  into v_total_weight
  from public.lead_group_members
  where group_id = p_group_id
    and account_id = v_account_id
    and user_id = any(v_eligible_user_ids);

  if v_total_weight = 0 then
    return null;
  end if;

  update public.lead_group_members
  set current_weight = current_weight + weight
  where group_id = p_group_id
    and account_id = v_account_id
    and user_id = any(v_eligible_user_ids);

  select user_id
  into v_winner_user_id
  from public.lead_group_members
  where group_id = p_group_id
    and account_id = v_account_id
    and user_id = any(v_eligible_user_ids)
  order by current_weight desc
  limit 1;

  update public.lead_group_members
  set current_weight = current_weight - v_total_weight
  where group_id = p_group_id
    and account_id = v_account_id
    and user_id = v_winner_user_id;

  update public.leads
  set owner_user_id = v_winner_user_id, routing_group_id = p_group_id
  where id = p_lead_id and account_id = v_account_id;

  insert into public.activities (account_id, lead_id, type, payload)
  values (
    v_account_id,
    p_lead_id,
    'lead_assigned',
    jsonb_build_object('group_id', p_group_id, 'user_id', v_winner_user_id)
  );

  return v_winner_user_id;
end;
$$;

revoke execute on function public.assign_lead_round_robin(uuid, uuid) from public, anon;
grant execute on function public.assign_lead_round_robin(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Invites grant membership on acceptance, not when the auth user is created.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_account_id uuid;
  pending_invite public.invites%rowtype;
  niche text;
  needs_follow_up_tag_id uuid;
  at_risk_tag_id uuid;
  hot_sequence_id uuid;
  cold_sequence_id uuid;
  stale_workflow_id uuid;
  at_risk_workflow_id uuid;
begin
  -- Membership via invite is granted only from a server-issued invites
  -- row. raw_user_meta_data is client-controllable and must never decide
  -- account membership.
  select * into pending_invite
  from public.invites
  where lower(email) = lower(new.email)
    and redeemed_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if found then
    -- Membership is granted when the invite is accepted, not when the
    -- auth user row already exists. Skip the personal workspace so the
    -- pending invite stays the only join path.
    return new;
  end if;

  niche := coalesce(nullif(new.raw_user_meta_data ->> 'niche', ''), 'wholesaler');
  if niche not in ('wholesaler', 'agency') then
    niche := 'wholesaler';
  end if;

  insert into public.accounts (name)
  values (coalesce(new.raw_user_meta_data ->> 'account_name', split_part(new.email, '@', 1) || '''s account'))
  returning id into new_account_id;

  insert into public.account_members (account_id, user_id, role)
  values (new_account_id, new.id, 'owner');

  if niche = 'agency' then
    insert into public.pipeline_stages (account_id, name, display_order, is_won, is_lost)
    values
      (new_account_id, 'Submitted', 1, false, false),
      (new_account_id, 'Qualified', 2, false, false),
      (new_account_id, 'With Client', 3, false, false),
      (new_account_id, 'Under Contract', 4, false, false),
      (new_account_id, 'Closed', 5, true, false),
      (new_account_id, 'Dead', 6, false, true);
  else
    insert into public.pipeline_stages (account_id, name, display_order, is_won, is_lost)
    values
      (new_account_id, 'New', 1, false, false),
      (new_account_id, 'Contacted', 2, false, false),
      (new_account_id, 'Qualified', 3, false, false),
      (new_account_id, 'Negotiating', 4, false, false),
      (new_account_id, 'Won', 5, true, false),
      (new_account_id, 'Lost', 6, false, true);
  end if;

  insert into public.tags (account_id, name, color)
  values (new_account_id, 'Needs Follow-up', '#f59e0b')
  returning id into needs_follow_up_tag_id;

  insert into public.tags (account_id, name, color)
  values (new_account_id, 'At Risk', '#ef4444')
  returning id into at_risk_tag_id;

  insert into public.tags (account_id, name, color)
  values (new_account_id, 'Hot Lead', '#22c55e');

  insert into public.sequences (account_id, name, description, is_active)
  values (new_account_id, 'Hot Seller Follow-up', 'Day 1 / 3 / 7 cadence for motivated sellers.', true)
  returning id into hot_sequence_id;

  insert into public.sequence_steps (account_id, sequence_id, step_number, channel, delay_days, subject, body_template)
  values
    (new_account_id, hot_sequence_id, 1, 'email', 0, 'Following up on your property',
      'Hi {{first_name}},' || chr(10) || chr(10) || 'Thanks for talking with us about your property. I wanted to follow up while it''s fresh — do you have a few minutes this week to go over next steps?' || chr(10) || chr(10) || 'Talk soon.'),
    (new_account_id, hot_sequence_id, 2, 'email', 3, 'Still interested in your timeline',
      'Hi {{first_name}},' || chr(10) || chr(10) || 'Circling back on your property. If your timeline has changed or you have questions about the offer, just reply here.'),
    (new_account_id, hot_sequence_id, 3, 'email', 7, 'One more check-in',
      'Hi {{first_name}},' || chr(10) || chr(10) || 'Wanted to check in one more time before we move on to other properties in the area. Let me know if you''d like to continue the conversation.');

  insert into public.sequences (account_id, name, description, is_active)
  values (new_account_id, 'Cold Lead Nurture', 'Day 30 / 60 / 90 long-term nurture for leads that aren''t ready yet.', true)
  returning id into cold_sequence_id;

  insert into public.sequence_steps (account_id, sequence_id, step_number, channel, delay_days, subject, body_template)
  values
    (new_account_id, cold_sequence_id, 1, 'email', 30, 'Checking back in',
      'Hi {{first_name}},' || chr(10) || chr(10) || 'It''s been a little while since we talked about your property. Has anything changed on your end?'),
    (new_account_id, cold_sequence_id, 2, 'email', 60, 'Still here when you''re ready',
      'Hi {{first_name}},' || chr(10) || chr(10) || 'No pressure at all — just wanted to stay on your radar in case your plans for the property have shifted.'),
    (new_account_id, cold_sequence_id, 3, 'email', 90, 'One last check-in',
      'Hi {{first_name}},' || chr(10) || chr(10) || 'Wanted to reach out one more time. If your situation has changed, we''d love to help — otherwise we''ll leave you be.');

  insert into public.workflows (account_id, name, is_active, trigger_type, trigger_config)
  values (new_account_id, 'Flag stale leads', true, 'no_activity_days', jsonb_build_object('days', 7))
  returning id into stale_workflow_id;

  insert into public.workflow_actions (account_id, workflow_id, step_number, action_type, action_config)
  values (new_account_id, stale_workflow_id, 1, 'add_tag', jsonb_build_object('tagId', needs_follow_up_tag_id));

  insert into public.workflows (account_id, name, is_active, trigger_type, trigger_config)
  values (new_account_id, 'Flag at-risk leads', true, 'no_next_action', jsonb_build_object('hours', 24))
  returning id into at_risk_workflow_id;

  insert into public.workflow_actions (account_id, workflow_id, step_number, action_type, action_config)
  values (new_account_id, at_risk_workflow_id, 1, 'add_tag', jsonb_build_object('tagId', at_risk_tag_id));

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Lead intake credentials: store a hash, reject anything that is not a
-- 64-character hex digest. Existing short tokens are revoked.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto with schema extensions;

alter table public.lead_intake_sources add column token_hash text;

update public.lead_intake_sources
set token_hash = encode(extensions.digest(convert_to(token, 'UTF8'), 'sha256'), 'hex')
where token ~ '^[A-Za-z0-9_-]{43}$';

update public.lead_intake_sources
set revoked_at = coalesce(revoked_at, now()),
    token_hash = encode(extensions.gen_random_bytes(32), 'hex')
where token_hash is null;

alter table public.lead_intake_sources alter column token_hash set not null;
alter table public.lead_intake_sources drop column token;

alter table public.lead_intake_sources
  add constraint lead_intake_sources_token_hash_format
  check (token_hash ~ '^[0-9a-f]{64}$');

alter table public.lead_intake_sources
  add constraint lead_intake_sources_token_hash_key unique (token_hash);

-- ---------------------------------------------------------------------------
-- Client comments follow the lead assignment, not only the comment's client_id.
-- ---------------------------------------------------------------------------

drop policy if exists "client select own comments" on public.lead_client_comments;
create policy "client select own comments"
  on public.lead_client_comments
  for select
  to authenticated
  using (
    public.is_account_client(account_id)
    and client_id = public.get_my_client_id(account_id)
    and exists (
      select 1
      from public.leads l
      where l.id = lead_client_comments.lead_id
        and l.account_id = lead_client_comments.account_id
        and l.client_id = public.get_my_client_id(lead_client_comments.account_id)
    )
  );

drop policy if exists "client insert own comments" on public.lead_client_comments;
create policy "client insert own comments"
  on public.lead_client_comments
  for insert
  to authenticated
  with check (
    public.is_account_client(account_id)
    and client_id = public.get_my_client_id(account_id)
    and exists (
      select 1
      from public.leads l
      where l.id = lead_client_comments.lead_id
        and l.account_id = lead_client_comments.account_id
        and l.client_id = public.get_my_client_id(lead_client_comments.account_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Inbound SMS replays of the same MessageSid are one activity.
-- ---------------------------------------------------------------------------

delete from public.activities a
where a.type = 'sms_received'
  and coalesce(a.payload->>'twilio_message_sid', '') <> ''
  and exists (
    select 1
    from public.activities b
    where b.type = 'sms_received'
      and b.payload->>'twilio_message_sid' = a.payload->>'twilio_message_sid'
      and (b.created_at, b.id) < (a.created_at, a.id)
  );

create unique index activities_inbound_sms_message_sid_uidx
  on public.activities ((payload->>'twilio_message_sid'))
  where type = 'sms_received'
    and coalesce(payload->>'twilio_message_sid', '') <> '';

notify pgrst, 'reload schema';
