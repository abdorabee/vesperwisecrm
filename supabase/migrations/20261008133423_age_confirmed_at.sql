-- Signup records the 18+ attestation here. Authenticated UPDATE is limited
-- to the workspace-settings columns, so this timestamp is written with the
-- service role.

alter table public.accounts
  add column if not exists age_confirmed_at timestamptz;

comment on column public.accounts.age_confirmed_at is
  'When the workspace creator confirmed they are 18 or older at signup. Null when the attestation was not recorded.';
