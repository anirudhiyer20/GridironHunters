alter table public.notifications
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists source_key text;

create unique index if not exists notifications_source_unique
on public.notifications (profile_id, type, source_type, source_id)
where source_type is not null and source_id is not null;

create unique index if not exists notifications_source_key_unique
on public.notifications (profile_id, type, source_type, source_key)
where source_type is not null and source_key is not null;

create or replace function public.create_notification(
  p_profile_id uuid,
  p_league_id uuid,
  p_type public.notification_type,
  p_title text,
  p_category text,
  p_body text,
  p_action_href text default null,
  p_source_type text default null,
  p_source_id uuid default null,
  p_source_key text default null
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

  if p_source_type is not null and p_source_id is not null then
    select n.id
    into v_notification_id
    from public.notifications n
    where n.profile_id = p_profile_id
      and n.type = p_type
      and n.source_type = p_source_type
      and n.source_id = p_source_id
    limit 1;

    if v_notification_id is not null then
      update public.notifications n
      set
        league_id = p_league_id,
        title = trim(p_title),
        category = trim(p_category),
        body = trim(p_body),
        action_href = nullif(trim(coalesce(p_action_href, '')), ''),
        archived_at = null
      where n.id = v_notification_id;

      return v_notification_id;
    end if;
  end if;

  if p_source_type is not null and p_source_key is not null then
    select n.id
    into v_notification_id
    from public.notifications n
    where n.profile_id = p_profile_id
      and n.type = p_type
      and n.source_type = p_source_type
      and n.source_key = p_source_key
    limit 1;

    if v_notification_id is not null then
      update public.notifications n
      set
        league_id = p_league_id,
        title = trim(p_title),
        category = trim(p_category),
        body = trim(p_body),
        action_href = nullif(trim(coalesce(p_action_href, '')), ''),
        archived_at = null
      where n.id = v_notification_id;

      return v_notification_id;
    end if;
  end if;

  insert into public.notifications (
    profile_id,
    league_id,
    type,
    title,
    category,
    body,
    action_href,
    source_type,
    source_id,
    source_key
  )
  values (
    p_profile_id,
    p_league_id,
    p_type,
    trim(p_title),
    trim(p_category),
    trim(p_body),
    nullif(trim(coalesce(p_action_href, '')), ''),
    nullif(trim(coalesce(p_source_type, '')), ''),
    p_source_id,
    nullif(trim(coalesce(p_source_key, '')), '')
  )
  returning id into v_notification_id;

  return v_notification_id;
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
    '/app/guild',
    'league_member',
    p_league_id
  );
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
  v_league public.leagues%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to seed a welcome notification.';
  end if;

  select l.*
  into v_league
  from public.league_members lm
  join public.leagues l on l.id = lm.league_id
  where lm.user_id = v_user_id
  order by lm.joined_at desc
  limit 1;

  if v_league.id is not null then
    return public.create_welcome_notification_for_member(v_user_id, v_league.id);
  end if;

  return public.create_notification(
    v_user_id,
    null,
    'welcome_to_guild',
    'Welcome Scroll',
    'Guild Welcome',
    E'Good morrow, Hunter.\n\nYour hearth is lit and your House is ready.\n\nJoin or create a Guild to begin filling your Party Chest, entering the Dungeon, and preparing for the Arena.',
    '/app/guild',
    'profile_welcome',
    v_user_id
  );
end;
$$;

