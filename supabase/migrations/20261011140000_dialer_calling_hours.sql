-- Reject outbound dialer reservations outside 8:00 AM–9:00 PM recipient local time.
-- ZIP wins when it maps; otherwise the NANP area code is used. The same dataset
-- lives in src/lib/dialer/calling-timezones.ts and is checked by tests/calling-hours.test.ts.

create or replace function public.dialer_recipient_time_zones(
  p_phone_e164 text,
  p_postal_code text
)
returns text[]
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_data jsonb := $calling_timezones${"areaCodes":{"America/New_York":["201","202","203","207","212","215","216","220","223","229","231","234","239","240","248","252","267","269","272","276","301","302","304","305","313","315","317","321","330","332","336","339","347","351","352","380","386","401","404","407","410","412","413","419","423","434","440","443","445","463","470","475","478","484","502","508","513","516","517","518","540","551","561","567","570","571","574","582","585","586","603","606","607","609","610","614","616","617","631","640","645","646","656","667","678","680","681","689","703","704","706","716","717","718","724","727","732","734","740","743","754","757","762","765","770","772","774","781","786","802","803","804","810","812","813","814","828","835","838","843","845","848","854","856","857","859","860","862","863","864","865","878","904","906","908","910","912","914","917","919","929","930","934","937","941","947","954","959","973","978","980","984","989"],"America/Chicago":["205","217","218","219","224","225","228","251","254","256","262","270","281","308","309","312","314","316","318","319","320","325","327","331","334","337","346","361","364","402","405","409","414","417","430","432","448","469","479","501","504","507","512","515","531","534","539","563","572","573","580","601","605","608","612","615","618","620","629","630","636","641","651","659","660","662","682","701","708","712","713","715","726","731","737","763","769","773","779","785","806","812","815","816","817","830","832","847","850","870","872","901","903","913","918","920","930","936","938","940","945","952","956","972","979","985"],"America/Denver":["303","307","308","385","406","435","505","575","605","701","719","720","801","915","970"],"America/Boise":["208","986"],"America/Phoenix":["480","520","602","623","928"],"America/Los_Angeles":["206","209","213","253","279","310","323","341","360","408","415","424","425","442","458","503","509","510","530","541","559","562","564","619","626","628","650","657","661","669","702","707","714","725","747","760","775","805","818","820","831","858","909","916","925","949","951","971"],"America/Vancouver":["236","250","604","672","778"],"America/Edmonton":["403","587","780","825"],"America/Winnipeg":["204","431"],"America/Regina":["306","639"],"America/Toronto":["226","249","289","343","365","367","416","418","437","438","450","514","519","548","579","581","613","647","705","807","819","873","905"],"America/Halifax":["506","782","902"],"America/St_Johns":["709"],"America/Whitehorse":["867"],"America/Iqaluit":["867"],"America/Anchorage":["907"],"Pacific/Honolulu":["808"],"America/Puerto_Rico":["340","787","939"],"Pacific/Guam":["671"],"Pacific/Pago_Pago":["684"]},"zip3":[[5,5,"America/New_York"],[6,9,"America/Puerto_Rico"],[10,27,"America/New_York"],[28,29,"America/New_York"],[30,38,"America/New_York"],[39,49,"America/New_York"],[50,59,"America/New_York"],[60,69,"America/New_York"],[70,89,"America/New_York"],[100,149,"America/New_York"],[150,196,"America/New_York"],[197,199,"America/New_York"],[200,205,"America/New_York"],[206,219,"America/New_York"],[220,246,"America/New_York"],[247,268,"America/New_York"],[270,289,"America/New_York"],[290,299,"America/New_York"],[300,319,"America/New_York"],[320,323,"America/New_York"],[324,325,"America/Chicago"],[326,349,"America/New_York"],[350,369,"America/Chicago"],[370,372,"America/Chicago"],[373,374,"America/New_York"],[375,375,"America/Chicago"],[376,379,"America/New_York"],[380,385,"America/Chicago"],[386,397,"America/Chicago"],[398,399,"America/New_York"],[400,418,"America/New_York"],[420,427,"America/Chicago"],[430,459,"America/New_York"],[460,462,"America/New_York"],[463,464,"America/Chicago"],[465,475,"America/New_York"],[476,477,"America/Chicago"],[478,479,"America/New_York"],[480,498,"America/New_York"],[499,499,"America/Chicago"],[500,528,"America/Chicago"],[530,549,"America/Chicago"],[550,567,"America/Chicago"],[570,576,"America/Chicago"],[577,577,"America/Denver"],[580,585,"America/Chicago"],[586,586,"America/Denver"],[587,587,"America/Chicago"],[588,588,"America/Denver"],[590,599,"America/Denver"],[600,629,"America/Chicago"],[630,658,"America/Chicago"],[660,676,"America/Chicago"],[677,679,"America/Denver"],[680,692,"America/Chicago"],[693,693,"America/Denver"],[700,714,"America/Chicago"],[716,729,"America/Chicago"],[730,749,"America/Chicago"],[750,797,"America/Chicago"],[798,799,"America/Denver"],[800,816,"America/Denver"],[820,831,"America/Denver"],[832,837,"America/Boise"],[838,838,"America/Los_Angeles"],[840,847,"America/Denver"],[850,864,"America/Phoenix"],[865,865,"America/Denver"],[870,884,"America/Denver"],[889,898,"America/Los_Angeles"],[900,961,"America/Los_Angeles"],[967,968,"Pacific/Honolulu"],[970,978,"America/Los_Angeles"],[979,979,"America/Boise"],[980,994,"America/Los_Angeles"],[995,999,"America/Anchorage"]],"zip5":[[96799,96799,"Pacific/Pago_Pago"]]}$calling_timezones$::jsonb;
  v_digits text;
  v_zip5 integer;
  v_zip3 integer;
  v_zone text;
  v_range jsonb;
  v_area text;
  v_zones text[] := '{}';
  v_entry record;
