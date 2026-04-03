alter table public.league_participants
  add column draft_control_mode text check (draft_control_mode in ('manual', 'autopick')),
  add column draft_control_reason text check (
    draft_control_reason is null
    or draft_control_reason in ('bot_default', 'timeout', 'commissioner_forced', 'manual_reclaimed')
  );

update public.league_participants
set
  draft_control_mode = case
    when participant_type = 'bot' then 'autopick'
    else 'manual'
  end,
  draft_control_reason = case
    when participant_type = 'bot' then 'bot_default'
    else null
  end
where draft_control_mode is null;

alter table public.league_participants
  alter column draft_control_mode set not null,
  alter column draft_control_mode set default 'manual';

create or replace function public.ensure_human_participant(
  p_league_id uuid,
  p_user_id uuid,
  p_role text
)
returns public.league_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_participant public.league_participants%rowtype;
begin
  select *
  into v_profile
  from public.ensure_profile_for_user(p_user_id);

  insert into public.league_participants (
    league_id,
    user_id,
    participant_type,
    role,
    display_name,
    email,
    draft_control_mode,
    draft_control_reason
  )
  values (
    p_league_id,
    p_user_id,
    'human',
    p_role,
    coalesce(
      nullif(trim(v_profile.display_name), ''),
      split_part(coalesce(v_profile.email, ''), '@', 1),
      'New Player'
    ),
    v_profile.email,
    'manual',
    null
  )
  on conflict (league_id, user_id) do update
  set
    role = excluded.role,
    display_name = excluded.display_name,
    email = excluded.email
  returning * into v_participant;

  return v_participant;
end;
$$;

