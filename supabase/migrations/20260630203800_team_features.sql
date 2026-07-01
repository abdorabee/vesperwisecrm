-- Team package features: lead routing groups + weighted round robin, user
-- restrictions, scorecards, and an automated workflow engine (covers
-- "automated lead response" and turns sequences into real automated
-- follow-ups via a cron-driven due-step queue).

-- ---------------------------------------------------------------------------
-- User restrictions
-- ---------------------------------------------------------------------------

alter table public.account_members
  add column lead_visibility text not null default 'all'
    check (lead_visibility in ('all', 'assigned_only')),
  add column max_open_leads integer check (max_open_leads is null or max_open_leads >= 0);

create or replace function public.is_account_admin(check_account_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.account_members
    where account_id = check_account_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- Lead routing groups (weighted round robin pools)
-- ---------------------------------------------------------------------------

create table public.lead_groups (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index on public.lead_groups (account_id);

create table public.lead_group_members (
  group_id uuid not null references public.lead_groups(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  weight smallint not null default 1 check (weight >= 0),
  current_weight numeric not null default 0,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index on public.lead_group_members (account_id);

alter table public.leads
  add column routing_group_id uuid references public.lead_groups(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Automated workflows
-- ---------------------------------------------------------------------------

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  trigger_type text not null check (trigger_type in (
    'lead_created', 'stage_changed', 'tag_added', 'no_activity_days'
  )),
  trigger_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.workflows (account_id, trigger_type) where is_active;

create table public.workflow_actions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  step_number integer not null,
  action_type text not null check (action_type in (
    'send_email_template', 'enroll_sequence', 'add_tag', 'assign_round_robin', 'change_stage'
  )),
  action_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index workflow_actions_workflow_order_unique
  on public.workflow_actions (workflow_id, step_number);

-- ---------------------------------------------------------------------------
-- Automated (cron-driven) sequence sends
-- ---------------------------------------------------------------------------

alter table public.lead_sequence_enrollments
  add column next_step_due_at timestamptz;

create index on public.lead_sequence_enrollments (next_step_due_at)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- New activity types
-- ---------------------------------------------------------------------------

alter table public.activities drop constraint activities_type_check;
alter table public.activities add constraint activities_type_check check (type in (
  'stage_changed', 'tag_added', 'tag_removed', 'email_sent',
  'note_added', 'lead_created', 'sequence_enrolled', 'sequence_step_sent',
  'lead_assigned', 'lead_unassigned', 'workflow_triggered'
));

-- ---------------------------------------------------------------------------
-- Weighted round robin assignment (smooth weighted round robin, atomic)
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

  if v_account_id is null or not public.is_account_member(v_account_id) then
    raise exception 'Lead not found or not accessible';
  end if;

  perform 1 from public.lead_groups where id = p_group_id and account_id = v_account_id;
  if not found then
    raise exception 'Routing group not found for this account';
  end if;

  -- Lock the group's members first so concurrent lead creation can't race on
  -- a stale current_weight read, then resolve eligibility (weight > 0, under
  -- their open-lead cap) once into a fixed array reused for every step below.
  perform 1 from public.lead_group_members where group_id = p_group_id for update;

  select coalesce(array_agg(gm.user_id), '{}')
  into v_eligible_user_ids
  from public.lead_group_members gm
  join public.account_members am
    on am.account_id = gm.account_id and am.user_id = gm.user_id
  where gm.group_id = p_group_id
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
  where group_id = p_group_id and user_id = any(v_eligible_user_ids);

  if v_total_weight = 0 then
    return null;
  end if;

  update public.lead_group_members
  set current_weight = current_weight + weight
  where group_id = p_group_id and user_id = any(v_eligible_user_ids);

  select user_id
  into v_winner_user_id
  from public.lead_group_members
  where group_id = p_group_id and user_id = any(v_eligible_user_ids)
  order by current_weight desc
  limit 1;

  update public.lead_group_members
  set current_weight = current_weight - v_total_weight
  where group_id = p_group_id and user_id = v_winner_user_id;

  update public.leads
  set owner_user_id = v_winner_user_id, routing_group_id = p_group_id
  where id = p_lead_id;

  insert into public.activities (account_id, lead_id, type, payload)
  values (v_account_id, p_lead_id, 'lead_assigned', jsonb_build_object('group_id', p_group_id, 'user_id', v_winner_user_id));

  return v_winner_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.lead_groups enable row level security;
alter table public.lead_group_members enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_actions enable row level security;

create policy "select own account groups" on public.lead_groups for select using (public.is_account_member(account_id));
create policy "admin write own account groups" on public.lead_groups for insert with check (public.is_account_admin(account_id));
create policy "admin update own account groups" on public.lead_groups for update using (public.is_account_admin(account_id)) with check (public.is_account_admin(account_id));
create policy "admin delete own account groups" on public.lead_groups for delete using (public.is_account_admin(account_id));

create policy "select own account group members" on public.lead_group_members for select using (public.is_account_member(account_id));
create policy "admin write own account group members" on public.lead_group_members for insert with check (public.is_account_admin(account_id));
create policy "admin update own account group members" on public.lead_group_members for update using (public.is_account_admin(account_id)) with check (public.is_account_admin(account_id));
create policy "admin delete own account group members" on public.lead_group_members for delete using (public.is_account_admin(account_id));

create policy "select own account workflows" on public.workflows for select using (public.is_account_member(account_id));
create policy "admin write own account workflows" on public.workflows for insert with check (public.is_account_admin(account_id));
create policy "admin update own account workflows" on public.workflows for update using (public.is_account_admin(account_id)) with check (public.is_account_admin(account_id));
create policy "admin delete own account workflows" on public.workflows for delete using (public.is_account_admin(account_id));

create policy "select own account workflow actions" on public.workflow_actions for select using (public.is_account_member(account_id));
create policy "admin write own account workflow actions" on public.workflow_actions for insert with check (public.is_account_admin(account_id));
create policy "admin update own account workflow actions" on public.workflow_actions for update using (public.is_account_admin(account_id)) with check (public.is_account_admin(account_id));
create policy "admin delete own account workflow actions" on public.workflow_actions for delete using (public.is_account_admin(account_id));

-- Admins manage member restrictions; everyone still sees memberships as before.
create policy "admin update member restrictions" on public.account_members for update
  using (public.is_account_admin(account_id))
  with check (public.is_account_admin(account_id));

-- Restricted visibility: replace the leads select policy so members with
-- 'assigned_only' visibility only see leads they own; everyone else keeps
-- full account visibility as before.
drop policy "select own account leads" on public.leads;
create policy "select own account leads" on public.leads for select using (
  public.is_account_member(account_id)
  and (
    owner_user_id = auth.uid()
    or not exists (
      select 1 from public.account_members am
      where am.account_id = leads.account_id
        and am.user_id = auth.uid()
        and am.lead_visibility = 'assigned_only'
    )
  )
);

revoke execute on function public.is_account_admin(uuid) from public, anon;
grant execute on function public.is_account_admin(uuid) to authenticated;

revoke execute on function public.assign_lead_round_robin(uuid, uuid) from public, anon;
grant execute on function public.assign_lead_round_robin(uuid, uuid) to authenticated;