begin
  if p_postal_code ~ '^\s*\d{5}(-?\d{4})?\s*$' then
    v_digits := substring(regexp_replace(p_postal_code, '\D', '', 'g') from 1 for 5);
    v_zip5 := v_digits::integer;
    for v_range in select value from jsonb_array_elements(v_data->'zip5')
    loop
      if v_zip5 between (v_range->>0)::integer and (v_range->>1)::integer then
        v_zone := v_range->>2;
      end if;
    end loop;
    if v_zone is not null then
      return array[v_zone];
    end if;
    v_zip3 := substring(v_digits from 1 for 3)::integer;
    for v_range in select value from jsonb_array_elements(v_data->'zip3')
    loop
      if v_zip3 between (v_range->>0)::integer and (v_range->>1)::integer then
        v_zone := v_range->>2;
      end if;
    end loop;
    if v_zone is not null then
      return array[v_zone];
    end if;
  end if;

  if p_phone_e164 ~ '^\+1[2-9][0-9]{9}$' then
    v_area := substring(p_phone_e164 from 3 for 3);
    for v_entry in select key, value from jsonb_each(v_data->'areaCodes')
    loop
      if v_entry.value @> jsonb_build_array(v_area) then
        v_zones := array_append(v_zones, v_entry.key);
      end if;
    end loop;
  end if;

  return v_zones;
end;
$$;

create or replace function public.assert_dialer_calling_hours(
  p_phone_e164 text,
  p_postal_code text
)
returns void
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_zones text[];
  v_zone text;
  v_local timestamp;
  v_minutes integer;
begin
  v_zones := public.dialer_recipient_time_zones(p_phone_e164, p_postal_code);
  if v_zones is null or cardinality(v_zones) = 0 then
    raise exception 'Cannot determine the recipient''s local time from the area code or ZIP.';
  end if;
  foreach v_zone in array v_zones loop
    v_local := timezone(v_zone, now());
    v_minutes := extract(hour from v_local)::integer * 60 + extract(minute from v_local)::integer;
    if v_minutes < 8 * 60 or v_minutes >= 21 * 60 then
      raise exception 'Outside calling hours. Calls are allowed from 8:00 AM until 9:00 PM in the recipient''s local time.';
    end if;
  end loop;
end;
$$;

revoke all on function public.dialer_recipient_time_zones(text, text) from public, anon, authenticated;
revoke all on function public.assert_dialer_calling_hours(text, text) from public, anon, authenticated;

