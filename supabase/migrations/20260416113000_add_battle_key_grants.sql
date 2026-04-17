create table public.battle_key_grants (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  participant_id uuid not null references public.league_participants (id) on delete cascade,
  week_number integer not null check (week_number between 1 and 18),
  keys_granted integer not null check (keys_granted > 0 and keys_granted <= 50),
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (league_id, participant_id, week_number)
);

create index battle_key_grants_lookup_idx
on public.battle_key_grants (league_id, participant_id, week_number desc);

alter table public.battle_key_grants enable row level security;

create policy "battle_key_grants_select_same_league_or_admin"
on public.battle_key_grants
for select
to authenticated
using (
  public.is_platform_admin(auth.uid())
  or exists (
    select 1
    from public.league_members lm
    where lm.league_id = battle_key_grants.league_id
      and lm.user_id = auth.uid()
  )
);

create or replace function public.grant_weekly_battle_keys(
  p_league_id uuid,
  p_week_number integer,
  p_keys_granted integer
)
returns table (
  granted_count integer,
  notified_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_league public.leagues%rowtype;
  v_granted_count integer := 0;
  v_notified_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to grant Battle Keys.';
  end if;

  if p_week_number < 1 or p_week_number > 18 then
    raise exception 'Week number must be between 1 and 18.';
  end if;

  if p_keys_granted <= 0 then
    raise exception 'Keys granted must be greater than 0.';
  end if;

  if p_keys_granted > 50 then
    raise exception 'Keys granted cannot exceed 50.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_league
  from public.leagues l
  where l.id = p_league_id;

  if not found then
    raise exception 'Guild not found.';
  end if;

  if not public.is_platform_admin(v_user_id) then
    raise exception 'Only platform admins can grant Battle Keys.';
  end if;

  insert into public.battle_key_grants (
    league_id,
    participant_id,
    week_number,
    keys_granted,
    granted_by
  )
  select
    lp.league_id,
    lp.id,
    p_week_number,
    p_keys_granted,
    v_user_id
  from public.league_participants lp
  where lp.league_id = p_league_id
    and lp.participant_type = 'human'
    and lp.user_id is not null
  on conflict (league_id, participant_id, week_number) do update
  set
    keys_granted = excluded.keys_granted,
    granted_by = excluded.granted_by,
    granted_at = timezone('utc', now());

  get diagnostics v_granted_count = row_count;

  v_notified_count := public.create_battle_keys_granted_notifications(
    p_league_id,
    p_week_number,
    p_keys_granted
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
    'battle_keys_granted',
    'battle_key_grant',
    p_league_id,
    p_league_id,
    jsonb_build_object(
      'week_number', p_week_number,
      'keys_granted', p_keys_granted,
      'granted_count', v_granted_count,
      'notified_count', v_notified_count
    )
  );

  return query
  select v_granted_count, v_notified_count;
end;
$$;

grant execute on function public.grant_weekly_battle_keys(uuid, integer, integer) to authenticated;
