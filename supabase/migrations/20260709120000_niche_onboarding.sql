-- Niche-templated onboarding: signup captures a niche (wholesaler vs
-- cold-calling agency) so the seeded pipeline stages match how that
-- business actually talks about its deals, instead of one generic default.

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
  invited_client_id uuid;
  niche text;
  needs_follow_up_tag_id uuid;
  at_risk_tag_id uuid;
  hot_sequence_id uuid;
  cold_sequence_id uuid;
  stale_workflow_id uuid;
  at_risk_workflow_id uuid;
begin
  invited_account_id := nullif(new.raw_user_meta_data ->> 'invited_account_id', '')::uuid;
  invited_role := coalesce(nullif(new.raw_user_meta_data ->> 'invited_role', ''), 'member');
  invited_client_id := nullif(new.raw_user_meta_data ->> 'invited_client_id', '')::uuid;

  if invited_account_id is not null then
    if invited_role not in ('admin', 'member', 'client') then
      invited_role := 'member';
    end if;

    insert into public.account_members (account_id, user_id, role, client_id)
    values (
      invited_account_id,
      new.id,
      invited_role,
      case when invited_role = 'client' then invited_client_id else null end
    )
    on conflict (account_id, user_id) do update
      set role = excluded.role, client_id = excluded.client_id;

    return new;
  end if;

  niche := coalesce(nullif(new.raw_user_meta_data ->> 'niche', ''), 'wholesaler');
  if niche not in ('wholesaler', 'agency') then
    niche := 'wholesaler';
  end if;

  insert into public.accounts (name)
  values (coalesce(new.raw_user_meta_data ->> 'account_name', split_part(new.email, '@', 1) || '''s account'))
  returning id into new_account_id;

  insert into public.account_members (account_id, user_id, role)
  values (new_account_id, new.id, 'owner');

  if niche = 'agency' then
    insert into public.pipeline_stages (account_id, name, display_order, is_won, is_lost)
    values
      (new_account_id, 'Submitted', 1, false, false),
      (new_account_id, 'Qualified', 2, false, false),
      (new_account_id, 'With Client', 3, false, false),
      (new_account_id, 'Under Contract', 4, false, false),
      (new_account_id, 'Closed', 5, true, false),
      (new_account_id, 'Dead', 6, false, true);
  else
    insert into public.pipeline_stages (account_id, name, display_order, is_won, is_lost)
    values
      (new_account_id, 'New', 1, false, false),
      (new_account_id, 'Contacted', 2, false, false),
      (new_account_id, 'Qualified', 3, false, false),
      (new_account_id, 'Negotiating', 4, false, false),
      (new_account_id, 'Won', 5, true, false),
      (new_account_id, 'Lost', 6, false, true);
  end if;

  insert into public.tags (account_id, name, color)
  values (new_account_id, 'Needs Follow-up', '#f59e0b')
  returning id into needs_follow_up_tag_id;

  insert into public.tags (account_id, name, color)
  values (new_account_id, 'At Risk', '#ef4444')
  returning id into at_risk_tag_id;

  insert into public.tags (account_id, name, color)
  values (new_account_id, 'Hot Lead', '#22c55e');

  insert into public.sequences (account_id, name, description, is_active)
  values (new_account_id, 'Hot Seller Follow-up', 'Day 1 / 3 / 7 cadence for motivated sellers.', true)
  returning id into hot_sequence_id;

  insert into public.sequence_steps (account_id, sequence_id, step_number, channel, delay_days, subject, body_template)
  values
    (new_account_id, hot_sequence_id, 1, 'email', 0, 'Following up on your property',
      'Hi {{first_name}},' || chr(10) || chr(10) || 'Thanks for talking with us about your property. I wanted to follow up while it''s fresh — do you have a few minutes this week to go over next steps?' || chr(10) || chr(10) || 'Talk soon.'),
    (new_account_id, hot_sequence_id, 2, 'email', 3, 'Still interested in your timeline',
      'Hi {{first_name}},' || chr(10) || chr(10) || 'Circling back on your property. If your timeline has changed or you have questions about the offer, just reply here.'),
    (new_account_id, hot_sequence_id, 3, 'email', 7, 'One more check-in',
      'Hi {{first_name}},' || chr(10) || chr(10) || 'Wanted to check in one more time before we move on to other properties in the area. Let me know if you''d like to continue the conversation.');

  insert into public.sequences (account_id, name, description, is_active)
  values (new_account_id, 'Cold Lead Nurture', 'Day 30 / 60 / 90 long-term nurture for leads that aren''t ready yet.', true)
  returning id into cold_sequence_id;

  insert into public.sequence_steps (account_id, sequence_id, step_number, channel, delay_days, subject, body_template)
  values
    (new_account_id, cold_sequence_id, 1, 'email', 30, 'Checking back in',
      'Hi {{first_name}},' || chr(10) || chr(10) || 'It''s been a little while since we talked about your property. Has anything changed on your end?'),
    (new_account_id, cold_sequence_id, 2, 'email', 60, 'Still here when you''re ready',
      'Hi {{first_name}},' || chr(10) || chr(10) || 'No pressure at all — just wanted to stay on your radar in case your plans for the property have shifted.'),
    (new_account_id, cold_sequence_id, 3, 'email', 90, 'One last check-in',
      'Hi {{first_name}},' || chr(10) || chr(10) || 'Wanted to reach out one more time. If your situation has changed, we''d love to help — otherwise we''ll leave you be.');

  insert into public.workflows (account_id, name, is_active, trigger_type, trigger_config)
  values (new_account_id, 'Flag stale leads', true, 'no_activity_days', jsonb_build_object('days', 7))
  returning id into stale_workflow_id;

  insert into public.workflow_actions (account_id, workflow_id, step_number, action_type, action_config)
  values (new_account_id, stale_workflow_id, 1, 'add_tag', jsonb_build_object('tagId', needs_follow_up_tag_id));

  insert into public.workflows (account_id, name, is_active, trigger_type, trigger_config)
  values (new_account_id, 'Flag at-risk leads', true, 'no_next_action', jsonb_build_object('hours', 24))
  returning id into at_risk_workflow_id;

  insert into public.workflow_actions (account_id, workflow_id, step_number, action_type, action_config)
  values (new_account_id, at_risk_workflow_id, 1, 'add_tag', jsonb_build_object('tagId', at_risk_tag_id));

  return new;
end;
$$;
