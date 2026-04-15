create table public.party_assignments (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  participant_id uuid not null references public.league_participants (id) on delete cascade,
  draft_pick_id uuid not null references public.draft_picks (id) on delete cascade,
  assignment_type text not null check (assignment_type in ('arena', 'dungeon')),
  slot_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint party_assignments_arena_slot_check check (
    assignment_type <> 'arena'
    or slot_key in ('qb', 'rb', 'wr', 'te', 'flex-1', 'flex-2')
  ),
  constraint party_assignments_dungeon_slot_check check (
    assignment_type <> 'dungeon'
    or slot_key in ('dungeon-1', 'dungeon-2', 'dungeon-3')
  )
);

create unique index party_assignments_slot_unique
on public.party_assignments (participant_id, assignment_type, slot_key);

create unique index party_assignments_pick_type_unique
on public.party_assignments (participant_id, assignment_type, draft_pick_id);

create index party_assignments_league_participant_idx
on public.party_assignments (league_id, participant_id);

create trigger set_party_assignments_updated_at
before update on public.party_assignments
for each row
execute function public.set_updated_at();

alter table public.party_assignments enable row level security;

create policy "party_assignments_select_same_league_or_admin"
on public.party_assignments
for select
to authenticated
using (
  public.is_platform_admin(auth.uid())
  or exists (
    select 1
    from public.league_members lm
    where lm.league_id = party_assignments.league_id
      and lm.user_id = auth.uid()
  )
);

create policy "party_assignments_insert_own_human_participant"
on public.party_assignments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.league_participants lp
    join public.draft_picks dp on dp.id = party_assignments.draft_pick_id
    where lp.id = party_assignments.participant_id
      and lp.league_id = party_assignments.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
      and dp.league_id = party_assignments.league_id
      and dp.participant_id = party_assignments.participant_id
      and dp.status in ('made', 'autopicked')
  )
);

create policy "party_assignments_update_own_human_participant"
on public.party_assignments
for update
to authenticated
using (
  exists (
    select 1
    from public.league_participants lp
    where lp.id = party_assignments.participant_id
      and lp.league_id = party_assignments.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
  )
)
with check (
  exists (
    select 1
    from public.league_participants lp
    join public.draft_picks dp on dp.id = party_assignments.draft_pick_id
    where lp.id = party_assignments.participant_id
      and lp.league_id = party_assignments.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
      and dp.league_id = party_assignments.league_id
      and dp.participant_id = party_assignments.participant_id
      and dp.status in ('made', 'autopicked')
  )
);

create policy "party_assignments_delete_own_human_participant"
on public.party_assignments
for delete
to authenticated
using (
  exists (
    select 1
    from public.league_participants lp
    where lp.id = party_assignments.participant_id
      and lp.league_id = party_assignments.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
  )
);
