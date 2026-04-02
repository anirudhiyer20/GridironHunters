create type public.platform_role as enum ('user', 'platform_admin');
create type public.league_status as enum ('pre_draft', 'active', 'completed');
create type public.audit_actor_type as enum ('user', 'admin', 'system');

alter table public.profiles
  add column platform_role public.platform_role not null default 'user',
  add column email text,
  add column email_verified_at timestamptz;

create unique index profiles_email_unique
on public.profiles (lower(email))
where email is not null;

alter table public.leagues
  add column status public.league_status not null default 'pre_draft',
  add column max_members integer not null default 10 check (max_members = 10),
  add column draft_starts_at timestamptz,
  add column settings jsonb not null default '{}'::jsonb;

alter table public.league_members
  add column created_at timestamptz not null default timezone('utc', now());

create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users (id) on delete restrict,
  expires_at timestamptz not null,
  disabled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint invite_codes_code_format check (code ~ '^[A-Z0-9]{6,12}$')
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_type public.audit_actor_type not null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  league_id uuid references public.leagues (id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index invite_codes_league_id_idx on public.invite_codes (league_id);
create index audit_logs_league_id_idx on public.audit_logs (league_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create trigger set_invite_codes_updated_at
before update on public.invite_codes
for each row
execute function public.set_updated_at();

alter table public.invite_codes enable row level security;
alter table public.audit_logs enable row level security;

drop policy "profiles_select_own" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.platform_role = 'platform_admin'
  )
);

drop policy "profiles_update_own" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.platform_role = 'platform_admin'
  )
)
with check (
  auth.uid() = id
  or exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.platform_role = 'platform_admin'
  )
);

drop policy "leagues_select_member" on public.leagues;
create policy "leagues_select_member_or_admin"
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
  or exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.platform_role = 'platform_admin'
  )
);

drop policy "leagues_update_commissioner" on public.leagues;
create policy "leagues_update_commissioner_or_admin"
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
  or exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.platform_role = 'platform_admin'
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
  or exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.platform_role = 'platform_admin'
  )
);

drop policy "league_members_select_self_or_commissioner" on public.league_members;
create policy "league_members_select_visible_to_member_commissioner_or_admin"
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
  or exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.platform_role = 'platform_admin'
  )
);

drop policy "league_members_insert_self_or_commissioner" on public.league_members;
create policy "league_members_insert_self_commissioner_or_admin"
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
  or exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.platform_role = 'platform_admin'
  )
);

drop policy "league_members_delete_self_or_commissioner" on public.league_members;
create policy "league_members_delete_self_commissioner_or_admin"
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
  or exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.platform_role = 'platform_admin'
  )
);

create policy "invite_codes_select_member_or_admin"
on public.invite_codes
for select
to authenticated
using (
  exists (
    select 1
    from public.league_members league_member
    where league_member.league_id = invite_codes.league_id
      and league_member.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.platform_role = 'platform_admin'
  )
);

create policy "invite_codes_insert_commissioner_or_admin"
on public.invite_codes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.league_members league_member
    where league_member.league_id = invite_codes.league_id
      and league_member.user_id = auth.uid()
      and league_member.role = 'commissioner'
  )
  or exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.platform_role = 'platform_admin'
  )
);

create policy "invite_codes_update_commissioner_or_admin"
on public.invite_codes
for update
to authenticated
using (
  exists (
    select 1
    from public.league_members league_member
    where league_member.league_id = invite_codes.league_id
      and league_member.user_id = auth.uid()
      and league_member.role = 'commissioner'
  )
  or exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.platform_role = 'platform_admin'
  )
)
with check (
  exists (
    select 1
    from public.league_members league_member
    where league_member.league_id = invite_codes.league_id
      and league_member.user_id = auth.uid()
      and league_member.role = 'commissioner'
  )
  or exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.platform_role = 'platform_admin'
  )
);

create policy "audit_logs_select_admin_or_commissioner"
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.platform_role = 'platform_admin'
  )
  or (
    league_id is not null
    and exists (
      select 1
      from public.league_members league_member
      where league_member.league_id = audit_logs.league_id
        and league_member.user_id = auth.uid()
        and league_member.role = 'commissioner'
    )
  )
);
