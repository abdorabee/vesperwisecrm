alter table public.accounts
  add column if not exists timezone text null,
  add column if not exists currency_code text not null default 'USD',
  add column if not exists date_format text not null default 'system',
  add column if not exists time_format text not null default 'system',
  add column if not exists updated_at timestamptz not null default now();

alter table public.accounts
  add constraint accounts_currency_code_check check (currency_code ~ '^[A-Z]{3}$'),
  add constraint accounts_date_format_check check (
    date_format in ('system', 'month_day_year', 'day_month_year', 'iso')
  ),
  add constraint accounts_time_format_check check (
    time_format in ('system', '12h', '24h')
  );

create or replace function public.touch_account_workspace_settings_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.touch_account_workspace_settings_updated_at()
  from public, anon, authenticated;

drop trigger if exists touch_account_workspace_settings_updated_at on public.accounts;
create trigger touch_account_workspace_settings_updated_at
before update of name, timezone, currency_code, date_format, time_format
on public.accounts
for each row execute function public.touch_account_workspace_settings_updated_at();

drop policy if exists "admins update workspace settings" on public.accounts;
create policy "admins update workspace settings" on public.accounts
  for update to authenticated
  using (public.is_account_admin(id))
  with check (public.is_account_admin(id));

revoke update on table public.accounts from authenticated;
grant update (name, timezone, currency_code, date_format, time_format)
  on table public.accounts to authenticated;
