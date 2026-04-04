create or replace function public.set_my_draft_control_mode(
  p_league_id uuid,
  p_mode text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_participant public.league_participants%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to change draft control mode.';
  end if;

  if p_mode not in ('manual', 'autopick') then
    raise exception 'Draft control mode is invalid.';
  end if;

  select *
  into v_participant
  from public.league_participants lp
  where lp.league_id = p_league_id
    and lp.user_id = v_user_id;

  if not found then
    raise exception 'You are not a participant in this league.';
  end if;

  if v_participant.participant_type <> 'human' then
    raise exception 'Only human participants can change draft control mode.';
  end if;

  update public.league_participants lp
  set
    draft_control_mode = p_mode,
    draft_control_reason = case
      when p_mode = 'manual' then null
      else 'user_toggled'
    end
  where lp.id = v_participant.id;

  return p_mode;
end;
$$;

grant execute on function public.set_my_draft_control_mode(uuid, text) to authenticated;
