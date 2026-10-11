-- Bind each invite link to one invites row. Redemption looks up this
-- digest of the verified OTP, so a newer invite for the same email cannot
-- take the join when an older link is opened.

alter table public.invites
  add column auth_token_hash text;

alter table public.invites
  add constraint invites_auth_token_hash_format
  check (auth_token_hash is null or auth_token_hash ~ '^[0-9a-f]{64}$');

create unique index invites_auth_token_hash_uidx
  on public.invites (auth_token_hash)
  where auth_token_hash is not null;

notify pgrst, 'reload schema';
