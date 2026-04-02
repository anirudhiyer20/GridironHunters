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
  from public.profiles p
  where p.id = v_user_id;

  if not found then
    raise exception 'Profile not found for current user.';
  end if;

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
