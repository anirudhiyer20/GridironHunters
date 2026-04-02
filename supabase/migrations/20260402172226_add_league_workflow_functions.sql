create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  output text := '';
  i integer := 0;
begin
  while i < 8 loop
    output := output || substr(chars, 1 + floor(random() * length(chars))::integer, 1);
    i := i + 1;
  end loop;

  return output;
end;
$$;

create or replace function public.current_actor_type(profile_role public.platform_role)
returns public.audit_actor_type
language sql
immutable
as $$
  select case
    when profile_role = 'platform_admin' then 'admin'::public.audit_actor_type
    else 'user'::public.audit_actor_type
  end
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
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'Profile not found for current user.';
  end if;

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
      select 1 from public.invite_codes where code = v_invite_code
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
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'Profile not found for current user.';
  end if;

  select *
  into v_invite
  from public.invite_codes
  where code = upper(trim(p_code))
    and disabled_at is null
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'Invite code not found.';
  end if;

  if v_invite.expires_at <= timezone('utc', now()) then
    raise exception 'Invite code has expired.';
  end if;

  select *
  into v_league
  from public.leagues
  where id = v_invite.league_id;

  if not found then
    raise exception 'League not found for invite code.';
  end if;

  if v_league.status <> 'pre_draft' then
    raise exception 'League is no longer accepting members.';
  end if;

  if exists (
    select 1
    from public.league_members
    where league_id = v_league.id
      and user_id = v_user_id
  ) then
    raise exception 'You are already a member of this league.';
  end if;

  select count(*)
  into v_member_count
  from public.league_members
  where league_id = v_league.id;

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

grant execute on function public.create_league_with_invite(text, text, integer, timestamptz) to authenticated;
grant execute on function public.join_league_via_code(text) to authenticated;
