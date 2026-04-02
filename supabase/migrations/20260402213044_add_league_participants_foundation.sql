create type public.participant_type as enum ('human', 'bot');

create table public.league_participants (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  participant_type public.participant_type not null,
  role text not null check (role in ('commissioner', 'member')),
  display_name text not null,
  email text,
  bot_number integer,
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint league_participants_identity_check check (
    (participant_type = 'human' and user_id is not null and bot_number is null)
    or (participant_type = 'bot' and user_id is null and bot_number is not null)
  )
);

alter table public.league_participants
  add constraint league_participants_league_user_unique unique (league_id, user_id);

create unique index league_participants_bot_number_unique
on public.league_participants (league_id, bot_number)
where bot_number is not null;

create index league_participants_league_id_idx
on public.league_participants (league_id);

create index league_participants_user_id_idx
on public.league_participants (user_id);

create trigger set_league_participants_updated_at
before update on public.league_participants
for each row
execute function public.set_updated_at();

alter table public.league_participants enable row level security;

create policy "league_participants_select_same_league_or_admin"
on public.league_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.league_members lm
    where lm.league_id = league_participants.league_id
      and lm.user_id = auth.uid()
  )
  or public.is_platform_admin(auth.uid())
);

create or replace function public.ensure_human_participant(
  p_league_id uuid,
  p_user_id uuid,
  p_role text
)
returns public.league_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_participant public.league_participants%rowtype;
begin
  select *
  into v_profile
  from public.ensure_profile_for_user(p_user_id);

  insert into public.league_participants (
    league_id,
    user_id,
    participant_type,
    role,
    display_name,
    email
  )
  values (
    p_league_id,
    p_user_id,
    'human',
    p_role,
    coalesce(
      nullif(trim(v_profile.display_name), ''),
      split_part(coalesce(v_profile.email, ''), '@', 1),
      'New Player'
    ),
    v_profile.email
  )
  on conflict (league_id, user_id) do update
  set
    role = excluded.role,
    display_name = excluded.display_name,
    email = excluded.email
  returning * into v_participant;

  return v_participant;
end;
$$;

insert into public.league_participants (
  league_id,
  user_id,
  participant_type,
  role,
  display_name,
  email,
  joined_at
)
select
  lm.league_id,
  lm.user_id,
  'human',
  lm.role,
  coalesce(
    nullif(trim(p.display_name), ''),
    split_part(coalesce(p.email, ''), '@', 1),
    'New Player'
  ),
  p.email,
  lm.joined_at
from public.league_members lm
left join public.profiles p on p.id = lm.user_id
on conflict (league_id, user_id) do update
set
  role = excluded.role,
  display_name = excluded.display_name,
  email = excluded.email,
  joined_at = excluded.joined_at;

alter table public.draft_slots
  add column participant_id uuid references public.league_participants (id) on delete cascade;

alter table public.draft_slots
  alter column user_id drop not null;

update public.draft_slots ds
set participant_id = lp.id
from public.league_participants lp
where lp.league_id = ds.league_id
  and lp.user_id = ds.user_id;

alter table public.draft_slots
  alter column participant_id set not null;

create unique index draft_slots_participant_unique
on public.draft_slots (draft_id, participant_id);

create index draft_slots_participant_id_idx
on public.draft_slots (participant_id);

alter table public.draft_picks
  add column participant_id uuid references public.league_participants (id) on delete cascade;

alter table public.draft_picks
  alter column user_id drop not null;

update public.draft_picks dp
set participant_id = lp.id
from public.league_participants lp
where lp.league_id = dp.league_id
  and lp.user_id = dp.user_id;

alter table public.draft_picks
  alter column participant_id set not null;

create index draft_picks_participant_id_idx
on public.draft_picks (participant_id);

drop function if exists public.generate_draft_order(uuid, uuid);
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
  v_participant_count integer := 0;
  v_round integer := 1;
  v_pick_number integer := 1;
  v_slot integer;
