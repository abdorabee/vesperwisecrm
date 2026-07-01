-- P0 audit gaps: invited users should join the inviting account instead of
-- always receiving a new isolated account on auth user creation.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_account_id uuid;
  invited_account_id uuid;
  invited_role text;
begin
  invited_account_id := nullif(new.raw_user_meta_data ->> 'invited_account_id', '')::uuid;
  invited_role := coalesce(nullif(new.raw_user_meta_data ->> 'invited_role', ''), 'member');

  if invited_account_id is not null then
    if invited_role not in ('admin', 'member') then
      invited_role := 'member';
    end if;

    insert into public.account_members (account_id, user_id, role)
    values (invited_account_id, new.id, invited_role)
    on conflict (account_id, user_id) do update
      set role = excluded.role;

    return new;
  end if;

  insert into public.accounts (name)
  values (coalesce(new.raw_user_meta_data ->> 'account_name', split_part(new.email, '@', 1) || '''s account'))
  returning id into new_account_id;

  insert into public.account_members (account_id, user_id, role)
  values (new_account_id, new.id, 'owner');

  insert into public.pipeline_stages (account_id, name, display_order, is_won, is_lost)
  values
    (new_account_id, 'New', 1, false, false),
    (new_account_id, 'Contacted', 2, false, false),
    (new_account_id, 'Qualified', 3, false, false),
    (new_account_id, 'Negotiating', 4, false, false),
    (new_account_id, 'Won', 5, true, false),
    (new_account_id, 'Lost', 6, false, true);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
