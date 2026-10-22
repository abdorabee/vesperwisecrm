-- Fix HIGH/MEDIUM bugs from PR #9 data migration wizard

-- Bug #1: Add exclusive row claiming function to prevent concurrent duplicate imports
-- This function claims up to p_limit pending rows with FOR UPDATE SKIP LOCKED
create or replace function public.claim_import_job_rows(
  p_job_id uuid,
  p_limit integer default 50
)
returns table (
  id uuid,
  account_id uuid,
  job_id uuid,
  row_number integer,
  payload jsonb,
  status text,
  error_text text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    r.id,
    r.account_id,
    r.job_id,
    r.row_number,
    r.payload,
    r.status,
    r.error_text,
    r.created_at
  from public.import_job_rows r
  where r.job_id = p_job_id
    and r.status = 'pending'
  order by r.row_number
  limit p_limit
  for update skip locked;
end;
$$;

-- Bug #3: Fix RLS leak - make import_job_rows SELECT policy admin-only
-- Non-admin members should NOT see sensitive payloads
drop policy if exists "select own account import job rows" on public.import_job_rows;

create policy "admin select import job rows"
  on public.import_job_rows
  for select
  to authenticated
  using (public.is_account_admin(account_id));

-- Bug #4: Add 'cancelled' status for failed enqueue scenarios
-- Update the status check constraint to include 'cancelled'
alter table public.import_jobs
  drop constraint if exists import_jobs_status_check;

alter table public.import_jobs
  add constraint import_jobs_status_check
  check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled'));
