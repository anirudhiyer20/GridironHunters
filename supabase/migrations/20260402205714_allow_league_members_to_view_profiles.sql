create or replace function public.shares_league_with_user(
  p_viewer_user_id uuid,
  p_target_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.league_members viewer_membership
    join public.league_members target_membership
      on target_membership.league_id = viewer_membership.league_id
    where viewer_membership.user_id = p_viewer_user_id
      and target_membership.user_id = p_target_user_id
  )
$$;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;

create policy "profiles_select_self_admin_or_league_member"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.is_platform_admin(auth.uid())
  or public.shares_league_with_user(auth.uid(), id)
);
