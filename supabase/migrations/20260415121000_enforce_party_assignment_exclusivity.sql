delete from public.party_assignments pa
using public.party_assignments other
where pa.participant_id = other.participant_id
  and pa.draft_pick_id = other.draft_pick_id
  and pa.id <> other.id
  and pa.assignment_type = 'dungeon'
  and other.assignment_type = 'arena';

drop index if exists public.party_assignments_pick_type_unique;

create unique index if not exists party_assignments_pick_unique
on public.party_assignments (participant_id, draft_pick_id);
