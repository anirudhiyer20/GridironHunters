create table public.hunt_queue_entries (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  participant_id uuid not null references public.league_participants (id) on delete cascade,
  target_player_id uuid not null references public.players (id) on delete cascade,
  target_tribe text not null check (target_tribe in ('Combat', 'Forge', 'Storm', 'Tundra', 'Halo', 'Blaze', 'Shroud', 'Prowl')),
  queue_rank integer not null check (queue_rank > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (league_id, participant_id, target_player_id),
  unique (league_id, participant_id, target_tribe, queue_rank)
);

create index hunt_queue_entries_lookup_idx
on public.hunt_queue_entries (league_id, participant_id, target_tribe, queue_rank);

create trigger set_hunt_queue_entries_updated_at
before update on public.hunt_queue_entries
for each row
execute function public.set_updated_at();

alter table public.hunt_queue_entries enable row level security;

create policy "hunt_queue_entries_select_same_league_or_admin"
on public.hunt_queue_entries
for select
to authenticated
using (
  public.is_platform_admin(auth.uid())
  or exists (
    select 1
    from public.league_members lm
    where lm.league_id = hunt_queue_entries.league_id
      and lm.user_id = auth.uid()
  )
);

create policy "hunt_queue_entries_insert_own_human_participant"
on public.hunt_queue_entries
for insert
to authenticated
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
      and not exists (
        select 1
        from public.draft_picks dp
        where dp.league_id = hunt_queue_entries.league_id
          and dp.picked_player_id = hunt_queue_entries.target_player_id
      )
  )
);

create policy "hunt_queue_entries_delete_own_human_participant"
on public.hunt_queue_entries
for delete
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
);
