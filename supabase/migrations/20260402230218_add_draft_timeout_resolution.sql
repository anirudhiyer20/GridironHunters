alter table public.drafts
  add column current_pick_started_at timestamptz;

update public.drafts
set current_pick_started_at = coalesce(current_pick_started_at, actual_started_at, timezone('utc', now()))
where status in ('ready', 'live', 'paused')
  and current_pick_started_at is null;

create or replace function public.choose_autopick_test_player(
  p_participant_id uuid,
  p_league_id uuid
)
returns table (
  player_key text,
  player_name text,
  picked_position text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_position text;
  v_player_key text;
  v_player_name text;
begin
  foreach v_position in array array['QB', 'RB', 'WR', 'TE', 'RB', 'WR', 'TE', 'QB'] loop
    begin
      perform public.validate_draft_position_selection(
        p_participant_id,
        p_league_id,
        v_position
      );

      select nap.player_key, nap.player_name
      into v_player_key, v_player_name
      from public.next_available_test_player(p_league_id, v_position) nap;

      if v_player_key is not null then
        return query
        select v_player_key, v_player_name, v_position;
        return;
      end if;
    exception
      when others then
        continue;
    end;
  end loop;

  raise exception 'No valid test player was available for autopick.';
end;
$$;

create or replace function public.advance_draft_pointer(
  p_draft_id uuid,
  p_league_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_pick public.draft_picks%rowtype;
begin
  select *
  into v_next_pick
  from public.draft_picks dp
  where dp.draft_id = p_draft_id
    and dp.status = 'pending'
  order by dp.pick_number asc
  limit 1;

  if not found then
    update public.drafts d
    set
      status = 'completed',
      current_pick_number = 80,
      current_round = 8,
      current_pick_started_at = null,
      completed_at = timezone('utc', now())
    where d.id = p_draft_id;

    update public.leagues l
    set status = 'active'
    where l.id = p_league_id;

    return;
  end if;

  update public.drafts d
  set
    current_pick_number = v_next_pick.pick_number,
    current_round = v_next_pick.round_number,
    current_pick_started_at = timezone('utc', now())
  where d.id = p_draft_id;
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

    exit when not found or v_current_participant.participant_type <> 'bot';

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

  perform public.resolve_bot_autopicks(p_league_id);

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

  v_bot_autopicks := public.resolve_bot_autopicks(p_league_id);

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

grant execute on function public.choose_autopick_test_player(uuid, uuid) to authenticated;
grant execute on function public.resolve_timed_out_pick(uuid) to authenticated;
