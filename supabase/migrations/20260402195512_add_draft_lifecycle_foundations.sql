alter type public.league_status add value if not exists 'draft_ready';
alter type public.league_status add value if not exists 'draft_live';
alter type public.league_status add value if not exists 'draft_paused';

create type public.draft_status as enum ('ready', 'live', 'paused', 'completed');

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null unique references public.leagues (id) on delete cascade,
  status public.draft_status not null default 'ready',
  scheduled_start_at timestamptz not null,
  actual_started_at timestamptz,
  paused_at timestamptz,
  completed_at timestamptz,
  current_pick_number integer not null default 1,
  current_round integer not null default 1,
  pick_time_seconds integer not null default 60 check (pick_time_seconds > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_drafts_updated_at
before update on public.drafts
for each row
execute function public.set_updated_at();

alter table public.drafts enable row level security;

create policy "drafts_select_member_or_admin"
on public.drafts
for select
to authenticated
using (
  exists (
    select 1
    from public.league_members lm
    where lm.league_id = drafts.league_id
      and lm.user_id = auth.uid()
  )
  or public.is_platform_admin(auth.uid())
);

create or replace function public.prepare_draft_room(
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
    raise exception 'You must be logged in to prepare the draft.';
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = v_user_id;

  if not found then
    raise exception 'Profile not found for current user.';
  end if;

  select *
  into v_league
  from public.leagues l
  where l.id = p_league_id;

  if not found then
    raise exception 'League not found.';
  end if;

  if v_league.status <> 'pre_draft' then
    raise exception 'Draft room can only be prepared from pre-draft state.';
  end if;

  if not (
    public.is_league_commissioner(v_user_id, p_league_id)
    or public.is_platform_admin(v_user_id)
  ) then
    raise exception 'You do not have permission to prepare this draft.';
  end if;

  if v_league.draft_starts_at is null then
    raise exception 'Set a draft start time before preparing the draft room.';
  end if;

  insert into public.drafts (
    league_id,
    status,
    scheduled_start_at
  )
  values (
    p_league_id,
    'ready',
    v_league.draft_starts_at
  )
  on conflict (league_id) do update
  set
    status = 'ready',
    scheduled_start_at = excluded.scheduled_start_at,
    paused_at = null
  returning * into v_draft;

  update public.leagues l
  set status = 'draft_ready'
  where l.id = p_league_id;

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
    'draft_prepared',
    'draft',
    v_draft.id,
    p_league_id,
    jsonb_build_object(
      'scheduled_start_at', v_draft.scheduled_start_at
    )
  );

  return query
  select v_league.id, v_league.slug, v_draft.id;
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

  select * into v_profile from public.profiles p where p.id = v_user_id;
  if not found then
    raise exception 'Profile not found for current user.';
  end if;

  select * into v_league from public.leagues l where l.id = p_league_id;
  if not found then
    raise exception 'League not found.';
  end if;

  if not (
    public.is_league_commissioner(v_user_id, p_league_id)
    or public.is_platform_admin(v_user_id)
  ) then
    raise exception 'You do not have permission to start this draft.';
  end if;

  select * into v_draft from public.drafts d where d.league_id = p_league_id;
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

create or replace function public.pause_draft(
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
    raise exception 'You must be logged in to pause the draft.';
  end if;

  select * into v_profile from public.profiles p where p.id = v_user_id;
  if not found then
    raise exception 'Profile not found for current user.';
  end if;

  select * into v_league from public.leagues l where l.id = p_league_id;
  if not found then
    raise exception 'League not found.';
  end if;

  if not (
    public.is_league_commissioner(v_user_id, p_league_id)
    or public.is_platform_admin(v_user_id)
  ) then
    raise exception 'You do not have permission to pause this draft.';
  end if;

  select * into v_draft from public.drafts d where d.league_id = p_league_id;
  if not found then
    raise exception 'Draft room has not been prepared yet.';
  end if;

  if v_draft.status <> 'live' then
    raise exception 'Only a live draft can be paused.';
  end if;

  update public.drafts d
  set
    status = 'paused',
    paused_at = timezone('utc', now())
  where d.id = v_draft.id
  returning * into v_draft;

  update public.leagues l
  set status = 'draft_paused'
  where l.id = p_league_id;

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
    'draft_paused',
    'draft',
    v_draft.id,
    p_league_id,
    jsonb_build_object(
      'paused_at', v_draft.paused_at
    )
  );

  return query
  select v_league.id, v_league.slug, v_draft.id;
end;
$$;

grant execute on function public.prepare_draft_room(uuid) to authenticated;
grant execute on function public.start_draft_now(uuid) to authenticated;
grant execute on function public.pause_draft(uuid) to authenticated;
