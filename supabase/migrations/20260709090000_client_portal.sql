-- Agency/client mode: external investor clients get a real, heavily scoped
-- login to a portal showing only leads assigned to them. This introduces a
-- new account_members role ('client') that must NOT gain the broad access
-- every other role gets via is_account_member() -- that function is
-- redefined to exclude it, which automatically tightens every existing
-- policy built on top of it (contacts, tasks, workflows, sequences, etc.)
-- without touching each one individually.

-- ---------------------------------------------------------------------------
-- Clients (external investor entities the agency sources leads for)
-- ---------------------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  contact_email text,
  contact_phone text,
  notes text,
  drive_folder_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.clients (account_id);

alter table public.clients enable row level security;

create policy "admin select own account clients" on public.clients
  for select using (public.is_account_admin(account_id));
create policy "admin write own account clients" on public.clients
  for insert with check (public.is_account_admin(account_id));
create policy "admin update own account clients" on public.clients
  for update using (public.is_account_admin(account_id)) with check (public.is_account_admin(account_id));
create policy "admin delete own account clients" on public.clients
  for delete using (public.is_account_admin(account_id));

-- ---------------------------------------------------------------------------
-- account_members: add 'client' role + client_id
-- ---------------------------------------------------------------------------

alter table public.account_members drop constraint if exists account_members_role_check;
alter table public.account_members add constraint account_members_role_check
  check (role in ('owner', 'admin', 'member', 'client'));

alter table public.account_members
  add column client_id uuid references public.clients(id) on delete cascade;

create index on public.account_members (client_id) where client_id is not null;

-- A user can always see their own membership row, regardless of role --
-- needed so client-role users can resolve their own account_id/client_id.
create policy "select own membership row" on public.account_members
  for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Redefine is_account_member to exclude the client role. Every existing
-- policy built on this function (contacts, leads, tasks, workflows,
-- sequences, tags, groups, email settings, google integration, ...)
-- automatically denies client-role users as a result.
-- ---------------------------------------------------------------------------

create or replace function public.is_account_member(check_account_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.account_members
    where account_id = check_account_id and user_id = auth.uid() and role <> 'client'
  );
$$;

create or replace function public.is_account_client(check_account_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.account_members
    where account_id = check_account_id and user_id = auth.uid() and role = 'client'
  );
$$;

