create or replace function public.list_available_test_players(
  p_league_id uuid
)
returns table (
  player_key text,
  player_name text,
  picked_position text
)
language sql
security definer
set search_path = public
stable
as $$
  with candidates as (
    select
      format('%s%02s', position_code, gs) as player_key,
      format('Test %s %s', position_code, gs) as player_name,
      position_code as picked_position
    from unnest(array['QB', 'RB', 'WR', 'TE']) as position_code
    cross join generate_series(1, 20) as gs
  )
  select c.player_key, c.player_name, c.picked_position
  from candidates c
  where not exists (
    select 1
    from public.draft_picks dp
    where dp.league_id = p_league_id
      and dp.picked_player_key = c.player_key
  )
  order by
    case c.picked_position
      when 'QB' then 1
      when 'RB' then 2
      when 'WR' then 3
      when 'TE' then 4
      else 5
    end,
    c.player_key;
$$;

grant execute on function public.list_available_test_players(uuid) to authenticated;
