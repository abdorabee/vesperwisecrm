-- Indexes for the hottest read paths surfaced by the July 2026 audit:
-- scorecards and manual-assign cap checks filter leads by owner + status,
-- dashboard/TV KPIs count leads by status, dashboard day-buckets scan
-- activities by account + created_at, and scorecards scan activities by
-- the acting user.

create index if not exists leads_account_owner_status_idx
  on public.leads (account_id, owner_user_id, status);

create index if not exists leads_account_status_idx
  on public.leads (account_id, status);

create index if not exists activities_account_created_at_idx
  on public.activities (account_id, created_at desc);

create index if not exists activities_actor_idx
  on public.activities (actor_user_id);
