-- Signup records acceptance here. Authenticated UPDATE is limited to the
-- workspace-settings columns, so this timestamp is written with the service role.

alter table public.accounts
  add column if not exists terms_accepted_at timestamptz;

comment on column public.accounts.terms_accepted_at is
  'When the workspace creator accepted the terms at signup. Null when acceptance was not recorded.';
