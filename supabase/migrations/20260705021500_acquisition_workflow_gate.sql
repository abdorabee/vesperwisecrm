-- Acquisition workflow gate: cold caller -> lead manager qualification -> acquisitions handoff.

-- ---------------------------------------------------------------------------
-- Job functions (layered on top of existing owner/admin/member access roles)
-- ---------------------------------------------------------------------------

alter table public.account_members
  add column job_function text
    check (job_function in ('cold_caller', 'lead_manager', 'acquisitions_manager'));

-- ---------------------------------------------------------------------------
-- Lead qualification gate
-- ---------------------------------------------------------------------------

alter table public.leads
  add column qualification_status text
    check (qualification_status in ('submitted', 'needs_info', 'qualified', 'rejected')),
  add column qualified_by_user_id uuid references auth.users(id),
  add column qualified_at timestamptz,
  add column rejection_reason text,
  add column submitted_by_user_id uuid references auth.users(id);

create index leads_qualification_queue_idx
  on public.leads (account_id, created_at)
  where qualification_status = 'submitted';

alter table public.activities drop constraint activities_type_check;
alter table public.activities add constraint activities_type_check check (type in (
  'stage_changed', 'tag_added', 'tag_removed', 'email_sent', 'email_received', 'sms_sent',
  'note_added', 'lead_created', 'sequence_enrolled', 'sequence_step_sent',
  'lead_assigned', 'lead_unassigned', 'workflow_triggered',
  'task_created', 'task_completed',
  'lead_qualified', 'lead_rejected', 'lead_needs_info'
));

alter table public.workflows drop constraint workflows_trigger_type_check;
alter table public.workflows add constraint workflows_trigger_type_check check (trigger_type in (
  'lead_created', 'stage_changed', 'tag_added', 'no_activity_days', 'no_next_action'
));

-- ---------------------------------------------------------------------------
-- Per-source intake tokens (dialer partners), replacing the single global
-- LEAD_INTAKE_SECRET so each source can be identified and revoked independently
-- ---------------------------------------------------------------------------

create table public.lead_intake_sources (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  token text not null unique,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.lead_intake_sources (account_id);

alter table public.lead_intake_sources enable row level security;

create policy "admin select own account intake sources" on public.lead_intake_sources
  for select using (public.is_account_admin(account_id));
create policy "admin write own account intake sources" on public.lead_intake_sources
  for insert with check (public.is_account_admin(account_id));
create policy "admin update own account intake sources" on public.lead_intake_sources
  for update using (public.is_account_admin(account_id)) with check (public.is_account_admin(account_id));
create policy "admin delete own account intake sources" on public.lead_intake_sources
  for delete using (public.is_account_admin(account_id));

-- ---------------------------------------------------------------------------
-- Extend member profiles RPC with job_function
-- ---------------------------------------------------------------------------

drop function if exists public.get_account_member_profiles(uuid);

create function public.get_account_member_profiles(p_account_id uuid)
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
    and public.is_account_member(p_account_id);
$$;

revoke execute on function public.get_account_member_profiles(uuid) from public, anon;
grant execute on function public.get_account_member_profiles(uuid) to authenticated;
