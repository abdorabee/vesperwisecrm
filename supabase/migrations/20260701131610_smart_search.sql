-- Smart Search: explainable lead search and related-lead discovery without paid AI.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

set search_path = public, extensions;

create or replace function public.smart_search_normalize(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select trim(regexp_replace(lower(unaccent(coalesce(p_value, ''))), '\s+', ' ', 'g'));
$$;

create or replace function public.smart_search_digits(p_value text)
returns text
language sql
immutable
parallel safe
as $$
  select regexp_replace(coalesce(p_value, ''), '\D', '', 'g');
$$;

create index if not exists contacts_smart_name_trgm_idx
  on public.contacts using gin (
    public.smart_search_normalize(first_name || ' ' || coalesce(last_name, '')) gin_trgm_ops
  )
  where deleted_at is null;

create index if not exists contacts_smart_email_trgm_idx
  on public.contacts using gin (public.smart_search_normalize(email) gin_trgm_ops)
  where email is not null and deleted_at is null;

create index if not exists contacts_smart_phone_digits_idx
  on public.contacts (public.smart_search_digits(phone))
  where phone is not null and deleted_at is null;

create index if not exists contacts_smart_company_trgm_idx
  on public.contacts using gin (public.smart_search_normalize(company) gin_trgm_ops)
  where company is not null and deleted_at is null;

create index if not exists leads_smart_title_trgm_idx
  on public.leads using gin (public.smart_search_normalize(title) gin_trgm_ops)
  where deleted_at is null;

create or replace function public.smart_search_leads(
  p_account_id uuid,
  p_query text,
  p_stage_id uuid default null,
  p_tag_id uuid default null,
  p_owner_id uuid default null,
  p_owner_unassigned boolean default false,
  p_limit integer default 100
)
returns table (
  lead_id uuid,
  relevance integer,
  match_reasons text[]
)
language sql
stable
set search_path = public, extensions
as $$
  with query_input as (
    select
      public.smart_search_normalize(p_query) as q,
      public.smart_search_digits(p_query) as q_digits
  ),
  tag_rollup as (
    select
      lt.lead_id,
      string_agg(t.name, ' ' order by t.name) as tag_text,
      bool_or(lt.tag_id = p_tag_id) as has_filter_tag
    from public.lead_tags lt
    join public.tags t on t.id = lt.tag_id
    where lt.account_id = p_account_id
    group by lt.lead_id
  ),
  base as (
    select
      l.id as lead_id,
      l.title,
      l.pipeline_stage_id,
      l.owner_user_id,
      c.id as contact_id,
      c.first_name,
      c.last_name,
      c.email,
      c.phone,
      c.company,
      c.source,
      c.notes,
      coalesce(tr.tag_text, '') as tag_text,
      coalesce(tr.has_filter_tag, false) as has_filter_tag,
      public.smart_search_normalize(l.title) as title_norm,
      public.smart_search_normalize(c.first_name || ' ' || coalesce(c.last_name, '')) as name_norm,
      public.smart_search_normalize(c.email) as email_norm,
      public.smart_search_digits(c.phone) as phone_digits,
      public.smart_search_normalize(c.company) as company_norm,
      public.smart_search_normalize(c.source) as source_norm,
      public.smart_search_normalize(c.notes) as notes_norm,
      public.smart_search_normalize(coalesce(tr.tag_text, '')) as tags_norm
    from public.leads l
    join public.contacts c on c.id = l.contact_id
    left join tag_rollup tr on tr.lead_id = l.id
    where l.account_id = p_account_id
      and c.account_id = p_account_id
      and l.deleted_at is null
      and c.deleted_at is null
      and (p_stage_id is null or l.pipeline_stage_id = p_stage_id)
      and (p_tag_id is null or coalesce(tr.has_filter_tag, false))
      and (
        (p_owner_unassigned and l.owner_user_id is null)
        or (not p_owner_unassigned and (p_owner_id is null or l.owner_user_id = p_owner_id))
      )
  ),
  scored as (
    select
      b.*,
      greatest(
        case when q.q <> '' and b.email_norm = q.q then 100 else 0 end,
        case when length(q.q_digits) >= 6 and b.phone_digits = q.q_digits then 96 else 0 end,
        case when length(q.q_digits) >= 4 and b.phone_digits like '%' || q.q_digits || '%' then 90 else 0 end,
        case when q.q <> '' and b.company_norm = q.q then 86 else 0 end,
        case when q.q <> '' and b.name_norm = q.q then 84 else 0 end,
        case when q.q <> '' and b.title_norm = q.q then 82 else 0 end,
        case when q.q <> '' and b.tags_norm like '%' || q.q || '%' then 74 else 0 end,
        case when q.q <> '' and b.company_norm like '%' || q.q || '%' then 70 else 0 end,
        case when q.q <> '' and b.name_norm like '%' || q.q || '%' then 68 else 0 end,
        case when q.q <> '' and b.title_norm like '%' || q.q || '%' then 66 else 0 end,
        case when q.q <> '' and b.notes_norm like '%' || q.q || '%' then 54 else 0 end,
        case when q.q <> '' and b.source_norm like '%' || q.q || '%' then 52 else 0 end,
        case
          when q.q <> '' then round(greatest(
            similarity(b.title_norm, q.q),
            similarity(b.name_norm, q.q),
            similarity(b.company_norm, q.q),
            similarity(b.tags_norm, q.q),
            similarity(b.notes_norm, q.q)
          ) * 64)::integer
          else 0
        end
      ) as relevance,
      array_remove(array[
        case when q.q <> '' and b.email_norm = q.q then 'Exact email' end,
        case when length(q.q_digits) >= 6 and b.phone_digits = q.q_digits then 'Exact phone' end,
        case when length(q.q_digits) >= 4 and b.phone_digits like '%' || q.q_digits || '%' then 'Similar phone' end,
        case when q.q <> '' and (b.company_norm = q.q or b.company_norm like '%' || q.q || '%' or similarity(b.company_norm, q.q) >= 0.35) then 'Company match' end,
        case when q.q <> '' and (b.name_norm = q.q or b.name_norm like '%' || q.q || '%' or similarity(b.name_norm, q.q) >= 0.35) then 'Name match' end,
        case when q.q <> '' and (b.title_norm = q.q or b.title_norm like '%' || q.q || '%' or similarity(b.title_norm, q.q) >= 0.35) then 'Lead title match' end,
        case when q.q <> '' and (b.tags_norm like '%' || q.q || '%' or similarity(b.tags_norm, q.q) >= 0.35) then 'Tag match' end,
        case when q.q <> '' and b.notes_norm like '%' || q.q || '%' then 'Notes match' end,
        case when q.q <> '' and b.source_norm like '%' || q.q || '%' then 'Source match' end
      ], null) as reasons
    from base b
    cross join query_input q
  )
  select
    s.lead_id,
    s.relevance,
    case
      when array_length(s.reasons, 1) is null and q.q = '' then array['All active leads']
      when array_length(s.reasons, 1) is null then array['Fuzzy match']
      else s.reasons
    end as match_reasons
  from scored s
  cross join query_input q
  where q.q = ''
    or s.relevance >= 18
  order by s.relevance desc, s.lead_id
  limit least(greatest(coalesce(p_limit, 100), 1), 250);
$$;

create or replace function public.get_related_leads(
  p_account_id uuid,
  p_lead_id uuid,
  p_limit integer default 6
)
returns table (
  lead_id uuid,
  relevance integer,
  match_reasons text[]
)
language sql
stable
set search_path = public, extensions
as $$
  with target as (
    select
      l.id,
      l.contact_id,
      public.smart_search_normalize(c.first_name || ' ' || coalesce(c.last_name, '')) as name_norm,
      public.smart_search_normalize(c.email) as email_norm,
      public.smart_search_digits(c.phone) as phone_digits,
      public.smart_search_normalize(c.company) as company_norm,
      coalesce(array_agg(lt.tag_id) filter (where lt.tag_id is not null), '{}'::uuid[]) as tag_ids
    from public.leads l
    join public.contacts c on c.id = l.contact_id
    left join public.lead_tags lt on lt.lead_id = l.id
    where l.id = p_lead_id
      and l.account_id = p_account_id
      and c.account_id = p_account_id
      and l.deleted_at is null
      and c.deleted_at is null
    group by l.id, l.contact_id, c.first_name, c.last_name, c.email, c.phone, c.company
  ),
  candidates as (
    select
      l.id as lead_id,
      l.contact_id,
      public.smart_search_normalize(c.first_name || ' ' || coalesce(c.last_name, '')) as name_norm,
      public.smart_search_normalize(c.email) as email_norm,
      public.smart_search_digits(c.phone) as phone_digits,
      public.smart_search_normalize(c.company) as company_norm,
      coalesce(array_agg(lt.tag_id) filter (where lt.tag_id is not null), '{}'::uuid[]) as tag_ids
    from public.leads l
    join public.contacts c on c.id = l.contact_id
    left join public.lead_tags lt on lt.lead_id = l.id
    where l.account_id = p_account_id
      and c.account_id = p_account_id
      and l.id <> p_lead_id
      and l.deleted_at is null
      and c.deleted_at is null
    group by l.id, l.contact_id, c.first_name, c.last_name, c.email, c.phone, c.company
  ),
  scored as (
    select
      c.lead_id,
      (
        select count(*)::integer
        from unnest(c.tag_ids) candidate_tag(tag_id)
        where candidate_tag.tag_id = any(t.tag_ids)
      ) as shared_tag_count,
      greatest(
        case when c.contact_id = t.contact_id then 100 else 0 end,
        case when t.email_norm <> '' and c.email_norm = t.email_norm then 98 else 0 end,
        case when length(t.phone_digits) >= 6 and c.phone_digits = t.phone_digits then 94 else 0 end,
        case when length(t.phone_digits) >= 4 and c.phone_digits like '%' || t.phone_digits || '%' then 86 else 0 end,
        case when t.company_norm <> '' and c.company_norm = t.company_norm then 82 else 0 end,
        case when t.name_norm <> '' and similarity(c.name_norm, t.name_norm) >= 0.55 then round(similarity(c.name_norm, t.name_norm) * 76)::integer else 0 end,
        case when t.company_norm <> '' and similarity(c.company_norm, t.company_norm) >= 0.55 then round(similarity(c.company_norm, t.company_norm) * 72)::integer else 0 end
      ) as base_score,
      array_remove(array[
        case when c.contact_id = t.contact_id then 'Same contact' end,
        case when t.email_norm <> '' and c.email_norm = t.email_norm then 'Same email' end,
        case when length(t.phone_digits) >= 6 and c.phone_digits = t.phone_digits then 'Same phone' end,
        case when length(t.phone_digits) >= 4 and c.phone_digits like '%' || t.phone_digits || '%' then 'Similar phone' end,
        case when t.company_norm <> '' and c.company_norm = t.company_norm then 'Same company' end,
        case when t.name_norm <> '' and similarity(c.name_norm, t.name_norm) >= 0.55 then 'Similar name' end,
        case when t.company_norm <> '' and similarity(c.company_norm, t.company_norm) >= 0.55 then 'Similar company' end
      ], null) as base_reasons
    from candidates c
    cross join target t
  ),
  final as (
    select
      s.lead_id,
      greatest(s.base_score, case when s.shared_tag_count > 0 then least(68, 44 + (s.shared_tag_count * 8)) else 0 end) as relevance,
      case
        when s.shared_tag_count > 0 then array_append(s.base_reasons, 'Shared tags')
        else s.base_reasons
      end as match_reasons
    from scored s
  )
  select
    f.lead_id,
    f.relevance,
    f.match_reasons
  from final f
  where f.relevance > 0
  order by f.relevance desc, f.lead_id
  limit least(greatest(coalesce(p_limit, 6), 1), 25);
$$;

revoke execute on function public.smart_search_leads(uuid, text, uuid, uuid, uuid, boolean, integer) from public;
revoke execute on function public.get_related_leads(uuid, uuid, integer) from public;

grant execute on function public.smart_search_leads(uuid, text, uuid, uuid, uuid, boolean, integer) to authenticated;
grant execute on function public.get_related_leads(uuid, uuid, integer) to authenticated;
