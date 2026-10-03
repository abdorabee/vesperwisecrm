-- Public sample workspace for /demo.
-- Fictional sellers only. The shared password is intentional: server actions
-- reject writes for this account and ask the visitor to create a workspace.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  'd4e00000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'sample@demo.vesperwisecrm.invalid',
  extensions.crypt('vesper-sample-workspace-2026', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"account_name":"Sample acquisitions","niche":"wholesaler"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into auth.identities (
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  'd4e00000-0000-4000-8000-000000000001',
  jsonb_build_object(
    'sub', 'd4e00000-0000-4000-8000-000000000001',
    'email', 'sample@demo.vesperwisecrm.invalid',
    'email_verified', true
  ),
  'email',
  'd4e00000-0000-4000-8000-000000000001',
  now(),
  now(),
  now()
where not exists (
  select 1
  from auth.identities
  where user_id = 'd4e00000-0000-4000-8000-000000000001'
    and provider = 'email'
);

do $$
declare
  demo_user uuid := 'd4e00000-0000-4000-8000-000000000001';
  acct uuid;
  stage_new uuid;
  stage_contacted uuid;
  stage_qualified uuid;
  stage_negotiating uuid;
  stage_won uuid;
  hot_tag uuid;
  hot_sequence uuid;
begin
  select account_id into acct
  from public.account_members
  where user_id = demo_user
  limit 1;

  if acct is null then
    raise exception 'sample demo account was not provisioned';
  end if;

  update public.accounts
  set name = 'Sample acquisitions'
  where id = acct;

  update public.account_members
  set onboarding_tour_completed_at = coalesce(onboarding_tour_completed_at, now())
  where user_id = demo_user
    and account_id = acct;

  update public.billing_accounts
  set source = 'grandfathered',
      plan_key = 'team',
      provider_status = 'active',
      seats = 3
  where account_id = acct;

  if exists (
    select 1 from public.leads where id = 'd4e00000-0000-4000-8000-000000000103'
  ) then
    return;
  end if;

  select id into stage_new from public.pipeline_stages where account_id = acct and name = 'New';
  select id into stage_contacted from public.pipeline_stages where account_id = acct and name = 'Contacted';
  select id into stage_qualified from public.pipeline_stages where account_id = acct and name = 'Qualified';
  select id into stage_negotiating from public.pipeline_stages where account_id = acct and name = 'Negotiating';
  select id into stage_won from public.pipeline_stages where account_id = acct and name = 'Won';
  select id into hot_tag from public.tags where account_id = acct and name = 'Hot Lead';
  select id into hot_sequence from public.sequences where account_id = acct and name = 'Hot Seller Follow-up';

  insert into public.contacts (
    id, account_id, first_name, last_name, email, phone, source, notes
  ) values
    ('d4e00000-0000-4000-8000-000000000011', acct, 'Ada', 'Quill', 'ada.quill@example.invalid', '317-555-0148', 'Direct mail', 'Sample seller. Not a real person.'),
    ('d4e00000-0000-4000-8000-000000000012', acct, 'Mateo', 'Solano', 'mateo.solano@example.invalid', '260-555-0194', 'Cold list', 'Sample seller. Not a real person.'),
    ('d4e00000-0000-4000-8000-000000000013', acct, 'Helen', 'Cho', 'helen.cho@example.invalid', '765-555-0172', 'Referral', 'Sample seller. Not a real person.'),
    ('d4e00000-0000-4000-8000-000000000014', acct, 'Rowan', 'Peck', 'rowan.peck@example.invalid', '765-555-0119', 'PPC', 'Sample seller. Not a real person.'),
    ('d4e00000-0000-4000-8000-000000000015', acct, 'Imani', 'Brooks', 'imani.brooks@example.invalid', '765-555-0160', 'Inbound', 'Sample seller. Not a real person.'),
    ('d4e00000-0000-4000-8000-000000000016', acct, 'Samir', 'Dalal', 'samir.dalal@example.invalid', '812-555-0133', 'Probate list', 'Sample seller. Not a real person.'),
    ('d4e00000-0000-4000-8000-000000000017', acct, 'June', 'Harlow', 'june.harlow@example.invalid', '812-555-0188', 'Direct mail', 'Sample seller. Not a real person.');

  insert into public.leads (
    id, account_id, contact_id, pipeline_stage_id, title, value, status,
    owner_user_id, qualification_status, submitted_by_user_id, created_at, updated_at
  ) values
    ('d4e00000-0000-4000-8000-000000000101', acct, 'd4e00000-0000-4000-8000-000000000011', stage_new, '18 Lantern Row', 148000, 'open', demo_user, null, null, now() - interval '2 days', now() - interval '2 days'),
    ('d4e00000-0000-4000-8000-000000000102', acct, 'd4e00000-0000-4000-8000-000000000012', stage_contacted, '440 Paper Birch Court', 186500, 'open', demo_user, null, null, now() - interval '5 days', now() - interval '1 day'),
    ('d4e00000-0000-4000-8000-000000000103', acct, 'd4e00000-0000-4000-8000-000000000013', stage_qualified, '9 Glassworks Avenue', 214000, 'open', demo_user, 'qualified', demo_user, now() - interval '8 days', now() - interval '3 hours'),
    ('d4e00000-0000-4000-8000-000000000104', acct, 'd4e00000-0000-4000-8000-000000000014', stage_negotiating, '77 Cedar Post Road', 132000, 'open', demo_user, 'qualified', demo_user, now() - interval '12 days', now() - interval '6 hours'),
    ('d4e00000-0000-4000-8000-000000000105', acct, 'd4e00000-0000-4000-8000-000000000015', stage_won, '310 Mockingbird Lane', 96000, 'won', demo_user, 'qualified', demo_user, now() - interval '21 days', now() - interval '4 days'),
    ('d4e00000-0000-4000-8000-000000000106', acct, 'd4e00000-0000-4000-8000-000000000016', stage_new, '55 Orchard Trace', 171000, 'open', demo_user, 'submitted', demo_user, now() - interval '6 hours', now() - interval '6 hours'),
    ('d4e00000-0000-4000-8000-000000000107', acct, 'd4e00000-0000-4000-8000-000000000017', stage_new, '802 Ridgeline Court', 159400, 'open', demo_user, 'submitted', demo_user, now() - interval '25 minutes', now() - interval '25 minutes');

  insert into public.lead_properties (
    account_id, lead_id, address_line1, city, state, postal_code, property_type,
    bedrooms, bathrooms, square_feet, asking_price, estimated_value,
    condition, motivation, timeline, occupancy_status, notes, contract_status
  ) values
    (acct, 'd4e00000-0000-4000-8000-000000000101', '18 Lantern Row', 'Indianapolis', 'IN', '46202', 'Single family', 3, 1, 1120, 148000, 141000, 'Dated', 'Tired landlord', '60 days', 'Tenant occupied', 'Sample record. Not a real property.', 'none'),
    (acct, 'd4e00000-0000-4000-8000-000000000102', '440 Paper Birch Court', 'Fort Wayne', 'IN', '46805', 'Single family', 4, 2, 1680, 186500, 179000, 'Average', 'Downsizing', '90 days', 'Owner occupied', 'Sample record. Not a real property.', 'none'),
    (acct, 'd4e00000-0000-4000-8000-000000000103', '9 Glassworks Avenue', 'Muncie', 'IN', '47302', 'Single family', 3, 2, 1480, 214000, 198000, 'Fair', 'Relocating for work', '30 days', 'Owner occupied', 'Sample record. Not a real property.', 'offered'),
    (acct, 'd4e00000-0000-4000-8000-000000000104', '77 Cedar Post Road', 'Kokomo', 'IN', '46901', 'Single family', 2, 1, 980, 132000, 128500, 'Needs work', 'Inherited', '45 days', 'Vacant', 'Sample record. Not a real property.', 'offered'),
    (acct, 'd4e00000-0000-4000-8000-000000000105', '310 Mockingbird Lane', 'Anderson', 'IN', '46016', 'Single family', 3, 1.5, 1240, 96000, 102000, 'Updated', 'Already moved', 'Closed', 'Vacant', 'Sample record. Not a real property.', 'closed'),
    (acct, 'd4e00000-0000-4000-8000-000000000106', '55 Orchard Trace', 'Terre Haute', 'IN', '47802', 'Single family', 3, 1, 1210, 171000, 164000, 'Fair', 'Probate', 'Unknown', 'Vacant', 'Sample record. Waiting on review.', 'none'),
    (acct, 'd4e00000-0000-4000-8000-000000000107', '802 Ridgeline Court', 'Columbus', 'IN', '47201', 'Single family', 2, 1, 1040, 159400, 151000, 'Average', 'Exploring options', 'This month', 'Owner occupied', 'Sample record. Waiting on review.', 'none');

  if hot_tag is not null then
    insert into public.lead_tags (lead_id, tag_id, account_id)
    values ('d4e00000-0000-4000-8000-000000000103', hot_tag, acct);
  end if;

  insert into public.activities (
    account_id, lead_id, type, actor_user_id, payload, created_at
  ) values
    (acct, 'd4e00000-0000-4000-8000-000000000103', 'lead_created', demo_user, jsonb_build_object('title', '9 Glassworks Avenue'), now() - interval '8 days'),
    (acct, 'd4e00000-0000-4000-8000-000000000103', 'note_added', demo_user, jsonb_build_object('note', 'Sample note. Helen wants to be out before the school year. Asking price is firm for two weeks, then she will look at a lower offer.'), now() - interval '3 hours'),
    (acct, 'd4e00000-0000-4000-8000-000000000103', 'stage_changed', demo_user, jsonb_build_object('from_stage', 'Contacted', 'to_stage', 'Qualified'), now() - interval '1 day');

  insert into public.lead_tasks (
    account_id, lead_id, title, description, due_at, priority, assigned_user_id, created_by_user_id
  ) values (
    acct,
    'd4e00000-0000-4000-8000-000000000103',
    'Confirm the 30-day move date',
    'Sample task. Ask whether the offer amount still works if closing slips a week.',
    now() + interval '1 day',
    'high',
    demo_user,
    demo_user
  );

  if hot_sequence is not null then
    insert into public.lead_sequence_enrollments (
      account_id, lead_id, sequence_id, current_step_number, status
    ) values (
      acct,
      'd4e00000-0000-4000-8000-000000000103',
      hot_sequence,
      2,
      'active'
    );

    insert into public.activities (
      account_id, lead_id, type, actor_user_id, payload, created_at
    ) values (
      acct,
      'd4e00000-0000-4000-8000-000000000103',
      'sequence_enrolled',
      demo_user,
      jsonb_build_object('sequence_name', 'Hot Seller Follow-up'),
      now() - interval '2 days'
    );
  end if;
end $$;
