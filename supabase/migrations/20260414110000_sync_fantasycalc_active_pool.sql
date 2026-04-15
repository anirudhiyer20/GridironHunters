drop function if exists public.import_fantasycalc_players(jsonb, boolean);

create or replace function public.import_fantasycalc_players(
  p_payload jsonb,
  p_deactivate_seed_players boolean default true
)
returns table (
  imported_count integer,
  deactivated_seed_count integer,
  deactivated_provider_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deactivated_seed_count integer := 0;
  v_deactivated_provider_count integer := 0;
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

    get diagnostics v_deactivated_seed_count = row_count;
  end if;

  create temporary table pg_temp.fantasycalc_import_players (
    source text not null,
    source_player_id text not null,
    player_key text not null,
    full_name text not null,
    short_name text,
    position text not null,
    nfl_team text not null,
    bye_week integer,
    years_experience integer not null,
    age integer,
    college text,
    is_active boolean not null,
    is_rookie boolean not null,
    depth_rank integer,
    provider_value integer,
    provider_overall_rank integer,
    provider_position_rank integer,
    provider_last_synced_at timestamptz not null
  ) on commit drop;

  insert into pg_temp.fantasycalc_import_players (
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
    'fantasycalc'::text,
    player_entry -> 'player' ->> 'id',
    format('FC-%s', player_entry -> 'player' ->> 'id'),
    player_entry -> 'player' ->> 'name',
    null::text,
    player_entry -> 'player' ->> 'position',
    coalesce(nullif(player_entry -> 'player' ->> 'maybeTeam', ''), 'FA'),
    null::integer,
    greatest(coalesce((player_entry -> 'player' ->> 'maybeYoe')::integer, 0), 0),
    case
      when nullif(player_entry -> 'player' ->> 'maybeAge', '') is null then null
      else round((player_entry -> 'player' ->> 'maybeAge')::numeric)::integer
    end,
    nullif(player_entry -> 'player' ->> 'maybeCollege', ''),
    true,
    coalesce((player_entry -> 'player' ->> 'maybeYoe')::integer, 0) = 0,
    nullif(player_entry ->> 'positionRank', '')::integer,
    nullif(player_entry ->> 'value', '')::integer,
    nullif(player_entry ->> 'overallRank', '')::integer,
    nullif(player_entry ->> 'positionRank', '')::integer,
    timezone('utc', now())
  from jsonb_array_elements(p_payload) as player_entry
  where coalesce(player_entry -> 'player' ->> 'position', '') in ('QB', 'RB', 'WR', 'TE')
    and nullif(player_entry -> 'player' ->> 'id', '') is not null
    and nullif(player_entry -> 'player' ->> 'name', '') is not null;

  if not exists (select 1 from pg_temp.fantasycalc_import_players) then
    raise exception 'No eligible QB/RB/WR/TE players were found in the FantasyCalc payload.';
  end if;

  with upserted as (
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
      imported.source,
      imported.source_player_id,
      imported.player_key,
      imported.full_name,
      imported.short_name,
      imported.position,
      imported.nfl_team,
      imported.bye_week,
      imported.years_experience,
      imported.age,
      imported.college,
      imported.is_active,
      imported.is_rookie,
      imported.depth_rank,
      imported.provider_value,
      imported.provider_overall_rank,
      imported.provider_position_rank,
      imported.provider_last_synced_at
    from pg_temp.fantasycalc_import_players imported
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

  update public.players p
  set is_active = false
  where p.source = 'fantasycalc'
    and p.is_active = true
    and not exists (
      select 1
      from pg_temp.fantasycalc_import_players imported
      where imported.source_player_id = p.source_player_id
    );

  get diagnostics v_deactivated_provider_count = row_count;

  return query
  select v_imported_count, v_deactivated_seed_count, v_deactivated_provider_count;
end;
$$;

grant execute on function public.import_fantasycalc_players(jsonb, boolean) to authenticated;
