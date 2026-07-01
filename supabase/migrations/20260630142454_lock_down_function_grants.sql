-- Prevent these SECURITY DEFINER functions from being called as public RPC endpoints.
-- handle_new_user is trigger-only (no client ever needs to call it directly).
-- is_account_member must stay executable by `authenticated` since RLS policies invoke it
-- as the querying user, but `anon` has no business calling it directly.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_account_member(uuid) from public, anon;
grant execute on function public.is_account_member(uuid) to authenticated;
