create table public.players (
  id uuid primary key default gen_random_uuid(),
  player_key text not null unique,
  full_name text not null,
  short_name text,
  position text not null check (position in ('QB', 'RB', 'WR', 'TE')),
  nfl_team text not null,
  bye_week integer check (bye_week between 1 and 18),
  years_experience integer not null default 0 check (years_experience >= 0),
  age integer check (age between 20 and 45),
  college text,
  is_active boolean not null default true,
  is_rookie boolean not null default false,
  depth_rank integer,
  created_at timestamptz not null default timezone('utc', now())
);

create index players_position_idx on public.players (position);
create index players_nfl_team_idx on public.players (nfl_team);

create table public.player_season_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  season integer not null,
  games_played integer not null default 0,
  fantasy_points_ppr numeric(8,2) not null default 0,
  passing_yards integer not null default 0,
  passing_tds integer not null default 0,
  rushing_yards integer not null default 0,
  rushing_tds integer not null default 0,
  receptions integer not null default 0,
  receiving_yards integer not null default 0,
  receiving_tds integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (player_id, season)
);

create index player_season_stats_player_id_idx on public.player_season_stats (player_id, season desc);

alter table public.players enable row level security;
alter table public.player_season_stats enable row level security;

create policy "players_select_authenticated"
on public.players
for select
to authenticated
using (true);

create policy "player_season_stats_select_authenticated"
on public.player_season_stats
for select
to authenticated
using (true);

with seeded_players as (
  insert into public.players (
    player_key,
    full_name,
    short_name,
    position,
    nfl_team,
    bye_week,
    years_experience,
    age,
    college,
    is_active,
    is_rookie,
    depth_rank
  )
  select
    format('%s-DEV-%s', pos.position, gs) as player_key,
    format('%s Prospect %s', pos.position, gs) as full_name,
    format('%s %s', pos.position, gs) as short_name,
    pos.position,
    pos.team_code,
    ((gs + pos.seed_offset) % 14) + 5,
    ((gs + pos.seed_offset) % 8),
    22 + ((gs + pos.seed_offset) % 11),
    format('%s State', pos.position),
    true,
    gs <= 3,
    gs
  from (
    values
      ('QB', 'BUF', 1),
      ('RB', 'ATL', 4),
      ('WR', 'CIN', 7),
      ('TE', 'DET', 10)
  ) as pos(position, team_code, seed_offset)
  cross join generate_series(1, 24) as gs
  on conflict (player_key) do update
  set
    full_name = excluded.full_name,
    short_name = excluded.short_name,
    nfl_team = excluded.nfl_team,
    bye_week = excluded.bye_week,
    years_experience = excluded.years_experience,
    age = excluded.age,
    college = excluded.college,
    is_active = excluded.is_active,
    is_rookie = excluded.is_rookie,
    depth_rank = excluded.depth_rank
  returning id, position, depth_rank
)
insert into public.player_season_stats (
  player_id,
  season,
  games_played,
  fantasy_points_ppr,
  passing_yards,
  passing_tds,
  rushing_yards,
  rushing_tds,
  receptions,
  receiving_yards,
  receiving_tds
)
select
  sp.id,
  2025,
  17,
  case sp.position
    when 'QB' then round((335 - (sp.depth_rank * 6.75))::numeric, 2)
    when 'RB' then round((285 - (sp.depth_rank * 5.4))::numeric, 2)
    when 'WR' then round((275 - (sp.depth_rank * 4.95))::numeric, 2)
    when 'TE' then round((210 - (sp.depth_rank * 3.9))::numeric, 2)
  end,
  case when sp.position = 'QB' then 4600 - (sp.depth_rank * 95) else 0 end,
  case when sp.position = 'QB' then 34 - floor(sp.depth_rank / 3.0)::integer else 0 end,
  case
    when sp.position = 'QB' then 320 - (sp.depth_rank * 10)
    when sp.position = 'RB' then 1250 - (sp.depth_rank * 38)
    else 120 - (sp.depth_rank * 4)
  end,
  case
    when sp.position = 'QB' then 5 - floor(sp.depth_rank / 8.0)::integer
    when sp.position = 'RB' then 11 - floor(sp.depth_rank / 4.0)::integer
    else 2
  end,
  case
    when sp.position = 'RB' then 42 + greatest(0, 20 - sp.depth_rank)
    when sp.position = 'WR' then 94 - floor(sp.depth_rank / 2.0)::integer
    when sp.position = 'TE' then 74 - sp.depth_rank
    else 0
  end,
  case
    when sp.position = 'RB' then 320 + greatest(0, 20 - sp.depth_rank) * 6
    when sp.position = 'WR' then 1280 - (sp.depth_rank * 33)
    when sp.position = 'TE' then 910 - (sp.depth_rank * 24)
    else 0
  end,
  case
    when sp.position = 'RB' then 3 + greatest(0, 12 - sp.depth_rank / 2)
    when sp.position = 'WR' then 9 - floor(sp.depth_rank / 4.0)::integer
    when sp.position = 'TE' then 7 - floor(sp.depth_rank / 5.0)::integer
    else 0
  end
