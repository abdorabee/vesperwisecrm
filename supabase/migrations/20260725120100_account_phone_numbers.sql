-- Security audit 2026-07-25, finding H-2.
--
-- Inbound SMS had no tenant identifier, so process-inbound.ts searched every
-- account's contacts for a matching sender and wrote the message into whichever
-- lead sorted first. The same seller phone worked by two tenants -- routine in
-- wholesaling -- put one tenant's conversation into the other's CRM.
--
-- The receiving number is the trustworthy signal. This table maps it to an
-- account. Until a row exists for a given number the application falls back to
-- contact matching, but quarantines instead of guessing whenever the sender
-- matches contacts in more than one account.

create table public.account_phone_numbers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  -- Last 10 digits, matching normalizePhoneDigits() in src/lib/sms.
  phone_digits text not null check (phone_digits ~ '^[0-9]{10}$'),
  label text,
  created_at timestamptz not null default now(),
  released_at timestamptz
);

-- One tenant per live number. Released numbers may be reassigned later.
create unique index account_phone_numbers_live_unique
  on public.account_phone_numbers (phone_digits)
  where released_at is null;

create index account_phone_numbers_account_idx
  on public.account_phone_numbers (account_id);

alter table public.account_phone_numbers enable row level security;

-- Members can see their own account's mappings. Writes are deliberately NOT
-- self-service: nothing today verifies that an account claiming phone_digits
-- actually controls that number in the shared Twilio account, so admin
-- self-service INSERT/UPDATE would let one tenant squat or hijack another
-- tenant's number, routing their inbound SMS into the attacker's account.
-- Until a real ownership-verification flow exists (e.g. a Twilio-signed
-- webhook proving control of the number), provisioning is service-role-only
-- -- an internal/operator action, not exposed to the client. No application
-- code writes to this table today, so this restriction breaks nothing.
create policy "members select own account phone numbers"
  on public.account_phone_numbers
  for select to authenticated
  using (public.is_account_member(account_id));

grant select on public.account_phone_numbers to authenticated;

notify pgrst, 'reload schema';