create or replace function public.get_my_client_id(check_account_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select client_id from public.account_members
  where account_id = check_account_id and user_id = auth.uid() and role = 'client'
  limit 1;
$$;

revoke execute on function public.is_account_client(uuid) from public, anon;
grant execute on function public.is_account_client(uuid) to authenticated;
revoke execute on function public.get_my_client_id(uuid) from public, anon;
grant execute on function public.get_my_client_id(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- leads: client assignment + interest status
-- ---------------------------------------------------------------------------

alter table public.leads
  add column client_id uuid references public.clients(id) on delete set null,
  add column client_interest_status text
    check (client_interest_status in ('pending', 'interested', 'declined')),
  add column client_decided_at timestamptz;

create index on public.leads (account_id, client_id) where client_id is not null;

create policy "client select assigned leads" on public.leads
  for select using (
    public.is_account_client(account_id)
    and client_id = public.get_my_client_id(account_id)
  );

create policy "client select assigned lead properties" on public.lead_properties
  for select using (
    exists (
      select 1 from public.leads l
      where l.id = lead_properties.lead_id
        and public.is_account_client(l.account_id)
        and l.client_id = public.get_my_client_id(l.account_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Client-visible comment thread (deliberately separate from the internal
-- activities feed, which stays entirely invisible to clients)
-- ---------------------------------------------------------------------------

create table public.lead_client_comments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  author_user_id uuid references auth.users(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index on public.lead_client_comments (account_id, lead_id, created_at);

alter table public.lead_client_comments enable row level security;

create policy "internal select client comments" on public.lead_client_comments
  for select using (public.is_account_member(account_id));
create policy "internal insert client comments" on public.lead_client_comments
  for insert with check (public.is_account_member(account_id));

create policy "client select own comments" on public.lead_client_comments
  for select using (
    public.is_account_client(account_id)
    and client_id = public.get_my_client_id(account_id)
  );
create policy "client insert own comments" on public.lead_client_comments
  for insert with check (
    public.is_account_client(account_id)
    and client_id = public.get_my_client_id(account_id)
  );

-- ---------------------------------------------------------------------------
-- Client interest RPC: narrower than a direct UPDATE grant -- only ever
-- touches client_interest_status/client_decided_at on a lead the caller's
-- client is actually assigned to.
-- ---------------------------------------------------------------------------

create or replace function public.set_client_lead_interest(p_lead_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_lead_client_id uuid;
  v_my_client_id uuid;
begin
  if p_status not in ('interested', 'declined') then
    raise exception 'Invalid status';
  end if;

  select account_id, client_id into v_account_id, v_lead_client_id
  from public.leads where id = p_lead_id;

  if v_account_id is null then
    raise exception 'Lead not found';
  end if;

  if not public.is_account_client(v_account_id) then
    raise exception 'Not authorized';
  end if;

  v_my_client_id := public.get_my_client_id(v_account_id);

  if v_lead_client_id is null or v_lead_client_id <> v_my_client_id then
    raise exception 'Lead is not assigned to your account';
  end if;

  update public.leads
  set client_interest_status = p_status, client_decided_at = now()
  where id = p_lead_id;

  insert into public.activities (account_id, lead_id, type, actor_user_id, payload)
  values (v_account_id, p_lead_id, 'client_interest_updated', auth.uid(), jsonb_build_object('status', p_status));
end;
$$;

revoke execute on function public.set_client_lead_interest(uuid, text) from public, anon;
grant execute on function public.set_client_lead_interest(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Activity types + member profile RPCs
-- ---------------------------------------------------------------------------

alter table public.activities drop constraint activities_type_check;
alter table public.activities add constraint activities_type_check check (type in (
  'stage_changed', 'tag_added', 'tag_removed', 'email_sent', 'email_received', 'sms_sent',
  'note_added', 'lead_created', 'sequence_enrolled', 'sequence_step_sent',
  'lead_assigned', 'lead_unassigned', 'workflow_triggered',
  'task_created', 'task_completed',
  'lead_qualified', 'lead_rejected', 'lead_needs_info',
  'report_generated',
  'client_assigned', 'client_interest_updated'
));

-- Team-facing member listing should never surface client-role rows.
create or replace function public.get_account_member_profiles(p_account_id uuid)
returns table (
  user_id uuid,
  email text,
  role text,
  lead_visibility text,
  max_open_leads integer,
  from_display_name text,
  from_email_local_part text,
  job_function text
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
    am.from_email_local_part,
    am.job_function
  from public.account_members am
  join auth.users u on u.id = am.user_id
  where am.account_id = p_account_id
    and public.is_account_member(p_account_id)
    and am.role <> 'client';
$$;

create or replace function public.get_client_portal_members(p_account_id uuid)
returns table (
  user_id uuid,
  email text,
  client_id uuid,
  client_name text
)
language sql
security definer
stable
set search_path = public
as $$
  select am.user_id, u.email, am.client_id, c.name
  from public.account_members am
  join auth.users u on u.id = am.user_id
  join public.clients c on c.id = am.client_id
  where am.account_id = p_account_id
    and public.is_account_admin(p_account_id)
    and am.role = 'client';
$$;

revoke execute on function public.get_client_portal_members(uuid) from public, anon;
grant execute on function public.get_client_portal_members(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Extend signup provisioning: invited client users need client_id carried
-- through, and the invited-role allowlist needs 'client' added.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_account_id uuid;
  invited_account_id uuid;
  invited_role text;
  invited_client_id uuid;
  needs_follow_up_tag_id uuid;
  at_risk_tag_id uuid;
  hot_sequence_id uuid;
  cold_sequence_id uuid;
  stale_workflow_id uuid;
  at_risk_workflow_id uuid;
begin
  invited_account_id := nullif(new.raw_user_meta_data ->> 'invited_account_id', '')::uuid;
  invited_role := coalesce(nullif(new.raw_user_meta_data ->> 'invited_role', ''), 'member');
  invited_client_id := nullif(new.raw_user_meta_data ->> 'invited_client_id', '')::uuid;

  if invited_account_id is not null then
    if invited_role not in ('admin', 'member', 'client') then
      invited_role := 'member';
    end if;

    insert into public.account_members (account_id, user_id, role, client_id)
    values (
      invited_account_id,
      new.id,
      invited_role,
      case when invited_role = 'client' then invited_client_id else null end
    )
    on conflict (account_id, user_id) do update
      set role = excluded.role, client_id = excluded.client_id;

    return new;
  end if;

  insert into public.accounts (name)
  values (coalesce(new.raw_user_meta_data ->> 'account_name', split_part(new.email, '@', 1) || '''s account'))
  returning id into new_account_id;

  insert into public.account_members (account_id, user_id, role)
  values (new_account_id, new.id, 'owner');

  insert into public.pipeline_stages (account_id, name, display_order, is_won, is_lost)
  values
    (new_account_id, 'New', 1, false, false),
    (new_account_id, 'Contacted', 2, false, false),
    (new_account_id, 'Qualified', 3, false, false),
    (new_account_id, 'Negotiating', 4, false, false),
    (new_account_id, 'Won', 5, true, false),
    (new_account_id, 'Lost', 6, false, true);

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
