-- Scheduled workflows record one successful run per lead, with an optional
-- cooldown. Cron can reassign, enroll, create a task, and email the manager
-- without a signed-in session.

alter table public.workflow_actions drop constraint workflow_actions_action_type_check;
alter table public.workflow_actions add constraint workflow_actions_action_type_check check (action_type in (
  'send_email_template',
  'enroll_sequence',
  'add_tag',
  'assign_round_robin',
  'change_stage',
  'reassign',
  'create_task',
  'notify_user'
));

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
  'call_started', 'call_completed', 'call_disposition_set',
  'user_notified'
));

create table public.workflow_lead_fires (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  fired_at timestamptz not null default now(),
  unique (workflow_id, lead_id)
);

create index workflow_lead_fires_account_idx on public.workflow_lead_fires (account_id);

alter table public.workflow_lead_fires enable row level security;

revoke all on table public.workflow_lead_fires from public, anon, authenticated;
grant select on table public.workflow_lead_fires to authenticated;
grant select, insert, update, delete on table public.workflow_lead_fires to service_role;

create policy "select own account workflow fires"
  on public.workflow_lead_fires
  for select
  to authenticated
  using (public.is_account_member(account_id));

create or replace function public.enforce_workflow_fire_same_account()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  workflow_account uuid;
  lead_account uuid;
begin
  select account_id into workflow_account
  from public.workflows
  where id = new.workflow_id;

  select account_id into lead_account
  from public.leads
  where id = new.lead_id;

  if workflow_account is null
     or lead_account is null
     or workflow_account is distinct from new.account_id
     or lead_account is distinct from new.account_id then
    raise exception 'Workflow fire, workflow, and lead must share one account';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_workflow_fire_same_account() from public, anon, authenticated;
grant execute on function public.enforce_workflow_fire_same_account() to service_role;

drop trigger if exists workflow_fire_same_account on public.workflow_lead_fires;
create trigger workflow_fire_same_account
  before insert or update of account_id, workflow_id, lead_id
  on public.workflow_lead_fires
  for each row
  execute function public.enforce_workflow_fire_same_account();

-- Service-role cron has no auth.uid(). Authenticated callers still need
-- access to the lead. Grants on this function are preserved by replace;
-- service_role is added below.
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

  if v_account_id is null then
    raise exception 'Lead not found or not accessible';
  end if;

  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and not public.can_access_lead(p_lead_id) then
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

grant execute on function public.assign_lead_round_robin(uuid, uuid) to service_role;

-- Not an API. Execute stays with the migration owner so handle_new_user and
-- the backfill below can call it. Invoker privileges follow that owner.
create or replace function public.seed_followup_workflow_presets(p_account_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  negotiating_stage_id uuid;
  first_stage_id uuid;
  cold_sequence_id uuid;
  untouched_workflow_id uuid;
  nurture_workflow_id uuid;
  untouched_name constant text := 'Untouched 4 days in Negotiation, then notify the manager and reassign';
  nurture_name constant text := 'Nurture for 90 days, then move back and re-enroll';
begin
  select id into negotiating_stage_id
  from public.pipeline_stages
  where account_id = p_account_id
    and name ilike 'negotiat%'
    and is_won = false
    and is_lost = false
  order by display_order
  limit 1;

  select id into first_stage_id
  from public.pipeline_stages
  where account_id = p_account_id
    and is_won = false
    and is_lost = false
  order by display_order
  limit 1;

  select id into cold_sequence_id
  from public.sequences
  where account_id = p_account_id
    and name = 'Cold Lead Nurture'
  order by created_at
  limit 1;

  if negotiating_stage_id is not null
     and not exists (
       select 1
       from public.workflows
       where account_id = p_account_id
         and name = untouched_name
     ) then
    insert into public.workflows (account_id, name, is_active, trigger_type, trigger_config)
    values (
      p_account_id,
      untouched_name,
      true,
      'no_activity_days',
      jsonb_build_object('days', 4, 'stageId', negotiating_stage_id)
    )
    returning id into untouched_workflow_id;

    insert into public.workflow_actions (
      account_id, workflow_id, step_number, action_type, action_config
    )
    values
      (
        p_account_id,
        untouched_workflow_id,
        1,
        'notify_user',
        jsonb_build_object('target', 'manager')
      ),
      (
        p_account_id,
        untouched_workflow_id,
        2,
        'reassign',
        jsonb_build_object('target', 'manager')
      );
  end if;

  if first_stage_id is not null
     and cold_sequence_id is not null
     and not exists (
       select 1
       from public.workflows
       where account_id = p_account_id
         and name = nurture_name
     ) then
    insert into public.workflows (account_id, name, is_active, trigger_type, trigger_config)
    values (
      p_account_id,
      nurture_name,
      true,
      'no_activity_days',
      jsonb_build_object('days', 90)
    )
    returning id into nurture_workflow_id;

    insert into public.workflow_actions (
      account_id, workflow_id, step_number, action_type, action_config
    )
    values
      (
        p_account_id,
        nurture_workflow_id,
        1,
        'change_stage',
        jsonb_build_object('stageId', first_stage_id)
      ),
      (
        p_account_id,
        nurture_workflow_id,
        2,
        'enroll_sequence',
        jsonb_build_object('sequenceId', cold_sequence_id)
      );
  end if;
end;
$$;

revoke all on function public.seed_followup_workflow_presets(uuid) from public, anon, authenticated, service_role;

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

  perform public.seed_followup_workflow_presets(new_account_id);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

do $$
declare
  account_row record;
begin
  for account_row in select id from public.accounts
  loop
    perform public.seed_followup_workflow_presets(account_row.id);
  end loop;
end $$;

insert into public.workflow_lead_fires (account_id, workflow_id, lead_id, fired_at)
select
  a.account_id,
  w.id,
  a.lead_id,
  max(a.created_at)
from public.activities a
join public.workflows w
  on w.id::text = a.payload->>'workflow_id'
 and w.account_id = a.account_id
join public.leads l
  on l.id = a.lead_id
 and l.account_id = a.account_id
where a.type = 'workflow_triggered'
  and coalesce(a.payload->>'status', '') = 'success'
group by a.account_id, w.id, a.lead_id
on conflict (workflow_id, lead_id) do nothing;
