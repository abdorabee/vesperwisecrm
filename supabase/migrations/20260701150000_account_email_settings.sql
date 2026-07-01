-- Per-account outbound email identity and domain verification.

create table public.account_email_settings (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  sending_domain text,
  from_name text,
  from_email text,
  domain_verification_status text not null default 'pending'
    check (domain_verification_status in ('pending', 'verified', 'failed')),
  resend_domain_id text,
  updated_at timestamptz not null default now()
);

alter table public.account_email_settings enable row level security;

create policy "admin select account email settings"
  on public.account_email_settings
  for select
  using (public.is_account_admin(account_id));

create policy "admin insert account email settings"
  on public.account_email_settings
  for insert
  with check (public.is_account_admin(account_id));

create policy "admin update account email settings"
  on public.account_email_settings
  for update
  using (public.is_account_admin(account_id))
  with check (public.is_account_admin(account_id));
