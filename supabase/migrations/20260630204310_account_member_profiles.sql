-- Expose member email addresses (from auth.users, normally inaccessible to
-- clients) scoped to the caller's own account, for the groups/team/scorecard UIs.

create or replace function public.get_account_member_profiles(p_account_id uuid)
returns table (
  user_id uuid,
  email text,
  role text,
  lead_visibility text,
  max_open_leads integer
)
language sql
security definer
stable
set search_path = public
as $$
  select am.user_id, u.email, am.role, am.lead_visibility, am.max_open_leads
  from public.account_members am
  join auth.users u on u.id = am.user_id
  where am.account_id = p_account_id
    and public.is_account_member(p_account_id);
$$;

revoke execute on function public.get_account_member_profiles(uuid) from public, anon;
grant execute on function public.get_account_member_profiles(uuid) to authenticated;
