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
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'Profile not found for current user.';
  end if;

  select *
  into v_league
  from public.leagues
  where id = p_league_id;

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

  update public.invite_codes
  set disabled_at = timezone('utc', now())
  where league_id = p_league_id
    and disabled_at is null;

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
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'Profile not found for current user.';
  end if;

  select *
  into v_league
  from public.leagues
  where id = p_league_id;

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
  from public.league_members
  where league_id = p_league_id
    and user_id = p_member_user_id;

  if not found then
    raise exception 'League member not found.';
  end if;

  if v_member.role = 'commissioner' then
    raise exception 'Commissioners cannot be removed with this action.';
  end if;

  delete from public.league_members
  where league_id = p_league_id
    and user_id = p_member_user_id;

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

grant execute on function public.regenerate_league_invite(uuid) to authenticated;
grant execute on function public.remove_league_member(uuid, uuid) to authenticated;
