-- Sequences, activity feed, and manual enrollment/step-tracking (no auto-send).

create table public.sequences (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.sequences (account_id);

create table public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  sequence_id uuid not null references public.sequences(id) on delete cascade,
  step_number integer not null,
  channel text not null default 'email' check (channel in ('email','sms')),
  delay_days integer not null default 0,
  subject text,
  body_template text not null,
  created_at timestamptz not null default now()
);

create unique index sequence_steps_sequence_order_unique
  on public.sequence_steps (sequence_id, step_number);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null check (type in (
    'stage_changed', 'tag_added', 'tag_removed', 'email_sent',
    'note_added', 'lead_created', 'sequence_enrolled', 'sequence_step_sent'
  )),
  actor_user_id uuid references auth.users(id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index on public.activities (account_id, lead_id, created_at desc);

create table public.lead_sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  sequence_id uuid not null references public.sequences(id) on delete cascade,
  current_step_number integer not null default 1,
  status text not null default 'active' check (status in ('active','completed','paused','cancelled')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.lead_sequence_enrollments (account_id, lead_id);
create unique index lead_sequence_enrollments_active_unique
  on public.lead_sequence_enrollments (lead_id, sequence_id)
  where status = 'active';

create table public.sequence_step_sends (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  enrollment_id uuid not null references public.lead_sequence_enrollments(id) on delete cascade,
  sequence_step_id uuid not null references public.sequence_steps(id) on delete restrict,
  sent_by_user_id uuid references auth.users(id),
  sent_at timestamptz not null default now(),
  activity_id uuid references public.activities(id)
);

create index on public.sequence_step_sends (account_id, enrollment_id);

alter table public.sequences enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.activities enable row level security;
alter table public.lead_sequence_enrollments enable row level security;
alter table public.sequence_step_sends enable row level security;

create policy "select own account sequences" on public.sequences for select using (public.is_account_member(account_id));
create policy "insert own account sequences" on public.sequences for insert with check (public.is_account_member(account_id));
create policy "update own account sequences" on public.sequences for update using (public.is_account_member(account_id)) with check (public.is_account_member(account_id));
create policy "delete own account sequences" on public.sequences for delete using (public.is_account_member(account_id));

create policy "select own account sequence_steps" on public.sequence_steps for select using (public.is_account_member(account_id));
create policy "insert own account sequence_steps" on public.sequence_steps for insert with check (public.is_account_member(account_id));
create policy "update own account sequence_steps" on public.sequence_steps for update using (public.is_account_member(account_id)) with check (public.is_account_member(account_id));
create policy "delete own account sequence_steps" on public.sequence_steps for delete using (public.is_account_member(account_id));

create policy "select own account activities" on public.activities for select using (public.is_account_member(account_id));
create policy "insert own account activities" on public.activities for insert with check (public.is_account_member(account_id));

create policy "select own account enrollments" on public.lead_sequence_enrollments for select using (public.is_account_member(account_id));
create policy "insert own account enrollments" on public.lead_sequence_enrollments for insert with check (public.is_account_member(account_id));
create policy "update own account enrollments" on public.lead_sequence_enrollments for update using (public.is_account_member(account_id)) with check (public.is_account_member(account_id));
create policy "delete own account enrollments" on public.lead_sequence_enrollments for delete using (public.is_account_member(account_id));

create policy "select own account step_sends" on public.sequence_step_sends for select using (public.is_account_member(account_id));
create policy "insert own account step_sends" on public.sequence_step_sends for insert with check (public.is_account_member(account_id));