from seeded_players sp
on conflict (player_id, season) do update
set
  games_played = excluded.games_played,
  fantasy_points_ppr = excluded.fantasy_points_ppr,
  passing_yards = excluded.passing_yards,
  passing_tds = excluded.passing_tds,
  rushing_yards = excluded.rushing_yards,
  rushing_tds = excluded.rushing_tds,
  receptions = excluded.receptions,
  receiving_yards = excluded.receiving_yards,
  receiving_tds = excluded.receiving_tds;

create or replace function public.list_available_draft_players(
  p_league_id uuid,
  p_position text default null
)
returns table (
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
  with latest_stats as (
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
  from public.players p
  left join latest_stats ls on ls.player_id = p.id
  where p.is_active = true
    and (p_position is null or p.position = p_position)
    and not exists (
      select 1
      from public.draft_picks dp
      where dp.league_id = p_league_id
        and dp.picked_player_id = p.id
    )
  order by p.position asc, coalesce(ls.fantasy_points_ppr, 0) desc, p.full_name asc;
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
begin
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

  perform public.advance_draft_pointer(p_draft_id, p_league_id);
end;
$$;

grant execute on function public.list_available_draft_players(uuid, text) to authenticated;
grant execute on function public.choose_autopick_player(uuid, uuid) to authenticated;
grant execute on function public.apply_draft_pick(uuid, uuid, uuid, uuid, uuid, text, text, text, text) to authenticated;

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
    from public.choose_autopick_player(v_current_participant.id, p_league_id);

    perform public.apply_draft_pick(
      v_draft.id,
      p_league_id,
      v_current_pick.id,
      v_current_participant.id,
      v_choice.player_id,
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

create or replace function public.submit_draft_pick(
  p_league_id uuid,
  p_player_id uuid
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
  v_player public.players%rowtype;
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

  select *
  into v_player
  from public.players p
  where p.id = p_player_id
    and p.is_active = true;

  if not found then
    raise exception 'Selected player could not be found.';
  end if;

  perform public.apply_draft_pick(
    v_draft.id,
    p_league_id,
    v_current_pick.id,
    v_participant.id,
    v_player.id,
    v_player.player_key,
    v_player.full_name,
    v_player.position,
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
      'player_id', v_player.id,
      'player_key', v_player.player_key,
      'player_name', v_player.full_name,
      'position', v_player.position,
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
  from public.choose_autopick_player(v_current_participant.id, p_league_id);

  perform public.apply_draft_pick(
    v_draft.id,
    p_league_id,
    v_current_pick.id,
    v_current_participant.id,
    v_choice.player_id,
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
      'player_id', v_choice.player_id,
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
  from public.choose_autopick_player(v_current_participant.id, p_league_id);

  perform public.apply_draft_pick(
    v_draft.id,
    p_league_id,
    v_current_pick.id,
    v_current_participant.id,
    v_choice.player_id,
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
      'player_id', v_choice.player_id,
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

create or replace function public.process_live_draft_queue(
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
  v_draft public.drafts%rowtype;
  v_current_pick public.draft_picks%rowtype;
  v_current_participant public.league_participants%rowtype;
  v_choice record;
  v_processed_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to process the live draft queue.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  if not (
    public.is_platform_admin(v_user_id)
    or public.is_league_commissioner(v_user_id, p_league_id)
    or exists (
      select 1
      from public.league_participants lp
      where lp.league_id = p_league_id
        and lp.user_id = v_user_id
    )
  ) then
    raise exception 'You do not have permission to process this live draft.';
  end if;

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

    if v_current_participant.participant_type = 'human'
       and v_current_participant.draft_control_mode = 'manual' then
      exit when v_draft.current_pick_started_at is null;
      exit when timezone('utc', now()) < v_draft.current_pick_started_at + make_interval(secs => v_draft.pick_time_seconds);

      update public.league_participants lp
      set
        draft_control_mode = 'autopick',
        draft_control_reason = 'timeout'
      where lp.id = v_current_participant.id
      returning * into v_current_participant;
    elsif not (
      v_current_participant.participant_type = 'bot'
      or v_current_participant.draft_control_mode = 'autopick'
    ) then
      exit;
    end if;

    select *
    into v_choice
    from public.choose_autopick_player(v_current_participant.id, p_league_id);

    perform public.apply_draft_pick(
      v_draft.id,
      p_league_id,
      v_current_pick.id,
      v_current_participant.id,
      v_choice.player_id,
      v_choice.player_key,
      v_choice.player_name,
      v_choice.picked_position,
      'autopicked'
    );

    v_processed_count := v_processed_count + 1;

    select *
    into v_draft
    from public.drafts d
    where d.id = v_draft.id;

    exit when v_draft.status <> 'live';
  end loop;

  return v_processed_count;
end;
$$;

grant execute on function public.resolve_automatic_picks(uuid) to authenticated;
grant execute on function public.submit_draft_pick(uuid, uuid) to authenticated;
grant execute on function public.force_autopick_current_pick(uuid) to authenticated;
grant execute on function public.resolve_timed_out_pick(uuid) to authenticated;
grant execute on function public.process_live_draft_queue(uuid) to authenticated;
