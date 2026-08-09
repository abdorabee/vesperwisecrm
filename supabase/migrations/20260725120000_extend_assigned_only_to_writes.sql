-- Security audit 2026-07-25, finding H-1.
--
-- `lead_visibility = 'assigned_only'` was applied to the leads SELECT policy in
-- 20260630203800 but never to the write policies, nor to the tables that hold
-- the actual sensitive content. A restricted member could therefore:
--   * read every contact (seller PII) and every activity (email + SMS bodies,
--     call notes) in the account, including for leads they cannot see;
--   * UPDATE or DELETE any lead in the account;
--   * reassign a lead to themselves and thereby gain the read access the
--     restriction was meant to deny.
--
-- This migration introduces one predicate and applies it consistently. The
-- dialer's can_access_dialer_lead() already did the right thing -- this is the
-- same rule, generalized and reused.

-- Whether the current user may act on a given lead, honoring assigned_only.
create or replace function public.can_access_lead(p_lead_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.leads l
    where l.id = p_lead_id
      and public.is_account_member(l.account_id)
      and (
        l.owner_user_id = (select auth.uid())
        or public.is_account_admin(l.account_id)
        or not exists (
          select 1 from public.account_members am
          where am.account_id = l.account_id
            and am.user_id = (select auth.uid())
            and am.lead_visibility = 'assigned_only'
        )
      )
  );
$$;

revoke execute on function public.can_access_lead(uuid) from public, anon;
grant execute on function public.can_access_lead(uuid) to authenticated;

-- Whether the current user is restricted at all. Cheap short-circuit so the
-- unrestricted majority keeps the original single-predicate cost.
create or replace function public.has_assigned_only_visibility(p_account_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.account_members am
    where am.account_id = p_account_id
      and am.user_id = (select auth.uid())
      and am.lead_visibility = 'assigned_only'
  );
$$;

revoke execute on function public.has_assigned_only_visibility(uuid) from public, anon;
grant execute on function public.has_assigned_only_visibility(uuid) to authenticated;

-- Leads: writes now match the narrowed read policy.
drop policy if exists "update own account leads" on public.leads;
create policy "update own account leads" on public.leads for update to authenticated
  using (
    public.is_account_member(account_id)
    and (
      owner_user_id = (select auth.uid())
      or not public.has_assigned_only_visibility(account_id)
    )
  )
  with check (
    public.is_account_member(account_id)
    and (
      owner_user_id = (select auth.uid())
      or not public.has_assigned_only_visibility(account_id)
    )
  );

drop policy if exists "delete own account leads" on public.leads;
create policy "delete own account leads" on public.leads for delete to authenticated
  using (
    public.is_account_member(account_id)
    and (
      owner_user_id = (select auth.uid())
      or not public.has_assigned_only_visibility(account_id)
    )
  );

-- Activities carry email bodies, SMS bodies and call notes -- the content the
-- restriction is actually protecting.
drop policy if exists "select own account activities" on public.activities;
create policy "select own account activities" on public.activities for select to authenticated
  using (
    public.is_account_member(account_id)
    and (
      not public.has_assigned_only_visibility(account_id)
      or lead_id is null
      or public.can_access_lead(lead_id)
    )
  );

-- Contacts hold seller PII. A restricted member reaches a contact when they own
-- a lead referencing it. Contacts with no lead at all stay readable: they are
-- newly inserted rows with no lead context to protect, and INSERT ... RETURNING
-- is subject to the SELECT policy, so excluding them would break contact
-- creation during the lead-creation flow.
drop policy if exists "select own account contacts" on public.contacts;
create policy "select own account contacts" on public.contacts for select to authenticated
  using (
    public.is_account_member(account_id)
    and (
      not public.has_assigned_only_visibility(account_id)
      or exists (
        select 1 from public.leads l
        where l.contact_id = contacts.id
          and l.account_id = contacts.account_id
          and l.deleted_at is null
          and l.owner_user_id = (select auth.uid())
      )
      or not exists (
        select 1 from public.leads l
        where l.contact_id = contacts.id
          and l.deleted_at is null
      )
    )
  );

drop policy if exists "update own account contacts" on public.contacts;
create policy "update own account contacts" on public.contacts for update to authenticated
  using (
    public.is_account_member(account_id)
    and (
      not public.has_assigned_only_visibility(account_id)
      or exists (
        select 1 from public.leads l
        where l.contact_id = contacts.id
          and l.account_id = contacts.account_id
          and l.deleted_at is null
          and l.owner_user_id = (select auth.uid())
      )
    )
  )
  with check (public.is_account_member(account_id));

drop policy if exists "delete own account contacts" on public.contacts;
create policy "delete own account contacts" on public.contacts for delete to authenticated
  using (
    public.is_account_member(account_id)
    and not public.has_assigned_only_visibility(account_id)
  );

-- Lead tags leak lead existence and segmentation.
drop policy if exists "select own account lead_tags" on public.lead_tags;
create policy "select own account lead_tags" on public.lead_tags for select to authenticated
  using (
    public.is_account_member(account_id)
    and (
      not public.has_assigned_only_visibility(account_id)
      or public.can_access_lead(lead_id)
    )
  );

-- Property details belong to the lead they describe.
drop policy if exists "select own account lead_properties" on public.lead_properties;
create policy "select own account lead_properties" on public.lead_properties for select to authenticated
  using (
    public.is_account_member(account_id)
    and (
      not public.has_assigned_only_visibility(account_id)
      or public.can_access_lead(lead_id)
    )
  );

-- Supporting indexes: the new predicates filter leads by owner and by contact.
create index if not exists leads_account_owner_idx
  on public.leads (account_id, owner_user_id) where deleted_at is null;
create index if not exists leads_contact_idx
  on public.leads (contact_id) where deleted_at is null;

notify pgrst, 'reload schema';
