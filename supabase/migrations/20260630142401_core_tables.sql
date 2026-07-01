-- Core, industry-agnostic CRM tables: contacts, pipeline_stages, leads, tags.

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  company text,
  source text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.contacts (account_id);
create unique index contacts_account_email_unique
  on public.contacts (account_id, lower(email))
  where email is not null and deleted_at is null;

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  display_order integer not null,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index pipeline_stages_account_order_unique
  on public.pipeline_stages (account_id, display_order);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  pipeline_stage_id uuid not null references public.pipeline_stages(id) on delete restrict,
  title text not null,
  value numeric(12,2),
  status text not null default 'open' check (status in ('open','won','lost')),
  owner_user_id uuid references auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.leads (account_id, pipeline_stage_id);
create index on public.leads (account_id, contact_id);
create index on public.leads (account_id, created_at);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

create unique index tags_account_name_unique on public.tags (account_id, lower(name));

create table public.lead_tags (
  lead_id uuid not null references public.leads(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, tag_id)
);

create index on public.lead_tags (account_id);

alter table public.contacts enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.leads enable row level security;
alter table public.tags enable row level security;
alter table public.lead_tags enable row level security;

create policy "select own account contacts" on public.contacts for select using (public.is_account_member(account_id));
create policy "insert own account contacts" on public.contacts for insert with check (public.is_account_member(account_id));
create policy "update own account contacts" on public.contacts for update using (public.is_account_member(account_id)) with check (public.is_account_member(account_id));
create policy "delete own account contacts" on public.contacts for delete using (public.is_account_member(account_id));

create policy "select own account stages" on public.pipeline_stages for select using (public.is_account_member(account_id));
create policy "insert own account stages" on public.pipeline_stages for insert with check (public.is_account_member(account_id));
create policy "update own account stages" on public.pipeline_stages for update using (public.is_account_member(account_id)) with check (public.is_account_member(account_id));
create policy "delete own account stages" on public.pipeline_stages for delete using (public.is_account_member(account_id));

create policy "select own account leads" on public.leads for select using (public.is_account_member(account_id));
create policy "insert own account leads" on public.leads for insert with check (public.is_account_member(account_id));
create policy "update own account leads" on public.leads for update using (public.is_account_member(account_id)) with check (public.is_account_member(account_id));
create policy "delete own account leads" on public.leads for delete using (public.is_account_member(account_id));

create policy "select own account tags" on public.tags for select using (public.is_account_member(account_id));
create policy "insert own account tags" on public.tags for insert with check (public.is_account_member(account_id));
create policy "update own account tags" on public.tags for update using (public.is_account_member(account_id)) with check (public.is_account_member(account_id));
create policy "delete own account tags" on public.tags for delete using (public.is_account_member(account_id));

create policy "select own account lead_tags" on public.lead_tags for select using (public.is_account_member(account_id));
create policy "insert own account lead_tags" on public.lead_tags for insert with check (public.is_account_member(account_id));
create policy "delete own account lead_tags" on public.lead_tags for delete using (public.is_account_member(account_id));

-- Extend signup provisioning to seed default pipeline stages for the new account.
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

  insert into public.pipeline_stages (account_id, name, display_order, is_won, is_lost)
  values
    (new_account_id, 'New', 1, false, false),
    (new_account_id, 'Contacted', 2, false, false),
    (new_account_id, 'Qualified', 3, false, false),
    (new_account_id, 'Negotiating', 4, false, false),
    (new_account_id, 'Won', 5, true, false),
    (new_account_id, 'Lost', 6, false, true);

  return new;
end;
$$;
