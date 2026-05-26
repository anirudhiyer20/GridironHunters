create table if not exists public.league_matchups (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  week_number integer not null check (week_number between 1 and 18),
  matchup_index integer not null check (matchup_index > 0),
  left_participant_id uuid not null references public.league_participants (id) on delete cascade,
  right_participant_id uuid not null references public.league_participants (id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'final')),
  left_score numeric(8, 2),
  right_score numeric(8, 2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (league_id, week_number, matchup_index),
  check (left_participant_id <> right_participant_id)
);

create index if not exists league_matchups_league_week_idx
on public.league_matchups (league_id, week_number, matchup_index);

create index if not exists league_matchups_participant_lookup_idx
on public.league_matchups (league_id, left_participant_id, right_participant_id);

drop trigger if exists set_league_matchups_updated_at on public.league_matchups;
create trigger set_league_matchups_updated_at
before update on public.league_matchups
for each row
execute function public.set_updated_at();

alter table public.league_matchups enable row level security;

drop policy if exists "league_matchups_select_same_league_or_admin" on public.league_matchups;
create policy "league_matchups_select_same_league_or_admin"
on public.league_matchups
for select
to authenticated
using (
  public.is_platform_admin(auth.uid())
  or exists (
    select 1
    from public.league_members lm
    where lm.league_id = league_matchups.league_id
      and lm.user_id = auth.uid()
  )
);

drop policy if exists "league_matchups_insert_commissioner_or_admin" on public.league_matchups;
create policy "league_matchups_insert_commissioner_or_admin"
on public.league_matchups
for insert
to authenticated
with check (
  public.is_platform_admin(auth.uid())
  or public.is_league_commissioner(auth.uid(), league_matchups.league_id)
);

drop policy if exists "league_matchups_update_commissioner_or_admin" on public.league_matchups;
create policy "league_matchups_update_commissioner_or_admin"
on public.league_matchups
for update
to authenticated
using (
  public.is_platform_admin(auth.uid())
  or public.is_league_commissioner(auth.uid(), league_matchups.league_id)
)
with check (
  public.is_platform_admin(auth.uid())
  or public.is_league_commissioner(auth.uid(), league_matchups.league_id)
);

drop policy if exists "league_matchups_delete_commissioner_or_admin" on public.league_matchups;
create policy "league_matchups_delete_commissioner_or_admin"
on public.league_matchups
for delete
to authenticated
using (
  public.is_platform_admin(auth.uid())
  or public.is_league_commissioner(auth.uid(), league_matchups.league_id)
);

create or replace function public.ensure_league_matchups(
  p_league_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_member_count integer;
  v_has_rows boolean;
  v_rotation text[];
  v_next_rotation text[];
  v_team_count integer;
  v_week_count integer;
  v_week_number integer;
  v_pair_index integer;
  v_matchup_index integer;
  v_left_id text;
  v_right_id text;
  v_rows_created integer := 0;
begin
  if p_league_id is null then
    raise exception 'League id is required.';
  end if;

  if v_user_id is null then
    raise exception 'You must be logged in to build Arena matchups.';
  end if;

  if not public.is_platform_admin(v_user_id)
    and not exists (
      select 1
      from public.league_members lm
      where lm.league_id = p_league_id
        and lm.user_id = v_user_id
    )
  then
    raise exception 'You do not have access to this Guild.';
  end if;

  select exists (
    select 1
    from public.league_matchups lm
    where lm.league_id = p_league_id
  )
  into v_has_rows;

  if v_has_rows then
    return 0;
  end if;

  select
    array_agg(lp.id::text order by lp.joined_at asc, lp.id asc),
    count(*)
  into v_rotation, v_member_count
  from public.league_participants lp
  where lp.league_id = p_league_id;

  if v_member_count < 2 or v_rotation is null then
    return 0;
  end if;

  if (v_member_count % 2) = 1 then
    v_rotation := v_rotation || '__bye__';
  end if;

  v_team_count := array_length(v_rotation, 1);
  v_week_count := v_team_count - 1;

  for v_week_number in 1..v_week_count loop
    v_matchup_index := 0;

    for v_pair_index in 1..(v_team_count / 2) loop
      v_left_id := v_rotation[v_pair_index];
      v_right_id := v_rotation[v_team_count - v_pair_index + 1];

      if v_left_id <> '__bye__' and v_right_id <> '__bye__' then
        v_matchup_index := v_matchup_index + 1;

        insert into public.league_matchups (
          league_id,
          week_number,
          matchup_index,
          left_participant_id,
          right_participant_id,
          status
        )
        values (
          p_league_id,
          v_week_number,
          v_matchup_index,
          v_left_id::uuid,
          v_right_id::uuid,
          'scheduled'
        );

        v_rows_created := v_rows_created + 1;
      end if;
    end loop;

    v_next_rotation := array[v_rotation[1], v_rotation[v_team_count]];
    if v_team_count > 2 then
      v_next_rotation := v_next_rotation || v_rotation[2:v_team_count - 1];
    end if;
    v_rotation := v_next_rotation;
  end loop;

  return v_rows_created;
end;
$$;

grant execute on function public.ensure_league_matchups(uuid) to authenticated;
