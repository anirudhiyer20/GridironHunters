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
  v_draft public.drafts%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to change draft control mode.';
  end if;

  if p_mode not in ('manual', 'autopick') then
    raise exception 'Draft control mode is invalid.';
  end if;

  select *
  into v_draft
  from public.drafts d
  where d.league_id = p_league_id;

  if not found then
    raise exception 'Draft room has not been prepared yet.';
  end if;

  if v_draft.status not in ('ready', 'live', 'paused') then
    raise exception 'Draft control can only be changed while the draft is still in progress.';
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
      when p_mode = 'manual' then 'manual_reclaimed'
      else 'user_toggled'
    end
  where lp.id = v_participant.id;

  return p_mode;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'league_participants_draft_control_reason_check'
  ) then
    alter table public.league_participants
      drop constraint league_participants_draft_control_reason_check;
  end if;
end
$$;

alter table public.league_participants
  add constraint league_participants_draft_control_reason_check
  check (
    draft_control_reason is null
    or draft_control_reason in ('bot_default', 'timeout', 'commissioner_forced', 'manual_reclaimed', 'user_toggled')
  );

grant execute on function public.set_my_draft_control_mode(uuid, text) to authenticated;
