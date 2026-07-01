-- Tenancy root: accounts + account_members, with auto-provisioning on signup.

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.account_members (
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

create index on public.account_members (user_id);

create or replace function public.is_account_member(check_account_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.account_members
    where account_id = check_account_id and user_id = auth.uid()
  );
$$;

alter table public.accounts enable row level security;
alter table public.account_members enable row level security;

create policy "select own accounts" on public.accounts
  for select using (public.is_account_member(id));

create policy "select own account memberships" on public.account_members
  for select using (public.is_account_member(account_id));

-- Auto-provision a personal account for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_account_id uuid;
begin
  insert into public.accounts (name)
  values (coalesce(new.raw_user_meta_data ->> 'account_name', split_part(new.email, '@', 1) || '''s account'))
  returning id into new_account_id;

  insert into public.account_members (account_id, user_id, role)
  values (new_account_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
