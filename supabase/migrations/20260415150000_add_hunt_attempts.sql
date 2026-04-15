create table public.hunt_attempts (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  participant_id uuid not null references public.league_participants (id) on delete cascade,
  hunt_queue_entry_id uuid not null references public.hunt_queue_entries (id) on delete cascade,
  target_player_id uuid not null references public.players (id) on delete cascade,
  target_tribe text not null check (target_tribe in ('Combat', 'Forge', 'Storm', 'Tundra', 'Halo', 'Blaze', 'Shroud', 'Prowl')),
  week_number integer not null default 1 check (week_number between 1 and 18),
  battle_keys_spent integer not null check (battle_keys_spent between 1 and 2),
  status text not null default 'submitted' check (status in ('submitted', 'resolved')),
  result text check (result in ('captured', 'escaped')),
  target_score numeric(7, 2),
  best_challenger_score numeric(7, 2),
  submitted_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (hunt_queue_entry_id)
);

create table public.hunt_attempt_challengers (
  id uuid primary key default gen_random_uuid(),
  hunt_attempt_id uuid not null references public.hunt_attempts (id) on delete cascade,
  challenger_draft_pick_id uuid not null references public.draft_picks (id) on delete cascade,
  challenger_slot integer not null check (challenger_slot in (1, 2)),
  challenger_score numeric(7, 2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (hunt_attempt_id, challenger_slot),
  unique (hunt_attempt_id, challenger_draft_pick_id)
);

create index hunt_attempts_participant_idx
on public.hunt_attempts (league_id, participant_id, week_number, status);

create index hunt_attempt_challengers_attempt_idx
on public.hunt_attempt_challengers (hunt_attempt_id);

create trigger set_hunt_attempts_updated_at
before update on public.hunt_attempts
for each row
execute function public.set_updated_at();

create trigger set_hunt_attempt_challengers_updated_at
before update on public.hunt_attempt_challengers
for each row
execute function public.set_updated_at();

alter table public.hunt_attempts enable row level security;
alter table public.hunt_attempt_challengers enable row level security;

create policy "hunt_attempts_select_same_league_or_admin"
on public.hunt_attempts
for select
to authenticated
using (
  public.is_platform_admin(auth.uid())
  or exists (
    select 1
    from public.league_members lm
    where lm.league_id = hunt_attempts.league_id
      and lm.user_id = auth.uid()
  )
);

create policy "hunt_attempts_insert_own_human_participant"
on public.hunt_attempts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.league_participants lp
    join public.hunt_queue_entries hqe on hqe.id = hunt_attempts.hunt_queue_entry_id
    where lp.id = hunt_attempts.participant_id
      and lp.league_id = hunt_attempts.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
      and hqe.league_id = hunt_attempts.league_id
      and hqe.participant_id = hunt_attempts.participant_id
      and hqe.target_player_id = hunt_attempts.target_player_id
      and hqe.target_tribe = hunt_attempts.target_tribe
  )
);

create policy "hunt_attempts_update_own_human_participant"
on public.hunt_attempts
for update
to authenticated
using (
  exists (
    select 1
    from public.league_participants lp
    where lp.id = hunt_attempts.participant_id
      and lp.league_id = hunt_attempts.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
  )
)
with check (
  exists (
    select 1
    from public.league_participants lp
    where lp.id = hunt_attempts.participant_id
      and lp.league_id = hunt_attempts.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
  )
);

create policy "hunt_attempt_challengers_select_same_league_or_admin"
on public.hunt_attempt_challengers
for select
to authenticated
using (
  exists (
    select 1
    from public.hunt_attempts ha
    where ha.id = hunt_attempt_challengers.hunt_attempt_id
      and (
        public.is_platform_admin(auth.uid())
        or exists (
          select 1
          from public.league_members lm
          where lm.league_id = ha.league_id
            and lm.user_id = auth.uid()
        )
      )
  )
);

create policy "hunt_attempt_challengers_insert_own_human_participant"
on public.hunt_attempt_challengers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.hunt_attempts ha
    join public.league_participants lp on lp.id = ha.participant_id
    join public.draft_picks dp on dp.id = hunt_attempt_challengers.challenger_draft_pick_id
    where ha.id = hunt_attempt_challengers.hunt_attempt_id
      and lp.league_id = ha.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
      and dp.league_id = ha.league_id
      and dp.participant_id = ha.participant_id
      and dp.status in ('made', 'autopicked')
  )
);

create policy "hunt_attempt_challengers_delete_own_human_participant"
on public.hunt_attempt_challengers
for delete
to authenticated
using (
  exists (
    select 1
    from public.hunt_attempts ha
    join public.league_participants lp on lp.id = ha.participant_id
    where ha.id = hunt_attempt_challengers.hunt_attempt_id
      and lp.league_id = ha.league_id
      and lp.user_id = auth.uid()
      and lp.participant_type = 'human'
  )
);
