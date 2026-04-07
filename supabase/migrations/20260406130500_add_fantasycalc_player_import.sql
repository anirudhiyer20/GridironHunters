alter table public.players
add column source text not null default 'seed',
add column source_player_id text,
add column provider_value integer,
add column provider_overall_rank integer,
add column provider_position_rank integer,
add column provider_last_synced_at timestamptz;

update public.players
set source_player_id = player_key
where source_player_id is null;

alter table public.players
alter column source_player_id set not null;

create unique index players_source_source_player_id_key
  on public.players (source, source_player_id);

create index players_provider_overall_rank_idx
  on public.players (provider_overall_rank)
  where is_active = true;

create or replace function public.import_fantasycalc_players(
  p_payload jsonb,
  p_deactivate_seed_players boolean default true
)
returns table (
  imported_count integer,
  deactivated_seed_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deactivated_count integer := 0;
  v_imported_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to import players.';
  end if;

  if not public.is_platform_admin(v_user_id) then
    raise exception 'Only platform admins can import provider players.';
  end if;

  if jsonb_typeof(p_payload) <> 'array' then
    raise exception 'FantasyCalc import payload must be a JSON array.';
  end if;

  if p_deactivate_seed_players then
    update public.players
    set is_active = false
    where source = 'seed'
      and is_active = true;

    get diagnostics v_deactivated_count = row_count;
  end if;

  with normalized_players as (
    select
      'fantasycalc'::text as source,
      player_entry -> 'player' ->> 'id' as source_player_id,
      format('FC-%s', player_entry -> 'player' ->> 'id') as player_key,
      player_entry -> 'player' ->> 'name' as full_name,
      null::text as short_name,
      player_entry -> 'player' ->> 'position' as position,
      coalesce(nullif(player_entry -> 'player' ->> 'maybeTeam', ''), 'FA') as nfl_team,
      null::integer as bye_week,
      greatest(coalesce((player_entry -> 'player' ->> 'maybeYoe')::integer, 0), 0) as years_experience,
      case
        when nullif(player_entry -> 'player' ->> 'maybeAge', '') is null then null
        else round((player_entry -> 'player' ->> 'maybeAge')::numeric)::integer
      end as age,
      nullif(player_entry -> 'player' ->> 'maybeCollege', '') as college,
      true as is_active,
      coalesce((player_entry -> 'player' ->> 'maybeYoe')::integer, 0) = 0 as is_rookie,
      nullif(player_entry ->> 'positionRank', '')::integer as depth_rank,
      nullif(player_entry ->> 'value', '')::integer as provider_value,
      nullif(player_entry ->> 'overallRank', '')::integer as provider_overall_rank,
      nullif(player_entry ->> 'positionRank', '')::integer as provider_position_rank,
      timezone('utc', now()) as provider_last_synced_at
    from jsonb_array_elements(p_payload) as player_entry
    where coalesce(player_entry -> 'player' ->> 'position', '') in ('QB', 'RB', 'WR', 'TE')
      and nullif(player_entry -> 'player' ->> 'id', '') is not null
      and nullif(player_entry -> 'player' ->> 'name', '') is not null
  ),
  upserted as (
    insert into public.players (
      source,
      source_player_id,
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
      depth_rank,
      provider_value,
      provider_overall_rank,
      provider_position_rank,
      provider_last_synced_at
    )
    select
      np.source,
      np.source_player_id,
      np.player_key,
      np.full_name,
      np.short_name,
      np.position,
      np.nfl_team,
      np.bye_week,
      np.years_experience,
      np.age,
      np.college,
      np.is_active,
      np.is_rookie,
      np.depth_rank,
      np.provider_value,
      np.provider_overall_rank,
      np.provider_position_rank,
      np.provider_last_synced_at
    from normalized_players np
    on conflict (source, source_player_id) do update
    set
      player_key = excluded.player_key,
      full_name = excluded.full_name,
      short_name = excluded.short_name,
      position = excluded.position,
      nfl_team = excluded.nfl_team,
      bye_week = excluded.bye_week,
      years_experience = excluded.years_experience,
      age = excluded.age,
      college = excluded.college,
      is_active = excluded.is_active,
      is_rookie = excluded.is_rookie,
      depth_rank = excluded.depth_rank,
      provider_value = excluded.provider_value,
      provider_overall_rank = excluded.provider_overall_rank,
      provider_position_rank = excluded.provider_position_rank,
      provider_last_synced_at = excluded.provider_last_synced_at
    returning 1
  )
  select count(*)
  into v_imported_count
  from upserted;

  if v_imported_count = 0 then
    raise exception 'No eligible QB/RB/WR/TE players were found in the FantasyCalc payload.';
  end if;

  return query
  select v_imported_count, v_deactivated_count;
end;
$$;

grant execute on function public.import_fantasycalc_players(jsonb, boolean) to authenticated;

drop function if exists public.list_available_draft_players(uuid, text);

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
  provider_value integer,
  provider_overall_rank integer,
  provider_position_rank integer,
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
    p.provider_value,
    p.provider_overall_rank,
    p.provider_position_rank,
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
  order by
    p.position asc,
    coalesce(p.provider_overall_rank, 2147483647) asc,
    coalesce(p.provider_value, 0) desc,
    coalesce(ls.fantasy_points_ppr, 0) desc,
    p.full_name asc;
$$;

drop function if exists public.list_my_draft_queue(uuid);

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
  provider_value integer,
  provider_overall_rank integer,
  provider_position_rank integer,
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
    p.provider_value,
    p.provider_overall_rank,
    p.provider_position_rank,
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
