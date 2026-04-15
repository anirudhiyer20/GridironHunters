alter table public.hunt_queue_entries
  add column if not exists week_number integer not null default 1 check (week_number between 1 and 18),
  add column if not exists battle_keys_to_spend integer not null default 1 check (battle_keys_to_spend between 1 and 5);

create table if not exists public.hunt_challengers (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  participant_id uuid not null references public.league_participants (id) on delete cascade,
  hunt_queue_entry_id uuid not null references public.hunt_queue_entries (id) on delete cascade,
  challenger_draft_pick_id uuid not null references public.draft_picks (id) on delete cascade,
  challenger_slot integer not null check (challenger_slot in (1, 2)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists hunt_challengers_slot_unique
on public.hunt_challengers (hunt_queue_entry_id, challenger_slot);

create unique index if not exists hunt_challengers_pick_unique
on public.hunt_challengers (hunt_queue_entry_id, challenger_draft_pick_id);

create index if not exists hunt_challengers_lookup_idx
on public.hunt_challengers (league_id, participant_id, hunt_queue_entry_id);

drop trigger if exists set_hunt_challengers_updated_at on public.hunt_challengers;
create trigger set_hunt_challengers_updated_at
before update on public.hunt_challengers
for each row
execute function public.set_updated_at();

alter table public.hunt_challengers enable row level security;

drop policy if exists "hunt_queue_entries_update_own_human_participant" on public.hunt_queue_entries;
create policy "hunt_queue_entries_update_own_human_participant"
on public.hunt_queue_entries
for update
to authenticated
using (
  exists (
    select 1
    from public.league_participants lp
    where lp.id = hunt_queue_entries.participant_id
      and lp.league_id = hunt_queue_entries.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
  )
)
with check (
  exists (
    select 1
    from public.league_participants lp
    join public.players p on p.id = hunt_queue_entries.target_player_id
    where lp.id = hunt_queue_entries.participant_id
      and lp.league_id = hunt_queue_entries.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
      and p.is_active = true
      and p.tribe = hunt_queue_entries.target_tribe
      and p.tribe <> 'Unclaimed'
  )
);

drop policy if exists "hunt_challengers_select_same_league_or_admin" on public.hunt_challengers;
create policy "hunt_challengers_select_same_league_or_admin"
on public.hunt_challengers
for select
to authenticated
using (
  public.is_platform_admin(auth.uid())
  or exists (
    select 1
    from public.league_members lm
    where lm.league_id = hunt_challengers.league_id
      and lm.user_id = auth.uid()
  )
);

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
      and exists (
        select 1
        from public.party_assignments pa
        where pa.league_id = hunt_challengers.league_id
          and pa.participant_id = hunt_challengers.participant_id
          and pa.draft_pick_id = hunt_challengers.challenger_draft_pick_id
          and pa.assignment_type = 'dungeon'
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
      and exists (
        select 1
        from public.party_assignments pa
        where pa.league_id = hunt_challengers.league_id
          and pa.participant_id = hunt_challengers.participant_id
          and pa.draft_pick_id = hunt_challengers.challenger_draft_pick_id
          and pa.assignment_type = 'dungeon'
      )
  )
);

drop policy if exists "hunt_challengers_delete_own_human_participant" on public.hunt_challengers;
create policy "hunt_challengers_delete_own_human_participant"
on public.hunt_challengers
for delete
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
);
