create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text not null,
  favorite_team text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  season integer not null check (season >= 2020),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('commissioner', 'member')),
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (league_id, user_id)
);

create index league_members_user_id_idx on public.league_members (user_id);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_leagues_updated_at
before update on public.leagues
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "leagues_insert_authenticated"
on public.leagues
for insert
to authenticated
with check (auth.uid() = created_by);

create policy "leagues_select_member"
on public.leagues
for select
to authenticated
using (
  exists (
    select 1
    from public.league_members league_member
    where league_member.league_id = leagues.id
      and league_member.user_id = auth.uid()
  )
);

create policy "leagues_update_commissioner"
on public.leagues
for update
to authenticated
using (
  exists (
    select 1
    from public.league_members league_member
    where league_member.league_id = leagues.id
      and league_member.user_id = auth.uid()
      and league_member.role = 'commissioner'
  )
)
with check (
  exists (
    select 1
    from public.league_members league_member
    where league_member.league_id = leagues.id
      and league_member.user_id = auth.uid()
      and league_member.role = 'commissioner'
  )
);

create policy "league_members_select_self_or_commissioner"
on public.league_members
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.league_members commissioner
    where commissioner.league_id = league_members.league_id
      and commissioner.user_id = auth.uid()
      and commissioner.role = 'commissioner'
  )
);

create policy "league_members_insert_self_or_commissioner"
on public.league_members
for insert
to authenticated
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.league_members commissioner
    where commissioner.league_id = league_members.league_id
      and commissioner.user_id = auth.uid()
      and commissioner.role = 'commissioner'
  )
);

create policy "league_members_delete_self_or_commissioner"
on public.league_members
for delete
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.league_members commissioner
    where commissioner.league_id = league_members.league_id
      and commissioner.user_id = auth.uid()
      and commissioner.role = 'commissioner'
  )
);
