-- Bring-your-own-Twilio credentials for the dialer.
--
-- Each account can connect its own Twilio account (Account SID, Auth Token,
-- API Key SID/Secret, TwiML App SID, phone number) so Twilio bills the tenant
-- directly instead of the platform. Auth Token and API Key Secret are the two
-- values that let anyone impersonate the tenant against the full Twilio REST
-- API (place calls, read recordings, rack up charges) -- unlike
-- account_phone_numbers (20260725120100), this table grants NO policies to
-- `authenticated` at all. There is deliberately no client-reachable read or
-- write path, not even for account admins: every touch of this table goes
-- through the service-role client, gated by requireAdminAccountId() in
-- application code. Service role bypasses RLS by default, so the table still
-- needs RLS enabled to keep the deny-by-default posture explicit.

create table public.dialer_provider_credentials (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  provider text not null default 'twilio' check (provider = 'twilio'),
  account_sid text not null,
  auth_token_ciphertext text not null,
  api_key_sid text not null,
  api_key_secret_ciphertext text not null,
  twiml_app_sid text not null,
  from_number text not null,
  status text not null default 'active' check (status in ('active', 'invalid')),
  last_verified_at timestamptz,
  connected_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dialer_provider_credentials enable row level security;

notify pgrst, 'reload schema';
