create or replace function public.resign_from_guild(
  p_league_id uuid
)
returns table (
  left_league_id uuid,
  left_league_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_member public.league_members%rowtype;
  v_league public.leagues%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to resign from a Guild.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select *
  into v_member
  from public.league_members lm
  where lm.league_id = p_league_id
    and lm.user_id = v_user_id;

  if not found then
    raise exception 'You are not a member of this Guild.';
  end if;

  if v_member.role = 'commissioner' then
    raise exception 'Guild Masters cannot resign yet. Transfer leadership first.';
  end if;

  select *
  into v_league
  from public.leagues l
  where l.id = p_league_id;

  if not found then
    raise exception 'Guild not found.';
  end if;

  delete from public.league_members lm
  where lm.league_id = p_league_id
    and lm.user_id = v_user_id;

  delete from public.league_participants lp
  where lp.league_id = p_league_id
    and lp.user_id = v_user_id
    and lp.participant_type = 'human';

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
    'member_resigned',
    'league_membership',
    v_user_id,
    p_league_id,
    jsonb_build_object(
      'league_id', p_league_id,
      'league_name', v_league.name
    )
  );

  return query
  select v_league.id, v_league.name;
end;
$$;

grant execute on function public.resign_from_guild(uuid) to authenticated;
