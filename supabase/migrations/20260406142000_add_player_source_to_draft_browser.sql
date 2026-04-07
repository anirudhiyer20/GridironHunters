drop function if exists public.list_available_draft_players(uuid, text);

create or replace function public.list_available_draft_players(
  p_league_id uuid,
  p_position text default null
)
returns table (
  player_id uuid,
  source text,
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
    p.source,
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

grant execute on function public.list_available_draft_players(uuid, text) to authenticated;