begin
  delete from public.draft_picks dp where dp.draft_id = p_draft_id;
  delete from public.draft_slots ds where ds.draft_id = p_draft_id;

  insert into public.draft_slots (
    draft_id,
    league_id,
    participant_id,
    user_id,
    slot_number
  )
  select
    p_draft_id,
    p_league_id,
    ordered.id,
    ordered.user_id,
    row_number() over (order by ordered.random_seed)
  from (
    select
      lp.id,
      lp.user_id,
      gen_random_uuid() as random_seed
    from public.league_participants lp
    where lp.league_id = p_league_id
  ) as ordered;

  select count(*)
  into v_participant_count
  from public.draft_slots ds
  where ds.draft_id = p_draft_id;

  if v_participant_count <> 10 then
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
          participant_id,
          user_id
        )
        select
          p_draft_id,
          p_league_id,
          v_round,
          v_pick_number,
          ds.slot_number,
          ds.participant_id,
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
          participant_id,
          user_id
        )
        select
          p_draft_id,
          p_league_id,
          v_round,
          v_pick_number,
          ds.slot_number,
          ds.participant_id,
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

create or replace function public.create_league_with_invite(
  p_name text,
  p_slug text,
  p_season integer,
  p_draft_starts_at timestamptz
)
returns table (
  league_id uuid,
  league_slug text,
  invite_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_active_league_count integer := 0;
  v_league_id uuid;
  v_invite_code text;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to create a league.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  if coalesce(trim(p_name), '') = '' then
    raise exception 'League name is required.';
  end if;

  if coalesce(trim(p_slug), '') = '' then
    raise exception 'League slug is required.';
  end if;

  if p_draft_starts_at is null then
    raise exception 'Draft start time is required.';
  end if;

  if p_draft_starts_at <= timezone('utc', now()) then
    raise exception 'Draft start time must be in the future.';
  end if;

  if v_profile.platform_role <> 'platform_admin' then
    select count(*)
    into v_active_league_count
    from public.league_members lm
    join public.leagues l on l.id = lm.league_id
    where lm.user_id = v_user_id
      and l.status <> 'completed';

    if v_active_league_count >= 1 then
      raise exception 'You can only participate in one league at a time.';
    end if;
  end if;

  insert into public.leagues (
    name,
    slug,
    season,
    created_by,
    draft_starts_at
  )
  values (
    trim(p_name),
    trim(p_slug),
    p_season,
    v_user_id,
    p_draft_starts_at
  )
  returning id into v_league_id;

  insert into public.league_members (
    league_id,
    user_id,
    role
  )
  values (
    v_league_id,
    v_user_id,
    'commissioner'
  );

  perform public.ensure_human_participant(v_league_id, v_user_id, 'commissioner');

  loop
    v_invite_code := public.generate_invite_code();
    exit when not exists (
      select 1 from public.invite_codes ic where ic.code = v_invite_code
    );
  end loop;

  insert into public.invite_codes (
    league_id,
    code,
    created_by,
    expires_at
  )
  values (
    v_league_id,
    v_invite_code,
    v_user_id,
    p_draft_starts_at
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
    'league_created',
    'league',
    v_league_id,
    v_league_id,
    jsonb_build_object(
      'slug', trim(p_slug),
      'season', p_season
    )
  );

  return query
  select v_league_id, trim(p_slug), v_invite_code;
end;
$$;

create or replace function public.join_league_via_code(
  p_code text
)
returns table (
  league_id uuid,
  league_slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_invite public.invite_codes%rowtype;
  v_league public.leagues%rowtype;
  v_member_count integer := 0;
  v_active_league_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to join a league.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_invite
  from public.invite_codes ic
  where ic.code = upper(trim(p_code))
    and ic.disabled_at is null
  order by ic.created_at desc
  limit 1;

  if not found then
    raise exception 'Invite code not found.';
  end if;

  if v_invite.expires_at <= timezone('utc', now()) then
    raise exception 'Invite code has expired.';
  end if;

  select *
  into v_league
  from public.leagues l
  where l.id = v_invite.league_id;

  if not found then
    raise exception 'League not found for invite code.';
  end if;

  if v_league.status <> 'pre_draft' then
    raise exception 'League is no longer accepting members.';
  end if;

  if exists (
    select 1
    from public.league_members lm
    where lm.league_id = v_league.id
      and lm.user_id = v_user_id
  ) then
    raise exception 'You are already a member of this league.';
  end if;

  select count(*)
  into v_member_count
  from public.league_participants lp
  where lp.league_id = v_league.id;

  if v_member_count >= v_league.max_members then
    raise exception 'League is full.';
  end if;

  if v_profile.platform_role <> 'platform_admin' then
    select count(*)
    into v_active_league_count
    from public.league_members lm
    join public.leagues l on l.id = lm.league_id
    where lm.user_id = v_user_id
      and l.status <> 'completed';

    if v_active_league_count >= 1 then
      raise exception 'You can only participate in one league at a time.';
    end if;
  end if;

  insert into public.league_members (
    league_id,
    user_id,
    role
  )
  values (
    v_league.id,
    v_user_id,
    'member'
  );

  perform public.ensure_human_participant(v_league.id, v_user_id, 'member');

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
    'league_joined',
    'league_membership',
    v_league.id,
    v_league.id,
    jsonb_build_object(
      'invite_code', v_invite.code
    )
  );

  return query
  select v_league.id, v_league.slug;
end;
$$;

drop function if exists public.remove_league_member(uuid, uuid);
create or replace function public.remove_league_participant(
  p_league_id uuid,
  p_participant_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_league public.leagues%rowtype;
  v_participant public.league_participants%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to manage league members.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_league
  from public.leagues l
  where l.id = p_league_id;

  if not found then
    raise exception 'League not found.';
  end if;

  if v_league.status <> 'pre_draft' then
    raise exception 'Members can only be removed before the draft.';
  end if;

  if not (
    public.is_league_commissioner(v_user_id, p_league_id)
    or public.is_platform_admin(v_user_id)
  ) then
    raise exception 'You do not have permission to remove members from this league.';
  end if;

  select *
  into v_participant
  from public.league_participants lp
  where lp.id = p_participant_id
    and lp.league_id = p_league_id;

  if not found then
    raise exception 'League participant not found.';
  end if;

  if v_participant.role = 'commissioner' then
    raise exception 'Commissioners cannot be removed with this action.';
  end if;

  if v_participant.user_id = v_user_id then
    raise exception 'Commissioners cannot remove themselves from the league.';
  end if;

  if v_participant.user_id is not null then
    delete from public.league_members lm
    where lm.league_id = p_league_id
      and lm.user_id = v_participant.user_id;
  end if;

  delete from public.league_participants lp
  where lp.id = p_participant_id;

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
    'participant_removed',
    'league_participant',
    p_participant_id,
    p_league_id,
    jsonb_build_object(
      'removed_participant_id', p_participant_id,
      'participant_type', v_participant.participant_type,
      'removed_user_id', v_participant.user_id
    )
  );
end;
$$;

create or replace function public.fill_empty_slots_with_bots(
  p_league_id uuid
)
returns table (
  filled_count integer,
  total_participants integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_league public.leagues%rowtype;
  v_current_count integer := 0;
  v_remaining_count integer := 0;
  v_filled_count integer := 0;
  v_next_bot_number integer := 1;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to manage this league.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_league
  from public.leagues l
  where l.id = p_league_id;

  if not found then
    raise exception 'League not found.';
  end if;

  if v_league.status <> 'pre_draft' then
    raise exception 'Bot fill is only available before the draft.';
  end if;

  if not (
    public.is_league_commissioner(v_user_id, p_league_id)
    or public.is_platform_admin(v_user_id)
  ) then
    raise exception 'You do not have permission to fill this league with bots.';
  end if;

  select count(*), coalesce(max(bot_number), 0) + 1
  into v_current_count, v_next_bot_number
  from public.league_participants lp
  where lp.league_id = p_league_id;

  v_remaining_count := greatest(v_league.max_members - v_current_count, 0);

  while v_filled_count < v_remaining_count loop
    insert into public.league_participants (
      league_id,
      participant_type,
      role,
      display_name,
      email,
      bot_number
    )
    values (
      p_league_id,
      'bot',
      'member',
      format('Bot %s', v_next_bot_number),
      null,
      v_next_bot_number
    );

    v_filled_count := v_filled_count + 1;
    v_next_bot_number := v_next_bot_number + 1;
  end loop;

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
    'bots_filled',
    'league',
    p_league_id,
    p_league_id,
    jsonb_build_object(
      'filled_count', v_filled_count
    )
  );

  return query
  select
    v_filled_count,
    v_current_count + v_filled_count;
end;
$$;

grant execute on function public.ensure_human_participant(uuid, uuid, text) to authenticated;
grant execute on function public.remove_league_participant(uuid, uuid) to authenticated;
grant execute on function public.fill_empty_slots_with_bots(uuid) to authenticated;
