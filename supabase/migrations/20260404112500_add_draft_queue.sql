create table public.draft_player_queue_entries (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  participant_id uuid not null references public.league_participants (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  queue_rank integer not null check (queue_rank > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (league_id, participant_id, player_id),
  unique (league_id, participant_id, queue_rank)
);

create index draft_player_queue_entries_lookup_idx
  on public.draft_player_queue_entries (league_id, participant_id, queue_rank);

alter table public.draft_player_queue_entries enable row level security;

create or replace function public.list_my_draft_queue(
  p_league_id uuid
)
returns table (
  queue_rank integer,
  player_id uuid,
  player_key text,
  full_name text,
  short_name text,
  picked_position text,
  nfl_team text,
  bye_week integer,
  years_experience integer,
  age integer,
  college text,
  fantasy_points_ppr numeric,
  games_played integer,
  passing_yards integer,
  passing_tds integer,
  rushing_yards integer,
  rushing_tds integer,
  receptions integer,
  receiving_yards integer,
  receiving_tds integer
)
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select lp.id as participant_id
    from public.league_participants lp
    where lp.league_id = p_league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
    limit 1
  ),
  latest_stats as (
    select distinct on (pss.player_id)
      pss.player_id,
      pss.fantasy_points_ppr,
      pss.games_played,
      pss.passing_yards,
      pss.passing_tds,
      pss.rushing_yards,
      pss.rushing_tds,
      pss.receptions,
      pss.receiving_yards,
      pss.receiving_tds
    from public.player_season_stats pss
    order by pss.player_id, pss.season desc
  )
  select
    dq.queue_rank,
    p.id,
    p.player_key,
    p.full_name,
    p.short_name,
    p.position,
    p.nfl_team,
    p.bye_week,
    p.years_experience,
    p.age,
    p.college,
    coalesce(ls.fantasy_points_ppr, 0),
    coalesce(ls.games_played, 0),
    coalesce(ls.passing_yards, 0),
    coalesce(ls.passing_tds, 0),
    coalesce(ls.rushing_yards, 0),
    coalesce(ls.rushing_tds, 0),
    coalesce(ls.receptions, 0),
    coalesce(ls.receiving_yards, 0),
    coalesce(ls.receiving_tds, 0)
  from public.draft_player_queue_entries dq
  join me on me.participant_id = dq.participant_id
  join public.players p on p.id = dq.player_id
  left join latest_stats ls on ls.player_id = p.id
  where dq.league_id = p_league_id
    and not exists (
      select 1
      from public.draft_picks dp
      where dp.league_id = p_league_id
        and dp.picked_player_id = dq.player_id
    )
  order by dq.queue_rank asc;
$$;

create or replace function public.queue_draft_player(
  p_league_id uuid,
  p_player_id uuid
)
returns table (
  queue_rank integer,
  player_name text,
  picked_position text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_participant public.league_participants%rowtype;
  v_player public.players%rowtype;
  v_next_rank integer;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to queue a player.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_participant
  from public.league_participants lp
  where lp.league_id = p_league_id
    and lp.user_id = v_user_id;

  if not found then
    raise exception 'You must be in this league to queue a player.';
  end if;

  if v_participant.participant_type <> 'human' then
    raise exception 'Only human participants can queue players.';
  end if;

  select *
  into v_player
  from public.players p
  where p.id = p_player_id
    and p.is_active = true;

  if not found then
    raise exception 'Selected player could not be found.';
  end if;

  if exists (
    select 1
    from public.draft_picks dp
    where dp.league_id = p_league_id
      and dp.picked_player_id = p_player_id
  ) then
    raise exception 'That player has already been drafted.';
  end if;

  if exists (
    select 1
    from public.draft_player_queue_entries dq
    where dq.league_id = p_league_id
      and dq.participant_id = v_participant.id
      and dq.player_id = p_player_id
  ) then
    raise exception 'That player is already in your queue.';
  end if;

  select coalesce(max(dq.queue_rank), 0) + 1
  into v_next_rank
  from public.draft_player_queue_entries dq
  where dq.league_id = p_league_id
    and dq.participant_id = v_participant.id;

  insert into public.draft_player_queue_entries (
    league_id,
    participant_id,
    player_id,
    queue_rank
  )
  values (
    p_league_id,
    v_participant.id,
    p_player_id,
    v_next_rank
  );

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
    'draft_queue_add',
    'draft_queue_entry',
    p_player_id,
    p_league_id,
    jsonb_build_object(
      'participant_id', v_participant.id,
      'player_id', v_player.id,
      'player_key', v_player.player_key,
      'player_name', v_player.full_name,
      'position', v_player.position,
      'queue_rank', v_next_rank
    )
  );

  return query
  select v_next_rank, v_player.full_name, v_player.position;
end;
$$;

create or replace function public.unqueue_draft_player(
  p_league_id uuid,
  p_player_id uuid
)
returns table (
  removed_count integer,
  player_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_participant public.league_participants%rowtype;
  v_player public.players%rowtype;
  v_removed_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to edit your queue.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_participant
  from public.league_participants lp
  where lp.league_id = p_league_id
    and lp.user_id = v_user_id;

  if not found then
    raise exception 'You must be in this league to edit your queue.';
  end if;

  select *
  into v_player
  from public.players p
  where p.id = p_player_id;

  delete from public.draft_player_queue_entries dq
  where dq.league_id = p_league_id
    and dq.participant_id = v_participant.id
    and dq.player_id = p_player_id;

  get diagnostics v_removed_count = row_count;

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
    'draft_queue_remove',
    'draft_queue_entry',
    p_player_id,
    p_league_id,
    jsonb_build_object(
      'participant_id', v_participant.id,
      'player_id', p_player_id,
      'player_name', v_player.full_name,
      'removed_count', v_removed_count
    )
  );

  return query
  select v_removed_count, v_player.full_name;
end;
$$;

create or replace function public.clear_my_draft_queue(
  p_league_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_participant public.league_participants%rowtype;
  v_cleared_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to clear your queue.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_participant
  from public.league_participants lp
  where lp.league_id = p_league_id
    and lp.user_id = v_user_id;

  if not found then
    raise exception 'You must be in this league to clear your queue.';
  end if;

  delete from public.draft_player_queue_entries dq
  where dq.league_id = p_league_id
    and dq.participant_id = v_participant.id;

  get diagnostics v_cleared_count = row_count;

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
    'draft_queue_clear',
    'draft_queue_entry',
    v_participant.id,
    p_league_id,
    jsonb_build_object(
      'participant_id', v_participant.id,
      'cleared_count', v_cleared_count
    )
  );

  return v_cleared_count;
end;
$$;

create or replace function public.choose_autopick_player(
  p_participant_id uuid,
  p_league_id uuid
)
returns table (
  player_id uuid,
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
  v_choice record;
  v_queued_choice record;
begin
  for v_queued_choice in
    select
      dq.player_id,
      p.player_key,
      p.full_name,
      p.position
    from public.draft_player_queue_entries dq
    join public.players p on p.id = dq.player_id
    where dq.league_id = p_league_id
      and dq.participant_id = p_participant_id
      and not exists (
        select 1
        from public.draft_picks dp
        where dp.league_id = p_league_id
          and dp.picked_player_id = dq.player_id
      )
    order by dq.queue_rank asc
  loop
    begin
      perform public.validate_draft_position_selection(
        p_participant_id,
        p_league_id,
        v_queued_choice.position
      );

      return query
      select
        v_queued_choice.player_id,
        v_queued_choice.player_key,
        v_queued_choice.full_name,
        v_queued_choice.position;
      return;
    exception
      when others then
        continue;
    end;
  end loop;

  foreach v_position in array array['QB', 'RB', 'WR', 'TE', 'RB', 'WR', 'TE', 'QB'] loop
    begin
      perform public.validate_draft_position_selection(
        p_participant_id,
        p_league_id,
        v_position
      );

      select lap.player_id, lap.player_key, lap.full_name, lap.picked_position
      into v_choice
      from public.list_available_draft_players(p_league_id, v_position) lap
      limit 1;

      if v_choice.player_id is not null then
        return query
        select v_choice.player_id, v_choice.player_key, v_choice.full_name, v_choice.picked_position;
        return;
      end if;
    exception
      when others then
        continue;
    end;
  end loop;

  raise exception 'No valid draftable player was available for autopick.';
end;
$$;

create or replace function public.apply_draft_pick(
  p_draft_id uuid,
  p_league_id uuid,
  p_pick_id uuid,
  p_participant_id uuid,
  p_player_id uuid,
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
      and dp.picked_player_id = p_player_id
  ) then
    raise exception 'That player has already been drafted.';
  end if;

  update public.draft_picks dp
  set
    status = p_status,
    picked_player_id = p_player_id,
    picked_player_key = p_player_key,
    picked_player_name = p_player_name,
    picked_position = p_position,
    made_at = timezone('utc', now())
  where dp.id = p_pick_id;

  delete from public.draft_player_queue_entries dq
  where dq.league_id = p_league_id
    and dq.player_id = p_player_id;

  perform public.advance_draft_pointer(p_draft_id, p_league_id);
end;
$$;

grant execute on function public.list_my_draft_queue(uuid) to authenticated;
grant execute on function public.queue_draft_player(uuid, uuid) to authenticated;
grant execute on function public.unqueue_draft_player(uuid, uuid) to authenticated;
grant execute on function public.clear_my_draft_queue(uuid) to authenticated;
grant execute on function public.choose_autopick_player(uuid, uuid) to authenticated;
grant execute on function public.apply_draft_pick(uuid, uuid, uuid, uuid, uuid, text, text, text, text) to authenticated;
