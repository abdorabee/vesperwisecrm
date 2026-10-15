alter table public.accounts
  add column if not exists company_name text,
  add column if not exists postal_address text;

alter table public.accounts
  add constraint accounts_company_name_length check (
    company_name is null or char_length(btrim(company_name)) between 1 and 200
  ),
  add constraint accounts_postal_address_length check (
    postal_address is null or char_length(btrim(postal_address)) between 1 and 500
  );

drop trigger if exists touch_account_workspace_settings_updated_at on public.accounts;
create trigger touch_account_workspace_settings_updated_at
before update of name, timezone, currency_code, date_format, time_format, company_name, postal_address
on public.accounts
for each row execute function public.touch_account_workspace_settings_updated_at();

grant update (company_name, postal_address)
  on table public.accounts to authenticated;
