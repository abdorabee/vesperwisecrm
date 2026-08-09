-- Tenant policies call helper functions whose EXECUTE privilege is deliberately
-- restricted to authenticated users. Policies created without a TO clause apply
-- to PUBLIC, causing anonymous Data API requests to fail with 42501 instead of
-- being denied cleanly by RLS.
do $$
declare
  tenant_policy record;
begin
  for tenant_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and roles @> array['public'::name]
      and (
        coalesce(qual, '') || ' ' || coalesce(with_check, '')
      ) ~ '(is_account_member|is_account_admin|is_account_client|get_my_client_id)'
  loop
    execute format(
      'alter policy %I on %I.%I to authenticated',
      tenant_policy.policyname,
      tenant_policy.schemaname,
      tenant_policy.tablename
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';