create or replace function public.fill_empty_slots_with_bots(
  p_league_id uuid
)
returns table (
  filled_count integer,
  total_participants integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_league public.leagues%rowtype;
  v_current_count integer := 0;
  v_remaining_count integer := 0;
  v_filled_count integer := 0;
  v_next_bot_number integer := 1;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to manage this league.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_league
  from public.leagues l
  where l.id = p_league_id;

  if not found then
    raise exception 'League not found.';
  end if;

  if v_league.status <> 'pre_draft' then
    raise exception 'Bot fill is only available before the draft.';
  end if;

  if not (
    public.is_league_commissioner(v_user_id, p_league_id)
    or public.is_platform_admin(v_user_id)
  ) then
    raise exception 'You do not have permission to fill this league with bots.';
  end if;

  select count(*), coalesce(max(bot_number), 0) + 1
  into v_current_count, v_next_bot_number
  from public.league_participants lp
  where lp.league_id = p_league_id;

  v_remaining_count := greatest(v_league.max_members - v_current_count, 0);

  while v_filled_count < v_remaining_count loop
    insert into public.league_participants (
      league_id,
      participant_type,
      role,
      display_name,
      email,
      bot_number,
      draft_control_mode,
      draft_control_reason
    )
    values (
      p_league_id,
      'bot',
      'member',
      format('Bot %s', v_next_bot_number),
      null,
      v_next_bot_number,
      'autopick',
      'bot_default'
    );

    v_filled_count := v_filled_count + 1;
    v_next_bot_number := v_next_bot_number + 1;
  end loop;

  insert into public.audit_logs (
    actor_user_id,
    actor_type,
    event_type,
    entity_type,
    entity_id,
    league_id,
    metadata
  )
  values (
    v_user_id,
    public.current_actor_type(v_profile.platform_role),
    'bots_filled',
    'league',
    p_league_id,
    p_league_id,
    jsonb_build_object(
      'filled_count', v_filled_count
    )
  );

  return query
  select
    v_filled_count,
    v_current_count + v_filled_count;
end;
$$;

create or replace function public.prepare_draft_room(
  p_league_id uuid
)
returns table (
  league_id uuid,
  league_slug text,
  draft_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_league public.leagues%rowtype;
  v_draft public.drafts%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to prepare the draft.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_league
  from public.leagues l
  where l.id = p_league_id;

  if not found then
    raise exception 'League not found.';
  end if;

  if v_league.status <> 'pre_draft' then
    raise exception 'Draft room can only be prepared from pre-draft state.';
  end if;

  if not (
    public.is_league_commissioner(v_user_id, p_league_id)
    or public.is_platform_admin(v_user_id)
  ) then
    raise exception 'You do not have permission to prepare this draft.';
  end if;

  if v_league.draft_starts_at is null then
    raise exception 'Set a draft start time before preparing the draft room.';
  end if;

  update public.league_participants lp
  set
    draft_control_mode = case
      when lp.participant_type = 'bot' then 'autopick'
      else 'manual'
    end,
    draft_control_reason = case
      when lp.participant_type = 'bot' then 'bot_default'
      else null
    end
  where lp.league_id = p_league_id;

  insert into public.drafts (
    league_id,
    status,
    scheduled_start_at,
    current_pick_started_at,
    completed_at
  )
  values (
    p_league_id,
    'ready',
    v_league.draft_starts_at,
    null,
    null
  )
  on conflict on constraint drafts_league_id_key do update
  set
    status = 'ready',
    scheduled_start_at = excluded.scheduled_start_at,
    paused_at = null,
    current_pick_number = 1,
    current_round = 1,
    current_pick_started_at = null,
    completed_at = null
  returning * into v_draft;

  perform public.generate_draft_order(v_draft.id, p_league_id);

  update public.leagues l
  set status = 'draft_ready'
  where l.id = p_league_id;

  insert into public.audit_logs (
    actor_user_id,
    actor_type,
    event_type,
    entity_type,
    entity_id,
    league_id,
    metadata
  )
  values (
    v_user_id,
    public.current_actor_type(v_profile.platform_role),
    'draft_prepared',
    'draft',
    v_draft.id,
    p_league_id,
    jsonb_build_object(
      'scheduled_start_at', v_draft.scheduled_start_at,
      'order_published', true
    )
  );

  return query
  select v_league.id, v_league.slug, v_draft.id;
end;
$$;

create or replace function public.resolve_automatic_picks(
  p_league_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.drafts%rowtype;
  v_current_pick public.draft_picks%rowtype;
  v_current_participant public.league_participants%rowtype;
  v_choice record;
  v_autopick_count integer := 0;
begin
  select *
  into v_draft
  from public.drafts d
  where d.league_id = p_league_id;

  if not found or v_draft.status <> 'live' then
    return 0;
  end if;

  loop
    select *
    into v_current_pick
    from public.draft_picks dp
    where dp.draft_id = v_draft.id
      and dp.pick_number = v_draft.current_pick_number
      and dp.status = 'pending';

    exit when not found;

    select *
    into v_current_participant
    from public.league_participants lp
    where lp.id = v_current_pick.participant_id;

    exit when not found;

    exit when not (
      v_current_participant.participant_type = 'bot'
      or v_current_participant.draft_control_mode = 'autopick'
    );

    select *
    into v_choice
    from public.choose_autopick_test_player(v_current_participant.id, p_league_id);

    perform public.apply_draft_pick(
      v_draft.id,
      p_league_id,
      v_current_pick.id,
      v_current_participant.id,
      v_choice.player_key,
      v_choice.player_name,
      v_choice.picked_position,
      'autopicked'
    );

    v_autopick_count := v_autopick_count + 1;

    select *
    into v_draft
    from public.drafts d
    where d.id = v_draft.id;

    exit when v_draft.status <> 'live';
  end loop;

  return v_autopick_count;
end;
$$;

create or replace function public.resolve_bot_autopicks(
  p_league_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.resolve_automatic_picks(p_league_id);
end;
$$;

create or replace function public.start_draft_now(
  p_league_id uuid
)
returns table (
  league_id uuid,
  league_slug text,
  draft_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_league public.leagues%rowtype;
  v_draft public.drafts%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to start the draft.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_league
  from public.leagues l
  where l.id = p_league_id;

  if not found then
    raise exception 'League not found.';
  end if;

  if not (
    public.is_league_commissioner(v_user_id, p_league_id)
    or public.is_platform_admin(v_user_id)
  ) then
    raise exception 'You do not have permission to start this draft.';
  end if;

  select *
  into v_draft
  from public.drafts d
  where d.league_id = p_league_id;

  if not found then
    raise exception 'Draft room has not been prepared yet.';
  end if;

  if v_draft.status not in ('ready', 'paused') then
    raise exception 'Draft can only be started from ready or paused state.';
  end if;

  update public.drafts d
  set
    status = 'live',
    actual_started_at = coalesce(d.actual_started_at, timezone('utc', now())),
    paused_at = null,
    current_pick_started_at = timezone('utc', now())
  where d.id = v_draft.id
  returning * into v_draft;

  update public.leagues l
  set status = 'draft_live'
  where l.id = p_league_id;

  perform public.resolve_automatic_picks(p_league_id);

  insert into public.audit_logs (
    actor_user_id,
    actor_type,
    event_type,
    entity_type,
    entity_id,
    league_id,
    metadata
  )
  values (
    v_user_id,
    public.current_actor_type(v_profile.platform_role),
    'draft_started',
    'draft',
    v_draft.id,
    p_league_id,
    jsonb_build_object(
      'actual_started_at', v_draft.actual_started_at
    )
  );

  return query
  select v_league.id, v_league.slug, v_draft.id;
end;
$$;

create or replace function public.submit_draft_pick(
  p_league_id uuid,
  p_player_key text,
  p_player_name text,
  p_position text
)
returns table (
  draft_id uuid,
  next_pick_number integer,
  next_round integer,
  bot_autopicks integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_draft public.drafts%rowtype;
  v_participant public.league_participants%rowtype;
  v_current_pick public.draft_picks%rowtype;
  v_bot_autopicks integer := 0;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to draft.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_draft
  from public.drafts d
  where d.league_id = p_league_id;

  if not found then
    raise exception 'Draft room has not been prepared yet.';
  end if;

  if v_draft.status <> 'live' then
    raise exception 'Draft must be live before picks can be made.';
  end if;

  select *
  into v_participant
  from public.league_participants lp
  where lp.league_id = p_league_id
    and lp.user_id = v_user_id;

  if not found then
    raise exception 'You are not a participant in this draft.';
  end if;

  if v_participant.participant_type <> 'human' then
    raise exception 'Bot picks are handled automatically.';
  end if;

  if v_participant.draft_control_mode <> 'manual' then
    raise exception 'You are currently on autopick. Reclaim control before making a manual pick.';
  end if;

  select *
  into v_current_pick
  from public.draft_picks dp
  where dp.draft_id = v_draft.id
    and dp.pick_number = v_draft.current_pick_number
    and dp.status = 'pending';

  if not found then
    raise exception 'There is no active pending pick.';
  end if;

  if v_current_pick.participant_id <> v_participant.id then
    raise exception 'It is not your turn to pick.';
  end if;

  perform public.apply_draft_pick(
    v_draft.id,
    p_league_id,
    v_current_pick.id,
    v_participant.id,
    upper(trim(p_player_key)),
    trim(p_player_name),
    upper(trim(p_position)),
    'made'
  );

  v_bot_autopicks := public.resolve_automatic_picks(p_league_id);

  insert into public.audit_logs (
    actor_user_id,
    actor_type,
    event_type,
    entity_type,
    entity_id,
    league_id,
    metadata
  )
  values (
    v_user_id,
    public.current_actor_type(v_profile.platform_role),
    'draft_pick_made',
    'draft_pick',
    v_current_pick.id,
    p_league_id,
    jsonb_build_object(
      'player_key', upper(trim(p_player_key)),
      'player_name', trim(p_player_name),
      'position', upper(trim(p_position)),
      'bot_autopicks', v_bot_autopicks
    )
  );

  select *
  into v_draft
  from public.drafts d
  where d.id = v_draft.id;

  return query
  select v_draft.id, v_draft.current_pick_number, v_draft.current_round, v_bot_autopicks;
end;
$$;

create or replace function public.reclaim_manual_draft_control(
  p_league_id uuid
)
returns table (
  participant_id uuid,
  draft_control_mode text,
  draft_control_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_participant public.league_participants%rowtype;
  v_draft public.drafts%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to reclaim draft control.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_draft
  from public.drafts d
  where d.league_id = p_league_id;

  if not found then
    raise exception 'Draft room has not been prepared yet.';
  end if;

  if v_draft.status not in ('ready', 'live', 'paused') then
    raise exception 'Draft control can only be changed while the draft is still in progress.';
  end if;

  select *
  into v_participant
  from public.league_participants lp
  where lp.league_id = p_league_id
    and lp.user_id = v_user_id;

  if not found then
    raise exception 'You are not a participant in this draft.';
  end if;

  if v_participant.participant_type <> 'human' then
    raise exception 'Bots cannot reclaim manual control.';
  end if;

  if v_participant.draft_control_mode = 'manual' then
    raise exception 'You already have manual draft control.';
  end if;

  update public.league_participants lp
  set
    draft_control_mode = 'manual',
    draft_control_reason = 'manual_reclaimed'
  where lp.id = v_participant.id
  returning * into v_participant;

  insert into public.audit_logs (
    actor_user_id,
    actor_type,
    event_type,
    entity_type,
    entity_id,
    league_id,
    metadata
  )
  values (
    v_user_id,
    public.current_actor_type(v_profile.platform_role),
    'draft_manual_control_reclaimed',
    'league_participant',
    v_participant.id,
    p_league_id,
    jsonb_build_object(
      'draft_control_mode', v_participant.draft_control_mode,
      'draft_control_reason', v_participant.draft_control_reason
    )
  );

  return query
  select v_participant.id, v_participant.draft_control_mode, v_participant.draft_control_reason;
end;
$$;

create or replace function public.force_autopick_current_pick(
  p_league_id uuid
)
returns table (
  draft_id uuid,
  resolved_pick_number integer,
  next_pick_number integer,
  next_round integer,
  player_name text,
  player_position text,
  bot_autopicks integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_draft public.drafts%rowtype;
  v_current_pick public.draft_picks%rowtype;
  v_current_participant public.league_participants%rowtype;
  v_choice record;
  v_bot_autopicks integer := 0;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to force an autopick.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_draft
  from public.drafts d
  where d.league_id = p_league_id;

  if not found then
    raise exception 'Draft room has not been prepared yet.';
  end if;

  if v_draft.status <> 'live' then
    raise exception 'Draft must be live to force an autopick.';
  end if;

  if not (
    public.is_league_commissioner(v_user_id, p_league_id)
    or public.is_platform_admin(v_user_id)
  ) then
    raise exception 'You do not have permission to force this autopick.';
  end if;

  select *
  into v_current_pick
  from public.draft_picks dp
  where dp.draft_id = v_draft.id
    and dp.pick_number = v_draft.current_pick_number
    and dp.status = 'pending';

  if not found then
    raise exception 'There is no active pending pick.';
  end if;

  select *
  into v_current_participant
  from public.league_participants lp
  where lp.id = v_current_pick.participant_id;

  if not found then
    raise exception 'Current participant could not be found.';
  end if;

  if v_current_participant.participant_type <> 'human' then
    raise exception 'Current pick already belongs to a bot and will resolve automatically.';
  end if;

  update public.league_participants lp
  set
    draft_control_mode = 'autopick',
    draft_control_reason = 'commissioner_forced'
  where lp.id = v_current_participant.id
  returning * into v_current_participant;

  select *
  into v_choice
  from public.choose_autopick_test_player(v_current_participant.id, p_league_id);

  perform public.apply_draft_pick(
    v_draft.id,
    p_league_id,
    v_current_pick.id,
    v_current_participant.id,
    v_choice.player_key,
    v_choice.player_name,
    v_choice.picked_position,
    'autopicked'
  );

  v_bot_autopicks := public.resolve_automatic_picks(p_league_id);

  insert into public.audit_logs (
    actor_user_id,
    actor_type,
    event_type,
    entity_type,
    entity_id,
    league_id,
    metadata
  )
  values (
    v_user_id,
    public.current_actor_type(v_profile.platform_role),
    'draft_pick_forced_autopick',
    'draft_pick',
    v_current_pick.id,
    p_league_id,
    jsonb_build_object(
      'player_key', v_choice.player_key,
      'player_name', v_choice.player_name,
      'position', v_choice.picked_position,
      'participant_id', v_current_participant.id,
      'bot_autopicks', v_bot_autopicks
    )
  );

  select *
  into v_draft
  from public.drafts d
  where d.id = v_draft.id;

  return query
  select
    v_draft.id,
    v_current_pick.pick_number,
    v_draft.current_pick_number,
    v_draft.current_round,
    v_choice.player_name,
    v_choice.picked_position,
    v_bot_autopicks;
end;
$$;

create or replace function public.resolve_timed_out_pick(
  p_league_id uuid
)
returns table (
  draft_id uuid,
  resolved_pick_number integer,
  next_pick_number integer,
  next_round integer,
  player_name text,
  player_position text,
  bot_autopicks integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_draft public.drafts%rowtype;
  v_current_pick public.draft_picks%rowtype;
  v_current_participant public.league_participants%rowtype;
  v_choice record;
  v_bot_autopicks integer := 0;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to resolve a timed out pick.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_draft
  from public.drafts d
  where d.league_id = p_league_id;

  if not found then
    raise exception 'Draft room has not been prepared yet.';
  end if;

  if v_draft.status <> 'live' then
    raise exception 'Draft must be live to resolve a timed out pick.';
  end if;

  if not (
    public.is_league_commissioner(v_user_id, p_league_id)
    or public.is_platform_admin(v_user_id)
  ) then
    raise exception 'You do not have permission to resolve this timed out pick.';
  end if;

  select *
  into v_current_pick
  from public.draft_picks dp
  where dp.draft_id = v_draft.id
    and dp.pick_number = v_draft.current_pick_number
    and dp.status = 'pending';

  if not found then
    raise exception 'There is no active pending pick.';
  end if;

  select *
  into v_current_participant
  from public.league_participants lp
  where lp.id = v_current_pick.participant_id;

  if not found then
    raise exception 'Current participant could not be found.';
  end if;

  if v_current_participant.participant_type <> 'human' then
    raise exception 'Current pick belongs to a bot and should resolve automatically.';
  end if;

  if v_draft.current_pick_started_at is null then
    raise exception 'Current pick start time is missing.';
  end if;

  if timezone('utc', now()) < v_draft.current_pick_started_at + make_interval(secs => v_draft.pick_time_seconds) then
    raise exception 'Current pick has not timed out yet.';
  end if;

  update public.league_participants lp
  set
    draft_control_mode = 'autopick',
    draft_control_reason = 'timeout'
  where lp.id = v_current_participant.id
  returning * into v_current_participant;

  select *
  into v_choice
  from public.choose_autopick_test_player(v_current_participant.id, p_league_id);

  perform public.apply_draft_pick(
    v_draft.id,
    p_league_id,
    v_current_pick.id,
    v_current_participant.id,
    v_choice.player_key,
    v_choice.player_name,
    v_choice.picked_position,
    'autopicked'
  );

  v_bot_autopicks := public.resolve_automatic_picks(p_league_id);

  insert into public.audit_logs (
    actor_user_id,
    actor_type,
    event_type,
    entity_type,
    entity_id,
    league_id,
    metadata
  )
  values (
    v_user_id,
    public.current_actor_type(v_profile.platform_role),
    'draft_pick_timed_out',
    'draft_pick',
    v_current_pick.id,
    p_league_id,
    jsonb_build_object(
      'player_key', v_choice.player_key,
      'player_name', v_choice.player_name,
      'position', v_choice.picked_position,
      'timed_out_participant_id', v_current_participant.id,
      'bot_autopicks', v_bot_autopicks
    )
  );

  select *
  into v_draft
  from public.drafts d
  where d.id = v_draft.id;

  return query
  select
    v_draft.id,
    v_current_pick.pick_number,
    v_draft.current_pick_number,
    v_draft.current_round,
    v_choice.player_name,
    v_choice.picked_position,
    v_bot_autopicks;
end;
$$;

grant execute on function public.resolve_automatic_picks(uuid) to authenticated;
grant execute on function public.reclaim_manual_draft_control(uuid) to authenticated;
grant execute on function public.force_autopick_current_pick(uuid) to authenticated;
