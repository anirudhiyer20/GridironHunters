create type public.notification_type as enum (
  'welcome_to_guild',
  'draft_results',
  'battle_keys_granted',
  'hunt_resolved',
  'arena_result',
  'badge_earned',
  'playoff_clinched'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  league_id uuid references public.leagues (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  category text not null,
  body text not null,
  action_href text,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index notifications_profile_created_at_idx
on public.notifications (profile_id, created_at desc);

create index notifications_profile_read_idx
on public.notifications (profile_id, read_at);

create index notifications_league_id_idx
on public.notifications (league_id)
where league_id is not null;

alter table public.notifications enable row level security;

create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (profile_id = auth.uid());

create policy "notifications_update_own_read_state"
on public.notifications
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create or replace function public.create_notification(
  p_profile_id uuid,
  p_league_id uuid,
  p_type public.notification_type,
  p_title text,
  p_category text,
  p_body text,
  p_action_href text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  if p_profile_id is null then
    raise exception 'Notification profile_id is required.';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'Notification title is required.';
  end if;

  if coalesce(trim(p_category), '') = '' then
    raise exception 'Notification category is required.';
  end if;

  if coalesce(trim(p_body), '') = '' then
    raise exception 'Notification body is required.';
  end if;

  insert into public.notifications (
    profile_id,
    league_id,
    type,
    title,
    category,
    body,
    action_href
  )
  values (
    p_profile_id,
    p_league_id,
    p_type,
    trim(p_title),
    trim(p_category),
    trim(p_body),
    nullif(trim(coalesce(p_action_href, '')), '')
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

create or replace function public.seed_my_welcome_notification()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_league public.leagues%rowtype;
  v_display_name text;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to seed a welcome notification.';
  end if;

  select *
  into v_profile
  from public.ensure_profile_for_user(v_user_id);

  select l.*
  into v_league
  from public.league_members lm
  join public.leagues l on l.id = lm.league_id
  where lm.user_id = v_user_id
  order by lm.joined_at desc
  limit 1;

  v_display_name := coalesce(
    nullif(trim(v_profile.display_name), ''),
    split_part(coalesce(v_profile.email, ''), '@', 1),
    'Hunter'
  );

  return public.create_notification(
    v_user_id,
    case when v_league.id is null then null else v_league.id end,
    'welcome_to_guild',
    'Welcome Scroll',
    'Guild Welcome',
    format(
      E'House of %s,\n\nGood morrow, and welcome to the Guild.\n\nYour hearth is lit, your Party Chest is ready, and the Dungeon gates are waiting for the first bold Hunt.\n\nCheck the Strategy Center before each week begins, spend your Battle Keys wisely, and may your House earn many Sigils.',
      v_display_name
    ),
    '/app'
  );
end;
$$;

create or replace function public.mark_notification_read(
  p_notification_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'You must be logged in to read notifications.';
  end if;

  update public.notifications n
  set read_at = coalesce(n.read_at, timezone('utc', now()))
  where n.id = p_notification_id
    and n.profile_id = v_user_id;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to read notifications.';
  end if;

  update public.notifications n
  set read_at = timezone('utc', now())
  where n.profile_id = v_user_id
    and n.read_at is null;

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

create or replace function public.create_welcome_notification_for_member(
  p_profile_id uuid,
  p_league_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_league public.leagues%rowtype;
  v_display_name text;
begin
  select *
  into v_profile
  from public.ensure_profile_for_user(p_profile_id);

  select *
  into v_league
  from public.leagues l
  where l.id = p_league_id;

  v_display_name := coalesce(
    nullif(trim(v_profile.display_name), ''),
    split_part(coalesce(v_profile.email, ''), '@', 1),
    'Hunter'
  );

  return public.create_notification(
    p_profile_id,
    p_league_id,
    'welcome_to_guild',
    'Welcome Scroll',
    'Guild Welcome',
    format(
      E'House of %s,\n\nGood morrow, and welcome to %s.\n\nYour hearth is lit, your Party Chest is ready, and the Dungeon gates are waiting for the first bold Hunt.\n\nCheck the Strategy Center before each week begins, spend your Battle Keys wisely, and may your House earn many Sigils.',
      v_display_name,
      coalesce(v_league.name, 'the Guild')
    ),
    '/app/guild'
  );
end;
$$;

grant execute on function public.seed_my_welcome_notification() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

alter publication supabase_realtime add table public.notifications;
