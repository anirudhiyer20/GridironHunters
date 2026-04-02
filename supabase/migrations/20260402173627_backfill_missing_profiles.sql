insert into public.profiles (
  id,
  email,
  display_name
)
select
  au.id,
  au.email,
  coalesce(
    au.raw_user_meta_data ->> 'display_name',
    split_part(coalesce(au.email, ''), '@', 1),
    'New Player'
  )
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null;
