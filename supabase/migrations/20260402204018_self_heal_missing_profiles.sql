create or replace function public.ensure_profile_for_user(
  p_user_id uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype;
  v_auth_user auth.users%rowtype;
begin
  if p_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = p_user_id;

  if found then
    return v_profile;
  end if;

  select *
  into v_auth_user
  from auth.users au
  where au.id = p_user_id;

  if not found then
    raise exception 'Profile not found for current user.';
  end if;

  insert into public.profiles (
    id,
    email,
    display_name
  )
  values (
    v_auth_user.id,
    v_auth_user.email,
    coalesce(
      v_auth_user.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(v_auth_user.email, ''), '@', 1),
      'New Player'
    )
  )
  on conflict (id) do update
  set email = excluded.email
  returning * into v_profile;

  return v_profile;
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
  from public.league_members lm
  where lm.league_id = v_league.id;

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

create or replace function public.regenerate_league_invite(
  p_league_id uuid
)
returns table (
  invite_code text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_league public.leagues%rowtype;
  v_invite_code text;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to manage invite codes.';
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
    raise exception 'Invite codes can only be managed before the draft.';
  end if;

  if not (
    public.is_league_commissioner(v_user_id, p_league_id)
    or public.is_platform_admin(v_user_id)
  ) then
    raise exception 'You do not have permission to manage this invite code.';
  end if;

  update public.invite_codes ic
  set disabled_at = timezone('utc', now())
  where ic.league_id = p_league_id
    and ic.disabled_at is null;

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
    p_league_id,
    v_invite_code,
    v_user_id,
    v_league.draft_starts_at
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
    'invite_regenerated',
    'invite_code',
    p_league_id,
    p_league_id,
    jsonb_build_object(
      'invite_code', v_invite_code
    )
  );

  return query
  select v_invite_code, v_league.draft_starts_at;
end;
$$;

create or replace function public.remove_league_member(
  p_league_id uuid,
  p_member_user_id uuid
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
  v_member public.league_members%rowtype;
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

  if v_user_id = p_member_user_id then
    raise exception 'Commissioners cannot remove themselves from the league.';
  end if;

  select *
  into v_member
  from public.league_members lm
  where lm.league_id = p_league_id
    and lm.user_id = p_member_user_id;

  if not found then
    raise exception 'League member not found.';
  end if;

  if v_member.role = 'commissioner' then
    raise exception 'Commissioners cannot be removed with this action.';
  end if;

  delete from public.league_members lm
  where lm.league_id = p_league_id
    and lm.user_id = p_member_user_id;

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
    'member_removed',
    'league_membership',
    p_member_user_id,
    p_league_id,
    jsonb_build_object(
      'removed_user_id', p_member_user_id
    )
  );
end;
$$;

create or replace function public.update_predraft_league_settings(
  p_league_id uuid,
  p_name text,
  p_draft_starts_at timestamptz
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
  v_league public.leagues%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to update league settings.';
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
    raise exception 'League settings can only be edited before the draft begins.';
  end if;

  if not (
    public.is_league_commissioner(v_user_id, p_league_id)
    or public.is_platform_admin(v_user_id)
  ) then
    raise exception 'You do not have permission to edit this league.';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'League name is required.';
  end if;

  if p_draft_starts_at is null then
    raise exception 'Draft start time is required.';
  end if;

  if p_draft_starts_at <= timezone('utc', now()) then
    raise exception 'Draft start time must be in the future.';
  end if;

  update public.leagues l
  set
    name = trim(p_name),
    draft_starts_at = p_draft_starts_at
  where l.id = p_league_id;

  update public.invite_codes ic
  set expires_at = p_draft_starts_at
  where ic.league_id = p_league_id
    and ic.disabled_at is null;

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
    'league_settings_updated',
    'league',
    p_league_id,
    p_league_id,
    jsonb_build_object(
      'name', trim(p_name),
      'draft_starts_at', p_draft_starts_at
    )
  );

  return query
  select v_league.id, v_league.slug;
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
  from public.ensure_profile_for_user(v_user_id);

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

  if not (
    public.is_league_commissioner(v_user_id, p_league_id)
    or public.is_platform_admin(v_user_id)
  ) then
    raise exception 'You do not have permission to start this draft.';
  end if;

  select *
  into v_draft
  from public.drafts d
  where d.league_id = p_league_id;

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

  if not (
    public.is_league_commissioner(v_user_id, p_league_id)
    or public.is_platform_admin(v_user_id)
  ) then
    raise exception 'You do not have permission to pause this draft.';
  end if;

  select *
  into v_draft
  from public.drafts d
  where d.league_id = p_league_id;

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

grant execute on function public.ensure_profile_for_user(uuid) to authenticated;
