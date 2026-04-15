create table public.user_characters (
  user_id uuid primary key references auth.users (id) on delete cascade,
  character_name text not null default 'House Warden',
  archetype text not null default 'Lantern Warden' check (archetype in ('Lantern Warden', 'Moss Ranger', 'Ash Duelist')),
  body_frame text not null default 'Balanced' check (body_frame in ('Balanced', 'Sturdy', 'Swift')),
  skin_tone text not null default 'sunlit' check (skin_tone in ('sunlit', 'umber', 'rose', 'deep')),
  hair_style text not null default 'cropped' check (hair_style in ('cropped', 'waves', 'braids', 'hooded')),
  hair_color text not null default 'chestnut' check (hair_color in ('chestnut', 'raven', 'copper', 'silver')),
  outfit_style text not null default 'tavern' check (outfit_style in ('tavern', 'ranger', 'duelist')),
  cloak_color text not null default '#9a6a3c',
  accent_color text not null default '#d7b46f',
  crest text not null default 'Lantern Crest' check (crest in ('Lantern Crest', 'Moss Sigil', 'Ash Banner')),
  pose text not null default 'ready' check (pose in ('ready', 'guard', 'scout')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_characters_hex_colors check (
    cloak_color ~ '^#[0-9A-Fa-f]{6}$'
    and accent_color ~ '^#[0-9A-Fa-f]{6}$'
  )
);

create trigger set_user_characters_updated_at
before update on public.user_characters
for each row
execute function public.set_updated_at();

alter table public.user_characters enable row level security;

create policy "user_characters_select_own"
on public.user_characters
for select
to authenticated
using (auth.uid() = user_id);

create policy "user_characters_insert_own"
on public.user_characters
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_characters_update_own"
on public.user_characters
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
