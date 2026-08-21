-- CRM data migration jobs. Admins enqueue CSV rows; members can watch
-- progress. The process-import-jobs cron uses the service role.

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_by_user_id uuid references auth.users(id),
  source_crm text not null
    check (source_crm in (
      'generic',
      'carrot',
      'hubspot',
      'gohighlevel',
      'pipedrive',
      'follow_up_boss'
    )),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  mapping jsonb not null default '{}'::jsonb,
  stage_map jsonb not null default '{}'::jsonb,
  imported_count integer not null default 0 check (imported_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index import_jobs_account_created_idx
  on public.import_jobs (account_id, created_at desc);

create index import_jobs_status_idx
  on public.import_jobs (status, created_at)
  where status in ('pending', 'processing');

create table public.import_job_rows (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_number integer not null check (row_number >= 2),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'imported', 'failed')),
  error_text text,
  created_at timestamptz not null default now()
);

create unique index import_job_rows_job_row_unique
  on public.import_job_rows (job_id, row_number);

create index import_job_rows_job_status_idx
  on public.import_job_rows (job_id, status, row_number);

create index import_job_rows_account_idx
  on public.import_job_rows (account_id);

alter table public.import_jobs enable row level security;
alter table public.import_job_rows enable row level security;

revoke all on public.import_jobs from anon, authenticated;
revoke all on public.import_job_rows from anon, authenticated;
grant select, insert, update on public.import_jobs to authenticated;
grant select, insert, update on public.import_job_rows to authenticated;

create policy "select own account import jobs"
  on public.import_jobs
  for select
  to authenticated
  using (public.is_account_member(account_id));

create policy "admin insert import jobs"
  on public.import_jobs
  for insert
  to authenticated
  with check (public.is_account_admin(account_id));

create policy "admin update import jobs"
  on public.import_jobs
  for update
  to authenticated
  using (public.is_account_admin(account_id))
  with check (public.is_account_admin(account_id));

create policy "select own account import job rows"
  on public.import_job_rows
  for select
  to authenticated
  using (public.is_account_member(account_id));

create policy "admin insert import job rows"
  on public.import_job_rows
  for insert
  to authenticated
  with check (public.is_account_admin(account_id));

create policy "admin update import job rows"
  on public.import_job_rows
  for update
  to authenticated
  using (public.is_account_admin(account_id))
  with check (public.is_account_admin(account_id));
