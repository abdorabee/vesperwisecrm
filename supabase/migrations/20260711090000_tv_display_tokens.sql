-- TV KPI wall (INT-33): tokenized read-only display links so an office TV
-- can show team metrics without a logged-in session, mirroring the
-- lead_intake_sources per-source-token pattern.

create table public.tv_display_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index on public.tv_display_tokens (account_id);

alter table public.tv_display_tokens enable row level security;

create policy "admin select own account tv tokens" on public.tv_display_tokens
  for select using (public.is_account_admin(account_id));
create policy "admin write own account tv tokens" on public.tv_display_tokens
  for insert with check (public.is_account_admin(account_id));
create policy "admin update own account tv tokens" on public.tv_display_tokens
  for update using (public.is_account_admin(account_id)) with check (public.is_account_admin(account_id));
