-- Security audit 2026-07-25, findings L-3 and H-3 (database half).

-- L-3: 20260721235738 restricted tenant policies to `authenticated`, but its
-- WHERE clause only matched policies referencing the helper functions. These
-- two are auth.uid()-based, so they were skipped and still apply to PUBLIC
-- (which includes anon). No live leak -- anon matches zero rows -- but it
-- breaks the invariant that migration set out to establish.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'account_members'
      and policyname = 'select own membership row'
      and roles @> array['public'::name]
  ) then
    alter policy "select own membership row" on public.account_members to authenticated;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'account_members'
      and policyname = 'update own onboarding tour flag'
      and roles @> array['public'::name]
  ) then
    alter policy "update own onboarding tour flag" on public.account_members to authenticated;
  end if;
end;
$$;

-- H-3: accounts.name is set from raw_user_meta_data at signup, which any
-- self-registered user controls by calling the Supabase auth API directly with
-- the public anon key. It is interpolated into invitation emails, so an
-- unbounded value is a phishing payload. Application-side escaping is the real
-- fix; this bounds the input as defense in depth.
create or replace function public.sanitize_account_name(p_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(
    btrim(regexp_replace(coalesce(p_name, ''), '[<>{}\r\n]', '', 'g')),
    ''
  );
$$;

-- Backfill any existing name that would now be rejected.
update public.accounts
set name = coalesce(public.sanitize_account_name(name), 'Account')
where name is distinct from coalesce(public.sanitize_account_name(name), 'Account');

alter table public.accounts
  add constraint accounts_name_length_check
  check (char_length(name) between 1 and 120);

-- Applied as a table trigger rather than inside handle_new_user() so every
-- write path is covered, including the several historical copies of that
-- trigger and any future admin rename UI.
create or replace function public.normalize_account_name()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.name := left(coalesce(public.sanitize_account_name(new.name), 'Account'), 120);
  return new;
end;
$$;

create trigger normalize_account_name
  before insert or update of name on public.accounts
  for each row execute function public.normalize_account_name();

notify pgrst, 'reload schema';
