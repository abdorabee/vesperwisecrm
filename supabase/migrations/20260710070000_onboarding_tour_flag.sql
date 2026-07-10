-- Onboarding tour flag: persist whether each account member has completed
-- the first-run dashboard walkthrough. Existing rows are backfilled so
-- current users are not shown the new tour on their next login.

alter table public.account_members
  add column onboarding_tour_completed_at timestamptz;

update public.account_members
set onboarding_tour_completed_at = now()
where onboarding_tour_completed_at is null;

create or replace function public.prevent_unsafe_self_member_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_role in ('postgres', 'service_role') then
    return new;
  end if;

  if public.is_account_admin(old.account_id) then
    return new;
  end if;

  if old.user_id = auth.uid()
    and to_jsonb(new) - 'onboarding_tour_completed_at'
      = to_jsonb(old) - 'onboarding_tour_completed_at'
  then
    return new;
  end if;

  raise exception 'Only onboarding tour completion can be self-updated';
end;
$$;

create trigger prevent_unsafe_self_member_updates
  before update on public.account_members
  for each row execute function public.prevent_unsafe_self_member_updates();

create policy "update own onboarding tour flag" on public.account_members
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
