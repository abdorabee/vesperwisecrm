-- New Team trials get 5 seats. Existing trial rows still at the column
-- default of 1 are raised to 5. Polar and grandfathered rows are left alone.

create or replace function billing_private.create_billing_account()
returns trigger
language plpgsql
security definer
set search_path = public, billing_private, pg_temp
as $$
begin
  insert into public.billing_accounts (
    account_id,
    source,
    plan_key,
    provider_status,
    seats,
    trial_start,
    trial_end
  )
  values (
    new.id,
    'trial',
    'team',
    'trialing',
    5,
    now(),
    now() + interval '60 days'
  )
  on conflict (account_id) do nothing;
  return new;
end;
$$;

revoke execute on function billing_private.create_billing_account() from public, anon, authenticated;

update public.billing_accounts
set
  seats = 5,
  updated_at = now()
where source = 'trial'
  and seats = 1;
