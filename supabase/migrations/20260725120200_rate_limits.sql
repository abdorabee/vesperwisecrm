-- Security audit 2026-07-25, finding H-4.
--
-- The application had no throttling of any kind. Postgres-backed fixed windows
-- keep this dependency-free and work on Vercel Hobby; swap for a Redis token
-- bucket if call volume makes the extra round-trip matter.

create table public.rate_limits (
  bucket_key text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  primary key (bucket_key, window_started_at)
);

-- Locked down: only the trusted server (service role) may consume budget.
-- Exposing this to `authenticated` would let a client burn another key's quota.
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated;

-- Returns true when the caller is within budget, false when the window is full.
-- The upsert is atomic, so concurrent callers cannot both slip past the limit.
create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit configuration';
  end if;

  -- Floor now() to the window boundary so every caller in the same window
  -- contends on one row.
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits (bucket_key, window_started_at, request_count)
  values (p_bucket_key, v_window_start, 1)
  on conflict (bucket_key, window_started_at)
    do update set request_count = public.rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer)
  to service_role;

-- Housekeeping: drop windows that can no longer be current. Safe to call from
-- any scheduled job; the dialer reconcile cron is a reasonable host.
create or replace function public.prune_rate_limits(p_older_than interval default '1 day')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limits
  where window_started_at < now() - p_older_than;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.prune_rate_limits(interval) from public, anon, authenticated;
grant execute on function public.prune_rate_limits(interval) to service_role;

notify pgrst, 'reload schema';
