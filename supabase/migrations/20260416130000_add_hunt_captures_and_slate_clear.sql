create table if not exists public.hunt_captures (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  participant_id uuid not null references public.league_participants (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  week_number integer not null check (week_number between 1 and 18),
  source_hunt_attempt_id uuid references public.hunt_attempts (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (league_id, player_id)
);

create index if not exists hunt_captures_participant_idx
on public.hunt_captures (league_id, participant_id, created_at desc);

alter table public.hunt_captures enable row level security;

create policy "hunt_captures_select_same_league_or_admin"
on public.hunt_captures
for select
to authenticated
using (
  public.is_platform_admin(auth.uid())
  or exists (
    select 1
    from public.league_members lm
    where lm.league_id = hunt_captures.league_id
      and lm.user_id = auth.uid()
  )
);

create policy "hunt_captures_insert_platform_admin_only"
on public.hunt_captures
for insert
to authenticated
with check (public.is_platform_admin(auth.uid()));

drop policy if exists "hunt_queue_entries_insert_own_human_participant" on public.hunt_queue_entries;
create policy "hunt_queue_entries_insert_own_human_participant"
on public.hunt_queue_entries
for insert
to authenticated
with check (
  exists (
    select 1
    from public.league_participants lp
    join public.players p on p.id = hunt_queue_entries.target_player_id
    where lp.id = hunt_queue_entries.participant_id
      and lp.league_id = hunt_queue_entries.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
      and p.is_active = true
      and p.tribe = hunt_queue_entries.target_tribe
      and p.tribe <> 'Unclaimed'
      and not exists (
        select 1
        from public.draft_picks dp
        where dp.league_id = hunt_queue_entries.league_id
          and dp.picked_player_id = hunt_queue_entries.target_player_id
      )
      and not exists (
        select 1
        from public.hunt_captures hc
        where hc.league_id = hunt_queue_entries.league_id
          and hc.player_id = hunt_queue_entries.target_player_id
      )
  )
);

create or replace function public.resolve_submitted_hunts(
  p_league_id uuid,
  p_week_number integer,
  p_limit integer default 200
)
returns table (
  resolved_count integer,
  captured_count integer,
  escaped_count integer,
  pending_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_attempt public.hunt_attempts%rowtype;
  v_target_score numeric(7, 2);
  v_best_challenger_score numeric(7, 2);
  v_result text;
  v_resolved_count integer := 0;
  v_captured_count integer := 0;
  v_escaped_count integer := 0;
  v_pending_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to resolve Hunts.';
  end if;

  if p_week_number < 1 or p_week_number > 18 then
    raise exception 'Week number must be between 1 and 18.';
  end if;

  if p_limit < 1 then
    raise exception 'Limit must be at least 1.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  if not public.is_platform_admin(v_user_id) then
    raise exception 'Only platform admins can resolve Hunts.';
  end if;

  for v_attempt in
    select ha.*
    from public.hunt_attempts ha
    where ha.league_id = p_league_id
      and ha.week_number = p_week_number
      and ha.status = 'submitted'
    order by ha.submitted_at asc
    limit p_limit
  loop
    v_target_score := public.compute_weekly_player_score(v_attempt.target_player_id, p_week_number);

    if v_target_score is null then
      continue;
    end if;

    update public.hunt_attempt_challengers hac
    set challenger_score = public.compute_weekly_player_score(dp.picked_player_id, p_week_number)
    from public.draft_picks dp
    where hac.hunt_attempt_id = v_attempt.id
      and dp.id = hac.challenger_draft_pick_id
      and dp.picked_player_id is not null;

    select max(hac.challenger_score)
    into v_best_challenger_score
    from public.hunt_attempt_challengers hac
    where hac.hunt_attempt_id = v_attempt.id;

    if v_best_challenger_score is null then
      continue;
    end if;

    v_result := case
      when v_best_challenger_score > v_target_score then 'captured'
      else 'escaped'
    end;

    update public.hunt_attempts ha
    set
      status = 'resolved',
      result = v_result,
      target_score = v_target_score,
      best_challenger_score = v_best_challenger_score,
      resolved_at = timezone('utc', now())
    where ha.id = v_attempt.id;

    if v_result = 'captured' then
      insert into public.hunt_captures (
        league_id,
        participant_id,
        player_id,
        week_number,
        source_hunt_attempt_id
      )
      values (
        v_attempt.league_id,
        v_attempt.participant_id,
        v_attempt.target_player_id,
        p_week_number,
        v_attempt.id
      )
      on conflict (league_id, player_id) do nothing;
    end if;

    delete from public.hunt_queue_entries hqe
    where hqe.id = v_attempt.hunt_queue_entry_id;

    v_resolved_count := v_resolved_count + 1;

    if v_result = 'captured' then
      v_captured_count := v_captured_count + 1;
    else
      v_escaped_count := v_escaped_count + 1;
    end if;
  end loop;

  select count(*)
  into v_pending_count
  from public.hunt_attempts ha
  where ha.league_id = p_league_id
    and ha.week_number = p_week_number
    and ha.status = 'submitted';

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
    'hunt_resolution_batch',
    'hunt_attempt',
    p_league_id,
    p_league_id,
    jsonb_build_object(
      'week_number', p_week_number,
      'resolved_count', v_resolved_count,
      'captured_count', v_captured_count,
      'escaped_count', v_escaped_count,
      'pending_count', v_pending_count,
      'limit', p_limit
    )
  );

  return query
  select v_resolved_count, v_captured_count, v_escaped_count, v_pending_count;
end;
$$;
