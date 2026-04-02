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

  update public.leagues
  set
    name = trim(p_name),
    draft_starts_at = p_draft_starts_at
  where id = p_league_id;

  update public.invite_codes
  set expires_at = p_draft_starts_at
  where league_id = p_league_id
    and disabled_at is null;

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

grant execute on function public.update_predraft_league_settings(uuid, text, timestamptz) to authenticated;
