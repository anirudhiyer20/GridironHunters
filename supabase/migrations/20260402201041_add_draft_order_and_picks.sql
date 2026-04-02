create table public.draft_slots (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts (id) on delete cascade,
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  slot_number integer not null check (slot_number between 1 and 10),
  created_at timestamptz not null default timezone('utc', now()),
  unique (draft_id, user_id),
  unique (draft_id, slot_number)
);

create table public.draft_picks (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts (id) on delete cascade,
  league_id uuid not null references public.leagues (id) on delete cascade,
  round_number integer not null check (round_number between 1 and 8),
  pick_number integer not null check (pick_number between 1 and 80),
  slot_number integer not null check (slot_number between 1 and 10),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'made', 'autopicked', 'skipped')),
  picked_player_id uuid,
  made_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (draft_id, pick_number),
  unique (draft_id, round_number, slot_number)
);

create index draft_slots_league_id_idx on public.draft_slots (league_id);
create index draft_picks_draft_id_idx on public.draft_picks (draft_id, pick_number);
create index draft_picks_user_id_idx on public.draft_picks (user_id);

alter table public.draft_slots enable row level security;
alter table public.draft_picks enable row level security;

create policy "draft_slots_select_member_or_admin"
on public.draft_slots
for select
to authenticated
using (
  exists (
    select 1
    from public.league_members lm
    where lm.league_id = draft_slots.league_id
      and lm.user_id = auth.uid()
  )
  or public.is_platform_admin(auth.uid())
);

create policy "draft_picks_select_member_or_admin"
on public.draft_picks
for select
to authenticated
using (
  exists (
    select 1
    from public.league_members lm
    where lm.league_id = draft_picks.league_id
      and lm.user_id = auth.uid()
  )
  or public.is_platform_admin(auth.uid())
);

create or replace function public.generate_draft_order(
  p_draft_id uuid,
  p_league_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_count integer := 0;
  v_round integer := 1;
  v_pick_number integer := 1;
  v_slot integer;
begin
  delete from public.draft_picks dp where dp.draft_id = p_draft_id;
  delete from public.draft_slots ds where ds.draft_id = p_draft_id;

  insert into public.draft_slots (
    draft_id,
    league_id,
    user_id,
    slot_number
  )
  select
    p_draft_id,
    p_league_id,
    ordered.user_id,
    row_number() over (order by ordered.random_seed)
  from (
    select
      lm.user_id,
      gen_random_uuid() as random_seed
    from public.league_members lm
    where lm.league_id = p_league_id
  ) as ordered;

  select count(*)
  into v_member_count
  from public.draft_slots ds
  where ds.draft_id = p_draft_id;

  if v_member_count <> 10 then
    raise exception 'Draft order can only be generated for full 10-team leagues.';
  end if;

  while v_round <= 8 loop
    if mod(v_round, 2) = 1 then
      v_slot := 1;
      while v_slot <= 10 loop
        insert into public.draft_picks (
          draft_id,
          league_id,
          round_number,
          pick_number,
          slot_number,
          user_id
        )
        select
          p_draft_id,
          p_league_id,
          v_round,
          v_pick_number,
          ds.slot_number,
          ds.user_id
        from public.draft_slots ds
        where ds.draft_id = p_draft_id
          and ds.slot_number = v_slot;

        v_pick_number := v_pick_number + 1;
        v_slot := v_slot + 1;
      end loop;
    else
      v_slot := 10;
      while v_slot >= 1 loop
        insert into public.draft_picks (
          draft_id,
          league_id,
          round_number,
          pick_number,
          slot_number,
          user_id
        )
        select
          p_draft_id,
          p_league_id,
          v_round,
          v_pick_number,
          ds.slot_number,
          ds.user_id
        from public.draft_slots ds
        where ds.draft_id = p_draft_id
          and ds.slot_number = v_slot;

        v_pick_number := v_pick_number + 1;
        v_slot := v_slot - 1;
      end loop;
    end if;

    v_round := v_round + 1;
  end loop;
end;
$$;

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
  on conflict on constraint drafts_league_id_key do update
  set
    status = 'ready',
    scheduled_start_at = excluded.scheduled_start_at,
    paused_at = null,
    current_pick_number = 1,
    current_round = 1
  returning * into v_draft;

  perform public.generate_draft_order(v_draft.id, p_league_id);

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
      'scheduled_start_at', v_draft.scheduled_start_at,
      'order_published', true
    )
  );

  return query
  select v_league.id, v_league.slug, v_draft.id;
end;
$$;
