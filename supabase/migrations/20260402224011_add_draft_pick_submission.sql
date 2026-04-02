alter table public.draft_picks
  add column picked_player_key text,
  add column picked_player_name text,
  add column picked_position text check (
    picked_position is null or picked_position in ('QB', 'RB', 'WR', 'TE')
  );

create unique index draft_picks_league_player_key_unique
on public.draft_picks (league_id, picked_player_key)
where picked_player_key is not null;

create or replace function public.validate_draft_position_selection(
  p_participant_id uuid,
  p_league_id uuid,
  p_position text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_picks integer := 0;
  v_qb_count integer := 0;
  v_rb_count integer := 0;
  v_wr_count integer := 0;
  v_te_count integer := 0;
  v_remaining_after_pick integer := 0;
  v_missing_required_after_pick integer := 0;
begin
  if p_position not in ('QB', 'RB', 'WR', 'TE') then
    raise exception 'Pick position must be QB, RB, WR, or TE.';
  end if;

  select
    count(*),
    count(*) filter (where dp.picked_position = 'QB'),
    count(*) filter (where dp.picked_position = 'RB'),
    count(*) filter (where dp.picked_position = 'WR'),
    count(*) filter (where dp.picked_position = 'TE')
  into
    v_total_picks,
    v_qb_count,
    v_rb_count,
    v_wr_count,
    v_te_count
  from public.draft_picks dp
  where dp.league_id = p_league_id
    and dp.participant_id = p_participant_id
    and dp.status in ('made', 'autopicked')
    and dp.picked_position is not null;

  if v_total_picks >= 8 then
    raise exception 'This roster already has 8 drafted players.';
  end if;

  if p_position = 'QB' and v_qb_count >= 2 then
    raise exception 'Teams can draft at most 2 QBs.';
  end if;

  v_remaining_after_pick := 8 - (v_total_picks + 1);

  if p_position = 'QB' then
    v_qb_count := v_qb_count + 1;
  elsif p_position = 'RB' then
    v_rb_count := v_rb_count + 1;
  elsif p_position = 'WR' then
    v_wr_count := v_wr_count + 1;
  elsif p_position = 'TE' then
    v_te_count := v_te_count + 1;
  end if;

  v_missing_required_after_pick :=
    (case when v_qb_count = 0 then 1 else 0 end) +
    (case when v_rb_count = 0 then 1 else 0 end) +
    (case when v_wr_count = 0 then 1 else 0 end) +
    (case when v_te_count = 0 then 1 else 0 end);

  if v_remaining_after_pick < v_missing_required_after_pick then
    raise exception 'This pick would make it impossible to satisfy the minimum roster rules.';
  end if;
end;
$$;

create or replace function public.next_available_test_player(
  p_league_id uuid,
  p_position text
)
returns table (
  player_key text,
  player_name text
)
language sql
security definer
set search_path = public
stable
as $$
  with candidates as (
    select
      format('%s%02s', p_position, gs) as player_key,
      format('Test %s %s', p_position, gs) as player_name
    from generate_series(1, 20) as gs
  )
  select c.player_key, c.player_name
  from candidates c
  where not exists (
    select 1
    from public.draft_picks dp
    where dp.league_id = p_league_id
      and dp.picked_player_key = c.player_key
  )
  order by c.player_key
  limit 1
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
    current_round = v_next_pick.round_number
  where d.id = p_draft_id;
end;
$$;

create or replace function public.apply_draft_pick(
  p_draft_id uuid,
  p_league_id uuid,
  p_pick_id uuid,
  p_participant_id uuid,
  p_player_key text,
  p_player_name text,
  p_position text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.validate_draft_position_selection(
    p_participant_id,
    p_league_id,
    p_position
  );

  if exists (
    select 1
    from public.draft_picks dp
    where dp.league_id = p_league_id
      and dp.picked_player_key = p_player_key
  ) then
    raise exception 'That player has already been drafted.';
  end if;

  update public.draft_picks dp
  set
    status = p_status,
    picked_player_key = p_player_key,
    picked_player_name = p_player_name,
    picked_position = p_position,
    made_at = timezone('utc', now())
  where dp.id = p_pick_id;

  perform public.advance_draft_pointer(p_draft_id, p_league_id);
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
  v_position text;
  v_player_key text;
  v_player_name text;
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

    v_player_key := null;
    v_player_name := null;

    foreach v_position in array array['QB', 'RB', 'WR', 'TE', 'RB', 'WR', 'TE', 'QB'] loop
      begin
        perform public.validate_draft_position_selection(
          v_current_participant.id,
          p_league_id,
          v_position
        );

        select player_key, player_name
        into v_player_key, v_player_name
        from public.next_available_test_player(p_league_id, v_position);

        if v_player_key is not null then
          exit;
        end if;
      exception
        when others then
          continue;
      end;
    end loop;

    if v_player_key is null then
      raise exception 'No valid test player was available for bot autopick.';
    end if;

    perform public.apply_draft_pick(
      v_draft.id,
      p_league_id,
      v_current_pick.id,
      v_current_participant.id,
      v_player_key,
      v_player_name,
      v_position,
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

  if v_participant.participant_type <> 'human' then
    raise exception 'Bot picks are handled automatically.';
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
    paused_at = null
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

grant execute on function public.validate_draft_position_selection(uuid, uuid, text) to authenticated;
grant execute on function public.next_available_test_player(uuid, text) to authenticated;
grant execute on function public.advance_draft_pointer(uuid, uuid) to authenticated;
grant execute on function public.apply_draft_pick(uuid, uuid, uuid, uuid, text, text, text, text) to authenticated;
grant execute on function public.resolve_bot_autopicks(uuid) to authenticated;
grant execute on function public.submit_draft_pick(uuid, text, text, text) to authenticated;
