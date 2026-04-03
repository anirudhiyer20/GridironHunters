create or replace function public.process_live_draft_queue(
  p_league_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_draft public.drafts%rowtype;
  v_current_pick public.draft_picks%rowtype;
  v_current_participant public.league_participants%rowtype;
  v_choice record;
  v_processed_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to process the live draft queue.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  if not (
    public.is_platform_admin(v_user_id)
    or public.is_league_commissioner(v_user_id, p_league_id)
    or exists (
      select 1
      from public.league_participants lp
      where lp.league_id = p_league_id
        and lp.user_id = v_user_id
    )
  ) then
    raise exception 'You do not have permission to process this live draft.';
  end if;

  select *
  into v_draft
  from public.drafts d
  where d.league_id = p_league_id;

  if not found or v_draft.status <> 'live' then
    return 0;
  end if;

  loop
    select *
    into v_current_pick
    from public.draft_picks dp
    where dp.draft_id = v_draft.id
      and dp.pick_number = v_draft.current_pick_number
      and dp.status = 'pending';

    exit when not found;

    select *
    into v_current_participant
    from public.league_participants lp
    where lp.id = v_current_pick.participant_id;

    exit when not found;

    if v_current_participant.participant_type = 'human'
       and v_current_participant.draft_control_mode = 'manual' then
      exit when v_draft.current_pick_started_at is null;
      exit when timezone('utc', now()) < v_draft.current_pick_started_at + make_interval(secs => v_draft.pick_time_seconds);

      update public.league_participants lp
      set
        draft_control_mode = 'autopick',
        draft_control_reason = 'timeout'
      where lp.id = v_current_participant.id
      returning * into v_current_participant;
    elsif not (
      v_current_participant.participant_type = 'bot'
      or v_current_participant.draft_control_mode = 'autopick'
    ) then
      exit;
    end if;

    select *
    into v_choice
    from public.choose_autopick_test_player(v_current_participant.id, p_league_id);

    perform public.apply_draft_pick(
      v_draft.id,
      p_league_id,
      v_current_pick.id,
      v_current_participant.id,
      v_choice.player_key,
      v_choice.player_name,
      v_choice.picked_position,
      'autopicked'
    );

    v_processed_count := v_processed_count + 1;

    select *
    into v_draft
    from public.drafts d
    where d.id = v_draft.id;

    exit when v_draft.status <> 'live';
  end loop;

  return v_processed_count;
end;
$$;

grant execute on function public.process_live_draft_queue(uuid) to authenticated;
