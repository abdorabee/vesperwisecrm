-- Per-account Google OAuth (Docs + Drive scopes) for one-click property
-- report generation. One integration per account, admin-managed.

create table public.google_integrations (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  connected_email text,
  drive_folder_id text,
  connected_by_user_id uuid references auth.users(id),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_integrations enable row level security;

create policy "admin select own account google integration"
  on public.google_integrations for select
  using (public.is_account_admin(account_id));
create policy "admin write own account google integration"
  on public.google_integrations for insert
  with check (public.is_account_admin(account_id));
create policy "admin update own account google integration"
  on public.google_integrations for update
  using (public.is_account_admin(account_id))
  with check (public.is_account_admin(account_id));
create policy "admin delete own account google integration"
  on public.google_integrations for delete
  using (public.is_account_admin(account_id));

alter table public.leads
  add column google_doc_url text;

alter table public.activities drop constraint activities_type_check;
alter table public.activities add constraint activities_type_check check (type in (
  'stage_changed', 'tag_added', 'tag_removed', 'email_sent', 'email_received', 'sms_sent',
  'note_added', 'lead_created', 'sequence_enrolled', 'sequence_step_sent',
  'lead_assigned', 'lead_unassigned', 'workflow_triggered',
  'task_created', 'task_completed',
  'lead_qualified', 'lead_rejected', 'lead_needs_info',
  'report_generated'
));
