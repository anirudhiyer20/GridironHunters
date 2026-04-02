create or replace function public.is_platform_admin(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_user_id
      and platform_role = 'platform_admin'
  );
$$;

create or replace function public.is_league_commissioner(
  p_user_id uuid,
  p_league_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.league_members
    where league_id = p_league_id
      and user_id = p_user_id
      and role = 'commissioner'
  );
$$;

drop policy "leagues_select_member_or_admin" on public.leagues;
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
  or public.is_platform_admin(auth.uid())
);

drop policy "leagues_update_commissioner_or_admin" on public.leagues;
create policy "leagues_update_commissioner_or_admin"
on public.leagues
for update
to authenticated
using (
  public.is_league_commissioner(auth.uid(), leagues.id)
  or public.is_platform_admin(auth.uid())
)
with check (
  public.is_league_commissioner(auth.uid(), leagues.id)
  or public.is_platform_admin(auth.uid())
);

drop policy "league_members_select_visible_to_member_commissioner_or_admin" on public.league_members;
create policy "league_members_select_visible_to_member_commissioner_or_admin"
on public.league_members
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_league_commissioner(auth.uid(), league_members.league_id)
  or public.is_platform_admin(auth.uid())
);

drop policy "league_members_insert_self_commissioner_or_admin" on public.league_members;
create policy "league_members_insert_self_commissioner_or_admin"
on public.league_members
for insert
to authenticated
with check (
  auth.uid() = user_id
  or public.is_league_commissioner(auth.uid(), league_members.league_id)
  or public.is_platform_admin(auth.uid())
);

drop policy "league_members_delete_self_commissioner_or_admin" on public.league_members;
create policy "league_members_delete_self_commissioner_or_admin"
on public.league_members
for delete
to authenticated
using (
  auth.uid() = user_id
  or public.is_league_commissioner(auth.uid(), league_members.league_id)
  or public.is_platform_admin(auth.uid())
);

drop policy "invite_codes_select_member_or_admin" on public.invite_codes;
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
  or public.is_platform_admin(auth.uid())
);

drop policy "invite_codes_insert_commissioner_or_admin" on public.invite_codes;
create policy "invite_codes_insert_commissioner_or_admin"
on public.invite_codes
for insert
to authenticated
with check (
  public.is_league_commissioner(auth.uid(), invite_codes.league_id)
  or public.is_platform_admin(auth.uid())
);

drop policy "invite_codes_update_commissioner_or_admin" on public.invite_codes;
create policy "invite_codes_update_commissioner_or_admin"
on public.invite_codes
for update
to authenticated
using (
  public.is_league_commissioner(auth.uid(), invite_codes.league_id)
  or public.is_platform_admin(auth.uid())
)
with check (
  public.is_league_commissioner(auth.uid(), invite_codes.league_id)
  or public.is_platform_admin(auth.uid())
);

drop policy "audit_logs_select_admin_or_commissioner" on public.audit_logs;
create policy "audit_logs_select_admin_or_commissioner"
on public.audit_logs
for select
to authenticated
using (
  public.is_platform_admin(auth.uid())
  or (
    league_id is not null
    and public.is_league_commissioner(auth.uid(), audit_logs.league_id)
  )
);

grant execute on function public.is_platform_admin(uuid) to authenticated;
grant execute on function public.is_league_commissioner(uuid, uuid) to authenticated;
