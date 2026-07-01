-- Action-based workflow: due/overdue tasks, "Your Day", and required next step.

create table public.lead_tasks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  assigned_user_id uuid references auth.users(id),
  created_by_user_id uuid references auth.users(id),
  completed_by_user_id uuid references auth.users(id),
  completed_at timestamptz,
  completion_note text,
  next_task_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed_at is null or completed_by_user_id is not null)
);

alter table public.lead_tasks
  add constraint lead_tasks_next_task_id_fkey
  foreign key (next_task_id) references public.lead_tasks(id) on delete set null;

create index lead_tasks_account_due_idx
  on public.lead_tasks (account_id, due_at)
  where completed_at is null;

create index lead_tasks_account_assignee_due_idx
  on public.lead_tasks (account_id, assigned_user_id, due_at)
  where completed_at is null;

create index lead_tasks_lead_idx on public.lead_tasks (lead_id, due_at);

alter table public.lead_tasks enable row level security;

create policy "select own account tasks" on public.lead_tasks
  for select
  using (
    public.is_account_member(account_id)
    and (
      assigned_user_id = (select auth.uid())
      or not exists (
        select 1 from public.account_members am
        where am.account_id = lead_tasks.account_id
          and am.user_id = (select auth.uid())
          and am.lead_visibility = 'assigned_only'
      )
    )
  );

create policy "insert own account tasks" on public.lead_tasks
  for insert
  with check (public.is_account_member(account_id));

create policy "update own account tasks" on public.lead_tasks
  for update
  using (
    public.is_account_member(account_id)
    and (
      assigned_user_id = (select auth.uid())
      or created_by_user_id = (select auth.uid())
      or public.is_account_admin(account_id)
    )
  )
  with check (public.is_account_member(account_id));

create policy "delete own account tasks" on public.lead_tasks
  for delete
  using (public.is_account_admin(account_id));

alter table public.activities drop constraint activities_type_check;
alter table public.activities add constraint activities_type_check check (type in (
  'stage_changed', 'tag_added', 'tag_removed', 'email_sent', 'sms_sent',
  'note_added', 'lead_created', 'sequence_enrolled', 'sequence_step_sent',
  'lead_assigned', 'lead_unassigned', 'workflow_triggered',
  'task_created', 'task_completed'
));