create or replace function public.create_draft_results_notifications(
  p_league_id uuid,
  p_draft_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league public.leagues%rowtype;
  v_participant record;
  v_party_lines text;
  v_notification_count integer := 0;
begin
  select *
  into v_league
  from public.leagues l
  where l.id = p_league_id;

  for v_participant in
    select lp.id, lp.user_id, lp.display_name
    from public.league_participants lp
    where lp.league_id = p_league_id
      and lp.participant_type = 'human'
      and lp.user_id is not null
  loop
    select string_agg(
      format(
        'Round %s, Pick %s: %s (%s)',
        dp.round_number,
        dp.pick_number,
        coalesce(dp.picked_player_name, p.full_name, 'Unknown Player'),
        coalesce(dp.picked_position, p.position, 'N/A')
      ),
      E'\n'
      order by dp.pick_number
    )
    into v_party_lines
    from public.draft_picks dp
    left join public.players p on p.id = dp.picked_player_id
    where dp.draft_id = p_draft_id
      and dp.participant_id = v_participant.id
      and dp.status in ('made', 'autopicked')
      and (dp.picked_player_id is not null or dp.picked_player_name is not null);

    perform public.create_notification(
      v_participant.user_id,
      p_league_id,
      'draft_results',
      'Draft Results',
      'Draft Room',
      format(
        E'House of %s,\n\nThe Draft has concluded in %s.\n\nYour opening Party has been recorded:\n\n%s\n\nSet your Arena lineup, choose your Dungeon battlers, and prepare for the first week of Hunts.',
        coalesce(v_participant.display_name, 'Hunter'),
        coalesce(v_league.name, 'the Guild'),
        coalesce(v_party_lines, 'No drafted players were recorded for this House.')
      ),
      '/app/house/party',
      'draft',
      p_draft_id
    );

    v_notification_count := v_notification_count + 1;
  end loop;

  return v_notification_count;
end;
$$;

create or replace function public.advance_draft_pointer(
  p_draft_id uuid,
  p_league_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_pick public.draft_picks%rowtype;
begin
  select *
  into v_next_pick
  from public.draft_picks dp
  where dp.draft_id = p_draft_id
    and dp.status = 'pending'
  order by dp.pick_number asc
  limit 1;

  if not found then
    update public.drafts d
    set
      status = 'completed',
      current_pick_number = 80,
      current_round = 8,
      current_pick_started_at = null,
      completed_at = timezone('utc', now())
    where d.id = p_draft_id;

    update public.leagues l
    set status = 'active'
    where l.id = p_league_id;

    perform public.create_draft_results_notifications(p_league_id, p_draft_id);

    return;
  end if;

  update public.drafts d
  set
    current_pick_number = v_next_pick.pick_number,
    current_round = v_next_pick.round_number,
    current_pick_started_at = timezone('utc', now())
  where d.id = p_draft_id;
end;
$$;

create or replace function public.create_hunt_resolved_notification(
  p_hunt_attempt_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.hunt_attempts%rowtype;
  v_participant public.league_participants%rowtype;
  v_target public.players%rowtype;
  v_challenger_lines text;
  v_result_title text;
  v_result_body text;
begin
  select *
  into v_attempt
  from public.hunt_attempts ha
  where ha.id = p_hunt_attempt_id;

  if not found or v_attempt.status <> 'resolved' then
    return null;
  end if;

  select *
  into v_participant
  from public.league_participants lp
  where lp.id = v_attempt.participant_id;

  if not found or v_participant.user_id is null then
    return null;
  end if;

  select *
  into v_target
  from public.players p
  where p.id = v_attempt.target_player_id;

  select string_agg(
    format(
      '%s (%s): %s pts',
      coalesce(dp.picked_player_name, p.full_name, 'Unknown Challenger'),
      coalesce(dp.picked_position, p.position, 'N/A'),
      coalesce(hac.challenger_score::text, 'pending')
    ),
    E'\n'
    order by hac.challenger_slot
  )
  into v_challenger_lines
  from public.hunt_attempt_challengers hac
  join public.draft_picks dp on dp.id = hac.challenger_draft_pick_id
  left join public.players p on p.id = dp.picked_player_id
  where hac.hunt_attempt_id = v_attempt.id;

  v_result_title := case
    when v_attempt.result = 'captured' then 'Hunt Captured'
    else 'Hunt Escaped'
  end;

  v_result_body := case
    when v_attempt.result = 'captured' then format(
      E'Your Hunt was successful.\n\n%s was captured from the %s Dungeon and has joined the path toward your Party.\n\nBattle Keys spent: %s\nTarget score: %s\nBest challenger score: %s\n\nBattlers:\n%s',
      coalesce(v_target.full_name, 'The Wild Player'),
      v_attempt.target_tribe,
      v_attempt.battle_keys_spent,
      coalesce(v_attempt.target_score::text, 'pending'),
      coalesce(v_attempt.best_challenger_score::text, 'pending'),
      coalesce(v_challenger_lines, 'No challengers recorded.')
    )
    else format(
      E'The Wild Player escaped this Hunt.\n\n%s survived the challenge in the %s Dungeon.\n\nBattle Keys spent: %s\nTarget score: %s\nBest challenger score: %s\n\nBattlers:\n%s',
      coalesce(v_target.full_name, 'The Wild Player'),
      v_attempt.target_tribe,
      v_attempt.battle_keys_spent,
      coalesce(v_attempt.target_score::text, 'pending'),
      coalesce(v_attempt.best_challenger_score::text, 'pending'),
      coalesce(v_challenger_lines, 'No challengers recorded.')
    )
  end;

  return public.create_notification(
    v_participant.user_id,
    v_attempt.league_id,
    'hunt_resolved',
    v_result_title,
    'Dungeon Report',
    v_result_body,
    '/app/dungeon/hunts',
    'hunt_attempt',
    v_attempt.id
  );
end;
$$;

create or replace function public.notify_hunt_attempt_resolved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'resolved'
    and (
      tg_op = 'INSERT'
      or old.status is distinct from new.status
      or old.result is distinct from new.result
      or old.target_score is distinct from new.target_score
      or old.best_challenger_score is distinct from new.best_challenger_score
    )
  then
    perform public.create_hunt_resolved_notification(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists notify_hunt_attempt_resolved on public.hunt_attempts;
create trigger notify_hunt_attempt_resolved
after insert or update of status, result, target_score, best_challenger_score
on public.hunt_attempts
for each row
execute function public.notify_hunt_attempt_resolved();

create or replace function public.create_battle_keys_granted_notifications(
  p_league_id uuid,
  p_week_number integer,
  p_keys_granted integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant record;
  v_notification_count integer := 0;
begin
  for v_participant in
    select lp.id, lp.user_id, lp.display_name
    from public.league_participants lp
    where lp.league_id = p_league_id
      and lp.participant_type = 'human'
      and lp.user_id is not null
  loop
    perform public.create_notification(
      v_participant.user_id,
      p_league_id,
      'battle_keys_granted',
      'Battle Keys',
      'Battle Keys',
      format(
        E'House of %s,\n\nThe Guild has delivered fresh Battle Keys for Week %s.\n\nKeys granted: %s\n\nUnused keys remain in your pouch. Keys spent on submitted Hunts are already at work.\n\nGood luck in your battles.',
        coalesce(v_participant.display_name, 'Hunter'),
        p_week_number,
        p_keys_granted
      ),
    '/app/dungeon/hunts',
    'battle_keys_week',
    null,
    format('%s:%s', p_league_id, p_week_number)
  );

    v_notification_count := v_notification_count + 1;
  end loop;

  return v_notification_count;
end;
$$;

create or replace function public.create_arena_result_notification(
  p_profile_id uuid,
  p_league_id uuid,
  p_title text,
  p_body text,
  p_source_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_notification(
    p_profile_id,
    p_league_id,
    'arena_result',
    p_title,
    'Arena Results',
    p_body,
    '/app/arena/results',
    case when p_source_id is null then null else 'arena_result' end,
    p_source_id
  );
end;
$$;

create or replace function public.create_badge_earned_notification(
  p_profile_id uuid,
  p_league_id uuid,
  p_badge_name text,
  p_body text,
  p_source_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_notification(
    p_profile_id,
    p_league_id,
    'badge_earned',
    coalesce(nullif(trim(p_badge_name), ''), 'New Sigil'),
    'Badge Receipt',
    p_body,
    '/app/house/trophies',
    case when p_source_id is null then null else 'badge' end,
    p_source_id
  );
end;
$$;

create or replace function public.create_playoff_clinched_notification(
  p_profile_id uuid,
  p_league_id uuid,
  p_body text,
  p_source_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_notification(
    p_profile_id,
    p_league_id,
    'playoff_clinched',
    'Playoff Berth',
    'Guild Notice',
    p_body,
    '/app/arena/standings',
    case when p_source_id is null then null else 'playoff' end,
    p_source_id
  );
end;
$$;