create or replace function public.prepare_dialer_call(
  p_contact_id uuid,
  p_lead_id uuid,
  p_queue_item_id uuid,
  p_phone_e164 text,
  p_idempotency_key uuid,
  p_provider text,
  p_max_calls_per_second integer
)
returns table (call_id uuid, attempt_id uuid, attempt_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_call_id uuid;
  v_attempt_id uuid;
  v_attempt_number integer;
  v_queue public.dialer_queues%rowtype;
  v_queue_item public.dialer_queue_items%rowtype;
  v_settings public.dialer_settings%rowtype;
  v_active_count integer;
  v_postal_code text;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;
  if p_phone_e164 !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'Invalid E.164 phone number';
  end if;
  if p_max_calls_per_second is null or p_max_calls_per_second not between 1 and 20 then
    raise exception 'Invalid provider rate limit';
  end if;

  select c.account_id into v_account_id
  from public.contacts c
  where c.id = p_contact_id and c.deleted_at is null;

  if v_account_id is null or not public.is_internal_account_member(v_account_id) then
    raise exception 'Contact not found or inaccessible';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_account_id::text, 0));

  select * into v_settings from public.dialer_settings where account_id = v_account_id;
  if not found then
    raise exception 'Dialer settings are missing';
  end if;

  select ca.call_id, ca.id, ca.status
  into v_call_id, v_attempt_id, attempt_status
  from public.call_attempts ca
  where ca.account_id = v_account_id
    and ca.idempotency_key = p_idempotency_key
    and ca.user_id = v_user_id;
  if found then
    call_id := v_call_id;
    attempt_id := v_attempt_id;
    return next;
    return;
  end if;

  if p_lead_id is not null then
    if not public.can_access_dialer_lead(v_account_id, p_lead_id) then
      raise exception 'Lead not found or inaccessible';
    end if;
    perform 1 from public.leads
    where id = p_lead_id and account_id = v_account_id and contact_id = p_contact_id;
    if not found then
      raise exception 'Lead and contact do not match';
    end if;
    select lp.postal_code into v_postal_code
    from public.lead_properties lp
    where lp.account_id = v_account_id
      and lp.lead_id = p_lead_id;
  end if;

  perform public.assert_dialer_calling_hours(p_phone_e164, v_postal_code);

  if exists (
    select 1 from public.contacts c
    where c.account_id = v_account_id
      and c.phone_e164 = p_phone_e164
      and c.do_not_call_at is not null
      and c.deleted_at is null
  ) then
    raise exception 'This phone number is marked Do Not Call';
  end if;

  update public.contacts
  set phone_e164 = p_phone_e164, updated_at = now()
  where id = p_contact_id and account_id = v_account_id;

  if exists (
    select 1 from public.call_attempts ca
    where ca.account_id = v_account_id
      and ca.user_id = v_user_id
      and ca.status in ('initiating', 'ringing', 'answered')
  ) then
    raise exception 'You already have an active call';
  end if;

  select count(*) into v_active_count
  from public.call_attempts ca
  where ca.account_id = v_account_id
    and ca.status in ('initiating', 'ringing', 'answered');
  if v_active_count >= v_settings.max_active_calls then
    raise exception 'Workspace active-call limit reached';
  end if;

  if (
    select count(*) from public.call_attempts ca
    where ca.account_id = v_account_id
      and ca.created_at >= now() - interval '1 second'
  ) >= least(v_settings.max_calls_per_second, p_max_calls_per_second) then
    raise exception 'Provider call rate limit reached';
  end if;

  if p_queue_item_id is not null then
    select * into v_queue_item from public.dialer_queue_items where id = p_queue_item_id for update;
    if not found or v_queue_item.account_id <> v_account_id
      or v_queue_item.contact_id <> p_contact_id
      or v_queue_item.lead_id is distinct from p_lead_id then
      raise exception 'Queue item does not match the call target';
    end if;
    if v_queue_item.status <> 'queued'
      or (v_queue_item.next_attempt_at is not null and v_queue_item.next_attempt_at > now()) then
      raise exception 'Queue item is not ready';
    end if;

    select * into v_queue from public.dialer_queues where id = v_queue_item.queue_id for update;
    if not found or v_queue.status <> 'active' then
      raise exception 'Queue is not active';
    end if;
    if v_queue.owner_user_id is not null and v_queue.owner_user_id <> v_user_id
      and not public.is_account_admin(v_account_id) then
      raise exception 'Personal queue is not accessible';
    end if;
    if v_queue.lead_group_id is not null
      and not public.is_account_admin(v_account_id)
      and not exists (
        select 1 from public.lead_group_members gm
        where gm.group_id = v_queue.lead_group_id and gm.user_id = v_user_id
      ) then
      raise exception 'Queue is restricted to another group';
    end if;
    if (
      select count(*) from public.dialer_queue_items qi
      where qi.queue_id = v_queue.id and qi.status = 'in_progress'
    ) >= v_queue.max_active_calls then
      raise exception 'Queue active-call limit reached';
    end if;

    select c.id into v_call_id
    from public.calls c
    where c.queue_item_id = p_queue_item_id
    order by c.created_at desc
    limit 1;
  end if;

  if v_call_id is null then
    insert into public.calls (
      account_id, contact_id, lead_id, queue_item_id, owner_user_id,
      status, to_phone_e164, started_at
    ) values (
      v_account_id, p_contact_id, p_lead_id, p_queue_item_id, v_user_id,
      'initiating', p_phone_e164, now()
    ) returning id into v_call_id;
  else
    update public.calls
    set owner_user_id = v_user_id, status = 'initiating', failure_reason = null,
        started_at = now(), answered_at = null, ended_at = null, updated_at = now()
    where id = v_call_id;
  end if;

  select coalesce(max(ca.attempt_number), 0) + 1 into v_attempt_number
  from public.call_attempts ca where ca.call_id = v_call_id;

  insert into public.call_attempts (
    account_id, call_id, user_id, attempt_number, idempotency_key, provider, status
  ) values (
    v_account_id, v_call_id, v_user_id, v_attempt_number, p_idempotency_key,
    p_provider, 'initiating'
  ) returning id into v_attempt_id;

  if p_queue_item_id is not null then
    update public.dialer_queue_items
    set status = 'in_progress', claimed_by_user_id = v_user_id,
        claimed_at = now(), updated_at = now()
    where id = p_queue_item_id;
  end if;

  insert into public.call_events (
    account_id, call_id, attempt_id, event_type, normalized_status,
    source, actor_user_id
  ) values (
    v_account_id, v_call_id, v_attempt_id, 'call_initiated', 'initiating',
    'user', v_user_id
  );

  call_id := v_call_id;
  attempt_id := v_attempt_id;
  attempt_status := 'initiating';
  return next;
end;
$$;

notify pgrst, 'reload schema';
