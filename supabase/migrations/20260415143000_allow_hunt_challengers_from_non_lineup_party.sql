drop policy if exists "hunt_challengers_insert_own_human_participant" on public.hunt_challengers;
create policy "hunt_challengers_insert_own_human_participant"
on public.hunt_challengers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.league_participants lp
    join public.hunt_queue_entries hqe on hqe.id = hunt_challengers.hunt_queue_entry_id
    join public.draft_picks dp on dp.id = hunt_challengers.challenger_draft_pick_id
    join public.players target on target.id = hqe.target_player_id
    where lp.id = hunt_challengers.participant_id
      and lp.league_id = hunt_challengers.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
      and hqe.league_id = hunt_challengers.league_id
      and hqe.participant_id = hunt_challengers.participant_id
      and dp.league_id = hunt_challengers.league_id
      and dp.participant_id = hunt_challengers.participant_id
      and dp.status in ('made', 'autopicked')
      and dp.picked_position = target.position
      and not exists (
        select 1
        from public.party_assignments pa
        where pa.league_id = hunt_challengers.league_id
          and pa.participant_id = hunt_challengers.participant_id
          and pa.draft_pick_id = hunt_challengers.challenger_draft_pick_id
          and pa.assignment_type = 'arena'
      )
  )
);

drop policy if exists "hunt_challengers_update_own_human_participant" on public.hunt_challengers;
create policy "hunt_challengers_update_own_human_participant"
on public.hunt_challengers
for update
to authenticated
using (
  exists (
    select 1
    from public.league_participants lp
    where lp.id = hunt_challengers.participant_id
      and lp.league_id = hunt_challengers.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
  )
)
with check (
  exists (
    select 1
    from public.league_participants lp
    join public.hunt_queue_entries hqe on hqe.id = hunt_challengers.hunt_queue_entry_id
    join public.draft_picks dp on dp.id = hunt_challengers.challenger_draft_pick_id
    join public.players target on target.id = hqe.target_player_id
    where lp.id = hunt_challengers.participant_id
      and lp.league_id = hunt_challengers.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
      and hqe.league_id = hunt_challengers.league_id
      and hqe.participant_id = hunt_challengers.participant_id
      and dp.league_id = hunt_challengers.league_id
      and dp.participant_id = hunt_challengers.participant_id
      and dp.status in ('made', 'autopicked')
      and dp.picked_position = target.position
      and not exists (
        select 1
        from public.party_assignments pa
        where pa.league_id = hunt_challengers.league_id
          and pa.participant_id = hunt_challengers.participant_id
          and pa.draft_pick_id = hunt_challengers.challenger_draft_pick_id
          and pa.assignment_type = 'arena'
      )
  )
);
