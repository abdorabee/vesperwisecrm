create table public.lead_properties (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  property_type text,
  bedrooms numeric,
  bathrooms numeric,
  square_feet integer check (square_feet is null or square_feet >= 0),
  asking_price numeric check (asking_price is null or asking_price >= 0),
  estimated_value numeric check (estimated_value is null or estimated_value >= 0),
  contract_status text not null default 'none' check (
    contract_status in ('none', 'offered', 'under_contract', 'closed', 'cancelled')
  ),
  contract_amount numeric check (contract_amount is null or contract_amount >= 0),
  contract_close_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, lead_id)
);

create index lead_properties_account_id_idx on public.lead_properties (account_id);
create index lead_properties_lead_id_idx on public.lead_properties (lead_id);
create index lead_properties_contract_status_idx
  on public.lead_properties (account_id, contract_status);

alter table public.lead_properties enable row level security;

create policy "select own account lead properties"
  on public.lead_properties
  for select
  to authenticated
  using (public.is_account_member(account_id));

create policy "insert own account lead properties"
  on public.lead_properties
  for insert
  to authenticated
  with check (public.is_account_member(account_id));

create policy "update own account lead properties"
  on public.lead_properties
  for update
  to authenticated
  using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

create policy "delete own account lead properties"
  on public.lead_properties
  for delete
  to authenticated
  using (public.is_account_member(account_id));
