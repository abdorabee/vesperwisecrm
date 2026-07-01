-- Inbound reply capture: tokens, activity type, account toggle.

create table public.email_reply_tokens (
  token text primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  outbound_activity_id uuid references public.activities(id) on delete set null,
  thread_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '365 days')
);

create index email_reply_tokens_account_lead_idx
  on public.email_reply_tokens (account_id, lead_id);

create index email_reply_tokens_expires_at_idx
  on public.email_reply_tokens (expires_at);

alter table public.email_reply_tokens enable row level security;

alter table public.account_email_settings
  add column capture_replies_enabled boolean not null default true;

alter table public.activities drop constraint activities_type_check;
alter table public.activities add constraint activities_type_check check (type in (
  'stage_changed', 'tag_added', 'tag_removed', 'email_sent', 'email_received', 'sms_sent',
  'note_added', 'lead_created', 'sequence_enrolled', 'sequence_step_sent',
  'lead_assigned', 'lead_unassigned', 'workflow_triggered',
  'task_created', 'task_completed'
));
